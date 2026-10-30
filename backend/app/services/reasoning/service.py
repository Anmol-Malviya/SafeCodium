"""Safe Vibe AI — Vulnerability Root-Cause Reasoning Service."""

from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.ai_engine.router import ai_router
from backend.app.ai_engine.schemas import AiReasoningRequest, AiReasoningResponse
from backend.app.models.project import Project, Vulnerability
from backend.app.services.iot_context.context_bundle import IotContextBuilder


class ReasoningService:
    """Combines IoT context intelligence with AI router to synthesize grounded reasoning."""

    @classmethod
    async def analyze_vulnerability(
        cls,
        vuln: Vulnerability,
        project: Project,
        provider: Optional[str] = None,
    ) -> AiReasoningResponse:
        """Constructs an IoT context bundle and invokes the AI router."""
        # 1. Build deep context bundle
        bundle = IotContextBuilder.build_bundle(project, vuln)

        # 2. Format peripheral context
        periph_desc = "; ".join(
            f"{p.peripheral_type} ({p.risk_level}): {p.description}"
            for p in bundle.peripheral_sources
        ) or "Internal memory buffer"

        # 3. Create typed AI reasoning request
        request = AiReasoningRequest(
            vulnerability_id=vuln.id,
            cwe_id=vuln.cwe_id,
            vulnerable_code=vuln.vulnerable_code,
            file_path=vuln.file_path,
            line_number=vuln.line_start,
            function_name=vuln.function_name,
            function_source_code=bundle.function_source_code or vuln.vulnerable_code,
            target_architecture=bundle.target_architecture,
            operating_system=bundle.operating_system,
            peripheral_context=periph_desc,
            provider=provider,
        )

        # 4. Route to AI engine
        return await ai_router.generate_reasoning(request)

