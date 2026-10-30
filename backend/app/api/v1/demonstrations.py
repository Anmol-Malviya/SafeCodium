"""Safe Vibe AI — End-to-End Demonstration Endpoints."""

import tempfile
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.session import get_db
from backend.app.schemas.common import ApiResponse
from backend.app.schemas.demonstration import (
    DemoStageReportResponse,
    EndToEndDemonstrationResponse,
)
from backend.app.services.demonstration.e2e_runner import EndToEndDemonstrator

router = APIRouter(prefix="/demonstrations", tags=["End-to-End Vulnerability Demonstrations"])


@router.post("/run/{cwe_code}", response_model=ApiResponse[EndToEndDemonstrationResponse])
async def run_end_to_end_demonstration(cwe_code: str, db: AsyncSession = Depends(get_db)):
    """
    Executes a fully autonomous end-to-end journey for CWE-120 or CWE-476 on sample_smart_meter.c:
    Ingest -> Detect -> Context -> AI Reason -> Repair -> Review -> Compiler -> Sanitizer -> Regression -> Profile -> Passport.
    """
    cwe_upper = cwe_code.upper()
    if not cwe_upper.startswith("CWE-"):
        cwe_upper = f"CWE-{cwe_upper}"

    if cwe_upper not in ("CWE-120", "CWE-476"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Demonstration currently supported for CWE-120 and CWE-476 firmware fixtures.",
        )

    fixture_name = "sample_smart_meter.c"
    with tempfile.TemporaryDirectory() as temp_dir_str:
        temp_dir = Path(temp_dir_str)
        demo_result = await EndToEndDemonstrator.run_cwe_demonstration(
            target_cwe=cwe_upper,
            fixture_file_name=fixture_name,
            db=db,
            temp_dir=temp_dir,
        )

    return ApiResponse(
        success=True,
        message=f"End-to-end demonstration for {cwe_upper} executed cleanly ({demo_result.final_verdict})",
        data=EndToEndDemonstrationResponse(
            demonstration_id=demo_result.demonstration_id,
            target_cwe=demo_result.target_cwe,
            cwe_title=demo_result.cwe_title,
            target_fixture=demo_result.target_fixture,
            total_stages=demo_result.total_stages,
            stages_passed=demo_result.stages_passed,
            final_verdict=demo_result.final_verdict,
            verification_passport_id=demo_result.verification_passport_id,
            passport_signature_sha256=demo_result.passport_signature_sha256,
            stages=[
                DemoStageReportResponse(
                    stage_name=s.stage_name,
                    status=s.status,
                    details=s.details,
                    evidence=s.evidence,
                )
                for s in demo_result.stages
            ],
        ),
    )
