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

client = genai.Client()


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

"build" — Use ONLY for a truly custom interactive app with specific requirements not covered by any template.
  Clear signals: "build me a...", "create a custom...", "make an app that..."

"edit" — Use ONLY when an active artifact is on screen AND user wants to modify it.
  Signals: "make it...", "add X to it", "change the color", "update it", "fix the..."
  Pronouns referring to the current UI: "it", "this", "the app", "the widget"

GOLDEN RULE: If a sentence can answer it — use "chat". Never spawn a UI where words will do.

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
"open snake" → template: snake
"I want to play snake" → template: snake
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

════════════════════════════════════════
TEMPLATE CATALOG
════════════════════════════════════════

ZERO-DATA (data: {{}}):
todo, snake, calculator, timer, clock, color, habit, budget, kanban,
password, qrcode, draw, converter, memory, tictactoe, typing,
calendar, billsplit, gradient, pixel, matrix, magicball

PARAMETRIC (provide rich data, no placeholders):
- youtube:    {{ "title": "best YouTube search query" }}
- weather:    {{ "city": "city name" }}
- notes:      {{ "title": "note title or empty string" }}
- flashcard:  {{ "topic": "string", "cards": [{{"front": "Q", "back": "A"}}, ...8-12 cards] }}
- quiz:       {{ "topic": "string", "questions": [{{"question":"...","options":["A","B","C","D"],"correct":0}}, ...5-10] }}
- chart:      {{ "type": "bar|line|pie", "title": "string", "labels": [...], "values": [...], "color": "blue|purple|green|orange|pink" }}
- spinwheel:  {{ "options": ["option1", "option2", ...up to 12] }}

════════════════════════════════════════
OUTPUT FORMAT — always valid JSON, one of:
════════════════════════════════════════

{{ "type": "chat", "reply": "Your full conversational response" }}

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
) -> tuple[str | None, str | None]:
    """
    Executes a brain plan and returns (code, ui_spec_json).
    Runs entirely outside the async loop — safe to call via asyncio.to_thread.
    """
    from vault_manager import get_hydrated_template

    plan_type = planned.get("type")

    # ── Edit existing artifact ───────────────────────────────────────────────
    if plan_type == "edit" and current_artifact:
        instruction = planned.get("edit_instruction", "")
        logger.info(f"EDIT MODE: {instruction[:80]}...")
        try:
            code = builder_edit_react(current_artifact, instruction)
            return code, None
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
            return code, json.dumps(planned)
        except Exception as e:
            logger.error(f"Vault hydration failed: {e} — falling back to builder")
            plan_type = "build"
            planned.setdefault("ui_spec", {"goal": f"Create a {template_id} app", "features": [], "style": "dark glassmorphism"})

    # ── Custom build ─────────────────────────────────────────────────────────
    if plan_type == "build" or planned.get("requires_ui"):
        ui_spec = planned.get("ui_spec")
        if ui_spec:
            logger.info(f"BUILDER: generating React component...")
            code = builder_generate_react(json.dumps(ui_spec))
            return code, json.dumps(ui_spec)

    # ── Chat / no artifact ───────────────────────────────────────────────────
    return None, None


def builder_generate_react(ui_spec: str) -> str:
    """Generates a standalone React component from a UI spec."""
    system_instruction = """You are a Full-Stack Creative Engineer (THE BUILDER).
Generate a SINGLE, standalone React Component (default export) using Tailwind CSS.

MEDIA INSTRUCTION: If building a YouTube or Music player:
- Always use the YouTube Embed iframe: `https://www.youtube.com/embed/[ID]`.
- Style it with premium Glassmorphism, blurred overlays, and Lucide-React icons.

DO NOT wrap in markdown code blocks. Just the raw JS/TS code.
Include all necessary React imports."""

    @retry(
        retry=retry_if_exception_type(errors.ServerError),
        stop=stop_after_attempt(2),
        wait=wait_exponential(multiplier=1, min=1, max=4),
    )
    def _build(model_name):
        logger.info(f"Builder generating with {model_name}...")
        return client.models.generate_content(
            model=model_name,
            contents=f"UI Spec:\n{ui_spec}",
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.4,
            ),
        )

    try:
        response = _build(PRIMARY_MODEL)
    except Exception as e:
        logger.warning(f"Primary builder failed, falling back: {e}")
        response = _build(FALLBACK_MODEL)

    code = response.text.strip()
    if code.startswith("```") and code.endswith("```"):
        lines = code.split("\n")
        code = "\n".join(lines[1:-1])
    return code


def builder_edit_react(current_code: str, instruction: str) -> str:
    """Modifies an existing React component based on an edit instruction."""
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

    @retry(
        retry=retry_if_exception_type(errors.ServerError),
        stop=stop_after_attempt(2),
        wait=wait_exponential(multiplier=1, min=1, max=4),
    )
    def _edit(model_name):
        logger.info(f"Editor running with {model_name}...")
        return client.models.generate_content(
            model=model_name,
            contents=edit_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.3,
            ),
        )

    try:
        response = _edit(PRIMARY_MODEL)
    except Exception as e:
        logger.warning(f"Primary editor failed, falling back: {e}")
        response = _edit(FALLBACK_MODEL)

    code = response.text.strip()
    if code.startswith("```") and code.endswith("```"):
        lines = code.split("\n")
        code = "\n".join(lines[1:-1])
    return code
