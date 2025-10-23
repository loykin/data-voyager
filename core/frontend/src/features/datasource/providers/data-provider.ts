import { DataProvider } from '@refinedev/core';
import { api } from '@/features';
import { DataSource } from '@/features';

export const datasourceProvider: DataProvider = {
  getList: async ({ resource }) => {
    if (resource === 'datasources') {
      const datasources = await api.get<DataSource[]>('/datasources');
      return {
        data: datasources as any,
        total: datasources.length,
      };
    }
    throw new Error(`Resource ${resource} not supported`);
  },

  getOne: async ({ resource, id }) => {
    if (resource === 'datasources') {
      const datasource = await api.get<DataSource>(`/datasources/${id}`);
      return { data: datasource as any };
    }
    throw new Error(`Resource ${resource} not supported`);
  },

  create: async ({ resource, variables }) => {
    if (resource === 'datasources') {
      const datasource = await api.post<DataSource>('/datasources', variables);
      return { data: datasource as any };
    }
    throw new Error(`Resource ${resource} not supported`);
  },

  update: async ({ resource, id, variables }) => {
    if (resource === 'datasources') {
      const datasource = await api.put<DataSource>(`/datasources/${id}`, variables);
      return { data: datasource as any };
    }
    throw new Error(`Resource ${resource} not supported`);
  },

  deleteOne: async ({ resource, id }) => {
    if (resource === 'datasources') {
      await api.delete(`/datasources/${id}`);
      return { data: {} as any };
    }
    throw new Error(`Resource ${resource} not supported`);
  },

  getApiUrl: () => '/api/v1',

  custom: async ({ url, method = 'get', payload }) => {
    const apiMethod = (method as string).toLowerCase() as 'get' | 'post' | 'put' | 'delete';
    const result = await api[apiMethod](url!, payload);
    return { data: result as any };
  },
};
