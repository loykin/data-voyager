import { useMutation } from '@tanstack/react-query'
import { datasourceApi } from '@/entities/datasource'
import type { QueryResponse, TimeRange } from '@/entities/datasource'

export type QueryParams = {
  query: string
  variables?: Record<string, unknown>
  timeRange?: TimeRange
  limit?: number
}

export const useQueryExecution = (connectionId: number) => {
  const mutation = useMutation({
    mutationFn: (params: QueryParams): Promise<QueryResponse> =>
      datasourceApi.query(connectionId, {
        query: params.query,
        variables: params.variables,
        time_range: params.timeRange,
        limit: params.limit ?? 10000,
      }),
  })

  return {
    execute: mutation.mutateAsync,
    result: mutation.data ?? null,
    running: mutation.isPending,
    error: mutation.error?.message ?? null,
    reset: mutation.reset,
  }
}
