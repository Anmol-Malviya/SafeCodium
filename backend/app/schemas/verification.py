"""Safe Vibe AI — Verification Schemas & Contracts."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class CompileResultResponse(BaseModel):
    compiler_used: str
    target_file: str
    exit_code: int
    success: bool
    stdout: str
    stderr: str
    warnings_count: int
    errors_count: int
    diagnostics: List[str]


class DualCompileResponse(BaseModel):
    patch_id: str
    compiler_name: str
    pre_patch: CompileResultResponse
    post_patch: CompileResultResponse
    compilation_passed: bool
    status: str
    delta_summary: str


class SanitizerRunResponse(BaseModel):
    sanitizer_type: str
    exit_code: int
    passed: bool
    crash_detected: bool
    crash_type: Optional[str]
    report_output: str
    stack_trace: List[str]
    memory_leak_detected: bool = False


class DualSanitizerResponse(BaseModel):
    patch_id: str
    pre_patch_asan: SanitizerRunResponse
    post_patch_asan: SanitizerRunResponse
    pre_patch_ubsan: SanitizerRunResponse
    post_patch_ubsan: SanitizerRunResponse
    verification_passed: bool
    status: str
    summary: str


class TestCaseResponse(BaseModel):
    case_id: str
    case_name: str
    category: str
    input_vector: str
    expected_behavior: str
    pre_patch_passed: bool
    pre_patch_behavior: str
    post_patch_passed: bool
    post_patch_behavior: str
    regression_detected: bool
    vulnerability_neutralized: bool


class RegressionSuiteResponse(BaseModel):
    patch_id: str
    total_cases: int
    passed_cases: int
    failed_cases: int
    suite_passed: bool
    status: str
    cases: List[TestCaseResponse]
    summary: str


class VerificationStatusResponse(BaseModel):
    id: str
    patch_id: str
    pre_patch_compiler_exit: int
    post_patch_compiler_exit: int
    asan_exit_code: int
    asan_output: Optional[str]
    ubsan_exit_code: int
    ubsan_output: Optional[str]
    test_suite_passed: bool
    test_results_json: Optional[Dict[str, Any]]
    binary_size_delta_bytes: int
    final_status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
