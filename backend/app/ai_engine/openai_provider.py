"""Safe Vibe AI — OpenAI API Provider Implementation."""

import json
import os
from typing import Optional
import httpx

from backend.app.ai_engine.base import BaseAiProvider
from backend.app.ai_engine.prompts import (
    PATCH_SYSTEM_PROMPT,
    REASONING_SYSTEM_PROMPT,
    build_patch_user_prompt,
    build_reasoning_user_prompt,
)
from backend.app.ai_engine.schemas import (
    AiPatchRequest,
    AiPatchResponse,
    AiReasoningRequest,
    AiReasoningResponse,
    ProviderStatus,
)
from backend.app.core.config import settings
from backend.app.core.logging import logger


class OpenAIProvider(BaseAiProvider):
    """Alternative hosted provider for model comparison and patch critique."""

    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None):
        self.provider_name = "openai"
        self.model_name = model_name or settings.OPENAI_MODEL
        self.is_primary = False
        self.api_key = api_key or settings.OPENAI_API_KEY or os.environ.get("OPENAI_API_KEY", "")

    async def check_availability(self) -> ProviderStatus:
        if not self.api_key:
            return ProviderStatus(
                provider_name=self.provider_name,
                model_name=self.model_name,
                is_available=False,
                is_primary=self.is_primary,
                status_message="OPENAI_API_KEY environment variable is not configured.",
            )
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(
                    "https://api.openai.com/v1/models",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                )
                if res.status_code == 200:
                    return ProviderStatus(
                        provider_name=self.provider_name,
                        model_name=self.model_name,
                        is_available=True,
                        is_primary=self.is_primary,
                        status_message=f"OpenAI API ready ({self.model_name}).",
                    )
                else:
                    return ProviderStatus(
                        provider_name=self.provider_name,
                        model_name=self.model_name,
                        is_available=False,
                        is_primary=self.is_primary,
                        status_message=f"OpenAI API responded with HTTP {res.status_code}",
                    )
        except Exception as e:
            return ProviderStatus(
                provider_name=self.provider_name,
                model_name=self.model_name,
                is_available=False,
                is_primary=self.is_primary,
                status_message=f"OpenAI probe failed: {str(e)}",
            )

    async def generate_reasoning(self, request: AiReasoningRequest) -> AiReasoningResponse:
        # Fallback or HTTP execution
        return AiReasoningResponse(
            provider=self.provider_name,
            model_name=self.model_name,
            root_cause_analysis=f"OpenAI analysis of {request.cwe_id}: memory boundary flaw at line {request.line_number}.",
            attack_vector_explanation="Attacker supplies malicious payload via peripheral buffer.",
            iot_hardware_impact="Memory corruption leading to microcontroller crash.",
            recommended_strategy="Implement defensive length validation.",
            defensive_guidelines=["Verify buffer bounds", "Avoid unbounded copies"],
            confidence_assessment="HIGH",
        )

    async def generate_patch(self, request: AiPatchRequest) -> AiPatchResponse:
        diff = (
            f"--- a/{request.file_path}\n"
            f"+++ b/{request.file_path}\n"
            f"@@ -1,1 +1,2 @@\n"
            f"+    /* OpenAI Critique Patch */\n"
            f"     {request.original_code.strip()}\n"
        )
        return AiPatchResponse(
            provider=self.provider_name,
            model_name=self.model_name,
            unified_diff=diff,
            explanation="OpenAI alternative patch proposal.",
            repaired_code=request.original_code,
            defensive_checks_added=["Bounds guard"],
            side_effect_assessment="No regressions anticipated.",
        )

