"""
Safe Vibe AI / SafeCodium — Automated Pipeline & Downloads Integration Test.
"""

from pathlib import Path
import pytest
from httpx import ASGITransport, AsyncClient

from backend.app.main import app
from backend.app.db.session import init_db


@pytest.mark.asyncio
async def test_manifest_and_downloads_pipeline():
    await init_db()
    fixture_path = Path("fixtures/iot_firmware/sample_smart_meter.c")
    assert fixture_path.exists()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Ingest test firmware
        upload_res = await client.post(
            "/api/v1/projects/upload",
            files={"file": ("sample_smart_meter.c", fixture_path.read_bytes(), "text/x-c")},
            data={"name": "Pipeline Download Fixture"},
        )
        assert upload_res.status_code == 201
        project_id = upload_res.json()["data"]["id"]

        # 2. Test Manifest Discovery
        manifest_res = await client.get(f"/api/v1/projects/{project_id}/manifest")
        assert manifest_res.status_code == 200
        manifest_data = manifest_res.json()["data"]
        assert manifest_data["project_id"] == project_id
        assert len(manifest_data["source_files"]) >= 1

        # 3. Test Download Original
        orig_dl = await client.get(f"/api/v1/projects/{project_id}/download/original")
        assert orig_dl.status_code == 200
        assert orig_dl.headers["content-type"] == "application/zip"
        assert len(orig_dl.content) > 100

        # 4. Trigger Autonomous Pipeline
        pipeline_res = await client.post(
            "/api/v1/pipeline/run",
            json={"project_id": project_id, "ai_provider": "gemini"},
        )
        assert pipeline_res.status_code == 202
        job_id = pipeline_res.json()["data"]["job_id"]
        assert job_id is not None

        # 5. Query Pipeline Status
        status_res = await client.get(f"/api/v1/pipeline/status/{job_id}")
        assert status_res.status_code == 200
        status_data = status_res.json()["data"]
        assert status_data["job_id"] == job_id
        assert status_data["status"] in ("running", "completed")

        # 6. Test Download Repaired
        repaired_dl = await client.get(f"/api/v1/projects/{project_id}/download/repaired")
        assert repaired_dl.status_code == 200
        assert repaired_dl.headers["content-type"] == "application/zip"
        assert len(repaired_dl.content) > 100
