"""Safe Vibe AI — Vulnerability Scanning API Endpoints."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.db.session import get_db
from backend.app.models.project import Project, Scan, Vulnerability
from backend.app.schemas.common import ApiResponse
from backend.app.schemas.scan import ScanDetailResponse, ScanResponse, VulnerabilityResponse
from backend.app.services.analysis.engine import AnalysisEngine

router = APIRouter(tags=["Vulnerability Scanning"])


class ScanRequest(BaseModel):
    project_id: str
    scanner_type: Optional[str] = "composite"


@router.post("/scans/run", response_model=ApiResponse[ScanDetailResponse], status_code=status.HTTP_201_CREATED)
async def trigger_scan(
    request: ScanRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Triggers static security analysis on the specified project's shadow workspace.
    Detects CWE-120, CWE-787, CWE-476, and CWE-416 findings.
    """
    result = await db.execute(select(Project).where(Project.id == request.project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    scan = await AnalysisEngine.run_scan(project, db, scanner_type=request.scanner_type or "composite")

    # Fetch newly generated vulnerabilities
    vuln_query = await db.execute(select(Vulnerability).where(Vulnerability.scan_id == scan.id))
    vulnerabilities = vuln_query.scalars().all()

    return ApiResponse(
        success=True,
        message=f"Static scan completed: {len(vulnerabilities)} vulnerabilities detected",
        data=ScanDetailResponse(
            scan=ScanResponse.model_validate(scan),
            vulnerabilities=[VulnerabilityResponse.model_validate(v) for v in vulnerabilities],
        ),
    )


@router.get("/scans/{scan_id}", response_model=ApiResponse[ScanDetailResponse])
async def get_scan_details(scan_id: str, db: AsyncSession = Depends(get_db)):
    """Retrieves a specific scan and all its identified vulnerabilities."""
    result = await db.execute(select(Scan).where(Scan.id == scan_id))
    scan = result.scalar_one_or_none()
    if not scan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan not found")

    vuln_query = await db.execute(select(Vulnerability).where(Vulnerability.scan_id == scan_id))
    vulnerabilities = vuln_query.scalars().all()

    return ApiResponse(
        success=True,
        message="Scan details retrieved",
        data=ScanDetailResponse(
            scan=ScanResponse.model_validate(scan),
            vulnerabilities=[VulnerabilityResponse.model_validate(v) for v in vulnerabilities],
        ),
    )


@router.get("/scans/project/{project_id}", response_model=ApiResponse[List[ScanResponse]])
async def list_project_scans(project_id: str, db: AsyncSession = Depends(get_db)):
    """Lists all scans run on a project."""
    result = await db.execute(
        select(Scan).where(Scan.project_id == project_id).order_by(Scan.created_at.desc())
    )
    scans = result.scalars().all()
    return ApiResponse(
        success=True,
        message=f"Retrieved {len(scans)} scans",
        data=[ScanResponse.model_validate(s) for s in scans],
    )


@router.get("/vulnerabilities/{vuln_id}", response_model=ApiResponse[VulnerabilityResponse])
async def get_vulnerability(vuln_id: str, db: AsyncSession = Depends(get_db)):
    """Retrieves single vulnerability details."""
    result = await db.execute(select(Vulnerability).where(Vulnerability.id == vuln_id))
    vuln = result.scalar_one_or_none()
    if not vuln:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vulnerability not found")

    return ApiResponse(
        success=True,
        message="Vulnerability details retrieved",
        data=VulnerabilityResponse.model_validate(vuln),
    )


@router.get("/vulnerabilities/project/{project_id}", response_model=ApiResponse[List[VulnerabilityResponse]])
async def list_project_vulnerabilities(project_id: str, db: AsyncSession = Depends(get_db)):
    """Lists all detected vulnerabilities for a project."""
    result = await db.execute(
        select(Vulnerability).where(Vulnerability.project_id == project_id).order_by(Vulnerability.line_start.asc())
    )
    vulns = result.scalars().all()
    return ApiResponse(
        success=True,
        message=f"Retrieved {len(vulns)} vulnerabilities",
        data=[VulnerabilityResponse.model_validate(v) for v in vulns],
    )
