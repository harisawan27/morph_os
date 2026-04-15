import sys
import os
import json

# Add current dir to path
sys.path.append(os.getcwd())

from llm_pipeline import generate_artifact_pipeline

def test_vault():
    print("Testing Vault Routing for 'play Udaarian'...")
    reply, ui_spec, code, embedding = generate_artifact_pipeline("play Udaarian")
    
    print(f"Reply: {reply}")
    try:
        spec = json.loads(ui_spec)
        print(f"Detected Type: {spec.get('type')}")
        print(f"Template ID: {spec.get('template_id')}")
    except:
        print("UI Spec is not a template (Custom build)")

    if code and "YouTube video player" in code:
        print("SUCCESS: YouTube Template Hydrated!")
    else:
        print("FAILURE: YouTube Template NOT found in code.")

def test_weather():
    print("\nTesting Vault Routing for 'Weather in New York'...")
    reply, ui_spec, code, embedding = generate_artifact_pipeline("What is the weather in New York right now?")
    
    print(f"Reply: {reply}")
    if code and "WeatherArtifact" in code:
        print("SUCCESS: Weather Template Hydrated!")
        # Check if data was injected
        if "New York" in code:
            print("DATA INJECTED SUCCESSFULLY.")
    else:
        print("FAILURE: Weather Template NOT found in code.")

if __name__ == "__main__":
    test_vault()
    test_weather()
