"""Safe Vibe AI — Central Multi-Provider AI Router."""

from typing import Dict, List, Optional
from backend.app.ai_engine.base import BaseAiProvider
from backend.app.ai_engine.gemini_provider import GeminiProvider
from backend.app.ai_engine.ollama_provider import OllamaProvider
from backend.app.ai_engine.openai_provider import OpenAIProvider
from backend.app.ai_engine.schemas import (
    AiPatchRequest,
    AiPatchResponse,
    AiReasoningRequest,
    AiReasoningResponse,
    ProviderStatus,
)
from backend.app.core.config import settings
from backend.app.core.logging import logger


class AiRouter:
    """Orchestrates multi-provider routing, fallbacks, and availability telemetry."""

    def __init__(self):
        self.providers: Dict[str, BaseAiProvider] = {
            "gemini": GeminiProvider(),
            "openai": OpenAIProvider(),
            "ollama": OllamaProvider(),
        }

    async def check_all_providers(self) -> List[ProviderStatus]:
        """Probes all configured AI providers and returns operational health."""
        statuses = []
        for name, provider in self.providers.items():
            try:
                status = await provider.check_availability()
                statuses.append(status)
            except Exception as e:
                statuses.append(
                    ProviderStatus(
                        provider_name=name,
                        model_name=provider.model_name,
                        is_available=False,
                        is_primary=provider.is_primary,
                        status_message=f"Error probing provider: {str(e)}",
                    )
                )
        return statuses

    def get_provider(self, requested_name: Optional[str] = None) -> BaseAiProvider:
        """Selects provider with fallback to primary."""
        name = (requested_name or settings.DEFAULT_AI_PROVIDER).lower()
        if name in self.providers:
            return self.providers[name]
        return self.providers["gemini"]

    async def generate_reasoning(self, request: AiReasoningRequest) -> AiReasoningResponse:
        """Routes reasoning request to selected provider with transparent logging."""
        provider = self.get_provider(request.provider)
        logger.info(f"Routing vulnerability reasoning to provider '{provider.provider_name}' (model: {provider.model_name})")
        return await provider.generate_reasoning(request)

    async def generate_patch(self, request: AiPatchRequest) -> AiPatchResponse:
        """Routes patch synthesis request to selected provider."""
        provider = self.get_provider(request.provider)
        logger.info(f"Routing patch synthesis to provider '{provider.provider_name}' (model: {provider.model_name})")
        return await provider.generate_patch(request)


ai_router = AiRouter()
