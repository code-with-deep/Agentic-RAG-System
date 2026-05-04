"""
Agentic RAG System -- Fallback Chain

Provides a graceful fallback hierarchy triggered when document retrieval
fails after exhausting CRAG retries. Tries web search first, then LLM 
general knowledge, and finally an honest abstention.
"""

import logging
from typing import Any, Dict, List, Optional

from app.config import settings
from app.services.decision_tracer import STEP_FALLBACK, DecisionTracer
from app.services.llm_client import llm

logger = logging.getLogger("agentic_rag.fallback_chain")

# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------
WEB_GENERATION_PROMPT = """Answer the following question using ONLY the web search results provided.
If the results do not contain enough information to answer, say so clearly.
Do not add information not present in the results.

Question: {query}

Web Search Results:
{formatted_results}

Provide a clear, accurate answer based solely on these search results."""


LLM_KNOWLEDGE_PROMPT = """Answer the following question using your general knowledge.
Be clear, accurate, and concise.
This answer is NOT sourced from any specific document.

Question: {query}"""


# ---------------------------------------------------------------------------
# Fallback Level 2: Web Search
# ---------------------------------------------------------------------------
async def search_web(query: str) -> Dict[str, Any]:
    """Perform a web search using Tavily or DuckDuckGo."""
    if not settings.enable_web_search:
        logger.info("Web search disabled in settings")
        return {"success": False, "source": None, "results": []}

    # Try Tavily API first
    if hasattr(settings, "tavily_api_key") and settings.tavily_api_key:
        try:
            from tavily import TavilyClient
            client = TavilyClient(api_key=settings.tavily_api_key)
            # Tavily is synchronous, but we can run it in a thread if needed.
            # For simplicity per instructions, calling it directly here.
            # Real-world: wrap in asyncio.to_thread
            raw_results = client.search(query, max_results=5)
            
            results = []
            for r in raw_results.get("results", []):
                results.append({
                    "title": r.get("title", ""),
                    "url": r.get("url", ""),
                    "content": r.get("content", ""),
                    "score": r.get("score", 0.0)
                })
                
            logger.info("Tavily search successful: %d results", len(results))
            return {"success": True, "source": "TAVILY", "results": results}
            
        except Exception as exc:
            logger.warning("Tavily search failed: %s, falling back to DuckDuckGo", exc)

    # Try DuckDuckGo
    try:
        from duckduckgo_search import DDGS
        ddgs = DDGS()
        raw_results = list(ddgs.text(query, max_results=5))
        
        results = []
        for r in raw_results:
            results.append({
                "title": r.get("title", ""),
                "url": r.get("href", ""),
                "content": r.get("body", ""),
                "score": 0.0  # DDGS doesn't provide scores
            })
            
        logger.info("DuckDuckGo search successful: %d results", len(results))
        return {"success": True, "source": "DUCKDUCKGO", "results": results}
        
    except Exception as exc:
        logger.error("DuckDuckGo search failed: %s", exc)
        return {"success": False, "source": None, "results": []}


def format_web_results(results: List[dict]) -> str:
    """Format web search results for the LLM prompt."""
    parts = []
    for r in results:
        content = r.get("content", "")[:500]
        parts.append(f"Source: {r.get('title', 'Unknown')} ({r.get('url', 'No URL')})\nContent: {content}")
    return "\n---\n".join(parts)


async def generate_from_web(query: str, web_results: List[dict]) -> str:
    """Generate an answer using web search results."""
    formatted_results = format_web_results(web_results)
    prompt = WEB_GENERATION_PROMPT.format(query=query, formatted_results=formatted_results)
    
    try:
        response = await llm.ainvoke(prompt)
        return response.content if hasattr(response, "content") else str(response)
    except Exception as exc:
        logger.error("LLM web generation failed: %s", exc)
        return ""


# ---------------------------------------------------------------------------
# Fallback Level 3: LLM General Knowledge
# ---------------------------------------------------------------------------
async def generate_from_llm_knowledge(query: str) -> Optional[str]:
    """Generate an answer using the LLM's base knowledge."""
    if not getattr(settings, "enable_llm_fallback", True):
        logger.info("LLM fallback disabled in settings")
        return None
        
    prompt = LLM_KNOWLEDGE_PROMPT.format(query=query)
    
    try:
        response = await llm.ainvoke(prompt)
        return response.content if hasattr(response, "content") else str(response)
    except Exception as exc:
        logger.error("LLM knowledge generation failed: %s", exc)
        return None


# ---------------------------------------------------------------------------
# Fallback Level 4: Abstain
# ---------------------------------------------------------------------------
def build_abstain_response(query: str, attempts_made: List[dict]) -> Dict[str, Any]:
    """Build a structured response explaining why the system cannot answer."""
    attempts_summary = "\n".join([
        f"- {a.get('strategy', 'unknown')}: {a.get('reason_failed', 'failed')} (Attempt {a.get('attempt_number', 0)})"
        for a in attempts_made
    ])
    
    answer = (
        "I cannot reliably answer this question based on the available documents. "
        "Here is what I searched for and why I could not find a sufficient answer:\n"
        f"{attempts_summary}\n\n"
        "Please try rephrasing your question or uploading additional relevant documents."
    )
    
    return {
        "answer": answer,
        "source_label": "ABSTAIN",
        "fallback_level": 4,
        "attempts_summary": attempts_made,
        "web_results": [],
        "context_used": ""
    }


# ---------------------------------------------------------------------------
# Master Fallback Orchestrator
# ---------------------------------------------------------------------------
async def execute(
    query: str, 
    reason: str, 
    attempts_made: List[dict],
    tracer: Optional[DecisionTracer] = None
) -> Dict[str, Any]:
    """Execute the fallback hierarchy (Web -> LLM -> Abstain)."""
    logger.warning("Initiating fallback chain for query '%s'. Reason: %s", query[:50], reason)
    
    # LEVEL 2: Web Search
    if tracer:
        tracer.log(
            step_name=STEP_FALLBACK,
            decision="Trying web search",
            reasoning=reason,
            input_data={"query": query},
            output_data={"target": "web"}
        )
        
    web_res = await search_web(query)
    if web_res["success"] and web_res["results"]:
        answer = await generate_from_web(query, web_res["results"])
        if answer:
            if tracer:
                tracer.log(
                    step_name=STEP_FALLBACK,
                    decision="Web search succeeded",
                    reasoning=f"Generated answer using {len(web_res['results'])} results from {web_res['source']}",
                    input_data={"results_count": len(web_res["results"])},
                    output_data={"source": web_res["source"]}
                )
            
            return {
                "answer": answer,
                "source_label": "WEB_SEARCH",
                "fallback_level": 2,
                "web_results": web_res["results"],
                "context_used": format_web_results(web_res["results"])
            }

    # LEVEL 3: LLM General Knowledge
    if tracer:
        tracer.log(
            step_name=STEP_FALLBACK,
            decision="Trying LLM knowledge",
            reasoning="Web search failed or disabled",
            input_data={"query": query},
            output_data={"target": "llm"}
        )
        
    llm_answer = await generate_from_llm_knowledge(query)
    if llm_answer:
        if tracer:
            tracer.log(
                step_name=STEP_FALLBACK,
                decision="LLM knowledge fallback used",
                reasoning="Generated answer from LLM base weights",
                input_data={"query": query},
                output_data={"status": "success"}
            )
            
        final_llm_answer = (
            llm_answer + 
            "\n\n⚠️ This answer is from general AI knowledge and NOT from your documents. "
            "It may not be accurate for your specific context."
        )
        
        return {
            "answer": final_llm_answer,
            "source_label": "LLM_GENERAL_KNOWLEDGE",
            "fallback_level": 3,
            "web_results": [],
            "context_used": ""
        }

    # LEVEL 4: Abstain
    if tracer:
        tracer.log(
            step_name=STEP_FALLBACK,
            decision="Abstaining",
            reasoning="All fallback options failed or were disabled",
            input_data={"attempts_count": len(attempts_made)},
            output_data={"status": "abstained"}
        )
        
    return build_abstain_response(query, attempts_made)
