import { useMutation } from '@tanstack/react-query'
import { datasourceApi } from '@/entities/datasource'
import type { BatchQueryResultItem, TimeRange } from '@/entities/datasource'

export type BatchQueryItem = {
  refId: string
  query: string
  variables?: Record<string, unknown>
  timeRange?: TimeRange
  limit?: number
}

export const useBatchQueryExecution = (connectionId: number) => {
  const mutation = useMutation({
    mutationFn: (items: BatchQueryItem[]): Promise<BatchQueryResultItem[]> =>
      datasourceApi
        .batchQuery(connectionId, {
          queries: items.map((item) => ({
            ref_id: item.refId,
            request: {
              query: item.query,
              variables: item.variables,
              time_range: item.timeRange,
              limit: item.limit ?? 10000,
            },
          })),
        })
        .then((r) => r.results),
  })

  return {
    execute: mutation.mutateAsync,
    results: mutation.data ?? null,
    running: mutation.isPending,
    error: mutation.error?.message ?? null,
    reset: mutation.reset,
  }
}
