"""Safe Vibe AI — End-to-End Demonstration Schemas."""

from typing import Dict, List
from pydantic import BaseModel


class DemoStageReportResponse(BaseModel):
    stage_name: str
    status: str
    details: str
    evidence: Dict[str, str]


class EndToEndDemonstrationResponse(BaseModel):
    demonstration_id: str
    target_cwe: str
    cwe_title: str
    target_fixture: str
    total_stages: int
    stages_passed: int
    final_verdict: str
    verification_passport_id: str
    passport_signature_sha256: str
    stages: List[DemoStageReportResponse]

