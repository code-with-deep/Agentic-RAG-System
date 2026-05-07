
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import AsyncGenerator
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.models.database import create_all_tables
from app.routers import config_routes, documents, evaluation, query

logger = logging.getLogger("agentic_rag")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)

import sys
logger.info("Python executable: %s", sys.executable)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan — run setup on startup, cleanup on shutdown."""
    logger.info("Creating database tables...")
    await create_all_tables()
    logger.info("Agentic RAG System started successfully")
    yield
    logger.info("Agentic RAG System shutting down")


app = FastAPI(
    title="Agentic RAG System",
    description="Production-grade Agentic Retrieval-Augmented Generation system with corrective RAG, hallucination detection, and iterative refinement.",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS Middleware ───────
origins = settings.allowed_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Mount Routers ─────────────────────────────────────
app.include_router(documents.router, prefix="/api")
app.include_router(query.router, prefix="/api")
app.include_router(evaluation.router, prefix="/api")
app.include_router(config_routes.router, prefix="/api")


# ── Health Checks ─────────────────────────────────────
async def health_check():
    """Comprehensive health check endpoint for monitoring and local use."""
    return {
        "status": "ok", 
        "version": "1.0.0", 
        "message": "Agentic RAG System is live",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# Register multiple health check paths for compatibility (OpenAPI clean)
for path in ("/", "/health", "/api/health"):
    app.add_api_route(path, health_check, methods=["GET"], tags=["system"])


async def root_path_fallback(request: Request):
    """Handle common paths at root to satisfy scanners/health checks."""
    logger.info("Root-level access to %s detected", request.url.path)
    return {"message": f"Please use /api{request.url.path} for API access.", "status": "active"}

# Register fallback paths
for path in ("/documents", "/stats"):
    app.add_api_route(path, root_path_fallback, methods=["GET"], include_in_schema=False)


# ── Global Exception Handler ─────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all exception handler returning redacted JSON errors with correlation IDs."""
    incident_id = uuid4().hex[:8]
    logger.error("Incident %s: Unhandled exception on %s %s: %s", incident_id, request.method, request.url.path, exc, exc_info=True)
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": "An unexpected error occurred. Please contact support with the incident ID.",
            "incident_id": incident_id,
            "path": str(request.url.path),
        },
    )
