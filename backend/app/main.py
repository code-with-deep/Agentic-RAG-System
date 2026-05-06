"""
Agentic RAG System — FastAPI Application Entry Point

Initializes the app, mounts routers, configures middleware,
and runs database migrations on startup.
"""
import os
os.environ["ANONYMIZED_TELEMETRY"] = "False"
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

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

# ── CORS Middleware (allow all for development) ───────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Mount Routers ─────────────────────────────────────
app.include_router(documents.router, prefix="/api")
app.include_router(query.router, prefix="/api")
app.include_router(evaluation.router, prefix="/api")
app.include_router(config_routes.router, prefix="/api")


# ── Health Check ──────────────────────────────────────
@app.get("/api/health", tags=["system"])
async def health_check():
    """Health check endpoint to verify the service is running."""
    return {"status": "ok", "version": "1.0.0"}


# ── Global Exception Handler ─────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all exception handler returning structured JSON errors."""
    logger.error("Unhandled exception on %s %s: %s", request.method, request.url.path, exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "detail": str(exc),
            "path": str(request.url.path),
        },
    )
