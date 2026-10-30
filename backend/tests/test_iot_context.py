"""Tests for Safe Vibe AI IoT Firmware Context Intelligence."""

from pathlib import Path
import pytest
from httpx import AsyncClient, ASGITransport

from backend.app.main import app
from backend.app.db.session import init_db
from backend.app.services.iot_context.peripheral_analyzer import PeripheralAnalyzer
from backend.app.services.iot_context.context_bundle import IotContextBuilder


def test_peripheral_analyzer_detection():
    """Verify hardware peripheral recognition (UART, ADC, WiFi, FreeRTOS)."""
    uart_code = "void read_data() { uart_read_bytes(UART_NUM_1, rx_buf, 128, 100); }"
    sources = PeripheralAnalyzer.analyze_snippet(uart_code)
    assert any(s.peripheral_type == "UART" for s in sources)
    assert any(s.risk_level == "UNTRUSTED_EXTERNAL" for s in sources)

    adc_code = "float val = analogRead(A0); process_calibration(val);"
    adc_sources = PeripheralAnalyzer.analyze_snippet(adc_code)
    assert any(s.peripheral_type == "ADC" for s in adc_sources)
    assert any(s.risk_level == "SENSOR_READING" for s in adc_sources)


@pytest.mark.asyncio
async def test_api_iot_context_endpoints():
    """Verify end-to-end IoT context endpoints for project and vulnerability."""
    await init_db()
    fixture_path = Path("fixtures/iot_firmware/sample_smart_meter.c")
    c_bytes = fixture_path.read_bytes()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Upload
        up_res = await client.post(
            "/api/v1/projects/upload",
            files={"file": ("sample_smart_meter.c", c_bytes, "text/x-c")},
            data={"name": "IoT Context Project"},
        )
        assert up_res.status_code == 201
        project_id = up_res.json()["data"]["id"]

        # Project IoT Summary
        summary_res = await client.get(f"/api/v1/iot-context/project/{project_id}")
        assert summary_res.status_code == 200
        summary_data = summary_res.json()["data"]
        assert summary_data["total_source_files"] >= 1
        periph_types = {p["peripheral_type"] for p in summary_data["detected_peripherals"]}
        assert "UART" in periph_types or "ADC" in periph_types

        # Scan to get vulnerabilities
        scan_res = await client.post("/api/v1/scans/run", json={"project_id": project_id})
        assert scan_res.status_code == 201
        vulns = scan_res.json()["data"]["vulnerabilities"]
        assert len(vulns) >= 2
        vuln_id = vulns[0]["id"]

        # Vulnerability IoT Context Bundle
        bundle_res = await client.get(f"/api/v1/iot-context/vulnerability/{vuln_id}")
        assert bundle_res.status_code == 200
        bundle = bundle_res.json()["data"]
        assert bundle["vulnerability_id"] == vuln_id
        assert len(bundle["defensive_idioms"]) > 0
        assert "memory_model_notes" in bundle
        assert len(bundle["surrounding_context_snippet"]) > 0
