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

export const getVulnerabilityIotContext = async (vulnId: string): Promise<IotContextBundleData> => {
  const response = await api.get<ApiResponse<IotContextBundleData>>(`/iot-context/vulnerability/${vulnId}`);
  return response.data.data;
};

