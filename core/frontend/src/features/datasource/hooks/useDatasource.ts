import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { DatasourceCreateInput, DatasourceInstance, DatasourceUpdateInput } from '@loykin/datasourcekit'
import { getDatasourceManager, testDatasourceOptions } from '@/features/datasource'

// Query keys
export const datasourceKeys = {
  all: ['datasources'] as const,
  types: ['datasource-types'] as const,
  filtered: (type?: string) => ['datasources', { type }] as const,
  one: (uid: string) => ['datasources', uid] as const,
}

export const useDatasourceTypes = () => {
  return useQuery({
    queryKey: datasourceKeys.types,
    queryFn: () => getDatasourceManager().types.list(),
  })
}

// Read
export const useDatasources = (type?: string) => {
  return useQuery({
    queryKey: datasourceKeys.filtered(type),
    queryFn: () =>
      getDatasourceManager()
        .instances.list({ filter: type ? { type } : undefined })
        .then((result) => result.items as DatasourceInstance<Record<string, unknown>>[]),
  })
}

export const useDatasource = (id: string) => {
  return useQuery({
    queryKey: datasourceKeys.one(id),
    queryFn: () =>
      getDatasourceManager()
        .instances.get(id)
        .then((result) => result as DatasourceInstance<Record<string, unknown>>),
    enabled: !!id,
  })
}

// Mutations
export const useDeleteDatasource = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => getDatasourceManager().instances.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: datasourceKeys.all })
    },
  })
}

export const useUpdateDatasource = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: DatasourceUpdateInput<Record<string, unknown>> }) =>
      getDatasourceManager().instances.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: datasourceKeys.all })
      queryClient.invalidateQueries({ queryKey: datasourceKeys.one(id) })
    },
  })
}

export const useCreateDatasource = () => {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (data: DatasourceCreateInput<Record<string, unknown>>) =>
      getDatasourceManager().instances.create(data),
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

export const useTestDatasource = () => {
  const mutation = useMutation({
    mutationFn: ({ type, options }: { type: string; options: Record<string, unknown> }) =>
      testDatasourceOptions(type, options),
  })
  return {
    testDatasource: mutation.mutateAsync,
    testing: mutation.isPending,
    testResult: mutation.data ?? null,
    testError: mutation.error?.message ?? null,
    reset: mutation.reset,
  }
}
