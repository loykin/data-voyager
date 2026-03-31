import { useMutation, useQueryClient } from '@tanstack/react-query'
import { datasourceApi, datasourceKeys } from '@/entities/datasource'
import type { CreateConnectionRequest } from '@/entities/datasource'

export const useCreateDatasource = () => {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (data: CreateConnectionRequest) => datasourceApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: datasourceKeys.all })
    },
  })

  return {
    createDatasource: mutation.mutateAsync,
    creating: mutation.isPending,
    error: mutation.error?.message ?? null,
    reset: mutation.reset,
  }
}
