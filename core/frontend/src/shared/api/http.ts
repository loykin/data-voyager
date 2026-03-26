const API_BASE_URL = '/api/v1'

interface ApiResponse<T> {
  data?: T
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`)
  }

  const result: ApiResponse<T> = await response.json()
  return (result.data ?? result) as T
}

export const http = {
  get: <T>(url: string) => apiFetch<T>(url, { method: 'GET' }),
  post: <T>(url: string, data?: unknown) =>
    apiFetch<T>(url, { method: 'POST', body: data ? JSON.stringify(data) : undefined }),
  put: <T>(url: string, data?: unknown) =>
    apiFetch<T>(url, { method: 'PUT', body: data ? JSON.stringify(data) : undefined }),
  delete: <T>(url: string) => apiFetch<T>(url, { method: 'DELETE' }),
}
