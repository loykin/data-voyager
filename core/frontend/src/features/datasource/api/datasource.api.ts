import { apiClient } from '@/generated/api/client'
import type { components } from '@/generated/api/schema.d.ts'

type Connection = components['schemas']['Connection']
type CreateConnectionRequest = components['schemas']['CreateConnectionRequest']
type UpdateConnectionRequest = components['schemas']['UpdateConnectionRequest']
type ConnectionTestResult = components['schemas']['ConnectionTestResult']
type TestConnectionRequest = components['schemas']['TestConnectionRequest']
type QueryRequest = components['schemas']['QueryRequest']
type QueryResponse = components['schemas']['QueryResponse']
type BatchQueryRequest = components['schemas']['BatchQueryRequest']
type BatchQueryResponse = components['schemas']['BatchQueryResponse']
type ConnectionHistory = components['schemas']['ConnectionHistory']

export type { Connection, CreateConnectionRequest, UpdateConnectionRequest, ConnectionHistory }

export const datasourceApi = {
  getList: async (type?: string): Promise<Connection[]> => {
    const { data, error } = await apiClient.GET('/connections', {
      params: { query: type ? { type } : undefined },
    })
    if (error) throw new Error((error as { error?: string }).error ?? 'Failed to fetch connections')
    return data.data
  },

  getOne: async (id: string): Promise<Connection> => {
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

  update: async (id: string, body: UpdateConnectionRequest): Promise<Connection> => {
    const { data, error } = await apiClient.PUT('/connections/{id}', {
      params: { path: { id } },
      body,
    })
    if (error) throw new Error((error as { error?: string }).error ?? 'Failed to update connection')
    return data.data
  },

  remove: async (id: string): Promise<void> => {
    const { error } = await apiClient.DELETE('/connections/{id}', {
      params: { path: { id } },
    })
    if (error) throw new Error((error as { error?: string }).error ?? 'Failed to delete connection')
  },

  testById: async (id: string): Promise<ConnectionTestResult> => {
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

  query: async (id: string, body: QueryRequest): Promise<QueryResponse> => {
    const { data, error } = await apiClient.POST('/connections/{id}/query', {
      params: { path: { id } },
      body,
    })
    if (error) throw new Error((error as { error?: string }).error ?? 'Query failed')
    return data
  },

  batchQuery: async (id: string, body: BatchQueryRequest): Promise<BatchQueryResponse> => {
    const { data, error } = await apiClient.POST('/connections/{id}/query/batch', {
      params: { path: { id } },
      body,
    })
    if (error) throw new Error((error as { error?: string }).error ?? 'Batch query failed')
    return data
  },

  listHistory: async (limit = 50, offset = 0): Promise<ConnectionHistory[]> => {
    const { data, error } = await apiClient.GET('/connections/history', {
      params: { query: { limit, offset } },
    })
    if (error) throw new Error((error as { error?: string }).error ?? 'Failed to fetch connection history')
    return data.data
  },

  listHistoryByConnection: async (id: string, limit = 50, offset = 0): Promise<ConnectionHistory[]> => {
    const { data, error } = await apiClient.GET('/connections/{id}/history', {
      params: { path: { id }, query: { limit, offset } },
    })
    if (error) throw new Error((error as { error?: string }).error ?? 'Failed to fetch connection history')
    return data.data
  },
}
