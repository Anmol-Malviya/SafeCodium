"""Unit and Integration tests for Safe Vibe AI Backend Foundation."""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.db.session import init_db


@pytest.mark.asyncio
async def test_root_endpoint():
    """Verify that root endpoint responds with online status."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Safe Vibe AI"
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
