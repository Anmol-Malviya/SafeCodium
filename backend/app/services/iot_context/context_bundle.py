"""Safe Vibe AI — IoT Context Bundle Synthesizer."""

from pathlib import Path
from typing import List, Optional
from pydantic import BaseModel

from backend.app.models.project import Project, Vulnerability
from backend.app.services.analysis.ast_scanner import AstSecurityScanner
from backend.app.services.iot_context.peripheral_analyzer import PeripheralAnalyzer, PeripheralSource


class IotContextBundle(BaseModel):
    project_id: str
    vulnerability_id: str
    framework_type: str  # esp_idf, arduino, generic_c
    target_architecture: str  # Xtensa / ARM Cortex-M / Generic
    operating_system: str  # FreeRTOS / Bare-Metal
    file_path: str
    function_name: Optional[str]
    function_start_line: Optional[int]
    function_end_line: Optional[int]
    function_source_code: str
    surrounding_context_snippet: str
    peripheral_sources: List[PeripheralSource]
    is_external_taint: bool
    memory_model_notes: str
    defensive_idioms: List[str]


class IotContextBuilder:
    """Builds deep contextual bundles for vulnerabilities to guide defensive AI repair."""

    @classmethod
    def build_bundle(cls, project: Project, vuln: Vulnerability) -> IotContextBundle:
        """Constructs an IoT context bundle for a vulnerability."""
        shadow_dir = Path(project.shadow_path)
        target_file = shadow_dir / vuln.file_path

        full_content = ""
        lines = []
        if target_file.exists() and target_file.is_file():
            try:
                full_content = target_file.read_text(encoding="utf-8", errors="replace")
                lines = full_content.splitlines()
            except Exception:
                pass

        # Extract function scope if possible
        functions = AstSecurityScanner.extract_functions(full_content)
        enclosing_func = None
        for fn in functions:
            if fn.start_line <= vuln.line_start <= fn.end_line:
                enclosing_func = fn
                break

        function_code = ""
        fn_start = None
        fn_end = None
        if enclosing_func and lines:
            fn_start = enclosing_func.start_line
            fn_end = enclosing_func.end_line
            function_code = "\n".join(lines[fn_start - 1 : fn_end])
        elif lines:
            # Fallback: slice 10 lines around vulnerability
            start = max(0, vuln.line_start - 6)
            end = min(len(lines), vuln.line_start + 6)
            function_code = "\n".join(lines[start:end])

        # Extract surrounding context (± 5 lines around line_start)
        surrounding_lines = []
        if lines:
            s_start = max(0, vuln.line_start - 6)
            s_end = min(len(lines), vuln.line_start + 5)
            surrounding_lines = lines[s_start:s_end]
        surrounding_snippet = "\n".join(surrounding_lines)

        # Detect peripheral sources in the function and enclosing code
        peripheral_sources = PeripheralAnalyzer.analyze_snippet(function_code or vuln.vulnerable_code)
        has_external_taint = any(p.risk_level == "UNTRUSTED_EXTERNAL" for p in peripheral_sources)

        # Determine OS & architecture defaults
        is_esp = project.framework_type == "esp_idf" or "esp_" in full_content or "freertos" in full_content.lower()
        operating_system = "FreeRTOS" if ("freertos" in full_content.lower() or is_esp) else "Bare-Metal"
        target_arch = "Xtensa LX6/LX7 (ESP32)" if is_esp else "ARM Cortex-M (Generic Embedded)"

        # Defensive idioms according to framework
        defensive_idioms = [
            "Validate all pointer inputs against NULL before dereferencing.",
            "Use snprintf() or strlcpy() with explicit sizeof(dest) - 1 bounds.",
            "Avoid dynamic memory allocation (malloc) inside real-time interrupt handlers or tight loops.",
        ]
        if is_esp:
            defensive_idioms.append("Return standard esp_err_t (e.g. ESP_ERR_INVALID_ARG) on parameter check failures.")
            defensive_idioms.append("Protect shared buffers with FreeRTOS mutexes or semaphore locks.")

        memory_model_notes = (
            "Embedded stack is strictly constrained (typically 2KB–4KB per task). "
            "Stack buffer overflows instantly corrupt task control blocks (TCBs) or adjacent ISR stacks."
        )

        return IotContextBundle(
            project_id=project.id,
            vulnerability_id=vuln.id,
            framework_type=project.framework_type,
            target_architecture=target_arch,
            operating_system=operating_system,
            file_path=vuln.file_path,
            function_name=vuln.function_name,
            function_start_line=fn_start,
            function_end_line=fn_end,
            function_source_code=function_code,
            surrounding_context_snippet=surrounding_snippet,
            peripheral_sources=peripheral_sources,
            is_external_taint=has_external_taint,
            memory_model_notes=memory_model_notes,
            defensive_idioms=defensive_idioms,
        )
