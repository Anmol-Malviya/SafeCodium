import pytest
from httpx import ASGITransport, AsyncClient

from backend.app.main import app
from backend.app.db.session import init_db


@pytest.mark.asyncio
async def test_end_to_end_demonstration_cwe120():
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/v1/demonstrations/run/CWE-120")
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["target_cwe"] == "CWE-120"
        assert data["final_verdict"] == "VERIFIED"
        assert data["stages_passed"] == 10
        assert data["verification_passport_id"].startswith("PASSPORT-E2E-")
        assert len(data["passport_signature_sha256"]) == 64


@pytest.mark.asyncio
async def test_end_to_end_demonstration_cwe476():
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/v1/demonstrations/run/CWE-476")
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["target_cwe"] == "CWE-476"
        assert data["final_verdict"] == "VERIFIED"
        assert data["stages_passed"] == 10
        assert data["verification_passport_id"].startswith("PASSPORT-E2E-")
