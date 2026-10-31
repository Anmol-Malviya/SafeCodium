"""Safe Vibe AI — AI Engine Structured Schemas & Contracts."""

from typing import List, Optional
from pydantic import BaseModel, Field


class AiReasoningRequest(BaseModel):
    vulnerability_id: str
    cwe_id: str
    vulnerable_code: str
    file_path: str
    line_number: int
    function_name: Optional[str] = None
    function_source_code: Optional[str] = None
    target_architecture: str = "Xtensa / ARM Cortex-M"
    operating_system: str = "FreeRTOS"
    peripheral_context: Optional[str] = None
    provider: Optional[str] = None  # gemini, openai, ollama


class AiReasoningResponse(BaseModel):
    provider: str
    model_name: str
    root_cause_analysis: str
    attack_vector_explanation: str
    iot_hardware_impact: str
    recommended_strategy: str
    defensive_guidelines: List[str]
    confidence_assessment: str


class AiPatchRequest(BaseModel):
    vulnerability_id: str
    cwe_id: str
    file_path: str
    original_code: str
    function_source_code: str
    repair_strategy: Optional[str] = None
    target_architecture: str = "Xtensa / ARM Cortex-M"
    operating_system: str = "FreeRTOS"
    provider: Optional[str] = None


class AiPatchResponse(BaseModel):
    provider: str
    model_name: str
    unified_diff: str
    explanation: str
    repaired_code: str
    defensive_checks_added: List[str]
    side_effect_assessment: str


class ProviderStatus(BaseModel):
    provider_name: str
    model_name: str
    is_available: bool
    is_primary: bool
    status_message: str
    enabled: bool = True
    credentials_configured: bool = False
    endpoint_masked: str = ""
    provider_role: str = "Secondary"  # "Primary Reasoning", "Secondary Critic", "Local Runtime"


class ProviderConfigureRequest(BaseModel):
    provider_name: str
    api_key: Optional[str] = None
    model_name: Optional[str] = None
    endpoint: Optional[str] = None
    enabled: Optional[bool] = None


class RoutingSettings(BaseModel):
    primary_provider: str = "gemini"
    secondary_provider: str = "openai"
    fallback_provider: str = "ollama"
    request_timeout_seconds: int = 30
    retry_policy_max_retries: int = 3
    automatic_fallback_enabled: bool = True


class AdvancedSettings(BaseModel):
    request_timeout_seconds: int = 30
    max_retries: int = 3
    log_level: str = "INFO"
    strict_bounds_enforcement: bool = True
    cache_model_responses: bool = False


