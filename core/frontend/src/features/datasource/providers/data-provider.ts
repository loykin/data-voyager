import { DataProvider } from '@refinedev/core';
import { dataSourceApiClient } from '../api/client';

/**
 * Datasource Provider - Refine.dev DataProvider implementation
 * 
 * This is the central data integration point that connects your datasource API
 * with Refine's data hooks (useList, useCreate, useUpdate, useDelete, etc.)
 */
export const datasourceProvider: DataProvider = {
  getList: async ({ resource, pagination, filters, sorters, meta }) => {
    if (resource === 'datasources') {
      const datasources = await dataSourceApiClient.getDataSources();
      return {
        data: datasources as any,
        total: datasources.length,
      };
    }
    throw new Error(`Resource ${resource} not supported`);
  },

  getOne: async ({ resource, id, meta }) => {
    if (resource === 'datasources') {
      const datasource = await dataSourceApiClient.getDataSource(Number(id));
      return {
        data: datasource as any,
      };
    }
    throw new Error(`Resource ${resource} not supported`);
  },

  create: async ({ resource, variables, meta }) => {
    if (resource === 'datasources') {
      const datasource = await dataSourceApiClient.createDataSource(variables as any);
      return {
        data: datasource as any,
      };
    }
    throw new Error(`Resource ${resource} not supported`);
  },

  update: async ({ resource, id, variables, meta }) => {
    if (resource === 'datasources') {
      const datasource = await dataSourceApiClient.updateDataSource(Number(id), variables as any);
      return {
        data: datasource as any,
      };
    }
    throw new Error(`Resource ${resource} not supported`);
  },

  deleteOne: async ({ resource, id, meta }) => {
    if (resource === 'datasources') {
      await dataSourceApiClient.deleteDataSource(Number(id));
      return {
        data: {} as any,
      };
    }
    throw new Error(`Resource ${resource} not supported`);
  },

  getApiUrl: () => {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
  },

  /**
   * Custom methods for datasource-specific operations
   * Use Refine's useCustom hook to access these endpoints
   */
  custom: async ({ url, method, filters, sorters, payload, query, headers, meta }) => {
    // Connection testing
    if (url === '/datasources/test' && method === 'post') {
      const result = await dataSourceApiClient.testConnection(payload as any);
      return {
        data: result as any,
      };
    }

    // Schema fetching
    if (url?.includes('/schema') && method === 'get') {
      const idMatch = url.match(/\/datasources\/(\d+)\/schema/);
      if (idMatch) {
        const id = Number(idMatch[1]);
        const schema = await dataSourceApiClient.getSchema(id);
        return {
          data: schema as any,
        };
      }
    }

    // Query execution
    if (url?.includes('/query') && method === 'post') {
      const idMatch = url.match(/\/datasources\/(\d+)\/query/);
      if (idMatch && payload) {
        const id = Number(idMatch[1]);
        const queryPayload = payload as unknown as { query: string; params?: any[] };
        const result = await dataSourceApiClient.executeQuery(id, queryPayload.query, queryPayload.params);
        return {
          data: result as any,
        };
      }
    }

    throw new Error(`Custom method not supported: ${method} ${url}`);
  },
};