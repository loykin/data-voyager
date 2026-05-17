import { useMutation } from '@tanstack/react-query'
import type { BatchQueryResultItem } from '@loykin/datasourcekit'
import { getDatasourceManager } from '@/features/datasource/api/datasource.manager'
import type { TimeRange } from '@/features/datasource'

export type BatchQueryItem = {
  refId: string
  query: string
  variables?: Record<string, unknown>
  timeRange?: TimeRange
  limit?: number
}

export const useBatchQueryExecution = (datasourceUid: string) => {
  const mutation = useMutation({
    mutationFn: (items: BatchQueryItem[]): Promise<BatchQueryResultItem[]> =>
      getDatasourceManager()
        .instances.batchQuery(
          items.map((item) => ({
            id: item.refId,
            datasourceUid,
            query: {
              text: item.query,
              limit: item.limit ?? 10000,
            },
          })),
          {
            variables: items[0]?.variables as Record<string, string | string[]> | undefined,
            timeRange: items[0]?.timeRange as { from: string; to: string } | undefined,
          },
        )
        .then((result) => result.items),
  })

  return {
    execute: mutation.mutateAsync,
    results: mutation.data ?? null,
    running: mutation.isPending,
    error: mutation.error?.message ?? null,
    reset: mutation.reset,
  }
}
