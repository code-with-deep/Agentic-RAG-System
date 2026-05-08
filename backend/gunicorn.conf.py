import os

# Gunicorn configuration for production
bind = f"0.0.0.0:{os.environ.get('PORT', '8080')}"
workers = 1  # Keep low for memory-constrained free tiers
worker_class = "uvicorn.workers.UvicornWorker"
timeout = 120
keepalive = 5
max_requests = 500
max_requests_jitter = 50

def pre_fork(server, worker):
    """
    Set environment variables before worker processes are forked.
    This ensures that memory-heavy libraries (like NumPy, PyTorch, and OpenBLAS)
    inherit these limits before they are even imported.
    """
    # --- Memory and Thread Optimizations for Constrained Environments (e.g. Render Free Tier) ---
    os.environ["MALLOC_ARENA_MAX"] = "2"
    os.environ["OMP_NUM_THREADS"] = "1"
    os.environ["OPENBLAS_NUM_THREADS"] = "1"
    os.environ["MKL_NUM_THREADS"] = "1"
    os.environ["VECLIB_MAXIMUM_THREADS"] = "1"
    os.environ["NUMEXPR_NUM_THREADS"] = "1"
    
    # Disable telemetry for dependencies
    os.environ["ANONYMIZED_TELEMETRY"] = "False"
    
    server.log.info("Gunicorn pre_fork: Threading and memory limits applied.")
