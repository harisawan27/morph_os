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
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
