from sqlalchemy.orm import declarative_base
from sqlalchemy import Column, Integer, String, Text, DateTime
from pgvector.sqlalchemy import Vector
import datetime
import uuid

Base = declarative_base()

class Artifact(Base):
    __tablename__ = 'artifacts'

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, index=True, nullable=True) # Groups artifacts by conversation session
    user_id = Column(String, index=True)
    prompt = Column(Text, nullable=False)
    reply = Column(Text, nullable=True) # Conversational response from Brain
    ui_spec = Column(Text, nullable=True) # JSON output from Brain
    code = Column(Text, nullable=True) # React code from Builder
    embedding = Column(Vector(768)) # Using 768 for standard text-embedding models like text-embedding-004
    state = Column(Text, nullable=True)  # JSON blob — persisted UI state (todos, notes content, etc.)
    thinking = Column(Text, nullable=True)  # Accumulated thought tokens from Think mode
    model = Column(String(16), nullable=True)  # "think" or "swift"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class UserSetting(Base):
    __tablename__ = 'user_settings'

    user_id = Column(String, primary_key=True, index=True) # Decoded JWT user sub ID
    name = Column(String, nullable=True)
    role = Column(String, nullable=True)
    about = Column(Text, nullable=True)
    location = Column(String, nullable=True)
    tone = Column(String(32), nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class AppStorage(Base):
    __tablename__ = 'app_storage'

    user_id = Column(String, primary_key=True, index=True) # Decoded JWT user sub ID
    app_id = Column(String, primary_key=True, index=True) # Unique ID for the app, e.g., morph_budget
    data = Column(Text, nullable=False) # JSON blob of stored data
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
