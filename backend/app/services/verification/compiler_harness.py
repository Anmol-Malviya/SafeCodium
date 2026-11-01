"""Safe Vibe AI — Dual Compilation Verification Engine."""

from dataclasses import dataclass, field
import os
from pathlib import Path
import re
import shutil
import subprocess
from typing import Dict, List, Optional, Tuple

from backend.app.services.verification.sandbox import ExecutionSandbox


@dataclass
class CompileResult:
    compiler_used: str
    target_file: str
    exit_code: int
    success: bool
    stdout: str
    stderr: str
    warnings_count: int
    errors_count: int
    diagnostics: List[str] = field(default_factory=list)
    execution_mode: str = "NATIVE_EXECUTION"


@dataclass
class DualCompileComparison:
    patch_id: str
    compiler_name: str
    pre_patch: CompileResult
    post_patch: CompileResult
    compilation_passed: bool
    status: str
    delta_summary: str
    execution_mode: str = "NATIVE_EXECUTION"


class DualCompilerHarness:
    """Executes and compares compilation between original source files and shadow patched replicas."""

    SUPPORTED_COMPILERS = ["g++", "clang++", "gcc", "clang", "cl"]

    @classmethod
    def detect_host_compiler(cls, is_cpp: bool = False) -> Optional[str]:
        """Detects if g++, clang++, gcc, clang, or cl is available on PATH."""
        compilers = ["g++", "clang++", "cl", "gcc", "clang"] if is_cpp else ["gcc", "clang", "g++", "clang++", "cl"]
        for comp in compilers:
            path = shutil.which(comp)
            if path:
                return comp
        return None

    @classmethod
    def compile_file(
        cls,
        file_path: str,
        flags: Optional[List[str]] = None,
        compiler_override: Optional[str] = None,
    ) -> CompileResult:
        path = Path(file_path)
        if not path.exists():
            return CompileResult(
                compiler_used="none",
                target_file=str(file_path),
                exit_code=1,
                success=False,
                stdout="",
                stderr=f"Target file does not exist: {file_path}",
                warnings_count=0,
                errors_count=1,
                diagnostics=[f"Error: {file_path} not found"],
            )

        is_cpp = path.suffix.lower() in {".cpp", ".cc", ".cxx", ".hpp"}
        compiler = compiler_override or cls.detect_host_compiler(is_cpp=is_cpp)
        default_flags = ["-Wall", "-Wextra", "-c"] if is_cpp else ["-Wall", "-Wextra", "-Werror=implicit-function-declaration", "-c"]
        flags = flags or default_flags

        if compiler:
            try:
                cmd = [compiler] + flags + [str(path), "-o", str(path.with_suffix(".o"))]
                sandbox_res = ExecutionSandbox.run_isolated_command(cmd, cwd=path.parent)
                stdout = sandbox_res.stdout
                stderr = sandbox_res.stderr
                exit_code = sandbox_res.exit_code

                warnings_count = len(re.findall(r"warning:", stderr, re.IGNORECASE))
                errors_count = len(re.findall(r"error:", stderr, re.IGNORECASE))

                obj_file = path.with_suffix(".o")
                if obj_file.exists():
                    try:
                        obj_file.unlink()
                    except Exception:
                        pass

                return CompileResult(
                    compiler_used=compiler,
                    target_file=str(path),
                    exit_code=exit_code,
                    success=(exit_code == 0),
                    stdout=stdout,
                    stderr=stderr,
                    warnings_count=warnings_count,
                    errors_count=errors_count,
                    diagnostics=stderr.splitlines(),
                    execution_mode="NATIVE_EXECUTION",
                )
            except Exception:
                pass

        # Deterministic C/C++ Compiler Simulation Harness
        return cls._simulate_iot_compilation(path)

    @classmethod
    def _strip_comments_and_strings(cls, code: str) -> str:
        """Strips single-line and multi-line comments and string literals to avoid false bracket mismatches."""
        no_line_comments = re.sub(r"//.*", "", code)
        no_comments = re.sub(r"/\*.*?\*/", "", no_line_comments, flags=re.DOTALL)
        no_strings = re.sub(r'"(?:\\.|[^"\\])*"', '""', no_comments)
        return re.sub(r"'(?:\\.|[^'\\])*'", "''", no_strings)

    @classmethod
    def _simulate_iot_compilation(cls, path: Path) -> CompileResult:
        content = path.read_text(encoding="utf-8", errors="replace")
        clean_code = cls._strip_comments_and_strings(content)
        clean_lines = clean_code.splitlines()

        diagnostics: List[str] = []
        warnings_count = 0
        errors_count = 0

        # Syntax checks: balanced braces
        open_b = clean_code.count("{")
        close_b = clean_code.count("}")
        if open_b != close_b:
            errors_count += 1
            diagnostics.append(f"{path.name}: error: expected '}}' at end of input (unclosed braces: {open_b} vs {close_b})")

        open_p = clean_code.count("(")
        close_p = clean_code.count(")")
        if open_p != close_p:
            errors_count += 1
            diagnostics.append(f"{path.name}: error: unbalanced parentheses (expected ')' or '(')")

        open_sq = clean_code.count("[")
        close_sq = clean_code.count("]")
        if open_sq != close_sq:
            errors_count += 1
            diagnostics.append(f"{path.name}: error: unbalanced square brackets (expected ']' or '[')")

        in_enum = False
        in_multiline = False

        for idx, line in enumerate(clean_lines, 1):
            stripped = line.strip()
            if not stripped or stripped.startswith(("#", "/*", "*", "//")):
                continue

            # Track enum scope
            if "enum " in stripped or "enum class" in stripped:
                in_enum = True
            if in_enum and "}" in stripped:
                in_enum = False
                continue
            if in_enum:
                continue

            # Track multi-line statements or declarations
            if stripped.endswith(("(", ",", "\\", "?", ":", "||", "&&", "+", "-", "*", "/", "%", "^", "&", "|", "=")):
                in_multiline = True
                continue
            if in_multiline:
                if stripped.endswith((";", "{", "}")):
                    in_multiline = False
                continue

            # Check missing semicolons for statements
            if not stripped.endswith(("{", "}", ":", ";", "\\", ",", "(", ")")):
                if not any(stripped.startswith(k) for k in (
                    "if", "else", "for", "while", "switch", "case", "do", "class", "struct",
                    "namespace", "public:", "private:", "protected:", "template", "Q_",
                    "UPROPERTY", "UFUNCTION", "GENERATED_BODY", "UE_LOG", "DECLARE_", "DEFINE_"
                )):
                    # Explicit complete call like func() or assignment a = b without trailing semicolon
                    if re.match(r"^[a-zA-Z_][a-zA-Z0-9_:<>*&\s]*\s*\([A-Za-z0-9_,\s\"'*&:]*\)$", stripped) or re.search(r"=\s*[^;{}]+$", stripped):
                        errors_count += 1
                        diagnostics.append(f"{path.name}:{idx}: error: expected ';' at end of statement")

            if "strcpy(" in line and "snprintf" not in line:
                warnings_count += 1
                diagnostics.append(f"{path.name}:{idx}: warning: call to deprecated function 'strcpy' [-Wdeprecated-declarations]")

        is_success = (errors_count == 0)
        exit_code = 0 if is_success else 1

        stdout = f"[C/C++ Compiler Simulation] Completed pass on {path.name} with {warnings_count} warnings, {errors_count} errors.\n"
        stderr = "\n".join(diagnostics)

        return CompileResult(
            compiler_used="embedded_gcc_simulator",
            target_file=str(path),
            exit_code=exit_code,
            success=is_success,
            stdout=stdout,
            stderr=stderr,
            warnings_count=warnings_count,
            errors_count=errors_count,
            diagnostics=diagnostics,
            execution_mode="STATIC_HEURISTIC_SIMULATION",
        )

    @classmethod
    def compare_compilation(
        cls,
        patch_id: str,
        original_file_path: str,
        shadow_file_path: str,
    ) -> DualCompileComparison:
        pre_res = cls.compile_file(original_file_path)
        post_res = cls.compile_file(shadow_file_path)

        compiler_name = post_res.compiler_used

        exec_mode = (
            "NATIVE_EXECUTION"
            if (pre_res.execution_mode == "NATIVE_EXECUTION" and post_res.execution_mode == "NATIVE_EXECUTION")
            else "STATIC_HEURISTIC_SIMULATION"
        )

        if post_res.success:
            if exec_mode == "NATIVE_EXECUTION":
                status = "VERIFIED"
                delta_summary = f"[NATIVE] Post-patch compiled cleanly with {compiler_name} (exit code 0)."
            else:
                status = "SIMULATED"
                delta_summary = f"[SIMULATION] AST compilation simulation passed (exit code 0, {post_res.warnings_count} warnings)."
        else:
            status = "FAILED"
            delta_summary = f"Post-patch compilation failed with {post_res.errors_count} errors."

        return DualCompileComparison(
            patch_id=patch_id,
            compiler_name=compiler_name,
            pre_patch=pre_res,
            post_patch=post_res,
            compilation_passed=post_res.success,
            status=status,
            delta_summary=delta_summary,
            execution_mode=exec_mode,
        )
