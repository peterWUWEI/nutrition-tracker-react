// Base URL for API calls. In development Vite proxies /api to the server
// (see vite.config.ts), so the default works both locally and in Docker.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

// Small wrapper around fetch that sends/receives JSON and throws on errors.
export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`
    try {
      const body: unknown = await response.json()
      if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
        message = body.error
      }
    } catch {
      // Response had no JSON body; keep the default message.
    }
    throw new ApiError(message, response.status)
  }

  // 204 No Content has no body to parse.
  if (response.status === 204) {
    return undefined as T
  }
  return (await response.json()) as T
}
