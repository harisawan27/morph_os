import os
import json
import re

TEMPLATES_DIR = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "frontend", "src", "vault", "templates"))

def camel_to_upper_snake(name: str) -> str:
    """Converts camelCase / mixedCase to UPPER_SNAKE_CASE for placeholder matching.

    Examples:
      videoId  -> VIDEO_ID
      feelsLike -> FEELS_LIKE
      windSpeed -> WIND_SPEED
    """
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', name)
    return re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1).upper()

def get_hydrated_template(template_id: str, data: dict) -> str:
    """
    Loads a .tsx template from the vault and performs string substitution.
    Returns the final React code.
    """
    template_path = os.path.join(TEMPLATES_DIR, f"{template_id}.jsx")

    if not os.path.exists(template_path):
        raise ValueError(f"Template '{template_id}' not found in the vault.")

    with open(template_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    # Strip ES6 import statements — react-runner scope provides all deps.
    # Use regex so multi-line imports like `import {\n  X,\n} from 'y'` are
    # removed in one pass (line-by-line stripping would leave the continuation).
    raw = "".join(lines)
    raw = re.sub(r'^import\b[^;]*;', '', raw, flags=re.MULTILINE)   # with semicolons
    raw = re.sub(r'^import\b[^\n]*$', '', raw, flags=re.MULTILINE)  # without semicolons
    content = raw

    hydrated = content

    # 1. Direct key replacements (camelCase → UPPER_SNAKE_CASE)
    for key, value in data.items():
        placeholder = "{{" + camel_to_upper_snake(key) + "}}"
        if isinstance(value, str):
            # Escape for safe embedding inside JS double-quoted string literals
            safe = (value
                .replace('\\', '\\\\')
                .replace('"', '\\"')
                .replace('\n', '\\n')
                .replace('\r', '\\r')
                .replace('\t', '\\t')
            )
            hydrated = hydrated.replace(placeholder, safe)
        else:
            hydrated = hydrated.replace(placeholder, str(value))

    # 2. Bulk JSON data replacement (for complex objects like weather/forecast)
    if "{{DATA_JSON}}" in hydrated:
        hydrated = hydrated.replace("{{DATA_JSON}}", json.dumps(data))

    return hydrated
