"""Safe Vibe AI / SafeCodium — Global System Analytics & Metrics Aggregator."""

from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.session import get_db
from backend.app.models.project import Patch, Project, Scan, Verification, Vulnerability
from backend.app.schemas.common import ApiResponse

router = APIRouter(prefix="/analytics", tags=["Full-Stack System Analytics & Pipeline"])


class PipelineKpisResponse(BaseModel):
    total_projects: int
    total_scans: int
    total_vulnerabilities: int
    critical_vulnerabilities: int
    high_vulnerabilities: int
    total_patches_synthesized: int
    verified_patches: int
    rejection_rate_percentage: float
    verification_success_rate: float


class RecentActivityItem(BaseModel):
    id: str
    event_type: str  # PROJECT_INGESTED | SCAN_COMPLETED | PATCH_SYNTHESIZED | PATCH_VERIFIED
    title: str
    target: str
    timestamp: str
    status: str


class DistributionItem(BaseModel):
    name: str
    count: int
    percentage: float


class FullPipelineDashboardResponse(BaseModel):
    kpis: PipelineKpisResponse
    severity_distribution: List[DistributionItem]
    top_cwe_distribution: List[DistributionItem]
    project_types_distribution: List[DistributionItem]
    recent_activity: List[RecentActivityItem]


@router.get("/dashboard", response_model=ApiResponse[FullPipelineDashboardResponse])
async def get_dashboard_analytics(db: AsyncSession = Depends(get_db)):
    """
    Computes real-time system-wide KPIs across all ingested projects, findings, and verification gates.
    Derives actual severity distributions, CWE category distributions, and framework counts from the database.
    """
    # 1. Core KPIs
    proj_count_res = await db.execute(select(func.count(Project.id)))
    total_projects = proj_count_res.scalar() or 0

    scan_count_res = await db.execute(select(func.count(Scan.id)))
    total_scans = scan_count_res.scalar() or 0

    vuln_count_res = await db.execute(select(func.count(Vulnerability.id)))
    total_vulns = vuln_count_res.scalar() or 0

    crit_res = await db.execute(select(func.count(Vulnerability.id)).where(Vulnerability.severity == "CRITICAL"))
    crit_vulns = crit_res.scalar() or 0

    high_res = await db.execute(select(func.count(Vulnerability.id)).where(Vulnerability.severity == "HIGH"))
    high_vulns = high_res.scalar() or 0

    patch_count_res = await db.execute(select(func.count(Patch.id)))
    total_patches = patch_count_res.scalar() or 0

    ver_count_res = await db.execute(select(func.count(Verification.id)).where(Verification.final_status == "VERIFIED"))
    verified_patches = ver_count_res.scalar() or 0

    rej_count_res = await db.execute(select(func.count(Verification.id)).where(Verification.final_status == "REJECTED"))
    rejected_patches = rej_count_res.scalar() or 0

    total_ver_attempts = verified_patches + rejected_patches
    success_rate = round((verified_patches / total_ver_attempts * 100), 1) if total_ver_attempts > 0 else 100.0
    rej_rate = round((rejected_patches / total_ver_attempts * 100), 1) if total_ver_attempts > 0 else 0.0

    # 2. Real Severity Breakdown
    sev_res = await db.execute(
        select(Vulnerability.severity, func.count(Vulnerability.id)).group_by(Vulnerability.severity)
    )
    severity_distribution: List[DistributionItem] = []
    for sev, cnt in sev_res.all():
        pct = round((cnt / total_vulns * 100), 1) if total_vulns > 0 else 0.0
        severity_distribution.append(DistributionItem(name=sev.capitalize(), count=cnt, percentage=pct))

    # 3. Real CWE Distribution
    cwe_res = await db.execute(
        select(Vulnerability.cwe_id, func.count(Vulnerability.id)).group_by(Vulnerability.cwe_id).order_by(func.count(Vulnerability.id).desc()).limit(5)
    )
    top_cwe_distribution: List[DistributionItem] = []
    for cwe, cnt in cwe_res.all():
        pct = round((cnt / total_vulns * 100), 1) if total_vulns > 0 else 0.0
        top_cwe_distribution.append(DistributionItem(name=cwe, count=cnt, percentage=pct))

    # 4. Real Project Framework Breakdown
    type_res = await db.execute(
        select(Project.framework_type, func.count(Project.id)).group_by(Project.framework_type)
    )
    project_types_distribution: List[DistributionItem] = []
    for ft, cnt in type_res.all():
        pct = round((cnt / total_projects * 100), 1) if total_projects > 0 else 0.0
        type_name = "ESP-IDF" if ft == "esp_idf" else "Arduino" if ft == "arduino" else "Generic C/C++"
        project_types_distribution.append(DistributionItem(name=type_name, count=cnt, percentage=pct))

    # 5. Recent Activity
    recent_projects = await db.execute(select(Project).order_by(Project.created_at.desc()).limit(5))
    recent_patches = await db.execute(select(Patch).order_by(Patch.created_at.desc()).limit(5))

    activities: List[RecentActivityItem] = []

    for p in recent_projects.scalars().all():
        activities.append(
            RecentActivityItem(
                id=p.id,
                event_type="PROJECT_INGESTED",
                title="Firmware Archive Ingested",
                target=p.name,
                timestamp=p.created_at.isoformat(),
                status="ACTIVE",
            )
        )

    for pt in recent_patches.scalars().all():
        activities.append(
            RecentActivityItem(
                id=pt.id,
                event_type="PATCH_SYNTHESIZED" if pt.status != "VERIFIED" else "PATCH_VERIFIED",
                title=f"Patch {pt.status}",
                target=f"Patch {pt.id[:8]} ({pt.ai_provider})",
                timestamp=pt.created_at.isoformat(),
                status=pt.status,
            )
        )

    activities.sort(key=lambda x: x.timestamp, reverse=True)

    return ApiResponse(
        success=True,
        message="Analytics dashboard retrieved",
        data=FullPipelineDashboardResponse(
            kpis=PipelineKpisResponse(
                total_projects=total_projects,
                total_scans=total_scans,
                total_vulnerabilities=total_vulns,
                critical_vulnerabilities=crit_vulns,
                high_vulnerabilities=high_vulns,
                total_patches_synthesized=total_patches,
                verified_patches=verified_patches,
                rejection_rate_percentage=rej_rate,
                verification_success_rate=success_rate,
            ),
            severity_distribution=severity_distribution,
            top_cwe_distribution=top_cwe_distribution,
            project_types_distribution=project_types_distribution,
            recent_activity=activities[:8],
        ),
    )
