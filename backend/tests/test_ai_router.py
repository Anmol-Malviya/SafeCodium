"""Tests for Safe Vibe AI Multi-Provider AI Engine & Router."""

import pytest
from httpx import AsyncClient, ASGITransport

from backend.app.main import app
from backend.app.ai_engine.router import ai_router
from backend.app.ai_engine.schemas import AiPatchRequest, AiReasoningRequest


@pytest.mark.asyncio
async def test_provider_availability_probe():
    """Verify that all three providers are probed cleanly without unhandled crashes."""
    statuses = await ai_router.check_all_providers()
    assert len(statuses) >= 3
    provider_names = {s.provider_name for s in statuses}
    assert {"gemini", "openai", "ollama"}.issubset(provider_names)


@pytest.mark.asyncio
async def test_ai_reasoning_generation():
    """Verify reasoning generation produces root cause and IoT hardware impact."""
    req = AiReasoningRequest(
        vulnerability_id="vuln-test-120",
        cwe_id="CWE-120",
        vulnerable_code="strcpy(out_packet->meter_serial, raw_stream);",
        file_path="sample_smart_meter.c",
        line_number=33,
        function_name="parse_telemetry_packet",
        target_architecture="Xtensa LX7 (ESP32)",
        operating_system="FreeRTOS",
        provider="gemini",
    )

    response = await ai_router.generate_reasoning(req)
    assert response.provider.startswith("gemini")
    assert "cwe-120" in response.root_cause_analysis.lower() or "memory" in response.root_cause_analysis.lower() or "buffer" in response.root_cause_analysis.lower() or "strcpy" in response.root_cause_analysis.lower()
    assert len(response.defensive_guidelines) > 0


@pytest.mark.asyncio
async def test_ai_patch_synthesis_diff_format():
    """Verify patch synthesis produces valid unified diff structure."""
    req = AiPatchRequest(
        vulnerability_id="vuln-test-120",
        cwe_id="CWE-120",
        file_path="sample_smart_meter.c",
        original_code="strcpy(out_packet->meter_serial, raw_stream);",
        function_source_code="void parse_telemetry_packet(...) { ... }",
        repair_strategy="snprintf bounds validation",
        provider="gemini",
    )

    response = await ai_router.generate_patch(req)
    assert "--- a/" in response.unified_diff
    assert "+++ b/" in response.unified_diff
    assert len(response.defensive_checks_added) > 0


@pytest.mark.asyncio
async def test_ai_api_endpoints():
    """Verify HTTP API endpoints /ai/providers, /ai/reasoning, and /ai/patch."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Providers endpoint
        res = await client.get("/api/v1/ai/providers")
        assert res.status_code == 200
        providers = res.json()["data"]
        assert len(providers) >= 3

        # 2. Reasoning endpoint
        reason_res = await client.post(
            "/api/v1/ai/reasoning",
            json={
                "vulnerability_id": "v-1",
                "cwe_id": "CWE-476",
                "vulnerable_code": "float val = reading_buffer[0];",
                "file_path": "meter.c",
                "line_number": 45,
                "function_name": "process_sensor_calibration",
            },
        )
        assert reason_res.status_code == 200
        assert "root_cause_analysis" in reason_res.json()["data"]

        # 3. Patch endpoint
        patch_res = await client.post(
            "/api/v1/ai/patch",
            json={
                "vulnerability_id": "v-1",
                "cwe_id": "CWE-476",
                "file_path": "meter.c",
                "original_code": "float val = reading_buffer[0];",
                "function_source_code": "int process_sensor_calibration(...) { ... }",
            },
        )
        assert patch_res.status_code == 200
        assert "unified_diff" in patch_res.json()["data"]

