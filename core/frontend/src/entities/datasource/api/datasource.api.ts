import { apiClient } from '@/generated/api/client'
import type { components } from '@/generated/api/schema.d.ts'

type Connection = components['schemas']['Connection']
type CreateConnectionRequest = components['schemas']['CreateConnectionRequest']
type UpdateConnectionRequest = components['schemas']['UpdateConnectionRequest']
type ConnectionTestResult = components['schemas']['ConnectionTestResult']
type TestConnectionRequest = components['schemas']['TestConnectionRequest']

export const datasourceApi = {
  getList: async (type?: string): Promise<Connection[]> => {
    const { data, error } = await apiClient.GET('/connections', {
      params: { query: type ? { type } : undefined },
    })
    if (error) throw new Error((error as { error?: string }).error ?? 'Failed to fetch connections')
    return data.data
  },

  getOne: async (id: number): Promise<Connection> => {
    const { data, error } = await apiClient.GET('/connections/{id}', {
      params: { path: { id } },
    })
    if (error) throw new Error((error as { error?: string }).error ?? 'Connection not found')
    return data.data
  },

  create: async (body: CreateConnectionRequest): Promise<Connection> => {
    const { data, error } = await apiClient.POST('/connections', { body })
    if (error) throw new Error((error as { error?: string }).error ?? 'Failed to create connection')
    return data.data
  },

  update: async (id: number, body: UpdateConnectionRequest): Promise<Connection> => {
    const { data, error } = await apiClient.PUT('/connections/{id}', {
      params: { path: { id } },
      body,
    })
    if (error) throw new Error((error as { error?: string }).error ?? 'Failed to update connection')
    return data.data
  },

  remove: async (id: number): Promise<void> => {
    const { error } = await apiClient.DELETE('/connections/{id}', {
      params: { path: { id } },
    })
    if (error) throw new Error((error as { error?: string }).error ?? 'Failed to delete connection')
  },

  testById: async (id: number): Promise<ConnectionTestResult> => {
    const { data, error } = await apiClient.POST('/connections/{id}/test', {
      params: { path: { id } },
    })
    if (error) throw new Error((error as { error?: string }).error ?? 'Connection test failed')
    return data.data
  },

  testConfig: async (body: TestConnectionRequest): Promise<ConnectionTestResult> => {
    const { data, error, response } = await apiClient.POST('/connections/test', { body })
    if (error) {
      const msg = (error as { error?: string }).error
        ?? `Server error (${response?.status ?? 'unknown'})`
      throw new Error(msg)
    }
    return data.data
  },

  getTypes: async (): Promise<string[]> => {
    const { data, error } = await apiClient.GET('/connection-types')
    if (error) throw new Error((error as { error?: string }).error ?? 'Failed to fetch types')
    return data.data
  },
}
