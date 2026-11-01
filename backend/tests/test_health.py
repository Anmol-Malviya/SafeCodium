"""Unit and Integration tests for SAFE-CODIUM Backend Foundation."""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.db.session import init_db
from backend.app.core.config import Settings


@pytest.mark.asyncio
async def test_root_endpoint():
    """Verify that root endpoint responds with online status."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "SAFE-CODIUM"
        assert data["status"] == "ONLINE"
        assert "version" in data


@pytest.mark.asyncio
async def test_health_endpoint():
    """Verify health endpoint dynamically detects system metrics and DB connectivity."""
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/health")
        assert response.status_code == 200
        payload = response.json()
        assert payload["success"] is True
        assert "data" in payload

        data = payload["data"]
        assert data["status"] == "OPERATIONAL"
        assert data["database_connected"] is True
        assert data["total_ram_gb"] > 0
        assert data["free_ram_gb"] > 0
        assert "python_version" in data
        assert "os" in data


def test_settings_debug_resilience_to_non_boolean_strings():
    """Verify that non-boolean strings like 'WARN', 'info', 'express:*' safely default to False without crashing."""
    s_warn = Settings(DEBUG="WARN")
    assert s_warn.DEBUG is False

    s_true = Settings(DEBUG="True")
    assert s_true.DEBUG is True

    s_false = Settings(DEBUG="false")
    assert s_false.DEBUG is False

    s_one = Settings(DEBUG="1")
    assert s_one.DEBUG is True
