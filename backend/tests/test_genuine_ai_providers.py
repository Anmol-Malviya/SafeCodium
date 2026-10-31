"""
Safe Vibe AI — Genuine AI Provider Integration Tests.
Validates:
1. OpenAI provider: Checks configuration honestly, does not mock successful synthesis if unconfigured.
2. Ollama provider: Probes offline daemon honestly, refuses unvalidated endpoints.
3. Custom-trained model provider: Honestly reports absence of local weight files without hallucinating availability.
4. Execution Sandbox: Verifies environment scrub eliminates sensitive credentials from spawned child processes.
"""

import os
import pytest
from backend.app.ai_engine.openai_provider import OpenAIProvider
from backend.app.ai_engine.ollama_provider import OllamaProvider
from backend.app.ai_engine.custom_provider import CustomTrainedProvider
from backend.app.services.verification.sandbox import ExecutionSandbox


@pytest.mark.asyncio
async def test_openai_provider_fails_honestly_when_unconfigured():
    provider = OpenAIProvider()
    provider.api_key = None
    status = await provider.check_availability()
    assert status.is_available is False
    assert "OPENAI_API_KEY is not configured" in status.status_message


@pytest.mark.asyncio
async def test_ollama_provider_fails_honestly_when_daemon_offline():
    provider = OllamaProvider(base_url="http://127.0.0.1:54321")
    status = await provider.check_availability()
    assert status.is_available is False
    assert "Offline mode" in status.status_message or "not reachable" in status.status_message


@pytest.mark.asyncio
async def test_custom_trained_provider_reports_truthful_unavailability():
    provider = CustomTrainedProvider()
    status = await provider.check_availability()
    assert status.is_available is False
    assert "safetensors" in status.status_message or "modularized" in status.status_message


def test_sandbox_environment_scrubbing():
    # Set dummy sensitive environment variables
    os.environ["SECRET_KEY"] = "super-secret-key-12345"
    os.environ["DATABASE_URL"] = "postgresql://admin:password@localhost:5432/db"
    os.environ["OPENAI_API_KEY"] = "sk-test-live-key"

    # Command that prints out environment variables
    proc = ExecutionSandbox.run_isolated_command(
        ["python", "-c", "import os; print('SECRET_KEY:', os.environ.get('SECRET_KEY')); print('OPENAI_API_KEY:', os.environ.get('OPENAI_API_KEY'))"]
    )
    assert proc.exit_code == 0
    assert "SECRET_KEY: None" in proc.stdout
    assert "OPENAI_API_KEY: None" in proc.stdout

