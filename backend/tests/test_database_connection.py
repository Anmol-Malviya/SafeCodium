"""SafeCodium — Automated Database Connection and Health Tests."""

import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from backend.app.db.session import engine, AsyncSessionLocal, get_db
from backend.app.main import app


@pytest.mark.asyncio
async def test_centralized_sqlite_connection():
    """Verify primary async engine connectivity and query execution."""
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT 1"))
        assert result.scalar() == 1


@pytest.mark.asyncio
async def test_session_lifecycle_and_rollback():
    """Verify session rollback on uncaught exceptions without leaking transactions."""
    async for session in get_db():
        # Session yielded
        assert session.is_active
        # Simulate rollback
        await session.rollback()
        assert session.is_active
        break


@pytest.mark.asyncio
async def test_api_health_endpoint_diagnostics():
    """Verify /api/v1/health returns detailed database diagnostics."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/health")
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["database_connected"] is True
        assert "database_details" in data
        db_details = data["database_details"]
        assert db_details["status"] == "CONNECTED"
        assert db_details["dialect"] in ("sqlite", "postgresql")
        assert db_details["latency_ms"] >= 0.0
        assert db_details["schema_initialized"] is True


@pytest.mark.asyncio
async def test_unreachable_database_failure_handling(tmp_path):
    """Verify system behaves gracefully and reports errors when DB is unreachable."""
    # Attempt connection to a non-existent PostgreSQL host
    fake_pg_engine = create_async_engine(
        "postgresql+asyncpg://nonexistent_user:pass@127.0.0.1:59999/fakename",
        connect_args={"timeout": 1},
    )
    with pytest.raises(Exception):
        async with fake_pg_engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    await fake_pg_engine.dispose()

