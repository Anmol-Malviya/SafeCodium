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


class PatchCritiqueResponse(BaseModel):
    patch_id: str
    critique_passed: bool
    critique_score: float
    semantic_integrity: str
    side_effects: List[str]
    c_syntax_valid: bool
    bounds_safety: bool
    zero_heap_allocation: bool
    summary_verdict: str


class PatchApplyRequest(BaseModel):
    patch_id: str
    dry_run: bool = False


class PatchApplyResponse(BaseModel):
    patch_id: str
    success: bool
    is_dry_run: bool
    target_file: str
    original_code: str
    patched_code: str
    hunks_applied: int
    hunks_total: int
    status: str
    diagnostics: List[str]
