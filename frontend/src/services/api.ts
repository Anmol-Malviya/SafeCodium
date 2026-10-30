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

export const getProjectFiles = async (projectId: string): Promise<SourceFileData[]> => {
  const response = await api.get<ApiResponse<SourceFileData[]>>(`/projects/${projectId}/files`);
  return response.data.data;
};

