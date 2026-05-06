
import uuid
from datetime import datetime, timezone
from typing import AsyncGenerator

from sqlalchemy import JSON, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, relationship

from app.config import settings


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _new_uuid() -> str:
    return str(uuid.uuid4())


DATABASE_URL = f"sqlite+aiosqlite:///{settings.sqlite_db_path}"

engine = create_async_engine(DATABASE_URL, echo=False, future=True)

async_session_factory = async_sessionmaker(
    bind=engine, class_=AsyncSession, expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


class Document(Base):
    __tablename__ = "documents"
    id = Column(String, primary_key=True, default=_new_uuid)
    filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False)
    total_pages = Column(Integer, nullable=False, default=0)
    upload_date = Column(DateTime(timezone=True), nullable=False, default=_utcnow)
    file_size = Column(Integer, nullable=False, default=0)
    tags = Column(JSON, nullable=False, default=list)
    chunk_counts = Column(JSON, nullable=False, default=dict)


class Query(Base):
    __tablename__ = "queries"
    id = Column(String, primary_key=True, default=_new_uuid)
    original_query = Column(Text, nullable=False)
    query_type = Column(String, nullable=True)
    routing_confidence = Column(Float, nullable=True)
    strategy_used = Column(String, nullable=True)
    final_answer = Column(Text, nullable=True)
    confidence_score = Column(Float, nullable=True)
    confidence_level = Column(String, nullable=True)
    source_label = Column(String, nullable=True)
    fallback_level = Column(Integer, nullable=False, default=0)
    hallucination_score = Column(Float, nullable=True)
    iterations_count = Column(Integer, nullable=False, default=0)
    total_latency_ms = Column(Integer, nullable=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, default=_utcnow)
    claims = relationship("Claim", back_populates="query", cascade="all, delete-orphan")
    decision_traces = relationship("DecisionTrace", back_populates="query", cascade="all, delete-orphan")
    iterations = relationship("Iteration", back_populates="query", cascade="all, delete-orphan")


class Claim(Base):
    __tablename__ = "claims"
    id = Column(String, primary_key=True, default=_new_uuid)
    query_id = Column(String, ForeignKey("queries.id", ondelete="CASCADE"), nullable=False)
    claim_text = Column(Text, nullable=False)
    verification_status = Column(String, nullable=False)
    supporting_chunk_id = Column(String, nullable=True)
    confidence = Column(Float, nullable=False, default=0.0)
    query = relationship("Query", back_populates="claims")


class DecisionTrace(Base):
    __tablename__ = "decision_trace"
    id = Column(String, primary_key=True, default=_new_uuid)
    query_id = Column(String, ForeignKey("queries.id", ondelete="CASCADE"), nullable=False)
    step_name = Column(String, nullable=False)
    decision = Column(String, nullable=False)
    reasoning = Column(Text, nullable=False)
    input_summary = Column(JSON, nullable=True)
    output_summary = Column(JSON, nullable=True)
    time_taken_ms = Column(Integer, nullable=False, default=0)
    timestamp = Column(DateTime(timezone=True), nullable=False, default=_utcnow)
    alternatives_considered = Column(JSON, nullable=True)
    query = relationship("Query", back_populates="decision_traces")


class Iteration(Base):
    __tablename__ = "iterations"
    id = Column(String, primary_key=True, default=_new_uuid)
    query_id = Column(String, ForeignKey("queries.id", ondelete="CASCADE"), nullable=False)
    iteration_number = Column(Integer, nullable=False)
    query_used = Column(Text, nullable=False)
    answer_generated = Column(Text, nullable=False)
    hallucination_score = Column(Float, nullable=False, default=0.0)
    confidence_score = Column(Float, nullable=False, default=0.0)
    changes_made = Column(Text, nullable=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, default=_utcnow)
    query = relationship("Query", back_populates="iterations")


class EvaluationResult(Base):
    __tablename__ = "evaluation_results"
    id = Column(String, primary_key=True, default=_new_uuid)
    job_id = Column(String, unique=True, nullable=False)
    dataset_path = Column(String, nullable=False)
    total_questions = Column(Integer, nullable=False)
    pass_rate = Column(Float, nullable=False)
    agentic_faithfulness = Column(Float, nullable=False)
    agentic_relevancy = Column(Float, nullable=False)
    agentic_accuracy = Column(Float, nullable=False)
    agentic_hallucination = Column(Float, nullable=False)
    simple_faithfulness = Column(Float, nullable=False)
    simple_relevancy = Column(Float, nullable=False)
    simple_accuracy = Column(Float, nullable=False)
    simple_hallucination = Column(Float, nullable=False)
    overall_improvement = Column(Float, nullable=False)
    hallucination_reduction = Column(Float, nullable=False)
    summary = Column(Text, nullable=False)
    per_question_results = Column(JSON, nullable=False)
    evaluated_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields an async database session."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def create_all_tables() -> None:
    """Create all database tables if they do not already exist."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
