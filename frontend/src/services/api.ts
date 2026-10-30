import axios from 'axios';

export interface SystemHealthData {
  status: string;
  uptime_seconds: number;
  os: string;
  python_version: string;
  total_ram_gb: number;
  free_ram_gb: number;
  gpu_detected: boolean;
  gpu_model: string | null;
  vram_total_mb: number | null;
  vram_free_mb: number | null;
  database_connected: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

export interface ProjectData {
  id: string;
  name: string;
  description: string | null;
  framework_type: string;
  source_type: string;
  original_path: string;
  shadow_path: string | null;
  file_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SourceFileData {
  relative_path: string;
  filename: string;
  extension: string;
  size_bytes: number;
  line_count: number;
}

export const getSystemHealth = async (): Promise<SystemHealthData> => {
  const response = await api.get<ApiResponse<SystemHealthData>>('/health');
  return response.data.data;
};

export const uploadProject = async (file: File, name?: string): Promise<ProjectData> => {
  const formData = new FormData();
  formData.append('file', file);
  if (name) {
    formData.append('name', name);
  }
  const response = await api.post<ApiResponse<ProjectData>>('/projects/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data.data;
};

export const listProjects = async (): Promise<ProjectData[]> => {
  const response = await api.get<ApiResponse<ProjectData[]>>('/projects');
  return response.data.data;
};

export interface VulnerabilityData {
  id: string;
  project_id: string;
  scan_id: string | null;
  cwe_id: string;
  title: string;
  severity: string;
  file_path: string;
  line_start: number;
  line_end: number;
  function_name: string | null;
  vulnerable_code: string;
  scanner_source: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ScanData {
  id: string;
  project_id: string;
  scanner_type: string;
  status: string;
  findings_count: number;
  created_at: string;
  updated_at: string;
}

export interface ScanDetailData {
  scan: ScanData;
  vulnerabilities: VulnerabilityData[];
}

export const triggerScan = async (projectId: string, scannerType: string = 'composite'): Promise<ScanDetailData> => {
  const response = await api.post<ApiResponse<ScanDetailData>>('/scans/run', {
    project_id: projectId,
    scanner_type: scannerType,
  });
  return response.data.data;
};

export const getScanDetails = async (scanId: string): Promise<ScanDetailData> => {
  const response = await api.get<ApiResponse<ScanDetailData>>(`/scans/${scanId}`);
  return response.data.data;
};

export interface EnrichedVulnerabilityData extends VulnerabilityData {
  cwe_name: string;
  cvss_base_score: number;
  cvss_vector: string;
  confidence: string;
  confidence_score: number;
  explanation: string;
  iot_impact: string;
  mitigation_strategies: string[];
}

export const getProjectVulnerabilities = async (projectId: string): Promise<VulnerabilityData[]> => {
  const response = await api.get<ApiResponse<VulnerabilityData[]>>(`/vulnerabilities/project/${projectId}`);
  return response.data.data;
};

export interface PeripheralSourceData {
  peripheral_type: string;
  identifier: string;
  description: string;
  risk_level: string;
}

export interface IotProjectContextSummaryData {
  project_id: string;
  framework_type: string;
  detected_peripherals: PeripheralSourceData[];
  total_source_files: number;
  memory_architecture: string;
  operating_system: string;
}

export interface IotContextBundleData {
  project_id: string;
  vulnerability_id: string;
  framework_type: string;
  target_architecture: string;
  operating_system: string;
  file_path: string;
  function_name: string | null;
  function_start_line: number | null;
  function_end_line: number | null;
  function_source_code: string;
  surrounding_context_snippet: string;
  peripheral_sources: PeripheralSourceData[];
  is_external_taint: boolean;
  memory_model_notes: string;
  defensive_idioms: string[];
}

export const getProjectFiles = async (projectId: string): Promise<SourceFileData[]> => {
  const response = await api.get<ApiResponse<SourceFileData[]>>(`/projects/${projectId}/files`);
  return response.data.data;
};

export const getVulnerabilityDetails = async (vulnId: string): Promise<EnrichedVulnerabilityData> => {
  const response = await api.get<ApiResponse<EnrichedVulnerabilityData>>(`/vulnerabilities/${vulnId}`);
  return response.data.data;
};

export const getProjectIotSummary = async (projectId: string): Promise<IotProjectContextSummaryData> => {
  const response = await api.get<ApiResponse<IotProjectContextSummaryData>>(`/iot-context/project/${projectId}`);
  return response.data.data;
};

export interface ProviderStatusData {
  provider_name: string;
  model_name: string;
  is_available: boolean;
  is_primary: boolean;
  status_message: string;
}

export interface AiReasoningRequestData {
  vulnerability_id: string;
  cwe_id: string;
  vulnerable_code: string;
  file_path: string;
  line_number: number;
  function_name?: string | null;
  function_source_code?: string | null;
  target_architecture?: string;
  operating_system?: string;
  peripheral_context?: string | null;
  provider?: string | null;
}

export interface AiReasoningResponseData {
  provider: string;
  model_name: string;
  root_cause_analysis: string;
  attack_vector_explanation: string;
  iot_hardware_impact: string;
  recommended_strategy: string;
  defensive_guidelines: string[];
  confidence_assessment: string;
}

export interface AiPatchRequestData {
  vulnerability_id: string;
  cwe_id: string;
  file_path: string;
  original_code: string;
  function_source_code: string;
  repair_strategy?: string | null;
  target_architecture?: string;
  operating_system?: string;
  provider?: string | null;
}

export interface AiPatchResponseData {
  provider: string;
  model_name: string;
  unified_diff: string;
  explanation: string;
  repaired_code: string;
  defensive_checks_added: string[];
  side_effect_assessment: string;
}

export const getVulnerabilityIotContext = async (vulnId: string): Promise<IotContextBundleData> => {
  const response = await api.get<ApiResponse<IotContextBundleData>>(`/iot-context/vulnerability/${vulnId}`);
  return response.data.data;
};

export const getAiProviders = async (): Promise<ProviderStatusData[]> => {
  const response = await api.get<ApiResponse<ProviderStatusData[]>>('/ai/providers');
  return response.data.data;
};

export const generateAiReasoning = async (request: AiReasoningRequestData): Promise<AiReasoningResponseData> => {
  const response = await api.post<ApiResponse<AiReasoningResponseData>>('/ai/reasoning', request);
  return response.data.data;
};

export const analyzeVulnerabilityRootCause = async (vulnId: string, provider?: string): Promise<AiReasoningResponseData> => {
  const url = provider ? `/reasoning/analyze/${vulnId}?provider=${provider}` : `/reasoning/analyze/${vulnId}`;
  const response = await api.post<ApiResponse<AiReasoningResponseData>>(url);
  return response.data.data;
};

export interface PatchData {
  id: string;
  vulnerability_id: string;
  ai_provider: string;
  model_name: string;
  unified_diff: string;
  root_cause_explanation: string;
  repair_strategy: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface PatchDetailData {
  patch: PatchData;
  defensive_checks_added: string[];
  side_effect_assessment: string;
}

export const generatePatch = async (
  vulnerabilityId: string,
  provider?: string,
  repairStrategy?: string,
): Promise<PatchDetailData> => {
  const response = await api.post<ApiResponse<PatchDetailData>>('/patches/generate', {
    vulnerability_id: vulnerabilityId,
    provider: provider || 'gemini',
    repair_strategy: repairStrategy,
  });
  return response.data.data;
};

export const getPatch = async (patchId: string): Promise<PatchData> => {
  const response = await api.get<ApiResponse<PatchData>>(`/patches/${patchId}`);
  return response.data.data;
};

export const listVulnerabilityPatches = async (vulnerabilityId: string): Promise<PatchData[]> => {
  const response = await api.get<ApiResponse<PatchData[]>>(`/patches/vulnerability/${vulnerabilityId}`);
  return response.data.data;
};

export const listProjectPatches = async (projectId: string): Promise<PatchData[]> => {
  const response = await api.get<ApiResponse<PatchData[]>>(`/patches/project/${projectId}`);
  return response.data.data;
};

export interface PatchCritiqueData {
  patch_id: string;
  critique_passed: boolean;
  critique_score: number;
  semantic_integrity: string;
  side_effects: string[];
  c_syntax_valid: boolean;
  bounds_safety: boolean;
  zero_heap_allocation: boolean;
  summary_verdict: string;
}

export interface PatchApplyData {
  patch_id: string;
  success: boolean;
  is_dry_run: boolean;
  target_file: string;
  original_code: string;
  patched_code: string;
  hunks_applied: number;
  hunks_total: number;
  status: string;
  diagnostics: string[];
}

export const critiquePatch = async (patchId: string): Promise<PatchCritiqueData> => {
  const response = await api.post<ApiResponse<PatchCritiqueData>>(`/patches/${patchId}/critique`);
  return response.data.data;
};

export const applyPatch = async (patchId: string, dryRun: boolean = false): Promise<PatchApplyData> => {
  const response = await api.post<ApiResponse<PatchApplyData>>(`/patches/${patchId}/apply`, {
    patch_id: patchId,
    dry_run: dryRun,
  });
  return response.data.data;
};

export interface CompileResultData {
  compiler_used: string;
  target_file: string;
  exit_code: number;
  success: boolean;
  stdout: string;
  stderr: string;
  warnings_count: number;
  errors_count: number;
  diagnostics: string[];
}

export interface DualCompileData {
  patch_id: string;
  compiler_name: string;
  pre_patch: CompileResultData;
  post_patch: CompileResultData;
  compilation_passed: boolean;
  status: string;
  delta_summary: string;
}

export interface VerificationStatusData {
  id: string;
  patch_id: string;
  pre_patch_compiler_exit: number;
  post_patch_compiler_exit: number;
  asan_exit_code: number;
  asan_output: string | null;
  ubsan_exit_code: number;
  ubsan_output: string | null;
  test_suite_passed: boolean;
  test_results_json: Record<string, any> | null;
  binary_size_delta_bytes: number;
  final_status: string;
  created_at: string;
  updated_at: string;
}

export const runDualCompilation = async (patchId: string): Promise<DualCompileData> => {
  const response = await api.post<ApiResponse<DualCompileData>>(`/verification/compile/${patchId}`);
  return response.data.data;
};

export const getVerificationStatus = async (patchId: string): Promise<VerificationStatusData> => {
  const response = await api.get<ApiResponse<VerificationStatusData>>(`/verification/status/${patchId}`);
  return response.data.data;
};

export interface SanitizerRunData {
  sanitizer_type: string;
  exit_code: number;
  passed: boolean;
  crash_detected: boolean;
  crash_type: string | null;
  report_output: string;
  stack_trace: string[];
  memory_leak_detected: boolean;
}

export interface DualSanitizerData {
  patch_id: string;
  pre_patch_asan: SanitizerRunData;
  post_patch_asan: SanitizerRunData;
  pre_patch_ubsan: SanitizerRunData;
  post_patch_ubsan: SanitizerRunData;
  verification_passed: boolean;
  status: string;
  summary: string;
}

export const runSanitizerVerification = async (patchId: string): Promise<DualSanitizerData> => {
  const response = await api.post<ApiResponse<DualSanitizerData>>(`/verification/sanitizers/${patchId}`);
  return response.data.data;
};

export interface TestCaseData {
  case_id: string;
  case_name: string;
  category: string;
  input_vector: string;
  expected_behavior: string;
  pre_patch_passed: boolean;
  pre_patch_behavior: string;
  post_patch_passed: boolean;
  post_patch_behavior: string;
  regression_detected: boolean;
  vulnerability_neutralized: boolean;
}

export interface RegressionSuiteData {
  patch_id: string;
  total_cases: number;
  passed_cases: number;
  failed_cases: number;
  suite_passed: boolean;
  status: string;
  cases: TestCaseData[];
  summary: string;
}

export const runRegressionSuite = async (patchId: string): Promise<RegressionSuiteData> => {
  const response = await api.post<ApiResponse<RegressionSuiteData>>(`/verification/regression/${patchId}`);
  return response.data.data;
};

export interface SectionMetricsData {
  text_bytes: number;
  data_bytes: number;
  bss_bytes: number;
  total_flash_bytes: number;
  total_ram_bytes: number;
}

export interface ResourceProfileData {
  patch_id: string;
  pre_patch_metrics: SectionMetricsData;
  post_patch_metrics: SectionMetricsData;
  flash_delta_bytes: number;
  ram_delta_bytes: number;
  flash_delta_percentage: number;
  ram_delta_percentage: number;
  is_resource_safe: boolean;
  verdict: string;
  summary: string;
  promoted_final_status: string;
}

export const runResourceProfiling = async (patchId: string): Promise<ResourceProfileData> => {
  const response = await api.post<ApiResponse<ResourceProfileData>>(`/verification/resource/${patchId}`);
  return response.data.data;
};






