"""Safe Vibe AI — AST & Syntax Static Security Analyzer."""

import os
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from backend.app.services.analysis.rules import STATIC_PATTERNS, SecurityFindingRaw

FUNC_DECL_PATTERN = re.compile(
    r"^(?:[A-Za-z0-9_*\s]+)\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)\s*\{?",
    re.MULTILINE,
)


class FunctionContext:
    def __init__(self, name: str, start_line: int, end_line: int, params: List[str]):
        self.name = name
        self.start_line = start_line
        self.end_line = end_line
        self.params = params


class AstSecurityScanner:
    """Parses C/C++ firmware files for CWE-120, CWE-787, CWE-476, and CWE-416."""

    @staticmethod
    def extract_functions(source_code: str) -> List[FunctionContext]:
        """Extracts function scopes and line boundaries from C source code."""
        functions = []
        lines = source_code.splitlines()
        current_func: Optional[FunctionContext] = None
        brace_depth = 0

        for idx, line in enumerate(lines, start=1):
            stripped = line.strip()

            # Ignore preprocessor directives
            if stripped.startswith("#"):
                continue

            # Look for function start if not currently inside a function
            if current_func is None:
                match = FUNC_DECL_PATTERN.match(stripped)
                if match and not stripped.endswith(";"):
                    func_name = match.group(1)
                    raw_params = match.group(2)
                    params = [p.strip() for p in raw_params.split(",") if p.strip()]
                    current_func = FunctionContext(func_name, idx, idx, params)
                    brace_depth = 0

            if current_func is not None:
                brace_depth += line.count("{") - line.count("}")
                if brace_depth <= 0 and "}" in line:
                    current_func.end_line = idx
                    functions.append(current_func)
                    current_func = None

        return functions

    @classmethod
    def scan_file(cls, file_path: Path, relative_path: str) -> List[SecurityFindingRaw]:
        """Performs static analysis on a single C/C++ source file."""
        findings: List[SecurityFindingRaw] = []

        try:
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()
        except Exception:
            return findings

        lines = content.splitlines()
        functions = cls.extract_functions(content)

        def get_enclosing_function(line_no: int) -> Optional[FunctionContext]:
            for fn in functions:
                if fn.start_line <= line_no <= fn.end_line:
                    return fn
            return None

        # 1. Check for CWE-120 (Unsafe string and memory functions)
        for idx, line in enumerate(lines, start=1):
            line_str = line.strip()
            if line_str.startswith("//") or line_str.startswith("/*"):
                continue

            fn = get_enclosing_function(idx)
            fn_name = fn.name if fn else None

            # Check strcpy, strcat, gets, sprintf
            if "strcpy" in line_str and "strncpy" not in line_str:
                match = re.search(r"\bstrcpy\s*\(\s*([^,]+),\s*([^)]+)\)", line_str)
                if match:
                    findings.append(SecurityFindingRaw(
                        cwe_id="CWE-120",
                        title="Unbounded Memory Copy via strcpy()",
                        severity="CRITICAL",
                        line_number=idx,
                        line_end=idx,
                        function_name=fn_name,
                        vulnerable_code=line_str,
                        explanation=f"strcpy() into destination '{match.group(1).strip()}' from '{match.group(2).strip()}' without checking bounds.",
                        scanner_source="safevibe_ast_detector",
                    ))

            elif "strcat" in line_str and "strncat" not in line_str:
                match = re.search(r"\bstrcat\s*\(\s*([^,]+),\s*([^)]+)\)", line_str)
                if match:
                    findings.append(SecurityFindingRaw(
                        cwe_id="CWE-120",
                        title="Unbounded String Concatenation via strcat()",
                        severity="HIGH",
                        line_number=idx,
                        line_end=idx,
                        function_name=fn_name,
                        vulnerable_code=line_str,
                        explanation="strcat() appends source without bounds validation on destination buffer.",
                        scanner_source="safevibe_ast_detector",
                    ))

            elif "gets(" in line_str:
                findings.append(SecurityFindingRaw(
                    cwe_id="CWE-120",
                    title="Inherently Dangerous Function gets()",
                    severity="CRITICAL",
                    line_number=idx,
                    line_end=idx,
                    function_name=fn_name,
                    vulnerable_code=line_str,
                    explanation="gets() is obsolete and inherently unsafe as it provides no buffer capacity limits.",
                    scanner_source="safevibe_ast_detector",
                ))

            # 2. Check for CWE-476 (NULL Pointer Dereference on parameters inside body)
            if fn and idx > fn.start_line:
                for param in fn.params:
                    # If parameter is a pointer
                    if "*" in param or "const" in param:
                        clean_param = param.replace("*", " ").replace("[", " ").replace("]", " ")
                        parts = clean_param.split()
                        param_name = parts[-1].strip() if parts else ""
                        if not param_name or param_name in {"char", "void", "int", "float", "double", "bool"} or param_name.startswith("char"):
                            continue

                        # Check if param_name is dereferenced safely using escaped name
                        safe_name = re.escape(param_name)
                        deref_pattern = rf"(\*{safe_name}\b|{safe_name}\[[^\]]+\]|{safe_name}->)"
                        if re.search(deref_pattern, line_str):
                            # Verify if there was an earlier NULL check for this parameter in the function
                            func_lines_before = lines[fn.start_line : idx - 1]
                            has_null_check = any(
                                f"{param_name} == NULL" in l or f"{param_name} == 0" in l or f"!{param_name}" in l or f"{param_name} != NULL" in l
                                for l in func_lines_before
                            )
                            if not has_null_check:
                                findings.append(SecurityFindingRaw(
                                    cwe_id="CWE-476",
                                    title=f"NULL Pointer Dereference on parameter '{param_name}'",
                                    severity="HIGH",
                                    line_number=idx,
                                    line_end=idx,
                                    function_name=fn_name,
                                    vulnerable_code=line_str,
                                    explanation=f"Pointer parameter '{param_name}' is dereferenced without prior NULL verification.",
                                    scanner_source="safevibe_ast_detector",
                                ))

            # 3. Check for CWE-416 (Use After Free)
            if "free(" in line_str:
                free_match = re.search(r"\bfree\s*\(\s*([A-Za-z0-9_]+)\s*\)", line_str)
                if free_match and fn:
                    freed_var = free_match.group(1).strip()
                    # Check subsequent lines in function for dereference of freed_var without reassignment
                    func_lines_after = lines[idx : fn.end_line]
                    for sub_idx, sub_line in enumerate(func_lines_after, start=idx + 1):
                        sub_str = sub_line.strip()
                        if f"{freed_var} =" in sub_str or f"{freed_var}=" in sub_str:
                            break  # Variable was reassigned
                        if re.search(rf"\b{freed_var}->|\*{freed_var}\b|{freed_var}\[[^\]]+\]", sub_str):
                            findings.append(SecurityFindingRaw(
                                cwe_id="CWE-416",
                                title=f"Use-After-Free of Pointer '{freed_var}'",
                                severity="CRITICAL",
                                line_number=sub_idx,
                                line_end=sub_idx,
                                function_name=fn_name,
                                vulnerable_code=sub_str,
                                explanation=f"Pointer '{freed_var}' is dereferenced after being released on line {idx}.",
                                scanner_source="safevibe_ast_detector",
                            ))
                            break

        return findings
