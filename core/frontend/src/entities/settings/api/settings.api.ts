import { apiClient } from '@/generated/api/client'
import type { components } from '@/generated/api/schema.d.ts'

export type AISettingsData = components['schemas']['AISettingsData']
export type UpdateAISettingsRequest = components['schemas']['UpdateAISettingsRequest']

export const settingsApi = {
  getAI: async (): Promise<AISettingsData> => {
    const { data, error } = await apiClient.GET('/settings/ai')
    if (error) throw new Error((error as { error?: string }).error ?? 'Failed to fetch AI settings')
    return data
  },

  updateAI: async (body: UpdateAISettingsRequest): Promise<void> => {
    const { error } = await apiClient.PUT('/settings/ai', { body })
    if (error) throw new Error((error as { error?: string }).error ?? 'Failed to save AI settings')
  },
}
