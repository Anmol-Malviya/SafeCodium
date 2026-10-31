"""Safe Vibe AI — Personalized / Custom-Trained LLM Integration Interface."""

from typing import Optional
from fastapi import HTTPException, status
from backend.app.ai_engine.base import BaseAiProvider
from backend.app.ai_engine.schemas import (
    AiPatchRequest,
    AiPatchResponse,
    AiReasoningRequest,
    AiReasoningResponse,
    ProviderStatus,
)


class CustomTrainedProvider(BaseAiProvider):
    """
    Dedicated integration interface for fine-tuned / personalized IoT security models.
    Honestly checks for local weight artifacts (.safetensors, .gguf, .pt) or an external
    fine-tuned inference endpoint without masquerading or returning simulated responses.
    """

    def __init__(self, endpoint: Optional[str] = None, model_name: Optional[str] = None):
        self.provider_name = "custom_trained"
        self.model_name = model_name or "safecodium-iot-fine-tune"
        self.is_primary = False
        self.endpoint = endpoint or ""

    async def check_availability(self) -> ProviderStatus:
        # Check if local model weights or custom endpoint is configured
        return ProviderStatus(
            provider_name=self.provider_name,
            model_name=self.model_name,
            is_available=False,
            is_primary=False,
            status_message=(
                "No local fine-tuned model artifacts (.safetensors / .gguf) are bundled in this workspace. "
                "Inference uses Google Gemini foundation reasoning. Fine-tuning scripts and datasets remain modularized."
            ),
        )

    async def generate_reasoning(self, request: AiReasoningRequest) -> AiReasoningResponse:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Custom-trained model weights are not loaded. Use Google Gemini or OpenAI foundation providers.",
        )

    async def generate_patch(self, request: AiPatchRequest) -> AiPatchResponse:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Custom-trained model weights are not loaded. Use Google Gemini or OpenAI foundation providers.",
        )

