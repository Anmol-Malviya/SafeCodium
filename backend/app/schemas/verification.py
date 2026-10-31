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
    execution_mode: str = "NATIVE_EXECUTION"  # NATIVE_EXECUTION | STATIC_HEURISTIC_SIMULATION | UNAVAILABLE


class DualCompileResponse(BaseModel):
    patch_id: str
    compiler_name: str
    pre_patch: CompileResultResponse
    post_patch: CompileResultResponse
    compilation_passed: bool
    status: str
    delta_summary: str
    execution_mode: str = "NATIVE_EXECUTION"


class SanitizerRunResponse(BaseModel):
    sanitizer_type: str
    exit_code: int
    passed: bool
    crash_detected: bool
    crash_type: Optional[str]
    report_output: str
    stack_trace: List[str]
    memory_leak_detected: bool = False
    execution_mode: str = "NATIVE_EXECUTION"  # NATIVE_EXECUTION | STATIC_HEURISTIC_SIMULATION | UNAVAILABLE


class DualSanitizerResponse(BaseModel):
    patch_id: str
    pre_patch_asan: SanitizerRunResponse
    post_patch_asan: SanitizerRunResponse
    pre_patch_ubsan: SanitizerRunResponse
    post_patch_ubsan: SanitizerRunResponse
    verification_passed: bool
    status: str
    summary: str
    execution_mode: str = "NATIVE_EXECUTION"


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


class SectionMetricsResponse(BaseModel):
    text_bytes: int
    data_bytes: int
    bss_bytes: int
    total_flash_bytes: int
    total_ram_bytes: int


class ResourceProfileResponse(BaseModel):
    patch_id: str
    pre_patch_metrics: SectionMetricsResponse
    post_patch_metrics: SectionMetricsResponse
    flash_delta_bytes: int
    ram_delta_bytes: int
    flash_delta_percentage: float
    ram_delta_percentage: float
    is_resource_safe: bool
    verdict: str
    summary: str
    promoted_final_status: str


class VerificationStatusResponse(BaseModel):
    id: Optional[str] = None
    patch_id: str
    pre_patch_compiler_exit: Optional[int] = None
    post_patch_compiler_exit: Optional[int] = None
    asan_exit_code: Optional[int] = None
    asan_output: Optional[str]
    ubsan_exit_code: Optional[int] = None
    ubsan_output: Optional[str]
    test_suite_passed: Optional[bool] = None
    test_results_json: Optional[Dict[str, Any]]
    binary_size_delta_bytes: Optional[int] = None
    final_status: str = "PENDING"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

