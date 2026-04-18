import os
import json
import uuid
import asyncio
import logging
import httpx
from fastapi import FastAPI, Depends, HTTPException, Query, File, UploadFile, Form
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional, Any

from database import get_db, init_db, SessionLocal
from models import Artifact
from llm_pipeline import brain_plan_ui, execute_plan, embed_text, search_web, local_template_match, analyze_file, chat_respond
from auth import get_current_user, get_optional_user

logger = logging.getLogger(__name__)

app = FastAPI(title="Morph OS Backend")

# CORS — in production both services are same-origin behind nginx so this only
# matters for local development (Next.js :3000 → FastAPI :8000).
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

# react-runner executes code in a sandboxed iframe — the browser sends Origin: null
# for such frames. We need to allow it for vault template API calls (e.g. YouTube search).
# This is safe because null-origin requests can't carry cookies / auth credentials anyway.
_ALL_ORIGINS = ALLOWED_ORIGINS + ["null"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALL_ORIGINS,
    allow_credentials=True,   # required for cookie-based auth
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    try:
        init_db()
    except Exception as e:
        logger.error(f"Database init failed (continuing anyway): {e}")


# ─── Auth ────────────────────────────────────────────────────────────────────

@app.get("/api/auth/me")
def get_me(user: dict = Depends(get_current_user)):
    """Returns the authenticated user's profile from their session JWT."""
    return {
        "id":      user.get("sub"),
        "email":   user.get("email"),
        "name":    user.get("name"),
        "picture": user.get("picture"),
    }

@app.get("/api/auth/status")
def auth_status(user: dict | None = Depends(get_optional_user)):
    """Debug endpoint — check if the backend can see your auth cookie."""
    if user:
        return {"authenticated": True, "email": user.get("email"), "sub": user.get("sub")}
    return {"authenticated": False, "reason": "No valid session cookie received"}


# ─── Generate ────────────────────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    prompt: str
    session_id: Optional[str] = None
    history: list[dict] = []
    user_context: Optional[dict] = None       # name, role, about, location, tone
    current_artifact: Optional[str] = None    # current rendered code for edit mode
    model: str = "swift"                       # "swift" | "think"

def _sse(event: dict) -> str:
    return f"data: {json.dumps(event)}\n\n"


async def _generate_stream(
    prompt: str,
    session_id: Optional[str],
    history: list[dict],
    user_context: Optional[dict],
    current_artifact: Optional[str],
    user_id: Optional[str],
    file_analysis: Optional[dict] = None,
    use_thinking: bool = False,
):
    """Core SSE generator — shared by JSON and multipart endpoints."""

    # ── 1. Embed original prompt ─────────────────────────────────────────────
    try:
        embedding = await asyncio.to_thread(embed_text, prompt)
    except Exception as e:
        yield _sse({"type": "error", "text": f"Embedding failed: {e}"})
        return

    # ── 2. Semantic cache (skip on file uploads — always fresh) ─────────────
    if user_id and not file_analysis:
        db = SessionLocal()
        try:
            distance_col = Artifact.embedding.cosine_distance(embedding).label("distance")
            closest = (
                db.query(Artifact, distance_col)
                .filter(Artifact.user_id == user_id)
                .order_by(distance_col)
                .first()
            )
            if closest:
                hit, distance = closest
                if distance is not None and distance < 0.1:
                    yield _sse({"type": "reply", "text": hit.reply or "Found in memory.", "id": hit.id})
                    if hit.code:
                        yield _sse({"type": "artifact", "code": hit.code, "id": hit.id})
                    yield _sse({"type": "done"})
                    return
        finally:
            db.close()

    # ── 3. Build brain prompt (inject file context when present) ─────────────
    brain_prompt = prompt
    if file_analysis:
        ftype  = file_analysis.get("type", "file")
        fname  = file_analysis.get("filename", "attachment")
        fdesc  = file_analysis.get("description", "")
        ftext  = file_analysis.get("text", "")
        fcolor = file_analysis.get("colors", [])
        parts  = [f"[ATTACHED FILE: {fname} | {ftype.upper()}]"]
        if fdesc:  parts.append(f"Description: {fdesc}")
        if ftext:  parts.append(f"Content:\n{ftext[:4000]}")
        if fcolor: parts.append(f"Brand colors detected: {', '.join(fcolor)}")
        brain_prompt = "\n".join(parts) + f"\n\nUser message: {prompt}"

    # ── 4. Local template fast-path (only when no file) ──────────────────────
    planned = None if file_analysis else local_template_match(prompt)

    # ── 5. Brain classifies + plans ──────────────────────────────────────────
    if planned is None:
        try:
            brain_json = await asyncio.to_thread(
                brain_plan_ui,
                brain_prompt,
                history,
                user_context,
                bool(current_artifact),
            )
            planned = json.loads(brain_json)
        except Exception as e:
            logger.error(f"Brain failed: {e}", exc_info=True)
            planned = {"type": "chat", "reply": "Something went wrong on my end. Try again?"}

    reply       = planned.get("reply", "On it...")
    artifact_id = str(uuid.uuid4())

    # ── 6a. Web search ────────────────────────────────────────────────────────
    if planned.get("type") == "search":
        query = planned.get("query", prompt)
        try:
            reply = await asyncio.to_thread(search_web, query)
        except Exception as e:
            logger.error(f"Web search failed: {e}")
            reply = "I tried to search the web but hit an error. Please try again."
        yield _sse({"type": "reply", "text": reply, "id": artifact_id, "pending": False})
        if user_id:
            db = SessionLocal()
            try:
                db.add(Artifact(id=artifact_id, user_id=user_id, session_id=session_id,
                                prompt=prompt, reply=reply, embedding=embedding))
                db.commit()
            except Exception as e:
                logger.error(f"Persist search failed: {e}"); db.rollback()
            finally:
                db.close()
        yield _sse({"type": "done"})
        return

    # ── 6b. Yield reply immediately ───────────────────────────────────────────
    needs_artifact  = planned.get("type") in ("template", "build", "edit") or planned.get("requires_ui")
    is_think_chat   = use_thinking and not needs_artifact and planned.get("type") == "chat"
    thinking_budget = 8000 if (use_thinking and needs_artifact) else 0

    yield _sse({
        "type": "reply", "text": "" if is_think_chat else reply, "id": artifact_id,
        "pending": bool(needs_artifact) or is_think_chat,
        "model": "think" if use_thinking else "swift",
    })

    # ── 6c. Think-mode chat — run thinking-enabled response ──────────────────
    final_reply   = reply
    think_reply   = None
    think_thought = None
    if is_think_chat:
        try:
            think_reply, think_thought = await asyncio.to_thread(
                chat_respond, prompt, history, 8000
            )
        except Exception as e:
            logger.error(f"Think chat failed: {e}")

    # ── 7. Execute plan (artifact builds) ─────────────────────────────────────
    code     = None
    ui_spec  = None
    thinking = None
    if needs_artifact:
        try:
            code, ui_spec, thinking = await asyncio.to_thread(
                execute_plan, planned, current_artifact, thinking_budget
            )
        except Exception as e:
            logger.error(f"Plan execution failed: {e}")

    # ── Stream thinking (artifact build thinking OR think-chat thinking) ──────
    emit_thinking = thinking if needs_artifact else think_thought
    if emit_thinking:
        yield _sse({"type": "thinking", "text": emit_thinking, "id": artifact_id})

    # ── Stream artifact ───────────────────────────────────────────────────────
    if code:
        yield _sse({"type": "artifact", "code": code, "id": artifact_id})

    # ── Stream updated chat reply for think-chat ──────────────────────────────
    if is_think_chat:
        fallback = think_reply or reply
        final_reply = fallback
        yield _sse({"type": "reply_text", "text": fallback, "id": artifact_id})

    # ── 8. Persist ────────────────────────────────────────────────────────────
    if user_id:
        db = SessionLocal()
        try:
            db.add(Artifact(id=artifact_id, user_id=user_id, session_id=session_id,
                            prompt=prompt, reply=final_reply, ui_spec=ui_spec, code=code, embedding=embedding))
            db.commit()
            logger.info(f"Persisted artifact {artifact_id}")
        except Exception as e:
            logger.error(f"Persist failed: {e}"); db.rollback()
        finally:
            db.close()

    yield _sse({"type": "done"})


@app.post("/api/generate")
async def generate_artifact(
    request: GenerateRequest,
    user: dict | None = Depends(get_optional_user),
):
    user_id = (user.get("email") or user.get("sub")) if user else None
    return StreamingResponse(
        _generate_stream(
            prompt=request.prompt,
            session_id=request.session_id,
            history=request.history,
            user_context=request.user_context,
            current_artifact=request.current_artifact,
            user_id=user_id,
            use_thinking=request.model == "think",
        ),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/api/generate-with-file")
async def generate_with_file(
    prompt: str = Form(...),
    session_id: Optional[str] = Form(None),
    history: str = Form("[]"),
    user_context: str = Form("{}"),
    current_artifact: Optional[str] = Form(None),
    model: str = Form("swift"),
    file: UploadFile = File(...),
    user: dict | None = Depends(get_optional_user),
):
    user_id = (user.get("email") or user.get("sub")) if user else None
    file_bytes = await file.read()
    mime_type  = file.content_type or "application/octet-stream"
    filename   = file.filename or "attachment"

    try:
        file_analysis = await asyncio.to_thread(analyze_file, file_bytes, mime_type, filename, prompt)
    except Exception as e:
        logger.error(f"File analysis failed: {e}")
        file_analysis = {"type": "unknown", "filename": filename,
                         "description": "Could not analyze file", "text": "", "colors": []}

    history_list = json.loads(history) if history else []
    user_ctx     = json.loads(user_context) if user_context and user_context != "{}" else None

    return StreamingResponse(
        _generate_stream(
            prompt=prompt,
            session_id=session_id,
            history=history_list,
            user_context=user_ctx,
            current_artifact=current_artifact,
            user_id=user_id,
            file_analysis=file_analysis,
            use_thinking=model == "think",
        ),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ─── Artifacts ───────────────────────────────────────────────────────────────

@app.get("/api/artifacts")
def get_artifacts(
    db: Session = Depends(get_db),
    user: dict | None = Depends(get_optional_user),
    limit: int = Query(100, le=200),
    offset: int = Query(0, ge=0),
):
    """Returns all artifacts (with generated code) for the current user."""
    if not user:
        return {"artifacts": [], "total": 0}
    user_id = user.get("email") or user.get("sub")
    items = (
        db.query(Artifact)
        .filter(Artifact.user_id == user_id, Artifact.code.isnot(None))
        .order_by(Artifact.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    total = (
        db.query(Artifact)
        .filter(Artifact.user_id == user_id, Artifact.code.isnot(None))
        .count()
    )
    return {
        "artifacts": [
            {
                "id":         a.id,
                "prompt":     a.prompt,
                "reply":      a.reply,
                "session_id": a.session_id,
                "ui_spec":    a.ui_spec,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in items
        ],
        "total": total,
    }


@app.delete("/api/artifacts/{artifact_id}")
def delete_artifact(
    artifact_id: str,
    db: Session = Depends(get_db),
    user: dict | None = Depends(get_optional_user),
):
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_id = user.get("email") or user.get("sub")
    deleted = (
        db.query(Artifact)
        .filter(Artifact.id == artifact_id, Artifact.user_id == user_id)
        .delete()
    )
    db.commit()
    return {"deleted": deleted}


# ─── Sessions ────────────────────────────────────────────────────────────────

@app.get("/api/sessions")
def get_sessions(
    db: Session = Depends(get_db),
    user: dict | None = Depends(get_optional_user),
):
    if not user:
        return []
    user_id = user.get("email") or user.get("sub")
    query = text("""
        SELECT session_id,
               MAX(created_at) as last_activity,
               MAX(session_title) as custom_title,
               (ARRAY_AGG(prompt ORDER BY created_at ASC))[1] as title
        FROM artifacts
        WHERE session_id IS NOT NULL AND user_id = :uid
        GROUP BY session_id
        ORDER BY last_activity DESC
        LIMIT 30
    """)
    rows = db.execute(query, {"uid": user_id}).fetchall()
    return [{"id": r[0], "title": r[2] or r[3]} for r in rows]


@app.delete("/api/sessions/{session_id}")
def delete_session(
    session_id: str,
    db: Session = Depends(get_db),
    user: dict | None = Depends(get_optional_user),
):
    if not user:
        return {"deleted": 0}
    user_id = user.get("email") or user.get("sub")
    deleted = (
        db.query(Artifact)
        .filter(Artifact.session_id == session_id, Artifact.user_id == user_id)
        .delete()
    )
    db.commit()
    return {"deleted": deleted}


class RenameSessionRequest(BaseModel):
    title: str

@app.patch("/api/sessions/{session_id}")
def rename_session(
    session_id: str,
    request: RenameSessionRequest,
    db: Session = Depends(get_db),
    user: dict | None = Depends(get_optional_user),
):
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_id = user.get("email") or user.get("sub")
    db.execute(
        text("UPDATE artifacts SET session_title = :title WHERE session_id = :sid AND user_id = :uid"),
        {"title": request.title, "sid": session_id, "uid": user_id},
    )
    db.commit()
    return {"ok": True}


@app.get("/api/sessions/{session_id}")
def get_session_history(
    session_id: str,
    db: Session = Depends(get_db),
    user: dict | None = Depends(get_optional_user),
):
    if not user:
        return {"messages": [], "active_artifact": None}
    user_id = user.get("email") or user.get("sub")
    artifacts = (
        db.query(Artifact)
        .filter(Artifact.session_id == session_id, Artifact.user_id == user_id)
        .order_by(Artifact.created_at.asc())
        .all()
    )
    messages = []
    last_artifact = None
    for a in artifacts:
        messages.append({"id": f"{a.id}_user", "role": "user", "text": a.prompt})
        messages.append({"id": a.id, "role": "assistant", "text": a.reply or "Done.", "code": a.code})
        if a.code:
            last_artifact = {"code": a.code, "id": a.id}
    return {"messages": messages, "active_artifact": last_artifact}


# ─── Artifact state ───────────────────────────────────────────────────────────

class ArtifactStateRequest(BaseModel):
    state: Any

@app.put("/api/artifacts/{artifact_id}/state")
def save_artifact_state(
    artifact_id: str,
    request: ArtifactStateRequest,
    db: Session = Depends(get_db),
    user: dict | None = Depends(get_optional_user),
):
    if not user:
        return {"status": "guest"}
    artifact = db.query(Artifact).filter(Artifact.id == artifact_id).first()
    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found")
    artifact.state = json.dumps(request.state)
    db.commit()
    return {"status": "synced"}


@app.get("/api/artifacts/{artifact_id}/state")
def get_artifact_state(
    artifact_id: str,
    db: Session = Depends(get_db),
    user: dict | None = Depends(get_optional_user),
):
    if not user:
        return {"state": None}
    artifact = db.query(Artifact).filter(Artifact.id == artifact_id).first()
    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found")
    return {"state": json.loads(artifact.state) if artifact.state else None}


# ─── YouTube Search ───────────────────────────────────────────────────────────

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "")

@app.get("/api/youtube/search")
async def youtube_search(q: str = Query(..., min_length=1)):
    """
    Searches YouTube Data API v3 and returns the top video ID + title.
    Requires YOUTUBE_API_KEY env var.
    """
    if not YOUTUBE_API_KEY:
        raise HTTPException(status_code=503, detail="YOUTUBE_API_KEY not configured")

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://www.googleapis.com/youtube/v3/search",
            params={
                "part":       "snippet",
                "q":          q,
                "type":       "video",
                "maxResults": 1,
                "key":        YOUTUBE_API_KEY,
            },
            timeout=8.0,
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="YouTube API error")

    items = resp.json().get("items", [])
    if not items:
        raise HTTPException(status_code=404, detail="No results found")

    video_id = items[0]["id"]["videoId"]
    title    = items[0]["snippet"]["title"]
    return {"videoId": video_id, "title": title}


# ─── Health ───────────────────────────────────────────────────────────────────

@app.get("/")
def health_check():
    return {"status": "system liquid."}
