import { useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import type { PluginContext } from '@data-voyager/sdk'

const BASE = '/api/v1'

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json() as Promise<T>
}

/**
 * Constructs a PluginContext that can be passed to plugin-registered components
 * (queryEditorComponent, configComponent, panelPlugin, etc.)
 */
export function usePluginContext(): PluginContext {
  const navigate = useNavigate()

  return useMemo(
    () => ({
      api: {
        get: (path, params) => {
          const url = params
            ? `${path}?${new URLSearchParams(params).toString()}`
            : path
          return apiFetch(url)
        },
        post: (path, body) => apiFetch(path, { method: 'POST', body: JSON.stringify(body) }),
        put: (path, body) => apiFetch(path, { method: 'PUT', body: JSON.stringify(body) }),
        delete: (path) => apiFetch(path, { method: 'DELETE' }),
      },
      auth: {
        hasPermission: () => true,
        currentUser: null,
      },
      alert: {
        fire: () => {},
        subscribe: () => () => {},
      },
      navigate,
    }),
    [navigate],
  )
}
