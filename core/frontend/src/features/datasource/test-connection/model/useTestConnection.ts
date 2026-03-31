import { useMutation } from '@tanstack/react-query'
import { datasourceApi } from '@/entities/datasource'
import type { TestConnectionRequest, ConnectionTestResult } from '@/entities/datasource'

export const useTestConnection = () => {
  const mutation = useMutation({
    mutationFn: (req: TestConnectionRequest) => datasourceApi.testConfig(req),
  })

  return {
    testConnection: mutation.mutateAsync,
    testing: mutation.isPending,
    testResult: mutation.data as ConnectionTestResult | null,
    testError: mutation.error?.message ?? null,
    reset: mutation.reset,
  }
}
