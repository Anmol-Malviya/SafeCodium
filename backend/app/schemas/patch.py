"""Safe Vibe AI — Patch Schemas and Contracts."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class PatchGenerateRequest(BaseModel):
    vulnerability_id: str
    repair_strategy: Optional[str] = None
    provider: Optional[str] = "gemini"


class PatchResponse(BaseModel):
    id: str
    vulnerability_id: str
    ai_provider: str
    model_name: str
    unified_diff: str
    root_cause_explanation: str
    repair_strategy: str
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PatchDetailResponse(BaseModel):
    patch: PatchResponse
    defensive_checks_added: List[str]
    side_effect_assessment: str
