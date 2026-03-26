import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { datasourceApi } from '../api/datasource.api'
import type { DataSource } from './datasource.types'

export const datasourceKeys = {
  all: ['datasources'] as const,
  one: (id: number) => ['datasources', id] as const,
}

export const useDatasources = () => {
  return useQuery({
    queryKey: datasourceKeys.all,
    queryFn: datasourceApi.getList,
  })
}

export const useDatasource = (id: number) => {
  return useQuery({
    queryKey: datasourceKeys.one(id),
    queryFn: () => datasourceApi.getOne(id),
    enabled: !!id,
  })
}

export const useDeleteDatasource = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => datasourceApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: datasourceKeys.all })
    },
  })
}

export const useUpdateDatasource = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<DataSource> }) =>
      datasourceApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: datasourceKeys.all })
      queryClient.invalidateQueries({ queryKey: datasourceKeys.one(id) })
    },
  })
}
