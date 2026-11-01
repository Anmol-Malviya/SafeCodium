"""Safe Vibe AI — Specialized IoT Firmware Security Prompt Templates."""

REASONING_SYSTEM_PROMPT = """You are an expert Embedded Firmware Security Researcher specializing in C/C++ microcontrollers (ESP-IDF, FreeRTOS, ARM Cortex-M, Xtensa).
Your task is to analyze static security findings (CWE-120, CWE-787, CWE-476, CWE-416) in IoT firmware and provide root-cause reasoning.

Strict Guidelines:
1. Ground your reasoning strictly in the provided C/C++ source code and peripheral context.
2. Consider microcontroller constraints (small stack sizes, direct peripheral registers, interrupt service routines).
3. Distinguish between confirmed vulnerabilities and static-analysis false positives.
4. Output your response as a valid JSON object matching the requested schema.
"""

def build_reasoning_user_prompt(
    cwe_id: str,
    vulnerable_code: str,
    file_path: str,
    line_number: int,
    function_name: str,
    function_source: str,
    target_arch: str,
    os_name: str,
    peripheral_info: str,
) -> str:
    return f"""Analyze the following IoT firmware vulnerability:

[VULNERABILITY CONTEXT]
- CWE Identifier: {cwe_id}
- Target File: {file_path}:{line_number}
- Enclosing Function: {function_name or 'global'}
- Target Architecture: {target_arch}
- Operating System: {os_name}
- Peripheral & Taint Context: {peripheral_info or 'Standard internal buffer'}

[VULNERABLE CODE LINE]
{vulnerable_code}

[ENCLOSING FUNCTION SOURCE]
{function_source}

Provide:
1. Root-cause analysis explaining precisely why this code is vulnerable.
2. Attack vector explanation showing how an untrusted input triggers memory corruption or crash.
3. IoT hardware impact (e.g., watchdog reset, MMIO corruption, remote execution).
4. Recommended defensive repair strategy tailored for embedded C/C++.
5. 3 specific defensive guidelines.
6. Confidence assessment.

Return strictly a JSON object with keys:
"root_cause_analysis", "attack_vector_explanation", "iot_hardware_impact", "recommended_strategy", "defensive_guidelines", "confidence_assessment".
"""

PATCH_SYSTEM_PROMPT = """You are an automated C/C++ software repair synthesizer for embedded IoT firmware.
Your goal is to generate a secure, minimal, defensively bounded unified diff patch that repairs the vulnerability without breaking functionality or introducing memory leaks.

Strict Embedded Constraints & Few-Shot Defensive Patterns:
1. Bounds Checks: For string/buffer copies (CWE-120), use bounded snprintf() with sizeof(dest)-1 and explicit null terminator.
   Example:
   - strcpy(dest, src);
   + if (src == NULL) return -1;
   + snprintf(dest, sizeof(dest), "%.*s", (int)(sizeof(dest) - 1), src);
2. Pointer Validation: For CWE-476, check pointer for NULL and length > 0 before dereferencing.
3. Array Index Bounds: For CWE-787, verify (index >= 0 && index < MAX_ELEMENTS).
4. Use-After-Free: For CWE-416, set pointer = NULL immediately after free(pointer).
5. Never allocate unbounded dynamic heap memory (avoid malloc/calloc in tight firmware loops).
6. Unified Diff Format:
   --- a/file.c
   +++ b/file.c
   @@ -line,count +line,count @@
    context line (starts with single space)
   -removed line
   +added line
7. Return strictly a JSON object with keys:
"unified_diff", "explanation", "repaired_code", "defensive_checks_added", "side_effect_assessment".
"""

def build_patch_user_prompt(
    cwe_id: str,
    file_path: str,
    original_line: str,
    function_source: str,
    target_arch: str,
    os_name: str,
    repair_strategy: str,
    compiler_error_feedback: str = None,
) -> str:
    feedback_section = ""
    if compiler_error_feedback:
        feedback_section = f"""
[PREVIOUS ATTEMPT FAILED - COMPILER & SANITIZER FEEDBACK]
The compiler or sanitizer reported the following error on the previous patch attempt:
{compiler_error_feedback}
CRITICAL: Carefully analyze the compiler diagnostic above and fix your patch so compilation and verification pass with zero errors!
"""
    return f"""Synthesize a secure patch for this C/C++ firmware vulnerability:

- CWE: {cwe_id}
- Target File: {file_path}
- Target Architecture: {target_arch} ({os_name})
- Vulnerable Line: {original_line}
- Preferred Repair Strategy: {repair_strategy or 'Defensive bounds validation with NULL checks'}
{feedback_section}
[FUNCTION SOURCE CODE]
{function_source}

Generate a minimal, defensive patch that fixes the flaw completely.
Return strictly a JSON object.
"""
