import { useMutation } from '@tanstack/react-query'
import { datasourceApi } from '@/entities/datasource'
import type { ConnectionConfig } from '@/entities/datasource'

export const useTestConnection = () => {
  const mutation = useMutation({
    mutationFn: (config: ConnectionConfig) => datasourceApi.testConnection(config),
  })

  return {
    testConnection: mutation.mutateAsync,
    testing: mutation.isPending,
    testResult: mutation.data ?? null,
    testError: mutation.error?.message ?? null,
    reset: mutation.reset,
  }
}
