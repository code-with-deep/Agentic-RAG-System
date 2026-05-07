"""
Agentic RAG System — Centralized Configuration

All settings are loaded from environment variables (.env file)
with sensible defaults. Import `settings` from this module everywhere.
"""

from pathlib import Path
from typing import Dict

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

import os
os.environ["ANONYMIZED_TELEMETRY"] = "False"

class Settings(BaseSettings):
    """Application-wide settings loaded from .env with defaults."""

    model_config = SettingsConfigDict(
        env_file=os.environ.get("ENV_FILE", str(Path(os.getcwd()) / ".env")),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── LLM Provider ──────────────────────────────────
    llm_provider: str = Field(default="groq", description="LLM provider: groq only")
    groq_model: str = Field(default="llama-3.3-70b-versatile", description="Groq model name")

    # ── API Keys ──────────────────────────────────────
    groq_api_key: str = Field(default="", description="Groq API key")
    tavily_api_key: str = Field(default="", description="Tavily web search API key")

    # ── Storage Paths ─────────────────────────────────
    chroma_db_path: str = Field(default="./data/chroma", description="ChromaDB persistence path")
    sqlite_db_path: str = Field(default="./data/sqlite/agentic_rag.db", description="SQLite database path")

    # ── Security ──────────────────────────────────────
    jwt_secret: str = Field(default="SUPER_SECRET_KEY_REPLACE_IN_PROD", description="Secret key for JWT verification")
    jwt_algorithm: str = Field(default="HS256", description="Algorithm for JWT signature")
    
    frontend_urls: str = Field(
        default="http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000",
        description="Comma-separated list of allowed frontend URLs for CORS",
        alias="FRONTEND_URLS"
    )

    @property
    def allowed_origins(self) -> list[str]:
        """Convert the CSV string into a list of origins."""
        if not self.frontend_urls:
            return ["*"]
        return [url.strip() for url in self.frontend_urls.split(",") if url.strip()]

    # ── Model Configuration ───────────────────────────
    embedding_model: str = Field(
        default="all-MiniLM-L6-v2",
        description="HuggingFace embedding model name",
    )
    reranker_model: str = Field(
        default="cross-encoder/ms-marco-MiniLM-L-6-v2",
        description="Cross-encoder reranker model name",
    )

    # ── Feature Toggles ──────────────────────────────
    enable_web_search: bool = Field(default=True, description="Enable web search fallback")
    enable_llm_fallback: bool = Field(default=True, description="Enable LLM-based fallback")

    # ── Retry Limits ──────────────────────────────────
    max_retrieval_retries: int = Field(default=3, description="Max retrieval retry attempts")
    max_generation_retries: int = Field(default=2, description="Max generation retry attempts")

    # ── Thresholds ────────────────────────────────────
    hallucination_threshold: float = Field(
        default=0.2,
        description="Hallucination score above which answers are rejected",
    )
    routing_confidence_threshold: float = Field(
        default=0.7,
        description="Minimum confidence for query routing commitment",
    )
    crag_proceed_ratio: float = Field(
        default=0.5,
        description="Ratio of CORRECT chunks above which to proceed immediately",
    )
    crag_fallback_ratio: float = Field(
        default=0.5,
        description="Ratio of INCORRECT chunks above which to trigger fallback",
    )

    # ── Retrieval Settings ────────────────────────────
    top_k_retrieval: int = Field(default=20, description="Chunks to retrieve in broad pass")
    top_k_final: int = Field(default=5, description="Chunks to keep after reranking")

    # ── Confidence Score Weights ──────────────────────
    retrieval_weight: float = Field(default=0.3, description="Weight for retrieval relevance")
    faithfulness_weight: float = Field(default=0.3, description="Weight for faithfulness score")
    coverage_weight: float = Field(default=0.2, description="Weight for context coverage")
    coherence_weight: float = Field(default=0.2, description="Weight for answer coherence")

    # ── Routing Table ─────────────────────────────────
    routing_table: Dict[str, str] = Field(
        default={
            "factual": "hybrid_rerank",
            "analytical": "multi_query",
            "summarization": "section_based",
            "conversational": "context_aware",
            "out_of_scope": "fallback",
        },
        description="Maps query types to retrieval strategies",
    )

from functools import lru_cache

@lru_cache
def get_settings() -> Settings:
    """Returns a singleton instance of the settings, loaded lazily and cached."""
    return Settings()

# Maintain backward compatibility for existing imports
settings = get_settings()
