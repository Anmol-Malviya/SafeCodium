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

export const getSystemHealth = async (): Promise<SystemHealthData> => {
  const response = await api.get<ApiResponse<SystemHealthData>>('/health');
  return response.data.data;
};

