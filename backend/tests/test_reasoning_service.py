"""Tests for Safe Vibe AI Vulnerability Reasoning Service."""

from pathlib import Path
import pytest
from httpx import AsyncClient, ASGITransport

from backend.app.main import app
from backend.app.db.session import init_db
from backend.app.models.project import Project, Vulnerability
from backend.app.services.reasoning.service import ReasoningService


@pytest.mark.asyncio
async def test_reasoning_service_direct():
    """Verify ReasoningService generates grounded root-cause explanation."""
    project = Project(
        id="test-proj-reasoning",
        name="Smart Meter Project",
        framework_type="generic_c",
        original_path="fixtures/iot_firmware",
        shadow_path="fixtures/iot_firmware",
    )
    vuln = Vulnerability(
        id="test-vuln-strcpy",
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

    reasoning = await ReasoningService.analyze_vulnerability(vuln, project, provider="gemini")
    assert reasoning.provider.startswith("gemini")
    assert len(reasoning.root_cause_analysis) > 10
    assert len(reasoning.attack_vector_explanation) > 10
    assert len(reasoning.iot_hardware_impact) > 5
    assert len(reasoning.defensive_guidelines) > 0


@pytest.mark.asyncio
async def test_api_reasoning_endpoint():
    """Verify POST /api/v1/reasoning/analyze/{vuln_id} endpoint."""
    await init_db()
    fixture_path = Path("fixtures/iot_firmware/sample_smart_meter.c")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Upload
        up_res = await client.post(
            "/api/v1/projects/upload",
            files={"file": ("sample_smart_meter.c", fixture_path.read_bytes(), "text/x-c")},
            data={"name": "Reasoning Test Meter"},
        )
        assert up_res.status_code == 201
        project_id = up_res.json()["data"]["id"]

        # Scan
        scan_res = await client.post("/api/v1/scans/run", json={"project_id": project_id})
        assert scan_res.status_code == 201
        vulns = scan_res.json()["data"]["vulnerabilities"]
        assert len(vulns) >= 2
        vuln_id = vulns[0]["id"]

        # Call reasoning endpoint
        reason_res = await client.post(f"/api/v1/reasoning/analyze/{vuln_id}?provider=gemini")
        assert reason_res.status_code == 200
        data = reason_res.json()["data"]
        assert "root_cause_analysis" in data
        assert "attack_vector_explanation" in data
        assert "iot_hardware_impact" in data
        assert "recommended_strategy" in data

