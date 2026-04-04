import { useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import type { PluginContext } from '@data-voyager/sdk'
import { http } from '@/shared/api/http'

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
          return http.get(url)
        },
        post: (path, body) => http.post(path, body),
        put: (path, body) => http.put(path, body),
        delete: (path) => http.delete(path),
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
