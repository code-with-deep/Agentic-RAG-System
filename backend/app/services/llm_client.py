"""
Agentic RAG System -- Shared LLM Client (Lazy Loaded)

Initializes the Groq LLM provider lazily to prevent startup crashes.
Gemini support has been removed as per project requirements.
"""

import json
import logging
import re
from typing import Any

from app.config import settings

logger = logging.getLogger("agentic_rag.llm_client")

def parse_llm_json(text: str) -> Any:
    """
    Extracts and parses JSON from an LLM response, stripping markdown code blocks if present.
    Uses regex for robust extraction.
    """
    if not text:
        return None
        
    text = text.strip()
    
    # Regex to find JSON within markdown blocks or just the raw JSON
    pattern = r"^\s*(?:```(?:json)?\s*)?(.*?)(?:\s*```)?\s*$"
    match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
    
    if match:
        json_str = match.group(1).strip()
    else:
        json_str = text
        
    try:
        return json.loads(json_str)
    except json.JSONDecodeError as e:
        logger.error("Failed to parse LLM JSON: %s. Raw text: %s", e, text[:200])
        raise

# Singleton instance to be initialized lazily
_llm = None

def _build_llm():
    """Build and return the Groq LLM client."""
    from langchain_groq import ChatGroq

    if not settings.groq_api_key:
        logger.warning("GROQ_API_KEY is not set. LLM calls will fail.")

    logger.info("Initializing LLM provider: Groq (%s)", settings.groq_model)
    return ChatGroq(
        model=settings.groq_model,
        groq_api_key=settings.groq_api_key,
        temperature=0.1,
    )

def get_llm():
    """Returns a singleton LLM instance, creating it on the first call."""
    global _llm
    if _llm is None:
        _llm = _build_llm()
    return _llm
