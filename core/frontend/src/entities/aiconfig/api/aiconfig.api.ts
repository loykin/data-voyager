import { apiClient } from '@/generated/api/client'
import type { AIConfig, CreateAIConfigRequest, UpdateAIConfigRequest } from '@/generated/api/client'

export type { AIConfig, CreateAIConfigRequest, UpdateAIConfigRequest }

export const aiConfigApi = {
  list: async (): Promise<AIConfig[]> => {
    const { data, error } = await apiClient.GET('/ai-configs')
    if (error) throw new Error((error as { error?: string }).error ?? 'Failed to fetch AI configs')
    return data.data
  },

  getById: async (id: string): Promise<AIConfig> => {
    const { data, error } = await apiClient.GET('/ai-configs/{id}', {
      params: { path: { id } },
    })
    if (error) throw new Error((error as { error?: string }).error ?? 'Not found')
    return data.data
  },

  create: async (body: CreateAIConfigRequest): Promise<AIConfig> => {
    const { data, error } = await apiClient.POST('/ai-configs', { body })
    if (error) throw new Error((error as { error?: string }).error ?? 'Failed to create AI config')
    return data.data
  },

  update: async (id: string, body: UpdateAIConfigRequest): Promise<AIConfig> => {
    const { data, error } = await apiClient.PUT('/ai-configs/{id}', {
      params: { path: { id } },
      body,
    })
    if (error) throw new Error((error as { error?: string }).error ?? 'Failed to update AI config')
    return data.data
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await apiClient.DELETE('/ai-configs/{id}', {
      params: { path: { id } },
    })
    if (error) throw new Error((error as { error?: string }).error ?? 'Failed to delete AI config')
  },

  activate: async (id: string): Promise<void> => {
    const { error } = await apiClient.POST('/ai-configs/{id}/activate', {
      params: { path: { id } },
    })
    if (error) throw new Error((error as { error?: string }).error ?? 'Failed to activate AI config')
  },
}
