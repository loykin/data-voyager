import { apiClient } from '@/generated/api/client'
import type { components } from '@/generated/api/schema.d.ts'
import type { AIConfig, CreateAIConfigRequest, UpdateAIConfigRequest } from '@/generated/api/client'

type AIConfigHistory = components['schemas']['AIConfigHistory']

export type { AIConfig, CreateAIConfigRequest, UpdateAIConfigRequest, AIConfigHistory }

function apiError(error: unknown, fallback: string): Error {
  return new Error((error as { error?: string } | null)?.error ?? fallback)
}

export const aiConfigApi = {
  list: async (): Promise<AIConfig[]> => {
    const { data, error } = await apiClient.GET('/ai-configs')
    if (error || !data) throw apiError(error, 'Failed to fetch AI configs')
    return data.data
  },

  getById: async (id: string): Promise<AIConfig> => {
    const { data, error } = await apiClient.GET('/ai-configs/{id}', {
      params: { path: { id } },
    })
    if (error || !data) throw apiError(error, 'Not found')
    return data.data
  },

  create: async (body: CreateAIConfigRequest): Promise<AIConfig> => {
    const { data, error } = await apiClient.POST('/ai-configs', { body })
    if (error || !data) throw apiError(error, 'Failed to create AI config')
    return data.data
  },

  update: async (id: string, body: UpdateAIConfigRequest): Promise<AIConfig> => {
    const { data, error } = await apiClient.PUT('/ai-configs/{id}', {
      params: { path: { id } },
      body,
    })
    if (error || !data) throw apiError(error, 'Failed to update AI config')
    return data.data
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await apiClient.DELETE('/ai-configs/{id}', {
      params: { path: { id } },
    })
    if (error) throw apiError(error, 'Failed to delete AI config')
  },

  activate: async (id: string): Promise<void> => {
    const { error } = await apiClient.POST('/ai-configs/{id}/activate', {
      params: { path: { id } },
    })
    if (error) throw apiError(error, 'Failed to activate AI config')
  },

  listHistory: async (limit = 50, offset = 0): Promise<AIConfigHistory[]> => {
    const { data, error } = await apiClient.GET('/ai-configs/history', {
      params: { query: { limit, offset } },
    })
    if (error || !data) throw apiError(error, 'Failed to fetch AI config history')
    return data.data
  },

  listHistoryByConfig: async (id: string, limit = 50, offset = 0): Promise<AIConfigHistory[]> => {
    const { data, error } = await apiClient.GET('/ai-configs/{id}/history', {
      params: { path: { id }, query: { limit, offset } },
    })
    if (error || !data) throw apiError(error, 'Failed to fetch AI config history')
    return data.data
  },
}
