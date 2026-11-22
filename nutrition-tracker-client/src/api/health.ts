import { apiRequest } from './client.ts'

export interface HealthStatus {
  status: 'ok' | 'error'
  database: 'up' | 'down'
}

export function getHealth(signal?: AbortSignal): Promise<HealthStatus> {
  return apiRequest<HealthStatus>('/health', { signal })
}
