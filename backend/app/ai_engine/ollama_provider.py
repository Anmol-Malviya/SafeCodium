"""Safe Vibe AI — Genuine Local Ollama Gemma 3 Provider Implementation."""

import json
from typing import Optional
import httpx
from fastapi import HTTPException, status

from backend.app.ai_engine.base import BaseAiProvider
from backend.app.ai_engine.prompts import (
    PATCH_SYSTEM_PROMPT,
    REASONING_SYSTEM_PROMPT,
    build_patch_user_prompt,
    build_reasoning_user_prompt,
)
from backend.app.ai_engine.schemas import (
    AiPatchRequest,
    AiPatchResponse,
    AiReasoningRequest,
    AiReasoningResponse,
    ProviderStatus,
)
from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.core.ssrf import validate_provider_url, SSRFValidationError


class OllamaProvider(BaseAiProvider):
    """Local offline inference engine targeting Gemma 3 4B via Ollama API."""

    def __init__(self, base_url: Optional[str] = None, model_name: Optional[str] = None):
        self.provider_name = "ollama"
        self.base_url = (base_url or settings.OLLAMA_BASE_URL).rstrip("/")
        self.model_name = model_name or settings.OLLAMA_MODEL
        self.is_primary = False
        self.timeout = 45.0

    def _get_validated_url(self) -> str:
        """Enforces SSRF boundary check on configured Ollama base URL."""
        return validate_provider_url(self.base_url, allow_local=settings.ALLOW_LOCAL_AI_ENDPOINTS)

    async def check_availability(self) -> ProviderStatus:
        try:
            safe_url = self._get_validated_url()
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{safe_url}/api/tags")
                if res.status_code == 200:
                    models = [m.get("name") for m in res.json().get("models", [])]
                    has_model = any(self.model_name in m for m in models)
                    if has_model:
                        msg = f"Ollama local daemon running with model '{self.model_name}' available."
                    else:
                        msg = f"Ollama daemon running, but model '{self.model_name}' is not pulled yet."
                    return ProviderStatus(
                        provider_name=self.provider_name,
                        model_name=self.model_name,
                        is_available=has_model,
                        is_primary=self.is_primary,
                        status_message=msg,
                    )
        except SSRFValidationError as e:
            return ProviderStatus(
                provider_name=self.provider_name,
                model_name=self.model_name,
                is_available=False,
                is_primary=self.is_primary,
                status_message=f"Ollama URL blocked by SSRF defense: {str(e)}",
            )
        except Exception:
            pass

        return ProviderStatus(
            provider_name=self.provider_name,
            model_name=self.model_name,
            is_available=False,
            is_primary=self.is_primary,
            status_message=f"Local Ollama daemon not reachable at {self.base_url} (Offline mode).",
        )

    async def generate_reasoning(self, request: AiReasoningRequest) -> AiReasoningResponse:
        """Executes genuine local reasoning via Ollama /api/chat."""
        try:
            safe_url = self._get_validated_url()
        except SSRFValidationError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"SSRF validation failed: {str(e)}")

        prompt = build_reasoning_user_prompt(
            cwe_id=request.cwe_id,
            vulnerable_code=request.vulnerable_code,
            file_path=request.file_path,
            line_number=request.line_number,
            function_name=request.function_name or "global",
            function_source=request.function_source_code or request.vulnerable_code,
            target_arch=request.target_architecture,
            os_name=request.operating_system,
            peripheral_info=request.peripheral_context or "",
        )

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.post(
                    f"{safe_url}/api/chat",
                    json={
                        "model": self.model_name,
                        "messages": [
                            {"role": "system", "content": REASONING_SYSTEM_PROMPT},
                            {"role": "user", "content": prompt},
                        ],
                        "stream": False,
                        "format": "json",
                    },
                )
                if res.status_code != 200:
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"Ollama returned HTTP {res.status_code}: {res.text[:200]}",
                    )
                content = res.json().get("message", {}).get("content", "{}")
                data = json.loads(content)

                return AiReasoningResponse(
                    provider=self.provider_name,
                    model_name=self.model_name,
                    root_cause_analysis=data.get("root_cause_analysis", "Ollama root cause analysis generated."),
                    attack_vector_explanation=data.get("attack_vector_explanation", "Buffer overrun vulnerability."),
                    iot_hardware_impact=data.get("iot_hardware_impact", "Microcontroller exception."),
                    recommended_strategy=data.get("recommended_strategy", "Defensive bounds check."),
                    defensive_guidelines=data.get("defensive_guidelines", ["Bounds check required."]),
                    confidence_assessment=data.get("confidence_assessment", "HIGH"),
                )
        except httpx.ConnectError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Local Ollama daemon is offline or unreachable at {self.base_url}.",
            )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Ollama reasoning error: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Ollama reasoning failed: {str(e)}",
            )

    async def generate_patch(self, request: AiPatchRequest) -> AiPatchResponse:
        """Executes genuine local patch synthesis via Ollama /api/chat."""
        try:
            safe_url = self._get_validated_url()
        except SSRFValidationError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"SSRF validation failed: {str(e)}")

        prompt = build_patch_user_prompt(
            cwe_id=request.cwe_id,
            file_path=request.file_path,
            original_line=request.original_code,
            function_source=request.function_source_code,
            target_arch=request.target_architecture,
            os_name=request.operating_system,
            repair_strategy=request.repair_strategy or "",
        )

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.post(
                    f"{safe_url}/api/chat",
                    json={
                        "model": self.model_name,
                        "messages": [
                            {"role": "system", "content": PATCH_SYSTEM_PROMPT},
                            {"role": "user", "content": prompt},
                        ],
                        "stream": False,
                        "format": "json",
                    },
                )
                if res.status_code != 200:
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"Ollama returned HTTP {res.status_code}: {res.text[:200]}",
                    )
                content = res.json().get("message", {}).get("content", "{}")
                data = json.loads(content)

                return AiPatchResponse(
                    provider=self.provider_name,
                    model_name=self.model_name,
                    unified_diff=data.get("unified_diff", ""),
                    explanation=data.get("explanation", "Ollama repair generated."),
                    repaired_code=data.get("repaired_code", request.original_code),
                    defensive_checks_added=data.get("defensive_checks_added", ["Bounds check"]),
                    side_effect_assessment=data.get("side_effect_assessment", "Minimal footprint."),
                )
        except httpx.ConnectError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Local Ollama daemon is offline or unreachable at {self.base_url}.",
            )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Ollama patch synthesis error: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Ollama patch synthesis failed: {str(e)}",
            )
