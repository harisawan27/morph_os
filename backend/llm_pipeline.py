import os
import json
import logging
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from google import genai
from google.genai import types, errors

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Model Configuration
PRIMARY_MODEL = 'gemini-2.5-flash'
FALLBACK_MODEL = 'gemini-2.0-flash' # Fallback when 2.5-flash is overloaded

# Initialize client. Assumes GEMINI_API_KEY is in environment.
client = genai.Client()

def embed_text(text: str) -> list[float]:
    """Vectorizes the input prompt using Google's embedding model."""
    # Standard embedding model
    response = client.models.embed_content(
        model='gemini-embedding-001',
        contents=text,
        config=types.EmbedContentConfig(output_dimensionality=768)
    )
    return response.embeddings[0].values

def brain_plan_ui(prompt: str, history: list[dict] = [], user_context: dict = None, has_active_artifact: bool = False) -> str:
    """
    The Brain: Acts as the high-reasoning Planner.
    Accepts optional user_context dict for personalization.
    """

    # Build user context block if provided
    user_ctx_block = ""
    if user_context:
        parts = []
        if user_context.get("name"):     parts.append(f"Name: {user_context['name']}")
        if user_context.get("role"):     parts.append(f"Occupation: {user_context['role']}")
        if user_context.get("about"):    parts.append(f"About them: {user_context['about']}")
        if user_context.get("location"): parts.append(f"Location: {user_context['location']}")
        if user_context.get("tone"):     parts.append(f"Preferred tone: {user_context['tone']}")
        if parts:
            user_ctx_block = "USER PROFILE — use this to personalize every response:\n" + "\n".join(parts) + "\n\n"

    system_instruction = f"""
    {user_ctx_block}You are THE BRAIN of Morph OS — an intelligent assistant that can both CONVERSE naturally and GENERATE interactive UI artifacts.

    ════════════════════════════════════════════════════════
    STEP 1 — DECIDE: Is this a CHAT request or an ARTIFACT request?
    ════════════════════════════════════════════════════════

    USE "chat" (no UI) for:
    • Conversation, greetings, questions about yourself or the world
    • Creative writing: poems, stories, essays, lyrics, jokes, scripts
    • Explanations, definitions, summaries, opinions, advice
    • Simple calculations or facts ("what's 15% of 200?", "who is Einstein?")
    • Follow-up questions or clarifications in a conversation
    • Anything where a written reply is the natural response

    USE "template" for:
    • Explicit requests to open/launch/create a tool, app, game, or widget
    • Keywords that clearly match a vault template below

    USE "build" ONLY for:
    • Requests for a truly custom interactive app that no template covers
    • NEVER use build for something a chat reply handles perfectly

    USE "edit" ONLY when an ACTIVE ARTIFACT is visible AND the user wants to modify it:
    • Signals: "make it", "add X to it", "change the", "update it", "remove", "fix the", "can you also"
    • Pronouns referring to existing UI: "it", "this", "the app", "the widget"
    • Style changes: "dark mode", "make it red", "bigger font"
    • Feature additions to existing UI: "add a delete button", "add a search bar"
    {{ "type": "edit", "edit_instruction": "Precise description of what to change", "reply": "Short acknowledgment" }}

    GOLDEN RULE: When in doubt — CHAT. A great written reply beats a mismatched artifact every time.

    ════════════════════════════════════════════════════════
    STEP 2 — IF ARTIFACT: Choose from the Vault first
    ════════════════════════════════════════════════════════

    ZERO-DATA TEMPLATES (data: {{}}):
    - "todo"       : Task list, checklist, to-do, grocery list.
    - "snake"      : Snake game, arcade game, retro game.
    - "calculator" : Calculator, math tool, arithmetic UI.
    - "timer"      : Timer, stopwatch, countdown.
    - "clock"      : Clock, world clock, timezone display.
    - "color"      : Color palette, color picker, hex colors.
    - "habit"      : Habit tracker, daily habits, streak tracker.
    - "budget"     : Budget tracker, expense tracker, finance tracker.
    - "kanban"     : Kanban board, task board, trello-like.
    - "password"   : Password generator, secure password.
    - "qrcode"     : QR code generator, QR maker.
    - "draw"       : Drawing canvas, paint, sketch, whiteboard.
    - "converter"  : Unit converter, length/weight/temperature/speed.
    - "memory"     : Memory card game, matching pairs, flip cards.
    - "tictactoe"  : Tic tac toe, noughts and crosses, XO game.
    - "typing"     : Typing speed test, WPM test, typing practice.
    - "calendar"   : Calendar, monthly planner, event tracker.
    - "billsplit"  : Bill splitter, split dinner, expense split, tip calculator.
    - "pomodoro"   : Pomodoro timer with task list, focus sessions, work/break cycles.
    - "gradient"   : Gradient generator, CSS gradient, color gradient maker.
    - "pixel"      : Pixel art editor, pixel drawing, 8-bit art.
    - "matrix"     : Matrix rain, digital rain, matrix screensaver.
    - "magicball"  : Magic 8 ball, fortune teller, yes/no oracle.

    PARAMETRIC TEMPLATES (provide rich data):
    - "youtube"    : Play a song, video, or music.
       DATA: {{ "title": "best YouTube search query — artist + song name" }}
       NOTE: NEVER provide videoId. No placeholders.
    - "weather"    : Weather forecast for a city.
       DATA: {{ "city": "city name, e.g. 'Mumbai' or 'New York'" }}
    - "notes"      : Notes, notepad, text editor, journal.
       DATA: {{ "title": "note title (can be empty string)" }}
    - "flashcard"  : Flashcards, study cards, memorization.
       DATA: {{ "topic": "string", "cards": [{{"front": "question", "back": "answer"}}, ...8-12 cards] }}
    - "quiz"       : Quiz, trivia, test, multiple choice.
       DATA: {{ "topic": "string", "questions": [{{"question":"...","options":["A","B","C","D"],"correct":0}}, ...5-10] }}
    - "chart"      : Chart, graph, data visualization.
       DATA: {{ "type": "bar|line|pie", "title": "string", "labels": [...], "values": [...], "color": "blue|purple|green|orange|pink" }}
    - "spinwheel"  : Spin the wheel, random picker, decision wheel, what to eat.
       DATA: {{ "options": ["option1", "option2", ...up to 12] }} — generate contextual options if user has a topic, else omit for defaults.

    DATA RULE: For parametric templates, generate rich realistic data. No placeholders, no dummy values.

    ════════════════════════════════════════════════════════
    OUTPUT — always return valid JSON, one of these four:
    ════════════════════════════════════════════════════════

    {{ "type": "chat", "requires_ui": false, "reply": "Your full conversational response here" }}

    {{ "type": "template", "template_id": "<id>", "data": {{ ... }}, "reply": "Short acknowledgment" }}

    {{ "type": "build", "requires_ui": true, "ui_spec": {{ "goal": "...", "features": [...], "style": "dark glassmorphism" }}, "reply": "Short text" }}

    {{ "type": "edit", "edit_instruction": "Precise description of what to change in the existing component", "reply": "Short acknowledgment" }}
    """

    # Build context
    history_context = ""
    if history:
        history_context = "### CONVERSATION HISTORY ###\n" + "\n".join([f"{msg['role'].capitalize()}: {msg['text']}" for msg in history]) + "\n\n"

    artifact_context = ""
    if has_active_artifact:
        artifact_context = "### ACTIVE ARTIFACT ###\nThere is currently a live interactive artifact rendered in the user's canvas. If the user's message seems to refer to it (using 'it', 'this', 'the app', etc.) or asks to modify/improve/fix it, use type 'edit'.\n\n"

    full_prompt = history_context + artifact_context + f"### USER MESSAGE ###\n{prompt}"
    
    @retry(
        retry=retry_if_exception_type(errors.ServerError),
        stop=stop_after_attempt(2),
        wait=wait_exponential(multiplier=1, min=1, max=4)
    )
    def _generate_with_fallback(model_name):
        logger.info(f"Generating brain plan with {model_name}...")
        return client.models.generate_content(
            model=model_name,
            contents=full_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.2,
                response_mime_type="application/json"
            )
        )

    try:
        response = _generate_with_fallback(PRIMARY_MODEL)
    except Exception as e:
        logger.warning(f"Primary model failed (busy), falling back: {e}")
        response = _generate_with_fallback(FALLBACK_MODEL)
        
    return response.text

def builder_generate_react(ui_spec: str) -> str:
    """
    The Builder: Consumes the JSON Spec to generate high-fidelity React code.
    Includes fallback resilience for high-demand spikes.
    """
    system_instruction = """
    You are a Full-Stack Creative Engineer (THE BUILDER).
    Generate a SINGLE, standalone React Component (default export) using Tailwind CSS.

    MEDIA INSTRUCTION: If building a YouTube or Music player:
    - Always use the YouTube Embed iframe: `https://www.youtube.com/embed/[ID]`.
    - If the ID is not explicitly provided in the spec, use a search-based placeholder or a generic YouTube player UI.
    - Style it with premium Glassmorphism, blurred overlays, and Lucide-React icons.

    DO NOT wrap in markdown code blocks. Just the raw JS/TS code.
    Include all necessary React imports.
    """
    
    @retry(
        retry=retry_if_exception_type(errors.ServerError),
        stop=stop_after_attempt(2),
        wait=wait_exponential(multiplier=1, min=1, max=4)
    )
    def _build_with_fallback(model_name):
        logger.info(f"Generating React code with {model_name}...")
        return client.models.generate_content(
            model=model_name,
            contents=f"Here is the UI Spec:\n{ui_spec}",
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.4
            )
        )

    try:
        response = _build_with_fallback(PRIMARY_MODEL)
    except Exception as e:
        logger.warning(f"Primary builder failed, falling back: {e}")
        response = _build_with_fallback(FALLBACK_MODEL)
    
    code = response.text.strip()
    if code.startswith("```") and code.endswith("```"):
        # Strip markdown syntax if it accidentally includes it
        lines = code.split("\\n")
        code = "\\n".join(lines[1:-1])
        
    return code

def builder_edit_react(current_code: str, instruction: str) -> str:
    """
    The Builder in EDIT mode: Takes existing React component + edit instruction,
    returns a modified version of the component.
    """
    system_instruction = """
    You are a Full-Stack Creative Engineer (THE BUILDER) in EDIT MODE.
    You will receive an existing React component and an edit instruction.

    YOUR TASK:
    - Modify the existing component exactly as instructed.
    - Preserve all existing functionality, state, style, and structure that is NOT mentioned in the instruction.
    - Keep the same dark glassmorphism / Tailwind CSS aesthetic.
    - Return the COMPLETE modified component (not a diff, not partial code).

    DO NOT wrap in markdown code blocks. Just the raw JS/TS code.
    Include all necessary React imports.
    """

    edit_prompt = f"""EXISTING COMPONENT:
{current_code}

EDIT INSTRUCTION:
{instruction}

Return the complete modified component."""

    @retry(
        retry=retry_if_exception_type(errors.ServerError),
        stop=stop_after_attempt(2),
        wait=wait_exponential(multiplier=1, min=1, max=4)
    )
    def _edit_with_fallback(model_name):
        logger.info(f"Editing React component with {model_name}...")
        return client.models.generate_content(
            model=model_name,
            contents=edit_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.3
            )
        )

    try:
        response = _edit_with_fallback(PRIMARY_MODEL)
    except Exception as e:
        logger.warning(f"Primary edit failed, falling back: {e}")
        response = _edit_with_fallback(FALLBACK_MODEL)

    code = response.text.strip()
    if code.startswith("```") and code.endswith("```"):
        lines = code.split("\n")
        code = "\n".join(lines[1:-1])

    return code


def local_intent_router(prompt: str):
    """
    Zero-Token Routing: Checks for common commands via keyword/regex matching.
    Returns (template_id, data, reply) if matched, else None.
    Weather intentionally excluded — needs the Brain to extract the city name from the prompt.
    """
    import re
    p = prompt.lower().strip()

    # Snake / Arcade
    if any(x in p for x in ["snake", "play snake", "arcade", "play game", "retro game"]):
        return "snake", {}, "Initializing the Arcade Engine..."

    # Memory game
    if any(x in p for x in ["memory game", "memory card", "matching game", "flip card", "card matching"]):
        return "memory", {}, "Shuffling the cards..."

    # Tic Tac Toe
    if any(x in p for x in ["tic tac toe", "tictactoe", "tic-tac-toe", "noughts and crosses", "xo game", "play xo"]):
        return "tictactoe", {}, "Setting up the board..."

    # Typing speed test
    if any(x in p for x in ["typing test", "typing speed", "wpm test", "type speed", "typeracer", "words per minute"]):
        return "typing", {}, "Loading the typing test..."

    # Calculator
    if any(x in p for x in ["calculator", "calc", "calculate", "math tool", "arithmetic"]):
        return "calculator", {}, "Spinning up the Morph Calculator..."

    # Pomodoro (specific — must come before generic timer)
    if any(x in p for x in ["pomodoro", "pomodoro timer", "focus session", "25 minute", "work break"]):
        return "pomodoro", {}, "Starting your focus session..."

    # Timer / Stopwatch
    if any(x in p for x in ["timer", "stopwatch", "countdown", "focus timer"]):
        return "timer", {}, "Mounting the Morph Timer..."

    # Clock
    if re.search(r"\b(?:clock|world clock|timezone|what time|current time)\b", p):
        return "clock", {}, "Rendering the Morph Clock..."

    # Notes / Notepad
    if any(x in p for x in ["note", "notepad", "notes app", "text editor", "write note", "rich text", "journal"]):
        title_match = re.search(r"(?:note|notepad)\s+(?:for|about|titled?|called)?\s*(.*)", p)
        title = title_match.group(1).strip().title() if title_match and title_match.group(1).strip() else ""
        return "notes", {"title": title}, f"Opening Morph Notes{f' — {title}' if title else ''}..."

    # Color palette
    if any(x in p for x in ["color", "colour", "palette", "hex", "color picker", "colour palette"]):
        return "color", {}, "Launching the Color Forge..."

    # ToDo / Tasks
    if any(x in p for x in ["todo", "to-do", "to do", "task list", "tasks", "checklist", "ledger"]):
        return "todo", {}, "Mounting The Ledger..."

    # Habit tracker
    if any(x in p for x in ["habit", "habit tracker", "daily habit", "routine tracker", "streak"]):
        return "habit", {}, "Opening Habit Tracker..."

    # Budget / Finance
    if any(x in p for x in ["budget", "expense", "expenses", "income", "finance tracker", "spending", "money tracker", "budget tracker"]):
        return "budget", {}, "Opening Budget Tracker..."

    # Kanban board
    if any(x in p for x in ["kanban", "kanban board", "task board", "project board", "sprint board", "trello"]):
        return "kanban", {}, "Opening Kanban Board..."

    # Password generator
    if any(x in p for x in ["password", "password generator", "generate password", "random password", "strong password"]):
        return "password", {}, "Generating secure passwords..."

    # QR code
    if any(x in p for x in ["qr code", "qrcode", "qr generator", "generate qr", "make qr"]):
        return "qrcode", {}, "Opening QR Generator..."

    # Drawing canvas
    if any(x in p for x in ["draw", "drawing", "paint", "sketch", "whiteboard", "doodle", "canvas"]):
        return "draw", {}, "Opening Drawing Canvas..."

    # Unit converter
    if any(x in p for x in ["convert", "converter", "unit convert", "unit converter", "length convert", "weight convert", "temperature convert", "mph to", "km to", "kg to", "celsius to", "fahrenheit"]):
        return "converter", {}, "Opening Unit Converter..."

    # Calendar
    if any(x in p for x in ["calendar", "monthly calendar", "monthly planner", "event calendar", "my calendar"]):
        return "calendar", {}, "Opening Morph Calendar..."

    # Bill splitter
    if any(x in p for x in ["bill split", "split bill", "split dinner", "split the bill", "expense split", "split cost", "tip calculator", "split check"]):
        return "billsplit", {}, "Opening Bill Splitter..."

    # Gradient generator
    if any(x in p for x in ["gradient", "css gradient", "gradient generator", "color gradient", "gradient maker"]):
        return "gradient", {}, "Opening Gradient Generator..."

    # Pixel art
    if any(x in p for x in ["pixel art", "pixel editor", "pixel draw", "8-bit art", "pixelart"]):
        return "pixel", {}, "Opening Pixel Art Editor..."

    # Matrix rain
    if any(x in p for x in ["matrix rain", "digital rain", "matrix screen", "matrix effect", "falling code", "matrix screensaver"]):
        return "matrix", {}, "Initializing the Matrix..."

    # Spin the wheel
    if any(x in p for x in ["spin the wheel", "spin wheel", "wheel spinner", "random picker", "decision wheel", "spinning wheel"]):
        return "spinwheel", {}, "Spinning up the wheel..."

    # Magic 8 ball
    if any(x in p for x in ["magic 8 ball", "magic ball", "8 ball", "magic 8ball", "fortune teller", "oracle"]):
        return "magicball", {}, "Summoning the oracle..."

    return None

def generate_artifact_pipeline(
    prompt: str,
    history: list[dict] = [],
    user_context: dict = None,
    current_artifact: str | None = None,
) -> tuple[str, str | None, str | None, list[float]]:
    """
    Runs the full Brain -> (Vault | Builder | Editor) pipeline.
    Returns (reply, ui_spec, code, embedding)
    """
    from vault_manager import get_hydrated_template

    embedding = embed_text(prompt)

    # 0. Zero-Token Local Routing (FASTEST) — skip if editing existing artifact
    if not current_artifact:
        local_match = local_intent_router(prompt)
        if local_match:
            template_id, data, reply = local_match
            logger.info(f"LOCAL ROUTE MATCH: {template_id}")
            try:
                code = get_hydrated_template(template_id, data)
                planned = {"type": "template", "template_id": template_id, "data": data, "reply": reply}
                return reply, json.dumps(planned), code, embedding
            except Exception as e:
                logger.warning(f"Local hydration failed: {e}. Falling back to AI Brain.")

    # 1. Brain Plans (Normal AI logic)
    brain_out = brain_plan_ui(
        prompt, history, user_context,
        has_active_artifact=bool(current_artifact)
    )
    try:
        planned = json.loads(brain_out)
    except json.JSONDecodeError:
        planned = {"reply": brain_out, "requires_ui": False}

    reply = planned.get("reply", "Orchestrating your request...")

    # Handle Edit Type — modify the currently active artifact
    if planned.get("type") == "edit" and current_artifact:
        edit_instruction = planned.get("edit_instruction", prompt)
        logger.info(f"EDIT MODE: {edit_instruction[:80]}...")
        try:
            code = builder_edit_react(current_artifact, edit_instruction)
            return reply, None, code, embedding
        except Exception as e:
            logger.error(f"Edit failed: {e}. Falling back to fresh build.")
            planned["type"] = "build"
            planned["requires_ui"] = True
            planned["ui_spec"] = {"goal": prompt, "features": [], "style": "dark glassmorphism"}

    # Handle Template Type
    if planned.get("type") == "template":
        template_id = planned.get("template_id")
        data = planned.get("data", {})
        logger.info(f"VAULT MATCH: Hydrating {template_id}...")
        try:
            code = get_hydrated_template(template_id, data)
            return reply, json.dumps(planned), code, embedding
        except Exception as e:
            logger.error(f"Vault hydration failed: {e}. Falling back to Builder.")
            planned["type"] = "build"
            planned["requires_ui"] = True
            if "ui_spec" not in planned:
                planned["ui_spec"] = {"goal": f"Create a {template_id} application"}

    # Handle Build Type
    requires_ui = planned.get("requires_ui", False) or planned.get("type") == "build"
    ui_spec = planned.get("ui_spec", None)

    # 2. Builder Generates
    code = None
    if requires_ui and ui_spec:
        code = builder_generate_react(json.dumps(ui_spec))

    return reply, json.dumps(ui_spec) if ui_spec else None, code, embedding
