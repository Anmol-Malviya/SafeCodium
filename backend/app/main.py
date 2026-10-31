"""Safe Vibe AI — FastAPI Application Entrypoint."""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.db.session import init_db
from backend.app.db.migrations import run_migrations
from backend.app.api.v1.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup and shutdown hooks."""
    logger.info("Starting Safe Vibe AI Engine...")
    logger.info(f"Target Environment: {settings.ENVIRONMENT}")
    logger.info(f"Database Target: {settings.DATABASE_URL}")

    # Initialize database tables
    try:
        run_migrations("head")
        await init_db()
        logger.info("Database schema verified and initialized.")
    except Exception as e:
        logger.error(f"Database initialization error: {e}")
        raise e

    yield

    logger.info("Shutting down Safe Vibe AI Engine...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="IoT-Aware Autonomous Vulnerability Detection, Repair and Verification Platform",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled Exception on {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "message": "Internal Server Error",
            "detail": str(exc) if settings.DEBUG else "An unexpected error occurred.",
        },
    )


# Mount routers
app.include_router(api_router, prefix="/api")


@app.get("/")
async def root():
    """Root endpoint verifying API availability."""
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "ONLINE",
        "docs": "/docs",
        "api_v1": "/api/v1",
    }

