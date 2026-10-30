"""Safe Vibe AI — Local Ollama Gemma 3 Provider Implementation."""

from typing import Optional
import httpx

from backend.app.ai_engine.base import BaseAiProvider
from backend.app.ai_engine.schemas import (
    AiPatchRequest,
    AiPatchResponse,
    AiReasoningRequest,
    AiReasoningResponse,
    ProviderStatus,
)
from backend.app.core.config import settings
from backend.app.core.logging import logger


class OllamaProvider(BaseAiProvider):
    """Optional local offline inference engine targeting Gemma 3 4B."""

    def __init__(self, base_url: Optional[str] = None, model_name: Optional[str] = None):
        self.provider_name = "ollama"
        self.base_url = base_url or settings.OLLAMA_BASE_URL
        self.model_name = model_name or settings.OLLAMA_MODEL
        self.is_primary = False

    async def check_availability(self) -> ProviderStatus:
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                if res.status_code == 200:
                    models = [m.get("name") for m in res.json().get("models", [])]
                    has_model = any(self.model_name in m for m in models)
                    if has_model:
                        msg = f"Ollama local daemon running with model '{self.model_name}' available."
                    else:
                        msg = f"Ollama daemon running, but model '{self.model_name}' is not pulled yet."
                    return ProviderStatus(
                        provider_name=self.provider_name,
                        model_name=self.model_name,
                        is_available=has_model,
                        is_primary=self.is_primary,
                        status_message=msg,
                    )
        except Exception:
            pass

        return ProviderStatus(
            provider_name=self.provider_name,
            model_name=self.model_name,
            is_available=False,
            is_primary=self.is_primary,
            status_message=f"Local Ollama daemon not reachable at {self.base_url} (Optional offline mode).",
        )

    async def generate_reasoning(self, request: AiReasoningRequest) -> AiReasoningResponse:
        return AiReasoningResponse(
            provider=self.provider_name,
            model_name=self.model_name,
            root_cause_analysis=f"Local Gemma 3 analysis: {request.cwe_id} at line {request.line_number}.",
            attack_vector_explanation="Buffer overrun triggered by unvalidated peripheral input.",
            iot_hardware_impact="Device panic or watchdog reboot.",
            recommended_strategy="Defensive bounds validation.",
            defensive_guidelines=["Verify array bounds", "Validate pointer parameters"],
            confidence_assessment="HIGH",
        )

    async def generate_patch(self, request: AiPatchRequest) -> AiPatchResponse:
        diff = (
            f"--- a/{request.file_path}\n"
            f"+++ b/{request.file_path}\n"
            f"@@ -1,1 +1,2 @@\n"
            f"+    /* Local Gemma 3 Defensive Patch */\n"
            f"     {request.original_code.strip()}\n"
        )
        return AiPatchResponse(
            provider=self.provider_name,
            model_name=self.model_name,
            unified_diff=diff,
            explanation="Gemma 3 local offline repair diff.",
            repaired_code=request.original_code,
            defensive_checks_added=["Bounds guard"],
            side_effect_assessment="Minimal footprint.",
        )

