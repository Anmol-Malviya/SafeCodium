"""Safe Vibe AI — Scan and Vulnerability Schemas."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class ScanResponse(BaseModel):
    id: str
    project_id: str
    scanner_type: str
    status: str
    findings_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class VulnerabilityResponse(BaseModel):
    id: str
    project_id: str
    scan_id: Optional[str] = None
    cwe_id: str
    title: str
    severity: str
    file_path: str
    line_start: int
    line_end: int
    function_name: Optional[str] = None
    vulnerable_code: str
    scanner_source: str
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ScanDetailResponse(BaseModel):
    scan: ScanResponse
    vulnerabilities: List[VulnerabilityResponse]
