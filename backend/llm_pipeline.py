import os
import json
import logging
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from google import genai
from google.genai import types, errors

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

PRIMARY_MODEL  = 'gemini-2.5-flash'
FALLBACK_MODEL = 'gemini-2.0-flash'

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


# ── Local template fast-path ─────────────────────────────────────────────────
# Maps every recognisable name → canonical template_id
_TEMPLATE_NAMES: dict[str, str] = {
    # Games
    "snake": "snake", "snake game": "snake",
    "memory": "memory", "memory card": "memory", "memory game": "memory",
    "tic tac toe": "tictactoe", "tictactoe": "tictactoe", "tic-tac-toe": "tictactoe",
    "magic 8 ball": "magicball", "magic8ball": "magicball", "8 ball": "magicball", "magic ball": "magicball",
    "typing": "typing", "typing test": "typing", "typing speed": "typing", "typing speed test": "typing",
    "chess": "chess", "chess game": "chess", "play chess": "chess",
    "checkers": "checkers", "checkers game": "checkers", "draughts": "checkers", "play checkers": "checkers",
    "toss": "toss", "coin toss": "toss", "flip a coin": "toss", "coin flip": "toss", "heads or tails": "toss",
    # Productivity
    "todo": "todo", "to do": "todo", "to-do": "todo", "todo list": "todo", "to do list": "todo",
    "kanban": "kanban", "kanban board": "kanban",
    "habit": "habit", "habit tracker": "habit",
    "pomodoro": "pomodoro", "pomodoro timer": "pomodoro",
    "timer": "timer", "countdown": "timer", "countdown timer": "timer",
    "calendar": "calendar",
    "notes": "notes", "note": "notes", "notepad": "notes", "rich notes": "notes",
    "diary": "diary", "daily diary": "diary", "journal": "diary", "my diary": "diary",
    # Finance
    "budget": "budget", "budget tracker": "budget",
    "bill splitter": "billsplit", "bill split": "billsplit", "split bill": "billsplit",
    "calculator": "calculator", "calc": "calculator",
    # Creative
    "drawing": "draw", "drawing canvas": "draw", "draw": "draw",
    "pixel art": "pixel", "pixel": "pixel", "pixel art editor": "pixel",
    "gradient": "gradient", "gradient generator": "gradient",
    "color palette": "color", "colour palette": "color",
    "matrix": "matrix", "matrix rain": "matrix",
    # Tools
    "weather": "weather",
    "music": "youtube", "music player": "youtube", "youtube": "youtube", "youtube player": "youtube",
    "chart": "chart", "chart builder": "chart",
    "flashcard": "flashcard", "flashcards": "flashcard",
    "quiz": "quiz",
    "spin wheel": "spinwheel", "spin the wheel": "spinwheel", "spinwheel": "spinwheel", "wheel": "spinwheel",
    "password": "password", "password generator": "password",
    "qr code": "qrcode", "qr": "qrcode", "qrcode": "qrcode",
    "clock": "clock",
    "converter": "converter", "unit converter": "converter",
}

# Phrases that signal "user wants to open/use a specific tool"
_OPEN_TRIGGERS = (
    "open ", "launch ", "start ", "play ", "load ",
    "show me ", "give me ", "get me ", "bring up ",
    "i want to play ", "i want to use ", "i want a ", "i want the ",
    "let's play ", "lets play ",
)

def local_template_match(prompt: str) -> dict | None:
    """
    Returns a brain-compatible plan dict if the prompt clearly targets a template,
    or None if the brain should decide.
    Only fires on explicit open/launch/play signals to avoid false positives.
    """
    p = prompt.strip().lower().rstrip("!?.").strip()

    # 1. Whole message IS just a template name (e.g. "snake", "calculator")
    if p in _TEMPLATE_NAMES:
        tid = _TEMPLATE_NAMES[p]
        return {"type": "template", "template_id": tid, "data": {}, "reply": _open_reply(tid)}

    # 2. Message starts with an explicit trigger phrase
    _TRIVIAL_SUFFIXES = ("", " please", " for me", " now", " again", " up")
    for trigger in _OPEN_TRIGGERS:
        if p.startswith(trigger):
            remainder = p[len(trigger):].rstrip("!?.").strip()
            # Remove leading "the" or "a" article
            for article in ("the ", "a "):
                if remainder.startswith(article):
                    remainder = remainder[len(article):]
                    break
            # try exact match first
            tid = _TEMPLATE_NAMES.get(remainder)
            if not tid:
                for name, template_id in _TEMPLATE_NAMES.items():
                    if remainder.startswith(name):
                        extra = remainder[len(name):].strip()
                        # Only match if nothing meaningful follows the name
                        if extra in _TRIVIAL_SUFFIXES:
                            tid = template_id
                            break
                    elif name.startswith(remainder) and len(remainder) >= 3:
                        tid = template_id
                        break
            if tid:
                return {"type": "template", "template_id": tid, "data": {}, "reply": _open_reply(tid)}

    return None


def _open_reply(template_id: str) -> str:
    friendly = {
        "snake": "Here's Snake — use arrow keys to move!",
        "memory": "Memory card game loaded — flip to match!",
        "tictactoe": "Tic-Tac-Toe ready — X goes first!",
        "magicball": "The Magic 8-Ball is ready for your question!",
        "typing": "Typing Speed Test ready — start when you are!",
        "todo": "Your Todo List is ready!",
        "kanban": "Kanban board loaded!",
        "habit": "Habit Tracker ready — start building streaks!",
        "pomodoro": "Pomodoro Timer ready — stay focused!",
        "timer": "Timer ready!",
        "calendar": "Calendar loaded!",
        "notes": "Notes opened — start writing!",
        "budget": "Budget Tracker ready!",
        "billsplit": "Bill Splitter ready — add your expenses!",
        "calculator": "Calculator ready!",
        "draw": "Drawing Canvas open — create something!",
        "pixel": "Pixel Art Editor ready!",
        "gradient": "Gradient Generator loaded!",
        "color": "Color Palette ready!",
        "matrix": "Matrix Rain initiated...",
        "weather": "Opening weather widget!",
        "youtube": "Music Player ready!",
        "chart": "Chart Builder loaded!",
        "flashcard": "Flashcards ready!",
        "quiz": "Quiz loaded — good luck!",
        "spinwheel": "Spin the Wheel ready!",
        "password": "Password Generator ready!",
        "qrcode": "QR Code Generator loaded!",
        "diary": "Your diary is open — write freely.",
        "clock": "Clock loaded!",
        "converter": "Unit Converter ready!",
    }
    return friendly.get(template_id, f"Opening {template_id}!")


def embed_text(text: str) -> list[float]:
    response = client.models.embed_content(
        model='gemini-embedding-001',
        contents=text,
        config=types.EmbedContentConfig(output_dimensionality=768)
    )
    return response.embeddings[0].values


def brain_plan_ui(
    prompt: str,
    history: list[dict] = [],
    user_context: dict = None,
    has_active_artifact: bool = False,
) -> str:
    """
    The Brain: classifies the request and plans the response.
    Always returns valid JSON.
    """

    # Build user context block
    user_ctx_block = ""
    if user_context:
        parts = []
        if user_context.get("name"):     parts.append(f"Name: {user_context['name']}")
        if user_context.get("role"):     parts.append(f"Occupation: {user_context['role']}")
        if user_context.get("about"):    parts.append(f"About: {user_context['about']}")
        if user_context.get("location"): parts.append(f"Location: {user_context['location']}")
        if user_context.get("tone"):     parts.append(f"Tone: {user_context['tone']}")
        if parts:
            user_ctx_block = "USER PROFILE:\n" + "\n".join(parts) + "\n\n"

    system_instruction = f"""{user_ctx_block}You are Morph OS — a smart AI assistant that can both CONVERSE naturally and generate interactive UI artifacts (apps, tools, games).

You must return ONE of four JSON types. Choose based on what the user actually needs.

════════════════════════════════════════
TYPE DECISION RULES
════════════════════════════════════════

"chat" — Use this by default. A written reply is the answer.
  • Greetings, small talk, questions about yourself
  • Factual questions: history, science, people, definitions
  • Math / calculations — just answer the number, don't open a calculator
  • Unit / currency conversions — just answer, don't open a converter
  • Coding help, debugging, explaining code — reply with text/code blocks
  • Creative writing: poems, stories, essays, jokes, lyrics
  • Advice, opinions, summaries, recommendations
  • Capability questions: "what can you do?", "do you have games?" — list your abilities
  • Follow-up questions and conversation

"template" — Use ONLY when user explicitly wants to OPEN or USE a specific built-in tool/game.
  Clear signals: "open X", "launch X", "I want to play X", "show me a X tool", "give me a X"
  NEVER use template just because a keyword appears — intent must be clear.

"build" — Use for a truly custom interactive app, OR when the user requests a known template WITH specific customization (color, theme, style, layout, etc.).
  Clear signals: "build me a...", "create a custom...", "make an app that...", "open X in green", "open X but with Y theme"
  If customized: set style/goal to reflect the customization. NEVER load a plain template then claim you'll handle the customization later.

"search" — Use when the user needs LIVE or CURRENT information that changes frequently.
  Signals: "trending", "latest", "today", "right now", "current", "news", "scores", "price"
  Examples: trending songs/movies/memes, breaking news, live sports scores, crypto/stock prices,
  today's releases, weather as a question (not "show me weather widget").
  Provide a clean search query that will return useful results.

"edit" — Use ONLY when an active artifact is on screen AND user wants to modify it.
  Signals: "make it...", "add X to it", "change the color", "update it", "fix the..."
  Pronouns referring to the current UI: "it", "this", "the app", "the widget"

GOLDEN RULE: If a sentence can answer it — use "chat". Never spawn a UI where words will do.

REPLY ACCURACY RULE: The "reply" field must describe what you ARE doing right now, not what you're not doing or plan to do later. If you're building a green calculator, say "Here's your green calculator!" — NEVER say "I'll keep your preference in mind for future updates" when you are already doing it.

════════════════════════════════════════
FEW-SHOT EXAMPLES (calibrate your judgment here)
════════════════════════════════════════

"hi" → chat: "Hey! What can I make for you today?"
"how are you?" → chat: "I'm running smooth! What do you want to build or talk about?"
"do you have games?" → chat: "Yes! I have Snake, Memory card game, Tic-Tac-Toe, and Magic 8-Ball. Just say which one you'd like to play!"
"what can you make?" → chat: list all categories with examples
"what's 20% of 350?" → chat: "That's 70."
"convert 5 miles to km" → chat: "5 miles = 8.05 km."
"who is Alan Turing?" → chat: [factual answer]
"what time is it in Tokyo?" → chat: [answer with timezone info — do NOT open the clock widget]
"explain how async/await works" → chat: [explanation with code examples]
"write me a poem about the ocean" → chat: [write the poem]
"what's the weather like?" → chat: "I can show you a live weather widget! Which city?"
"I forgot my password" → chat: [help them recover it — do NOT open password generator]
"note that I'll be late" → chat: "Got it, noted!" — do NOT open notes app
"I was drawing yesterday" → chat: [respond conversationally — do NOT open drawing canvas]
"can you calculate compound interest?" → chat: [explain or calculate — do NOT open calculator]
"how do I convert Celsius to Fahrenheit?" → chat: "The formula is (C × 9/5) + 32." — do NOT open converter
"top 5 trending songs" → search: "top 5 trending songs globally right now"
"latest news" → search: "breaking world news today"
"what's bitcoin price?" → search: "bitcoin price today USD"
"who won yesterday's match?" → search: "cricket/football match results yesterday"
"trending movies this week" → search: "trending movies this week worldwide"
"open snake" → template: snake
"I want to play snake" → template: snake
"open chess" → template: chess
"play checkers" → template: checkers
"flip a coin" → template: toss
"launch the calculator" → template: calculator
"show me a budget tracker" → template: budget
"give me a todo list" → template: todo
"make me a pomodoro timer" → template: pomodoro
"open the drawing canvas" → template: draw
"weather in Tokyo" → template: weather, data: {{"city": "Tokyo"}}
"play me some lofi music" → template: youtube, data: {{"title": "lofi hip hop chill beats"}}
"make flashcards for photosynthesis" → template: flashcard, data: {{"topic": "Photosynthesis", "cards": [...]}}
"build a habit tracker for my gym routine" → template: habit (closest match, use template not build)
"build me a custom CRM dashboard with lead scoring" → build [genuinely custom]
"make it dark mode" [active artifact] → edit
"add a reset button to it" [active artifact] → edit
"open calculator in green" → build: {"goal": "calculator with green color scheme", "features": ["standard arithmetic operations", "clear/backspace", "keyboard support"], "style": "green theme"}, reply: "Here's your green calculator!"
"open snake but red" → build: {"goal": "snake game with red color scheme", "features": ["arrow key controls", "score tracking", "level progression"], "style": "red theme"}, reply: "Here's your red Snake game!"

════════════════════════════════════════
TEMPLATE CATALOG
════════════════════════════════════════

ZERO-DATA (data: {{}}):
todo, snake, calculator, timer, clock, color, habit, budget, kanban,
password, qrcode, draw, converter, memory, tictactoe, typing,
calendar, billsplit, gradient, pixel, matrix, magicball,
chess, checkers, toss

PARAMETRIC (provide rich data, no placeholders):
- youtube:    {{ "title": "best YouTube search query" }}
- weather:    {{ "city": "city name" }}
- notes:      {{ "title": "note title or empty string", "content": "pre-filled text — use extracted file text if a file was attached, otherwise empty string" }}
- diary:      {{ "content": "pre-filled entry text — use extracted file text if a file was attached, otherwise empty string" }}
- flashcard:  {{ "topic": "string", "cards": [{{"front": "Q", "back": "A"}}, ...8-12 cards] }}
- quiz:       {{ "topic": "string", "questions": [{{"question":"...","options":["A","B","C","D"],"correct":0}}, ...5-10] }}
- chart:      {{ "type": "bar|line|pie", "title": "string", "labels": [...], "values": [...], "color": "blue|purple|green|orange|pink" }}
- spinwheel:  {{ "options": ["option1", "option2", ...up to 12] }}

════════════════════════════════════════
FILE CONTEXT RULES (when [ATTACHED FILE] block appears)
════════════════════════════════════════

When an [ATTACHED FILE] block is present, the extracted text is available under "Content:".
Route based on the user's intent AND the file type:

→ "add to diary" / "write this in diary" / "put this in diary"
    → template: diary, data.content = extracted text from the file
→ "add to notes" / "write this in notes" / "open notes with this"
    → template: notes, data.title = "...", data.content = extracted text
→ "what does this say?" / "read this" / "summarize this"
    → chat: answer using the extracted text as context
→ "make this pixel art" / "pixelate this image"
    → template: pixel, data: {{}}
→ "what are the brand colors?" / "extract colors"
    → chat: list the detected colors from the file analysis block
→ Otherwise: answer conversationally using the file content as context

════════════════════════════════════════
OUTPUT FORMAT — always valid JSON, one of:
════════════════════════════════════════

{{ "type": "chat", "reply": "Your full conversational response" }}

{{ "type": "search", "query": "optimized search query string", "reply": "Searching the web for you..." }}

{{ "type": "template", "template_id": "<id>", "data": {{ ... }}, "reply": "Short friendly acknowledgment" }}

{{ "type": "build", "ui_spec": {{ "goal": "...", "features": [...], "style": "dark glassmorphism" }}, "reply": "Short text" }}

{{ "type": "edit", "edit_instruction": "Precise description of what to change", "reply": "Short acknowledgment" }}
"""

    history_context = ""
    if history:
        history_context = "CONVERSATION HISTORY:\n" + "\n".join(
            [f"{m['role'].capitalize()}: {m['text']}" for m in history[-12:]]
        ) + "\n\n"

    artifact_context = ""
    if has_active_artifact:
        artifact_context = "ACTIVE ARTIFACT: There is a live interactive artifact on the user's canvas right now. If the user refers to it with 'it', 'this', 'the app', or asks to change/fix/update it — use type 'edit'.\n\n"

    full_prompt = history_context + artifact_context + f"USER: {prompt}"

    @retry(
        retry=retry_if_exception_type(errors.ServerError),
        stop=stop_after_attempt(2),
        wait=wait_exponential(multiplier=1, min=1, max=4),
    )
    def _call(model_name):
        logger.info(f"Brain thinking with {model_name}...")
        return client.models.generate_content(
            model=model_name,
            contents=full_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.2,
                response_mime_type="application/json",
            ),
        )

    try:
        response = _call(PRIMARY_MODEL)
    except Exception as e:
        logger.warning(f"Primary brain failed, falling back: {e}")
        response = _call(FALLBACK_MODEL)

    return response.text


def execute_plan(
    planned: dict,
    current_artifact: str | None = None,
    thinking_budget: int = 0,
) -> tuple[str | None, str | None, str | None]:
    """
    Executes a brain plan and returns (code, ui_spec_json, thinking_text).
    Runs entirely outside the async loop — safe to call via asyncio.to_thread.
    """
    from vault_manager import get_hydrated_template

    plan_type = planned.get("type")

    # ── Edit existing artifact ───────────────────────────────────────────────
    if plan_type == "edit" and current_artifact:
        instruction = planned.get("edit_instruction", "")
        logger.info(f"EDIT MODE: {instruction[:80]}...")
        try:
            code, thinking = builder_edit_react(current_artifact, instruction, thinking_budget)
            return code, None, thinking or None
        except Exception as e:
            logger.error(f"Edit failed: {e} — falling back to fresh build")
            plan_type = "build"
            planned.setdefault("ui_spec", {"goal": instruction, "features": [], "style": "dark glassmorphism"})

    # ── Vault template ───────────────────────────────────────────────────────
    if plan_type == "template":
        template_id = planned.get("template_id")
        data = planned.get("data", {})
        logger.info(f"VAULT: hydrating {template_id}...")
        try:
            code = get_hydrated_template(template_id, data)
            return code, json.dumps(planned), None
        except Exception as e:
            logger.error(f"Vault hydration failed: {e} — falling back to builder")
            plan_type = "build"
            planned.setdefault("ui_spec", {"goal": f"Create a {template_id} app", "features": [], "style": "dark glassmorphism"})

    # ── Custom build ─────────────────────────────────────────────────────────
    if plan_type == "build" or planned.get("requires_ui"):
        ui_spec = planned.get("ui_spec")
        if ui_spec:
            logger.info(f"BUILDER: generating React component...")
            code, thinking = builder_generate_react(json.dumps(ui_spec), thinking_budget)
            return code, json.dumps(ui_spec), thinking or None

    # ── Chat / no artifact ───────────────────────────────────────────────────
    return None, None, None


def search_web(query: str) -> str:
    """Uses Gemini with Google Search grounding to answer real-time queries."""
    @retry(
        retry=retry_if_exception_type(errors.ServerError),
        stop=stop_after_attempt(2),
        wait=wait_exponential(multiplier=1, min=1, max=4),
    )
    def _search(model_name):
        logger.info(f"Web search: '{query[:60]}...' via {model_name}")
        return client.models.generate_content(
            model=model_name,
            contents=query,
            config=types.GenerateContentConfig(
                tools=[types.Tool(google_search=types.GoogleSearch())],
                temperature=0.2,
            ),
        )

    try:
        response = _search(PRIMARY_MODEL)
    except Exception as e:
        logger.warning(f"Primary search failed, falling back: {e}")
        response = _search(FALLBACK_MODEL)

    return response.text


def builder_generate_react(ui_spec: str, thinking_budget: int = 0) -> tuple[str, str]:
    """Generates a standalone React component. Returns (code, thinking_text)."""
    system_instruction = """You are a Full-Stack Creative Engineer (THE BUILDER).
Generate a SINGLE, standalone React Component (default export) using Tailwind CSS.

MEDIA INSTRUCTION: If building a YouTube or Music player:
- Always use the YouTube Embed iframe: `https://www.youtube.com/embed/[ID]`.
- Style it with premium Glassmorphism, blurred overlays, and Lucide-React icons.

DO NOT wrap in markdown code blocks. Just the raw JS/TS code.
Include all necessary React imports."""

    cfg_kwargs = dict(
        system_instruction=system_instruction,
        temperature=0.4,
    )
    if thinking_budget > 0:
        cfg_kwargs["thinking_config"] = types.ThinkingConfig(thinking_budget=thinking_budget)

    @retry(
        retry=retry_if_exception_type(errors.ServerError),
        stop=stop_after_attempt(2),
        wait=wait_exponential(multiplier=1, min=1, max=4),
    )
    def _build(model_name):
        logger.info(f"Builder generating with {model_name} (thinking={thinking_budget})...")
        return client.models.generate_content(
            model=model_name,
            contents=f"UI Spec:\n{ui_spec}",
            config=types.GenerateContentConfig(**cfg_kwargs),
        )

    try:
        response = _build(PRIMARY_MODEL)
    except Exception as e:
        logger.warning(f"Primary builder failed, falling back: {e}")
        response = _build(FALLBACK_MODEL)

    thinking_text = ""
    code_text = ""
    try:
        for part in response.candidates[0].content.parts:
            if getattr(part, "thought", False):
                thinking_text += part.text
            else:
                code_text += part.text
    except Exception:
        code_text = response.text

    code = code_text.strip()
    if code.startswith("```") and code.endswith("```"):
        lines = code.split("\n")
        code = "\n".join(lines[1:-1])
    return code, thinking_text


def analyze_file(file_bytes: bytes, mime_type: str, filename: str, user_prompt: str) -> dict:
    """Analyzes an uploaded file using Gemini vision (images) or text extraction (PDFs/text)."""
    import base64, io

    fname_lower = filename.lower()

    # ── PDF ──────────────────────────────────────────────────────────────────
    if mime_type == "application/pdf" or fname_lower.endswith(".pdf"):
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(file_bytes))
        text = "\n\n".join(p.extract_text() or "" for p in reader.pages)
        return {
            "type": "pdf",
            "filename": filename,
            "description": f"PDF document with {len(reader.pages)} page(s)",
            "text": text[:8000],
            "colors": [],
        }

    # ── Plain text / markdown / CSV / JSON ───────────────────────────────────
    if mime_type.startswith("text/") or fname_lower.endswith((".txt", ".md", ".csv", ".json")):
        text = file_bytes.decode("utf-8", errors="replace")
        return {
            "type": "text",
            "filename": filename,
            "description": f"Text file ({filename})",
            "text": text[:8000],
            "colors": [],
        }

    # ── Image — Gemini vision (OCR + color extraction + intent) ─────────────
    if mime_type.startswith("image/"):
        encoded = base64.b64encode(file_bytes).decode()
        response = client.models.generate_content(
            model=PRIMARY_MODEL,
            contents=[
                types.Content(role="user", parts=[
                    types.Part(inline_data=types.Blob(mime_type=mime_type, data=encoded)),
                    types.Part(text=(
                        f'Analyze this image. The user said: "{user_prompt}". '
                        'Return ONLY valid JSON: '
                        '{"description":"one-sentence description",'
                        '"text":"any visible text in the image or empty string",'
                        '"colors":["#hex1","#hex2","#hex3"],'
                        '"suggested_action":"chat|notes|colors|pixel|build"}'
                    )),
                ])
            ],
            config=types.GenerateContentConfig(
                temperature=0.1,
                response_mime_type="application/json",
            ),
        )
        result = json.loads(response.text)
        result.update({"type": "image", "filename": filename})
        return result

    # ── Unknown ───────────────────────────────────────────────────────────────
    return {
        "type": "unknown",
        "filename": filename,
        "description": "Unsupported file type",
        "text": "",
        "colors": [],
    }


def builder_edit_react(current_code: str, instruction: str, thinking_budget: int = 0) -> tuple[str, str]:
    """Modifies an existing React component. Returns (code, thinking_text)."""
    system_instruction = """You are a Full-Stack Creative Engineer (THE BUILDER) in EDIT MODE.
You will receive an existing React component and an edit instruction.

YOUR TASK:
- Modify the existing component exactly as instructed.
- Preserve all existing functionality, state, style, and structure not mentioned in the instruction.
- Keep the same dark glassmorphism / Tailwind CSS aesthetic.
- Return the COMPLETE modified component (not a diff, not partial code).

DO NOT wrap in markdown code blocks. Just the raw JS/TS code.
Include all necessary React imports."""

    edit_prompt = f"""EXISTING COMPONENT:
{current_code}

EDIT INSTRUCTION:
{instruction}

Return the complete modified component."""

    cfg_kwargs = dict(
        system_instruction=system_instruction,
        temperature=0.3,
    )
    if thinking_budget > 0:
        cfg_kwargs["thinking_config"] = types.ThinkingConfig(thinking_budget=thinking_budget)

    @retry(
        retry=retry_if_exception_type(errors.ServerError),
        stop=stop_after_attempt(2),
        wait=wait_exponential(multiplier=1, min=1, max=4),
    )
    def _edit(model_name):
        logger.info(f"Editor running with {model_name} (thinking={thinking_budget})...")
        return client.models.generate_content(
            model=model_name,
            contents=edit_prompt,
            config=types.GenerateContentConfig(**cfg_kwargs),
        )

    try:
        response = _edit(PRIMARY_MODEL)
    except Exception as e:
        logger.warning(f"Primary editor failed, falling back: {e}")
        response = _edit(FALLBACK_MODEL)

    thinking_text = ""
    code_text = ""
    try:
        for part in response.candidates[0].content.parts:
            if getattr(part, "thought", False):
                thinking_text += part.text
            else:
                code_text += part.text
    except Exception:
        code_text = response.text

    code = code_text.strip()
    if code.startswith("```") and code.endswith("```"):
        lines = code.split("\n")
        code = "\n".join(lines[1:-1])
    return code, thinking_text
