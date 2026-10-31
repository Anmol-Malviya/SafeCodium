"""Safe Vibe AI — Central Multi-Provider AI Router."""

import os
from typing import Dict, List, Optional
from backend.app.ai_engine.base import BaseAiProvider
from backend.app.ai_engine.gemini_provider import GeminiProvider
from backend.app.ai_engine.ollama_provider import OllamaProvider
from backend.app.ai_engine.openai_provider import OpenAIProvider
from backend.app.ai_engine.custom_provider import CustomTrainedProvider
from backend.app.ai_engine.schemas import (
    AiPatchRequest,
    AiPatchResponse,
    AiReasoningRequest,
    AiReasoningResponse,
    ProviderStatus,
)
from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.core.ssrf import validate_provider_url, SSRFValidationError


class AiRouter:
    """Orchestrates multi-provider routing, fallbacks, and availability telemetry."""

    def __init__(self):
        self.providers: Dict[str, BaseAiProvider] = {
            "gemini": GeminiProvider(),
            "openai": OpenAIProvider(),
            "ollama": OllamaProvider(),
            "custom_trained": CustomTrainedProvider(),
        }
        self.provider_enabled_state: Dict[str, bool] = {
            "gemini": True,
            "openai": True,
            "ollama": True,
            "custom_trained": False,
        }
        self.routing_settings = {
            "primary_provider": "gemini",
            "secondary_provider": "openai",
            "fallback_provider": "ollama",
            "request_timeout_seconds": 30,
            "retry_policy_max_retries": 3,
            "automatic_fallback_enabled": True,
        }
        self.advanced_settings = {
            "request_timeout_seconds": 30,
            "max_retries": 3,
            "log_level": "INFO",
            "strict_bounds_enforcement": True,
            "cache_model_responses": False,
        }

    async def check_all_providers(self) -> List[ProviderStatus]:
        """Probes all configured AI providers and returns operational health."""
        statuses = []
        for name, provider in self.providers.items():
            enabled = self.provider_enabled_state.get(name, True)
            try:
                status = await provider.check_availability()
                status.enabled = enabled
                if name == "gemini":
                    status.credentials_configured = bool(getattr(provider, "api_key", False))
                    status.endpoint_masked = "Google GenAI API"
                    status.provider_role = "Primary Reasoning"
                elif name == "openai":
                    status.credentials_configured = bool(getattr(provider, "api_key", False))
                    status.endpoint_masked = "OpenAI API"
                    status.provider_role = "Secondary Provider"
                elif name == "ollama":
                    status.credentials_configured = True
                    status.endpoint_masked = getattr(provider, "base_url", "http://localhost:11434")
                    status.provider_role = "Local Runtime"
                elif name == "custom_trained":
                    status.credentials_configured = False
                    status.endpoint_masked = "Modular Interface"
                    status.provider_role = "Trained / Fine-Tuned (Modular)"
                statuses.append(status)
            except Exception as e:
                statuses.append(
                    ProviderStatus(
                        provider_name=name,
                        model_name=provider.model_name,
                        is_available=False,
                        is_primary=provider.is_primary,
                        status_message=f"Error probing provider: {str(e)}",
                        enabled=enabled,
                        credentials_configured=False,
                        endpoint_masked="Configured",
                        provider_role="Provider",
                    )
                )
        return statuses

    def update_provider_config(
        self,
        provider_name: str,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
        endpoint: Optional[str] = None,
        enabled: Optional[bool] = None,
    ) -> bool:
        """Updates runtime configuration for a provider safely with SSRF defense."""
        if provider_name not in self.providers:
            return False

        provider = self.providers[provider_name]
        if enabled is not None:
            self.provider_enabled_state[provider_name] = enabled

        if model_name:
            provider.model_name = model_name

        if api_key and api_key.strip():
            if hasattr(provider, "api_key"):
                provider.api_key = api_key.strip()
                if provider_name == "gemini":
                    os.environ["GEMINI_API_KEY"] = api_key.strip()
                elif provider_name == "openai":
                    os.environ["OPENAI_API_KEY"] = api_key.strip()

        if endpoint and endpoint.strip():
            # Validate URL for SSRF protection
            validated_url = validate_provider_url(
                endpoint.strip(),
                allow_local=settings.ALLOW_LOCAL_AI_ENDPOINTS,
            )
            if hasattr(provider, "base_url"):
                provider.base_url = validated_url
            elif hasattr(provider, "endpoint"):
                provider.endpoint = validated_url

        return True

    def get_provider(self, requested_name: Optional[str] = None) -> BaseAiProvider:
        """Selects provider with fallback to primary."""
        name = (requested_name or settings.DEFAULT_AI_PROVIDER).lower()
        if name in self.providers and self.provider_enabled_state.get(name, True):
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
