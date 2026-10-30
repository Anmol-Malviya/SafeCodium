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
