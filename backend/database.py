import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

# We can provide a standard Postgres URL for local docker, but Neon will require SSL
# If DATABASE_URL is not set, fallback to local docker postgres
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://morph:morphpassword@localhost:5432/morph_db")

# Neon requires sslmode=require in the connection string usually, or connect_args
# Check if sslmode is in the url, if it's external we might need to handle it.
# As an easier approach, let SQLAlchemy handle the DSN parsing.
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    from models import Base

    # Needs to ensure vector extension is created
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        conn.commit()

    # Create tables (no-op if they already exist)
    Base.metadata.create_all(bind=engine)

    # Safe column migrations — add any columns that were added after initial deploy.
    # ALTER TABLE ... ADD COLUMN IF NOT EXISTS is idempotent on PostgreSQL 9.6+.
    _migrations = [
        "ALTER TABLE artifacts ADD COLUMN IF NOT EXISTS session_id VARCHAR;",
        "ALTER TABLE artifacts ADD COLUMN IF NOT EXISTS state TEXT;",
        "ALTER TABLE artifacts ADD COLUMN IF NOT EXISTS reply TEXT;",
        "ALTER TABLE artifacts ADD COLUMN IF NOT EXISTS ui_spec TEXT;",
        "ALTER TABLE artifacts ADD COLUMN IF NOT EXISTS session_title VARCHAR;",
        "CREATE INDEX IF NOT EXISTS ix_artifacts_session_id ON artifacts(session_id);",
    ]
    with engine.connect() as conn:
        for sql in _migrations:
            try:
                conn.execute(text(sql))
            except Exception:
                pass  # column/index already exists with correct definition
        conn.commit()

if __name__ == "__main__":
    init_db()
    print("Database initialized.")
