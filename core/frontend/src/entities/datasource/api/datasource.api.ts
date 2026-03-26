import { http } from '@/shared/api/http'
import type { DataSource, ConnectionTestResult } from '@/entities/datasource'

export const datasourceApi = {
  getList: () => http.get<DataSource[]>('/datasources'),

  getOne: (id: number) => http.get<DataSource>(`/datasources/${id}`),

  create: (data: Omit<DataSource, 'id' | 'createdAt' | 'updatedAt'>) =>
    http.post<DataSource>('/datasources', data),

  update: (id: number, data: Partial<DataSource>) =>
    http.put<DataSource>(`/datasources/${id}`, data),

  remove: (id: number) => http.delete<void>(`/datasources/${id}`),

  testConnection: (config: DataSource['config']) =>
    http.post<ConnectionTestResult>('/datasources/test', config),
}
