import sys
import os
import json
import traceback

# Add current dir to path
sys.path.append(os.getcwd())

from database import SessionLocal
from main import generate_artifact, GenerateRequest
from llm_pipeline import generate_artifact_pipeline

def debug_pipeline():
    print("Testing 'play song Udaarian'...")
    req = GenerateRequest(
        prompt="play song Udaarian", 
        user_id="anonymous",
        session_id="debug-session",
        history=[]
    )
    db = SessionLocal()
    try:
        # Run the pipeline directly to see where it fails
        print("Running generate_artifact_pipeline...")
        reply, ui_spec, code, embedding = generate_artifact_pipeline(req.prompt, req.history)
        print("Pipeline Success!")
        print(f"Reply: {reply[:50]}...")
        print(f"UI Spec Type: {type(ui_spec)}")
        print(f"Code Length: {len(code) if code else 0}")
        
        # Test DB insertion
        from models import Artifact
        print("Testing DB Artifact creation...")
        new_artifact = Artifact(
            user_id=req.user_id,
            session_id=req.session_id,
            prompt=req.prompt,
            reply=reply,
            ui_spec=ui_spec,
            code=code,
            embedding=embedding
        )
        db.add(new_artifact)
        db.commit()
        print("DB Success!")
        
    except Exception as e:
        print("\n!!! ERROR DETECTED !!!")
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    debug_pipeline()
