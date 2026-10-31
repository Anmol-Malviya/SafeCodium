"""Safe Vibe AI / SafeCodium — Async Database Engine and Session Factory."""

from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.db.base import Base

# Ensure all models are registered on Base.metadata before any engine/schema activity
import backend.app.models  # noqa: F401


def get_engine_args(database_url: str) -> dict:
    """Returns database dialect-specific engine parameters."""
    if database_url.startswith("sqlite+aiosqlite"):
        return {
            "connect_args": {
                "check_same_thread": False,
                "timeout": 30.0,
            },
            "echo": False,
        }
    elif database_url.startswith("postgresql+asyncpg"):
        return {
            "echo": False,
            "pool_size": 10,
            "max_overflow": 20,
            "pool_pre_ping": True,
            "pool_recycle": 1800,
        }
    return {"echo": False}


# Create centralized async engine
engine: AsyncEngine = create_async_engine(
    settings.DATABASE_URL,
    **get_engine_args(settings.DATABASE_URL),
)

# Centralized Async session factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def init_db() -> None:
    """
    Initializes tables asynchronously using registered models.
    Non-destructive: existing tables and columns are preserved.
    """
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database schema verified via Base.metadata.create_all")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Centralized database session dependency provider for FastAPI handlers."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
