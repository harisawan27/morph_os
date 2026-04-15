import asyncio
from database import SessionLocal
from main import generate_artifact, GenerateRequest

def test():
    db = SessionLocal()
    req = GenerateRequest(prompt="Hi", user_id="anonymous")
    try:
        res = generate_artifact(req, db)
        print("Success:", res)
    except Exception as e:
        import traceback
        traceback.print_exc()

test()
