"""Safe Vibe AI — Automated Secure Patch Synthesizer."""

from pathlib import Path
from typing import Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.ai_engine.router import ai_router
from backend.app.ai_engine.schemas import AiPatchRequest, AiPatchResponse
from backend.app.core.logging import logger
from backend.app.models.project import Patch, Project, Vulnerability
from backend.app.services.iot_context.context_bundle import IotContextBuilder


class PatchSynthesizer:
    """Coordinates vulnerability-specific defensive patch synthesis and unified diff persistence."""

    @staticmethod
    def determine_strategy(vuln: Vulnerability) -> str:
        """Determines default defensive repair strategy based on CWE class."""
        if vuln.cwe_id == "CWE-120":
            return "Replace unsafe memory/string copy with bounded snprintf() and NULL input guard."
        elif vuln.cwe_id == "CWE-476":
            return "Inject explicit NULL pointer validation guard with early error return."
        elif vuln.cwe_id == "CWE-787":
            return "Enforce strict array index upper-bound verification before memory write."
        elif vuln.cwe_id == "CWE-416":
            return "Set freed pointer to NULL immediately following free() call."
        return "Defensive bounds check and pointer validation."

    @classmethod
    async def synthesize_patch(
        cls,
        vuln: Vulnerability,
        project: Project,
        db: AsyncSession,
        custom_strategy: Optional[str] = None,
        provider: Optional[str] = "gemini",
        compiler_error_feedback: Optional[str] = None,
    ) -> Tuple[Patch, AiPatchResponse]:
        """Synthesizes a minimal unified diff defensive patch and saves it to the database."""
        strategy = custom_strategy or cls.determine_strategy(vuln)
        bundle = IotContextBuilder.build_bundle(project, vuln)

        # Build typed AI patch request
        patch_req = AiPatchRequest(
            vulnerability_id=vuln.id,
            cwe_id=vuln.cwe_id,
            file_path=vuln.file_path,
            original_code=vuln.vulnerable_code,
            function_source_code=bundle.function_source_code or vuln.vulnerable_code,
            repair_strategy=strategy,
            target_architecture=bundle.target_architecture,
            operating_system=bundle.operating_system,
            provider=provider,
            compiler_error_feedback=compiler_error_feedback,
        )

        logger.info(f"Synthesizing patch for {vuln.cwe_id} via provider '{provider}' (Feedback present: {bool(compiler_error_feedback)})")
        ai_resp: AiPatchResponse = await ai_router.generate_patch(patch_req)

        # Validate that output contains unified diff syntax
        diff_text = ai_resp.unified_diff.strip()
        if not ("---" in diff_text and "+++" in diff_text):
            # Format fallback unified diff if necessary
            diff_text = (
                f"--- a/{vuln.file_path}\n"
                f"+++ b/{vuln.file_path}\n"
                f"@@ -{vuln.line_start},1 +{vuln.line_start},1 @@\n"
                f"-    {vuln.vulnerable_code.strip()}\n"
                f"+    {ai_resp.repaired_code.strip()}\n"
            )

        # Persist Patch model
        patch_record = Patch(
            vulnerability_id=vuln.id,
            ai_provider=ai_resp.provider,
            model_name=ai_resp.model_name,
            unified_diff=diff_text,
            root_cause_explanation=ai_resp.explanation,
            repair_strategy=strategy,
            status="proposed",
        )

        db.add(patch_record)
        await db.commit()
        await db.refresh(patch_record)

        logger.info(f"Persisted synthesized patch {patch_record.id} for vulnerability {vuln.id}")
        return patch_record, ai_resp
