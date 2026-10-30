"""Tests for Safe Vibe AI Patch Synthesizer & Unified Diff Engine."""

import uuid
from pathlib import Path
import pytest
from httpx import AsyncClient, ASGITransport

from backend.app.main import app
from backend.app.db.session import init_db
from backend.app.models.project import Project, Vulnerability
from backend.app.services.patching.synthesizer import PatchSynthesizer


@pytest.mark.asyncio
async def test_patch_synthesizer_direct():
    """Verify PatchSynthesizer creates valid unified diff with defensive bounds."""
    await init_db()
    proj_id = f"test-patch-proj-{uuid.uuid4().hex[:8]}"
    vuln_id = f"test-vuln-patch-{uuid.uuid4().hex[:8]}"
    project = Project(
        id=proj_id,
        name="Smart Meter Patch Test",
        framework_type="generic_c",
        original_path="fixtures/iot_firmware",
        shadow_path="fixtures/iot_firmware",
    )
    vuln = Vulnerability(
        id=vuln_id,
        project_id=project.id,
        cwe_id="CWE-120",
        title="Unbounded Memory Copy via strcpy()",
        severity="CRITICAL",
        file_path="sample_smart_meter.c",
        line_start=33,
        line_end=33,
        function_name="parse_telemetry_packet",
        vulnerable_code="strcpy(out_packet->meter_serial, raw_stream);",
        scanner_source="safevibe_ast_detector",
        status="detected",
    )

    from backend.app.db.session import AsyncSessionLocal
    async with AsyncSessionLocal() as session:
        session.add(project)
        session.add(vuln)
        await session.commit()

        patch_rec, ai_resp = await PatchSynthesizer.synthesize_patch(
            vuln=vuln,
            project=project,
            db=session,
            provider="gemini",
        )

        assert patch_rec.id is not None
        assert "--- a/" in patch_rec.unified_diff
        assert "+++ b/" in patch_rec.unified_diff
        assert patch_rec.status == "proposed"
        assert len(ai_resp.defensive_checks_added) > 0


@pytest.mark.asyncio
async def test_api_patch_generate_endpoint():
    """Verify POST /api/v1/patches/generate endpoint end-to-end."""
    await init_db()
    fixture_path = Path("fixtures/iot_firmware/sample_smart_meter.c")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Upload
        up_res = await client.post(
            "/api/v1/projects/upload",
            files={"file": ("sample_smart_meter.c", fixture_path.read_bytes(), "text/x-c")},
            data={"name": "Patch Gen Meter"},
        )
        assert up_res.status_code == 201
        project_id = up_res.json()["data"]["id"]

        # 2. Scan
        scan_res = await client.post("/api/v1/scans/run", json={"project_id": project_id})
        assert scan_res.status_code == 201
        vulns = scan_res.json()["data"]["vulnerabilities"]
        assert len(vulns) >= 2
        vuln_id = vulns[0]["id"]

        # 3. Generate Patch
        patch_res = await client.post(
            "/api/v1/patches/generate",
            json={"vulnerability_id": vuln_id, "provider": "gemini"},
        )
        assert patch_res.status_code == 201
        patch_data = patch_res.json()["data"]
        assert "patch" in patch_data
        patch_id = patch_data["patch"]["id"]
        assert "--- a/" in patch_data["patch"]["unified_diff"]

        # 4. List Patches by Vulnerability
        list_res = await client.get(f"/api/v1/patches/vulnerability/{vuln_id}")
        assert list_res.status_code == 200
        patches = list_res.json()["data"]
        assert len(patches) >= 1
        assert any(p["id"] == patch_id for p in patches)
