"""
Agentic RAG System -- Shared LLM Client

Initializes the correct LLM provider (Gemini or Groq) based on
settings.llm_provider and exports a single `llm` instance.
"""

import logging

from app.config import settings

logger = logging.getLogger("agentic_rag.llm_client")


def _build_llm():
    """Build and return the LLM client based on the configured provider."""
    provider = settings.llm_provider.lower().strip()

    if provider == "gemini":
        from langchain_google_genai import ChatGoogleGenerativeAI

        logger.info("Initializing LLM provider: Google Gemini (gemini-2.0-flash)")
        return ChatGoogleGenerativeAI(
            model="gemini-2.0-flash",
            google_api_key=settings.gemini_api_key,
            temperature=0.1,
            convert_system_message_to_human=True,
        )

    elif provider == "groq":
        from langchain_groq import ChatGroq

        logger.info("Initializing LLM provider: Groq (llama-3.3-70b-versatile)")
        return ChatGroq(
            model="llama-3.3-70b-versatile",
            groq_api_key=settings.groq_api_key,
            temperature=0.1,
        )

    else:
        raise ValueError(
            f"Unknown LLM provider: '{provider}'. Must be 'gemini' or 'groq'."
        )


llm = _build_llm()
logger.info("LLM client ready (provider=%s)", settings.llm_provider)
