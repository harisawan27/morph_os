import os
import re
import json
import logging
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from google import genai
from google.genai import types, errors

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Model Configuration ──────────────────────────────────────────────────────
# Brain: newest flash, intent classification + image analysis
BRAIN_MODEL    = 'gemini-3.5-flash'

# Chat + Search: quality text generation + Google grounding
CHAT_MODEL     = 'gemini-3.1-flash-lite'
SEARCH_MODEL   = 'gemini-3.1-flash-lite'

# Builder: Gemma for all code generation (Swift + Think)
BUILDER_MODEL    = 'gemma-4-31b-it'
BUILDER_FALLBACK = 'gemma-4-26b-a4b-it'

# Vision: shares pool with Brain
VISION_MODEL   = 'gemini-3.1-flash-lite'

# Legacy aliases kept for any direct callers
PRIMARY_MODEL  = BRAIN_MODEL
FALLBACK_MODEL = BUILDER_FALLBACK

# ThinkingConfig may not exist in older SDK versions — guard it
# NOTE: Gemma models do NOT support ThinkingConfig — only used for Chat (gemini-3.1-flash)
def _thinking_cfg(budget: int):
    try:
        # include_thoughts=True is required — without it the model thinks internally
        # but never returns thought parts in the response
        tc = types.ThinkingConfig(
            thinking_budget=budget,
            include_thoughts=budget > 0,
        )
        return tc
    except Exception as e:
        logger.warning(f"ThinkingConfig unavailable: {e}")
        return None

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


# ── Code extraction for Gemma models ─────────────────────────────────────────
# Gemma outputs natural reasoning before code. These helpers extract clean
# React components and optionally split reasoning from code for the ThinkingBlock.

_CODE_START_SIGNALS = ('import ', 'const ', 'export ', 'function ', '"use ', "'use ")

def _extract_react_code(raw: str) -> str:
    """Extracts clean React component code from model output.
    Handles Gemma models that prefix reasoning/chain-of-thought before code."""
    raw = raw.strip()
    if not raw:
        return raw

    # Strategy 1: Find code inside markdown fences (```jsx ... ``` or ```javascript ... ```)
    fence_match = re.search(r'```(?:jsx?|tsx?|react|javascript)?\s*\n(.*?)```', raw, re.DOTALL)
    if fence_match:
        return fence_match.group(1).strip()

    # Strategy 2: Find the first import/const/export/function line and take everything from there
    lines = raw.split('\n')
    for i, line in enumerate(lines):
        stripped = line.strip()
        if any(stripped.startswith(sig) for sig in _CODE_START_SIGNALS):
            code = '\n'.join(lines[i:])
            # Strip trailing fence if present
            if code.rstrip().endswith('```'):
                code = code.rstrip()[:-3]
            return code.strip()

    # Strategy 3: Old behavior — strip wrapping fences
    if raw.startswith("```") and raw.endswith("```"):
        lines = raw.split("\n")
        return "\n".join(lines[1:-1]).strip()

    return raw


def _stream_gemma_with_reasoning(model_name: str, contents: str, cfg_kwargs: dict, thought_queue=None) -> tuple[str, str]:
    """Streams Gemma output, splitting natural reasoning from code in real-time.
    Reasoning lines go to thought_queue (for ThinkingBlock), code is collected separately.
    Returns (code_text, reasoning_text)."""
    logger.info(f"Builder streaming (Gemma reasoning mode) with {model_name}...")
    full_text = ""
    reasoning_lines = []
    code_started = False

    stream = client.models.generate_content_stream(
        model=model_name,
        contents=contents,
        config=types.GenerateContentConfig(**cfg_kwargs),
    )

    # Buffer for accumulating partial lines across chunks
    line_buffer = ""

    for chunk in stream:
        try:
            for part in chunk.candidates[0].content.parts:
                text = part.text or ""
                full_text += text

                if code_started:
                    # Already in code section — skip reasoning logic
                    continue

                # Process text to detect transition from reasoning to code
                line_buffer += text
                while '\n' in line_buffer:
                    line, line_buffer = line_buffer.split('\n', 1)
                    stripped = line.strip()

                    # Check if this line starts actual code
                    if any(stripped.startswith(sig) for sig in _CODE_START_SIGNALS):
                        code_started = True
                        break
                    # Check for markdown fence start (```jsx)
                    if stripped.startswith('```') and not stripped.endswith('```'):
                        code_started = True
                        break

                    # This is reasoning — send to ThinkingBlock
                    if stripped and thought_queue is not None:
                        # Clean up bullet markers for nicer display
                        display = stripped.lstrip('*-•').strip()
                        if display:
                            thought_queue.put(display + '\n')
                            reasoning_lines.append(display)
        except Exception:
            pass

    code = _extract_react_code(full_text)
    reasoning = '\n'.join(reasoning_lines)
    return code, reasoning


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


def _build_user_ctx_block(user_context: dict = None) -> str:
    """Builds a formatted block containing the user's persona and styling preferences, 
    injects Morph OS's identity, creator details, and custom prompts for the creator."""
    
    # ── 1. Morph OS Identity & Creator Info (Always injected for context) ──
    identity_block = """MORPH OS IDENTITY & ARCHITECTURE:
- You are Morph OS (Generative Operating System), a state-of-the-art AI assistant and UI canvas engine.
- You can converse naturally, search the web, and build/edit responsive web applications/games in React.
- CREATOR DETAILS: Morph OS was built and designed by Muhammad Haris Awan.
  * Creator Name: Muhammad Haris Awan (Haris)
  * Creator Role: Full Stack Web Developer & Agentic AI Engineer
  * Creator Location: Karachi, Pakistan
  * Creator Linktree: https://linktr.ee/harisawan (Share this Linktree link if asked about contact details/socials/portfolio)
  * Creator Email: haris@webxes.com (Share this email if someone wants to contact the creator)
  * Creator Phone: +92-3361232724
  * Specialties: Full stack web apps, agentic AI systems, Spec-Driven Development, and custom automation.
- If someone asks "Who are you?", "Who built you?", "Who is your creator?", "Who is Haris?", or similar questions, answer in a detailed, respectful, and proud manner. Share his professional background, location, Linktree link (https://linktr.ee/harisawan), and email (haris@webxes.com) clearly and beautifully formatted. Do NOT hide this information.
\n"""

    # ── 2. Check if the user is the creator (Haris) ──
    user_email = user_context.get("email") if user_context else None
    is_creator = False
    if user_email and user_email.lower().strip() == "111hariswan@gmail.com":
        is_creator = True

    # ── 3. Build User Profile block ──
    user_parts = []
    if is_creator:
        user_parts.append("Name: Muhammad Haris Awan (Haris) [CREATOR & OWNER OF MORPH OS]")
        user_parts.append("Role: Full Stack Web Developer & Agentic AI Engineer")
        user_parts.append("Location: Karachi, Pakistan")
        user_parts.append("Preferred Tone: creative")
        user_parts.append("Special Status: YOU ARE TALKING DIRECTLY TO YOUR CREATOR. Greet him with immense respect and enthusiasm. Acknowledge him as your maker. You can say 'Welcome back, Boss!' or 'Hello Haris, my creator!' or similar. Be helpful, professional, yet warm and extremely devoted to his commands. Tailor your responses to assist his engineering workflow.")
    elif user_context:
        if user_context.get("name"):     user_parts.append(f"Name: {user_context['name']}")
        if user_context.get("role"):     user_parts.append(f"Occupation: {user_context['role']}")
        if user_context.get("about"):    user_parts.append(f"About: {user_context['about']}")
        if user_context.get("location"): user_parts.append(f"Location: {user_context['location']}")
        if user_context.get("tone"):     user_parts.append(f"Preferred Tone: {user_context['tone']}")

    user_block = ""
    if user_parts:
        user_block = "USER PROFILE & CONTEXT:\n" + "\n".join(user_parts) + "\n\n"

    return identity_block + user_block


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

    user_ctx_block = _build_user_ctx_block(user_context)

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

"edit" — Use when an active artifact is on screen AND the user wants to modify OR fix it.
  Modification signals: "make it...", "add X to it", "change the color", "update it", "fix the..."
  Pronouns referring to the current UI: "it", "this", "the app", "the widget", "the game"
  Bug/complaint signals (ACTIVE ARTIFACT = EDIT, not chat): "not working", "broken", "doesn't work",
  "isn't working", "can't click", "keys don't work", "arrows don't work", "button doesn't work",
  "no response", "glitched", "stuck", "wrong behavior", "can you fix", "please fix", "why isn't"
  RULE: If there is an active artifact and the user reports something is wrong with it → type "edit".
  NEVER respond to a bug report about an active artifact with "chat" — that just explains the problem
  without fixing it. The user wants it FIXED, not explained.

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
"build me a custom CRM dashboard with lead scoring" → build: {"ui_spec": {"goal": "CRM dashboard with lead scoring", "features": ["lead list table", "lead details pane", "dynamic lead score indicator based on interactions", "filter/search leads"], "style": "dark glassmorphism theme"}, "reply": "Building your custom lead-scoring CRM dashboard now!"}
"make a happy birthday wish app" → build: {"ui_spec": {"goal": "Happy Birthday Wish App", "features": ["interactive card interface", "custom name input", "pop-up confetti animation on click", "play festive birthday music track"], "style": "festive colorful theme"}, "reply": "Making a happy birthday wish app with confetti for you!"}
"create a simple scoreboard app" → build: {"ui_spec": {"goal": "Scoreboard app", "features": ["two team score counters", "plus/minus buttons", "team name editing", "reset button"], "style": "dark dashboard theme"}, "reply": "Building your custom scoreboard app now!"}
"generate a resume builder interface" → build: {"ui_spec": {"goal": "Resume builder", "features": ["input fields for profile, jobs, skills", "live preview layout on side", "mock export button"], "style": "clean slate professional theme"}, "reply": "Creating a custom resume builder app for you!"}
"I want an app that tracks water intake" → build: {"ui_spec": {"goal": "Water intake tracker", "features": ["log daily intake logs", "daily progress goal ring", "drink history list", "quick add presets"], "style": "ocean blue theme"}, "reply": "Building a custom water intake tracker!"}
"make it dark mode" [active artifact] → edit
"add a reset button to it" [active artifact] → edit
"the arrows aren't working" [active artifact] → edit: "Fix arrow key controls — attach keyboard listeners to window, not canvas"
"it's not saving my data" [active artifact] → edit: "Fix data persistence using localStorage"
"the button doesn't do anything" [active artifact] → edit: "Fix the button's onClick handler to perform the correct action"
"can you fix the collision detection?" [active artifact] → edit: "Fix collision detection logic"
"why isn't it working?" [active artifact] → edit: "Debug and fix the broken functionality"
"open calculator in green" → build: {{"goal": "calculator with green color scheme", "features": ["standard arithmetic operations", "clear/backspace", "keyboard support"], "style": "green theme"}}, reply: "Here's your green calculator!"
"open snake but red" → build: {{"goal": "snake game with red color scheme", "features": ["arrow key controls", "score tracking", "level progression"], "style": "red theme"}}, reply: "Here's your red Snake game!"

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
        artifact_context = (
        "ACTIVE ARTIFACT: There is a live interactive artifact (app/game/tool) on the user's canvas right now.\n"
        "- If the user asks to change, update, modify, or improve it → type 'edit'\n"
        "- If the user reports a bug, something not working, broken behavior, missing feature, or wrong output → type 'edit' (FIX IT, don't explain it)\n"
        "- The edit_instruction must describe exactly what to fix or change so the builder can act on it.\n"
        "- Only use 'chat' if the user is clearly asking a general knowledge question unrelated to the artifact.\n\n"
    )

    full_prompt = history_context + artifact_context + f"USER: {prompt}"

    # Disable thinking for brain: classification needs clean JSON, not reasoning tokens
    _brain_cfg_kwargs: dict = dict(
        system_instruction=system_instruction,
        temperature=0.2,
        response_mime_type="application/json",
    )
    tc = _thinking_cfg(0)
    if tc:
        _brain_cfg_kwargs["thinking_config"] = tc

    @retry(
        retry=retry_if_exception_type(errors.ServerError),
        stop=stop_after_attempt(2),
        wait=wait_exponential(multiplier=1, min=1, max=4),
    )
    def _call(model_name):
        logger.info(f"Brain classifying with {model_name}...")
        return client.models.generate_content(
            model=model_name,
            contents=full_prompt,
            config=types.GenerateContentConfig(**_brain_cfg_kwargs),
        )

    try:
        response = _call(BRAIN_MODEL)
    except Exception as e:
        logger.warning(f"Brain failed ({BRAIN_MODEL}), falling back to {CHAT_MODEL}: {e}")
        response = _call(CHAT_MODEL)

    return response.text


def execute_plan(
    planned: dict,
    current_artifact: str | None = None,
    thinking_budget: int = 0,
    thought_queue=None,
    user_context: dict = None,
) -> tuple[str | None, str | None, str | None]:
    """
    Executes a brain plan and returns (code, ui_spec_json, thinking_text).
    Runs entirely outside the async loop — safe to call via asyncio.to_thread.
    """
    from vault_manager import get_hydrated_template

    plan_type = planned.get("type")

    # ── Edit existing artifact ───────────────────────────────────────────────
    if plan_type == "edit":
        instruction = planned.get("edit_instruction", "")
        if current_artifact:
            logger.info(f"EDIT MODE: {instruction[:80]}...")
            try:
                code, thinking = builder_edit_react(current_artifact, instruction, thinking_budget, thought_queue, user_context)
                return code, None, thinking or None
            except Exception as e:
                logger.error(f"Edit failed: {e} — falling back to fresh build")
        else:
            logger.warning("EDIT requested but no current_artifact — falling back to fresh build")
        # Fall through to build using the edit instruction as the goal
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
            code, thinking = builder_generate_react(json.dumps(ui_spec), thinking_budget, thought_queue, user_context)
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
        response = _search(SEARCH_MODEL)
    except Exception as e:
        logger.warning(f"Search failed, falling back to brain model: {e}")
        response = _search(BRAIN_MODEL)

    return response.text


def builder_generate_react(ui_spec: str, thinking_budget: int = 0, thought_queue=None, user_context: dict = None) -> tuple[str, str]:
    """Generates a standalone React component. Returns (code, thinking_text)."""
    user_ctx_block = _build_user_ctx_block(user_context)
    system_instruction = user_ctx_block + """You are THE BUILDER — the code engine of Morph OS, a generative operating system that morphs the UI into whatever the user needs. Your output IS the product. It must be flawless.

════════════════════════════════════════
OUTPUT RULES (non-negotiable)
════════════════════════════════════════
- Return ONE standalone React component as a default export. Raw JS/JSX only — no markdown fences, no explanation text.
- Use Tailwind CSS for all styling. Import React hooks and Lucide-React icons at the top.
- The component must fill its container: use `className="h-full w-full ..."` on the root element.
- Persist user data with localStorage where it makes sense (todos, transactions, notes, settings).

════════════════════════════════════════
FUNCTIONALITY — ZERO COMPROMISE
════════════════════════════════════════
- Every button, input, toggle, and control MUST have working React state behind it. No dead UI.
- Every feature listed in the spec MUST be fully implemented. If it's in the spec, ship it.
- NEVER write placeholder sections. NEVER write "Future updates will include…", "Coming soon", "Learn more", or any stub card. If you can't implement it fully, simplify the scope — do not fake it.
- Forms must validate input. Empty/invalid submissions must be silently ignored or show inline feedback.
- Lists must support add AND delete (and edit if relevant). Empty states must show a helpful message.
- Calculators, converters, and any computation features must produce correct output on every interaction.

════════════════════════════════════════
COLOR & STYLE — APPLY EXACTLY
════════════════════════════════════════
- Read the "style" field in the UI spec and apply it faithfully throughout the entire component.
- If the style says "neon green": use #39FF14 (or similar vivid green) as the primary accent. Apply it to buttons, active states, borders, highlights, stat values, and icons. The rest of the background stays dark (#0a0a0a or #0d0d0d).
- If the style says "red theme", "blue theme", "purple", etc. — apply that color as the primary accent the same way.
- If no color is specified: use the default dark glassmorphism aesthetic (bg-[#0a0a0a], white/8 borders, emerald/red for income/expense).
- Accent color must appear on: primary action buttons, active tab/toggle highlight, stat values, icon fills, focus rings. It must feel intentional — not just one element.
- Use `style={{ color: '#39FF14' }}` or inline hex when Tailwind's arbitrary value syntax `text-[#39FF14]` is needed.

════════════════════════════════════════
DESIGN QUALITY — MORPH OS STANDARD
════════════════════════════════════════
- Dark background (#0a0a0a). Cards use bg-white/4 or bg-white/[0.03] with border border-white/8.
- Rounded corners: rounded-2xl for cards, rounded-xl for inputs/buttons, rounded-full for pills.
- Typography: stat values in text-2xl font-light, labels in text-[10px] uppercase tracking-wider text-white/40.
- Spacing: p-4 for section padding, gap-3 for grids, gap-2 for form rows.
- Hover states on every interactive element. Transition-all on buttons and cards.
- Scrollable lists use flex-1 overflow-y-auto with a thin custom scrollbar (scrollbar-thin scrollbar-thumb-white/10).
- No external images. Use Lucide-React icons only.

════════════════════════════════════════
GAMES & SIMULATIONS — MANDATORY RULES
════════════════════════════════════════
Any request involving a game (flappy bird, snake, pong, tetris, platformer, breakout, asteroids, space invader, chess, checkers, etc.) MUST follow these rules — no exceptions:

RENDERING: Use HTML Canvas API + useRef + useEffect game loop. NEVER use div/CSS animations for game objects. CSS cannot do collision detection. Divs are not game objects.

GAME LOOP PATTERN (required):
```
const canvasRef = useRef(null);
useEffect(() => {
  const canvas = canvasRef.current;
  const ctx = canvas.getContext('2d');
  let animId;
  // initialise game state
  const loop = () => {
    update();   // physics, input, collision
    render(ctx); // clear + draw everything
    animId = requestAnimationFrame(loop);
  };
  animId = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(animId);
}, []);
```

EVERY GAME MUST HAVE:
- A state object holding all game data (positions, velocities, score, lives, phase)
- An `update()` function: physics step, input handling, collision detection, score increment
- A `render(ctx)` function: ctx.clearRect → draw background → draw all game objects
- Proper collision detection (AABB rect overlap or circle distance — not CSS)
- Start screen, running state, and game-over screen
- Score displayed on canvas with ctx.fillText
- Keyboard AND touch/click input so it works on mobile too

KEYBOARD INPUT — CRITICAL: Always attach keyboard listeners to `window`, NEVER to the canvas element.
The artifact runs inside a sandboxed iframe — canvas.addEventListener('keydown') will NEVER fire because
the canvas cannot receive focus in this environment. window.addEventListener always fires.
Required pattern inside useEffect:
```
const handleKey = (e) => { /* handle e.key */ };
window.addEventListener('keydown', handleKey);
return () => window.removeEventListener('keydown', handleKey);
```
Also call `e.preventDefault()` for arrow keys and Space to stop page scrolling.

FLAPPY BIRD SPECIFICALLY:
- Bird: circle or rect with gravity (vy += gravity each frame) and jump on Space/click (vy = -jumpForce)
- Pipes: array of {x, topHeight, gap} objects. Each frame: x -= pipeSpeed. Remove when x < -pipeWidth. Add new pipe when last pipe reaches spawn threshold.
- Collision: bird rect overlaps top pipe rect OR bottom pipe rect OR hits floor/ceiling → game over
- Gap must be ~150px tall so the bird can pass through
- Pipes must be visually solid (ctx.fillRect in green or chosen color, with a wider cap rect at the opening edge)

════════════════════════════════════════
MEDIA INSTRUCTION
════════════════════════════════════════
- YouTube / Music player: embed via `https://www.youtube.com/embed/[VIDEO_ID]` in an iframe. Style with glassmorphism overlays and Lucide icons.

════════════════════════════════════════
SELF-CHECK BEFORE RETURNING
════════════════════════════════════════
Before outputting, verify:
✓ Every feature in the spec is implemented — no stubs
✓ The requested color scheme is applied across the whole UI
✓ Every button has an onClick handler with real logic
✓ No "Future updates", "Coming soon", or "Learn more" text anywhere
✓ If this is a game: canvas + requestAnimationFrame game loop is used, NOT divs
✓ If this is a game: pipes / obstacles / enemies are actually rendered and collidable
✓ Component is a valid default export with all imports at the top
✓ No markdown fences — raw code only"""

    cfg_kwargs = dict(
        system_instruction=system_instruction,
        temperature=0.4,
    )
    # NOTE: Gemma models do NOT support ThinkingConfig — reasoning is extracted
    # from the model's natural chain-of-thought output instead.

    def _run_stream_gemma(model_name) -> tuple[str, str]:
        """Streaming path — Gemma's natural reasoning goes to thought_queue."""
        return _stream_gemma_with_reasoning(
            model_name, f"UI Spec:\n{ui_spec}", cfg_kwargs, thought_queue
        )

    @retry(
        retry=retry_if_exception_type(errors.ServerError),
        stop=stop_after_attempt(2),
        wait=wait_exponential(multiplier=1, min=1, max=4),
    )
    def _run_non_stream(model_name) -> tuple[str, str]:
        logger.info(f"Builder generating with {model_name}...")
        resp = client.models.generate_content(
            model=model_name,
            contents=f"UI Spec:\n{ui_spec}",
            config=types.GenerateContentConfig(**cfg_kwargs),
        )
        raw = ""
        try:
            for part in resp.candidates[0].content.parts:
                raw += part.text or ""
        except Exception:
            pass
        raw = raw or (resp.text or "")
        code = _extract_react_code(raw)
        return code, ""

    code_text, thinking_text = "", ""
    if thought_queue is not None:
        # Stream with reasoning → ThinkingBlock (works for both Swift+Think)
        try:
            code_text, thinking_text = _run_stream_gemma(BUILDER_MODEL)
        except Exception as e:
            logger.warning(f"Builder stream failed ({BUILDER_MODEL}): {e} — trying fallback")
            try:
                code_text, thinking_text = _run_stream_gemma(BUILDER_FALLBACK)
            except Exception as e2:
                logger.error(f"Fallback stream also failed: {e2} — non-stream")
                code_text, thinking_text = _run_non_stream(BUILDER_FALLBACK)
    else:
        # No streaming — just generate and extract code
        try:
            code_text, thinking_text = _run_non_stream(BUILDER_MODEL)
        except Exception as e:
            logger.warning(f"Builder non-stream failed: {e} — falling back")
            code_text, thinking_text = _run_non_stream(BUILDER_FALLBACK)

    code = _extract_react_code(code_text) if code_text else ""

    # Run the critic — auto-fix if it fails
    code, thinking_text = _critic_and_fix(code, ui_spec, thinking_text)
    return code, thinking_text


# ── Critic + Fixer ───────────────────────────────────────────────────────────

_STUB_PHRASES = [
    "future updates will include",
    "coming soon",
    "will be added",
    "not yet implemented",
    "placeholder",
    "learn more",
    "stay tuned",
]

def _critic_check(code: str, ui_spec: str) -> list[str]:
    """
    Fast programmatic checks. Returns a list of failure reasons.
    Empty list = code passed.
    """
    failures = []
    code_lower = code.lower()

    # 1. Stub/placeholder text
    for phrase in _STUB_PHRASES:
        if phrase in code_lower:
            failures.append(f'Contains forbidden stub text: "{phrase}"')
            break

    # 2. Dead onClick handlers
    import re
    dead_clicks = re.findall(r'onClick=\{(?:\(\)\s*=>\s*\{\s*\}|\(\)\s*=>\s*null|undefined)\}', code)
    if dead_clicks:
        failures.append(f"Found {len(dead_clicks)} empty/dead onClick handler(s) — every button must have real logic")

    # 3. Color check — if spec mentions a color, it must appear in the code
    spec_lower = ui_spec.lower()
    color_map = {
        "neon green": ["#39ff14", "#00ff00", "#00e000", "neon", "lime"],
        "red":        ["#ef4444", "#dc2626", "#f87171", "red-"],
        "blue":       ["#3b82f6", "#2563eb", "#60a5fa", "blue-"],
        "purple":     ["#8b5cf6", "#7c3aed", "#a78bfa", "purple-"],
        "orange":     ["#f97316", "#ea580c", "#fb923c", "orange-"],
        "pink":       ["#ec4899", "#db2777", "#f472b6", "pink-"],
        "yellow":     ["#eab308", "#ca8a04", "#fbbf24", "yellow-"],
        "cyan":       ["#06b6d4", "#0891b2", "#67e8f9", "cyan-"],
    }
    for color_name, indicators in color_map.items():
        if color_name in spec_lower:
            if not any(ind in code_lower for ind in indicators):
                failures.append(f'Style requires "{color_name}" but no matching color found in generated code')
            break

    # 4. Must have a default export
    if "export default" not in code:
        failures.append("Missing default export — component will not render")

    # 5. Games must use Canvas API — div/CSS cannot do collision detection
    game_keywords = [
        "flappy", "snake game", "pong", "tetris", "breakout", "asteroids",
        "space invader", "platformer", "pacman", "pac-man", "endless runner",
        "doodle jump", "2048", "minesweeper",
    ]
    if any(kw in spec_lower for kw in game_keywords):
        has_canvas = "canvas" in code_lower and (
            "requestanimationframe" in code_lower or "getcontext" in code_lower
        )
        if not has_canvas:
            failures.append(
                "Game detected but no Canvas API found. "
                "Games MUST use useRef+canvas+requestAnimationFrame game loop. "
                "Rewrite completely using Canvas — do NOT use div/CSS for game objects."
            )

    return failures


def _critic_and_fix(code: str, ui_spec: str, thinking_text: str) -> tuple[str, str]:
    """
    Runs the critic. If it finds issues, calls the fixer once with Gemma.
    Returns (final_code, thinking_text).
    """
    failures = _critic_check(code, ui_spec)
    if not failures:
        logger.info("Critic: PASSED — no issues found")
        return code, thinking_text

    failure_summary = "\n".join(f"- {f}" for f in failures)
    logger.warning(f"Critic: FAILED — {len(failures)} issue(s):\n{failure_summary}")

    fix_prompt = f"""The following React component has quality issues that MUST be fixed.

ISSUES FOUND:
{failure_summary}

ORIGINAL COMPONENT:
{code}

UI SPEC (what this component should do and look like):
{ui_spec}

Fix every issue listed above. Apply the color scheme from the spec throughout the entire component.
Remove ALL stub/placeholder text — implement features or remove them entirely.
Every onClick must have real working logic.
Return the COMPLETE fixed component. Raw JSX only — no markdown, no explanation."""

    cfg_kwargs = dict(system_instruction="You are THE BUILDER — a senior React engineer fixing quality issues in a generated component. Follow the fix instructions exactly.", temperature=0.2)

    @retry(
        retry=retry_if_exception_type(errors.ServerError),
        stop=stop_after_attempt(2),
        wait=wait_exponential(multiplier=1, min=1, max=4),
    )
    def _fix(model_name):
        logger.info(f"Fixer running with {model_name}...")
        return client.models.generate_content(
            model=model_name,
            contents=fix_prompt,
            config=types.GenerateContentConfig(**cfg_kwargs),
        )

    try:
        fix_response = _fix(BUILDER_MODEL)
    except Exception as e:
        logger.warning(f"Fixer primary failed: {e} — falling back")
        fix_response = _fix(BUILDER_FALLBACK)

    raw_fix = ""
    try:
        for part in fix_response.candidates[0].content.parts:
            raw_fix += (part.text or "")
    except Exception:
        pass

    raw_fix = raw_fix or (fix_response.text or "")
    fixed_code = _extract_react_code(raw_fix)

    remaining = _critic_check(fixed_code, ui_spec)
    if remaining:
        logger.warning(f"Critic post-fix: still {len(remaining)} issue(s) — shipping best effort")
    else:
        logger.info("Critic post-fix: PASSED")

    return fixed_code or code, thinking_text


def chat_respond(
    prompt: str,
    history: list[dict] = [],
    thinking_budget: int = 0,
    thought_queue=None,
    text_queue=None,
    user_context: dict = None,
) -> tuple[str, str]:
    """Generates a thoughtful chat reply. Returns (reply_text, thinking_text)."""
    user_ctx_block = _build_user_ctx_block(user_context)

    # Determine response tone details
    tone_instruction = ""
    if user_context and user_context.get("tone"):
        tone = user_context["tone"]
        if tone == "casual":
            tone_instruction = "Adopt a friendly, casual, warm, and highly conversational tone."
        elif tone == "professional":
            tone_instruction = "Adopt a professional, formal, polite, and precise tone. Be direct and clear."
        elif tone == "creative":
            tone_instruction = "Adopt a highly creative, expressive, and imaginative tone. Be original."

    system_instruction = user_ctx_block + f"""You are Morph OS — a smart, helpful AI assistant.
Answer the user's question directly, accurately, and engagingly.
Use markdown where it helps (code blocks, bullet lists, bold, etc.).
Be thorough but concise. {tone_instruction}"""

    history_context = ""
    if history:
        history_context = "CONVERSATION HISTORY:\n" + "\n".join(
            [f"{m['role'].capitalize()}: {m['text']}" for m in history[-12:]]
        ) + "\n\n"

    full_prompt = history_context + f"USER: {prompt}"

    cfg_kwargs: dict = dict(system_instruction=system_instruction, temperature=0.7)
    if thinking_budget > 0:
        tc = _thinking_cfg(thinking_budget)
        if tc:
            cfg_kwargs["thinking_config"] = tc

    def _run_stream(model_name) -> tuple[str, str]:
        logger.info(f"Chat streaming with {model_name}...")
        r, t = "", ""
        stream = client.models.generate_content_stream(
            model=model_name,
            contents=full_prompt,
            config=types.GenerateContentConfig(**cfg_kwargs),
        )
        for chunk in stream:
            try:
                for part in chunk.candidates[0].content.parts:
                    pt = part.text or ""
                    if getattr(part, "thought", False):
                        t += pt
                        if thought_queue is not None and pt:
                            thought_queue.put(pt)
                    else:
                        r += pt
                        if text_queue is not None and pt:
                            text_queue.put(pt)
            except Exception:
                pass
        return r, t

    @retry(
        retry=retry_if_exception_type(errors.ServerError),
        stop=stop_after_attempt(2),
        wait=wait_exponential(multiplier=1, min=1, max=4),
    )
    def _run_non_stream(model_name) -> tuple[str, str]:
        logger.info(f"Chat generating with {model_name} (thinking={thinking_budget})...")
        resp = client.models.generate_content(
            model=model_name,
            contents=full_prompt,
            config=types.GenerateContentConfig(**cfg_kwargs),
        )
        r, t = "", ""
        try:
            for part in resp.candidates[0].content.parts:
                pt = part.text or ""
                if getattr(part, "thought", False):
                    t += pt
                else:
                    r += pt
        except Exception:
            pass
        return r or (resp.text or ""), t

    reply_text, thinking_text = "", ""
    if thought_queue is not None and thinking_budget > 0:
        try:
            reply_text, thinking_text = _run_stream(CHAT_MODEL)
        except Exception as e:
            logger.warning(f"Chat stream failed: {e} — non-stream fallback")
            try:
                reply_text, thinking_text = _run_non_stream(CHAT_MODEL)
            except Exception as e2:
                logger.warning(f"Chat non-stream also failed: {e2} — last resort")
                reply_text, thinking_text = _run_non_stream(BRAIN_MODEL)
    else:
        try:
            reply_text, thinking_text = _run_non_stream(CHAT_MODEL)
        except Exception as e:
            logger.warning(f"Chat non-stream failed: {e} — falling back")
            reply_text, thinking_text = _run_non_stream(BRAIN_MODEL)

    return reply_text.strip(), thinking_text


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
            model=VISION_MODEL,
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


def builder_edit_react(current_code: str, instruction: str, thinking_budget: int = 0, thought_queue=None, user_context: dict = None) -> tuple[str, str]:
    """Modifies an existing React component. Returns (code, thinking_text)."""
    user_ctx_block = _build_user_ctx_block(user_context)
    system_instruction = user_ctx_block + """You are THE BUILDER in EDIT MODE — the code engine of Morph OS. You will receive a live React component and a precise edit instruction.

YOUR TASK:
- Apply the edit instruction exactly.
- Preserve all existing functionality, state, logic, and style that isn't affected by the instruction.
- If the instruction changes the color/theme — update it everywhere it appears. A color change is never just one element.
- NEVER introduce placeholder text ("Future updates…", "Coming soon", "Learn more"). Implement fully or skip — never stub.
- Every new button or control must have real working logic. No dead UI.
- Return the COMPLETE modified component — not a diff, not partial code.
- Raw JS/JSX only. No markdown fences. All imports at the top.

KEYBOARD INPUT — CRITICAL: Keyboard listeners MUST be attached to `window`, never to the canvas element.
The artifact runs in a sandboxed iframe — canvas.addEventListener('keydown') NEVER fires.
window.addEventListener('keydown', handler) always fires. If the existing code uses canvas.addEventListener
for keyboard events, replace every instance with window.addEventListener and clean up in the return.
Also call e.preventDefault() for Arrow keys and Space to prevent page scroll.

CRITICAL — WHEN TO FULLY REWRITE:
If the existing component is fundamentally broken or uses the wrong approach for what is being fixed, do NOT try to patch it. REWRITE IT COMPLETELY using the correct approach.
Examples that require a full rewrite:
- Instruction asks to "add pipes" or "fix collision" but the game uses div/CSS instead of Canvas — rewrite with Canvas + requestAnimationFrame game loop.
- Instruction asks to "fix the game loop" but there is no requestAnimationFrame — rewrite with a proper game loop.
- Any game fix where the existing code has no canvas element — always rewrite with Canvas API.
- Instruction is to fix keyboard/arrow key controls and the code uses canvas.addEventListener — replace with window.addEventListener.
A correct full rewrite is infinitely better than a patched broken component."""

    edit_prompt = f"""EXISTING COMPONENT:
{current_code}

EDIT INSTRUCTION:
{instruction}

Return the complete modified component."""

    cfg_kwargs = dict(
        system_instruction=system_instruction,
        temperature=0.3,
    )
    # NOTE: Gemma models do NOT support ThinkingConfig — reasoning is extracted
    # from the model's natural chain-of-thought output instead.

    def _run_stream_gemma(model_name) -> tuple[str, str]:
        """Streaming path — Gemma's natural reasoning goes to thought_queue."""
        return _stream_gemma_with_reasoning(
            model_name, edit_prompt, cfg_kwargs, thought_queue
        )

    @retry(
        retry=retry_if_exception_type(errors.ServerError),
        stop=stop_after_attempt(2),
        wait=wait_exponential(multiplier=1, min=1, max=4),
    )
    def _run_non_stream(model_name) -> tuple[str, str]:
        logger.info(f"Editor generating with {model_name}...")
        resp = client.models.generate_content(
            model=model_name,
            contents=edit_prompt,
            config=types.GenerateContentConfig(**cfg_kwargs),
        )
        raw = ""
        try:
            for part in resp.candidates[0].content.parts:
                raw += part.text or ""
        except Exception:
            pass
        raw = raw or (resp.text or "")
        code = _extract_react_code(raw)
        return code, ""

    code_text, thinking_text = "", ""
    if thought_queue is not None:
        try:
            code_text, thinking_text = _run_stream_gemma(BUILDER_MODEL)
        except Exception as e:
            logger.warning(f"Editor stream failed ({BUILDER_MODEL}): {e} — trying fallback")
            try:
                code_text, thinking_text = _run_stream_gemma(BUILDER_FALLBACK)
            except Exception as e2:
                logger.error(f"Fallback stream also failed: {e2} — non-stream")
                code_text, thinking_text = _run_non_stream(BUILDER_FALLBACK)
    else:
        try:
            code_text, thinking_text = _run_non_stream(BUILDER_MODEL)
        except Exception as e:
            logger.warning(f"Editor non-stream failed: {e} — falling back")
            code_text, thinking_text = _run_non_stream(BUILDER_FALLBACK)

    code = _extract_react_code(code_text) if code_text else ""
    return code, thinking_text
