import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { datasourceApi } from '../api/datasource.api'
import type { UpdateConnectionRequest, CreateConnectionRequest, TestConnectionRequest, ConnectionTestResult } from '@/features/datasource'

// Query keys
export const datasourceKeys = {
  all: ['connections'] as const,
  filtered: (type?: string) => ['connections', { type }] as const,
  one: (id: string) => ['connections', id] as const,
}

// Read
export const useDatasources = (type?: string) => {
  return useQuery({
    queryKey: datasourceKeys.filtered(type),
    queryFn: () => datasourceApi.getList(type),
  })
}

export const useDatasource = (id: string) => {
  return useQuery({
    queryKey: datasourceKeys.one(id),
    queryFn: () => datasourceApi.getOne(id),
    enabled: !!id,
  })
}

// Mutations
export const useDeleteDatasource = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => datasourceApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: datasourceKeys.all })
    },
  })
}

export const useUpdateDatasource = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateConnectionRequest }) =>
      datasourceApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: datasourceKeys.all })
      queryClient.invalidateQueries({ queryKey: datasourceKeys.one(id) })
    },
  })
}

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
