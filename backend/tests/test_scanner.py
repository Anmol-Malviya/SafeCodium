"""Tests for Safe Vibe AI Static Vulnerability Detection Engine."""

from pathlib import Path
import pytest
from httpx import AsyncClient, ASGITransport

from backend.app.main import app
from backend.app.db.session import init_db
from backend.app.services.analysis.ast_scanner import AstSecurityScanner


@pytest.mark.asyncio
async def test_ast_scanner_on_smart_meter_fixture():
    """Verify that AST scanner accurately identifies CWE-120 and CWE-476 in sample_smart_meter.c."""
    fixture_path = Path("fixtures/iot_firmware/sample_smart_meter.c")
    assert fixture_path.exists(), "Sample smart meter fixture must exist"

    findings = AstSecurityScanner.scan_file(fixture_path, "sample_smart_meter.c")
    assert len(findings) >= 2

    # Check for CWE-120
    cwe_120 = next((f for f in findings if f.cwe_id == "CWE-120"), None)
    assert cwe_120 is not None
    assert "strcpy" in cwe_120.vulnerable_code
    assert cwe_120.function_name == "parse_telemetry_packet"
    assert cwe_120.severity == "CRITICAL"

    # Check for CWE-476
    cwe_476 = next((f for f in findings if f.cwe_id == "CWE-476"), None)
    assert cwe_476 is not None
    assert "reading_buffer" in cwe_476.vulnerable_code
    assert cwe_476.function_name == "process_sensor_calibration"
    assert cwe_476.severity == "HIGH"


@pytest.mark.asyncio
async def test_api_scan_workflow():
    """Verify end-to-end API upload and scan trigger."""
    await init_db()
    fixture_path = Path("fixtures/iot_firmware/sample_smart_meter.c")
    c_bytes = fixture_path.read_bytes()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Upload fixture
        upload_res = await client.post(
            "/api/v1/projects/upload",
            files={"file": ("sample_smart_meter.c", c_bytes, "text/x-c")},
            data={"name": "Smart Meter Test"},
        )
        assert upload_res.status_code == 201
        project_id = upload_res.json()["data"]["id"]

        # 2. Trigger scan
        scan_res = await client.post(
            "/api/v1/scans/run",
            json={"project_id": project_id, "scanner_type": "composite"},
        )
        assert scan_res.status_code == 201
        scan_data = scan_res.json()["data"]
        scan_id = scan_data["scan"]["id"]
        vulns = scan_data["vulnerabilities"]

        assert len(vulns) >= 2
        cwe_ids = {v["cwe_id"] for v in vulns}
        assert "CWE-120" in cwe_ids
        assert "CWE-476" in cwe_ids

        # 3. Fetch scan details
        detail_res = await client.get(f"/api/v1/scans/{scan_id}")
        assert detail_res.status_code == 200
        assert detail_res.json()["data"]["scan"]["findings_count"] == len(vulns)

        # 4. Fetch vulnerabilities by project
        vuln_list_res = await client.get(f"/api/v1/vulnerabilities/project/{project_id}")
        assert vuln_list_res.status_code == 200
        assert len(vuln_list_res.json()["data"]) == len(vulns)

