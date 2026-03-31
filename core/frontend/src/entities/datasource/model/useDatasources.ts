import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { datasourceApi } from '../api/datasource.api'
import type { UpdateConnectionRequest } from './datasource.types'

export const datasourceKeys = {
  all: ['connections'] as const,
  filtered: (type?: string) => ['connections', { type }] as const,
  one: (id: number) => ['connections', id] as const,
}

export const useDatasources = (type?: string) => {
  return useQuery({
    queryKey: datasourceKeys.filtered(type),
    queryFn: () => datasourceApi.getList(type),
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
    mutationFn: ({ id, data }: { id: number; data: UpdateConnectionRequest }) =>
      datasourceApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: datasourceKeys.all })
      queryClient.invalidateQueries({ queryKey: datasourceKeys.one(id) })
    },
  })
}
