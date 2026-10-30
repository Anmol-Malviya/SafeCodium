"""Safe Vibe AI — Abstract AI Provider Contract."""

from abc import ABC, abstractmethod
from backend.app.ai_engine.schemas import (
    AiPatchRequest,
    AiPatchResponse,
    AiReasoningRequest,
    AiReasoningResponse,
    ProviderStatus,
)


class BaseAiProvider(ABC):
    """Abstract interface implemented by all AI reasoning and patch generation backends."""

    provider_name: str
    model_name: str
    is_primary: bool

    @abstractmethod
    async def check_availability(self) -> ProviderStatus:
        """Probes the provider endpoint and credentials to confirm operational status."""
        pass

    @abstractmethod
    async def generate_reasoning(self, request: AiReasoningRequest) -> AiReasoningResponse:
        """Analyzes a vulnerability and produces root-cause explanation and attack vector."""
        pass

    @abstractmethod
    async def generate_patch(self, request: AiPatchRequest) -> AiPatchResponse:
        """Synthesizes a minimal unified diff defensive repair patch."""
        pass
