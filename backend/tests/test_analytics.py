import uuid
import pytest
from httpx import ASGITransport, AsyncClient

from backend.app.main import app
from backend.app.models.project import Project, Vulnerability, Patch, Verification


@pytest.mark.asyncio
async def test_analytics_dashboard_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/analytics/dashboard")
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert "kpis" in data
        assert "recent_activity" in data
        assert data["kpis"]["total_projects"] >= 0
        assert data["kpis"]["verification_success_rate"] >= 0.0

