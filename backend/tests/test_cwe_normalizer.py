"""Tests for Safe Vibe AI CWE Classification and Finding Normalization."""

from pathlib import Path
import pytest
from httpx import AsyncClient, ASGITransport

from backend.app.main import app
from backend.app.db.session import init_db
from backend.app.models.project import Vulnerability
from backend.app.services.analysis.cwe_catalog import get_cwe_metadata
from backend.app.services.analysis.normalizer import FindingNormalizer


def test_cwe_catalog_definitions():
    """Verify CWE catalog contains full metadata for target CWEs."""
    cwe_120 = get_cwe_metadata("CWE-120")
    assert cwe_120.cwe_id == "CWE-120"
    assert cwe_120.cvss_base_score == 9.8
    assert "strcpy" in cwe_120.mitigation_strategies[0].lower()
    assert "remote" in cwe_120.iot_impact.lower()

    cwe_476 = get_cwe_metadata("CWE-476")
    assert cwe_476.cwe_id == "CWE-476"
    assert cwe_476.cvss_base_score == 7.5
    assert len(cwe_476.mitigation_strategies) > 0


def test_finding_normalizer_enrichment():
    """Verify FindingNormalizer properly enriches a raw Vulnerability model."""
    vuln = Vulnerability(
        id="test-vuln-id",
        project_id="test-proj-id",
        cwe_id="CWE-120",
        title="Unbounded Memory Copy via strcpy()",
        severity="CRITICAL",
        file_path="src/main.c",
        line_start=42,
        line_end=42,
        function_name="handle_packet",
        vulnerable_code="strcpy(buffer, input);",
        scanner_source="safevibe_ast_detector",
        status="detected",
    )

    enriched = FindingNormalizer.normalize(vuln)
    assert enriched.cwe_id == "CWE-120"
    assert enriched.cwe_name.startswith("Buffer Copy")
    assert enriched.cvss_base_score == 9.8
    assert enriched.confidence == "HIGH"
    assert enriched.confidence_score >= 0.9
    assert len(enriched.mitigation_strategies) > 0


@pytest.mark.asyncio
async def test_enriched_vulnerability_api():
    """Verify GET /api/v1/vulnerabilities/{id} returns enriched taxonomy and CVSS metrics."""
    await init_db()
    fixture_path = Path("fixtures/iot_firmware/sample_smart_meter.c")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Upload
        up_res = await client.post(
            "/api/v1/projects/upload",
            files={"file": ("smart_meter.c", fixture_path.read_bytes(), "text/x-c")},
            data={"name": "Smart Meter Norm Test"},
        )
        assert up_res.status_code == 201
        project_id = up_res.json()["data"]["id"]

        # Scan
        scan_res = await client.post("/api/v1/scans/run", json={"project_id": project_id})
        assert scan_res.status_code == 201
        vulns = scan_res.json()["data"]["vulnerabilities"]
        assert len(vulns) >= 2
        vuln_id = vulns[0]["id"]

        # Fetch single enriched vulnerability
        get_res = await client.get(f"/api/v1/vulnerabilities/{vuln_id}")
        assert get_res.status_code == 200
        enriched_data = get_res.json()["data"]

        assert "cvss_base_score" in enriched_data
        assert "cvss_vector" in enriched_data
        assert "confidence" in enriched_data
        assert "iot_impact" in enriched_data
        assert "mitigation_strategies" in enriched_data
        assert enriched_data["cvss_base_score"] > 0
