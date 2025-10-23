/**
 * Datasource Hooks - Built on top of Refine.dev hooks
 * 
 * These hooks provide a convenient API for working with datasources
 * while leveraging Refine's built-in data management capabilities.
 */

import { useList, useCreate, useUpdate, useDelete, useCustomMutation, useCustom } from '@refinedev/core';
import { DataSource, ConnectionConfig, ConnectionTestResult, QueryResult, SchemaInfo } from '../types/datasource.types';

/**
 * Hook for managing datasources list and CRUD operations
 * Uses Refine's useList, useCreate, useUpdate, useDelete hooks
 */
export const useDatasources = () => {
  // Fetch datasources list
  const listResult = useList<DataSource>({
    resource: 'datasources',
  });

  // Create mutation
  const { mutateAsync: createMutation } = useCreate<DataSource>();

  // Update mutation  
  const { mutateAsync: updateMutation } = useUpdate<DataSource>();

  // Delete mutation
  const { mutateAsync: deleteMutation } = useDelete();

  const createDataSource = async (datasource: Omit<DataSource, 'id' | 'createdAt' | 'updatedAt'>): Promise<DataSource> => {
    const result = await createMutation({
      resource: 'datasources',
      values: datasource,
    });
    return result.data;
  };

  const updateDataSource = async (id: number, datasource: Partial<DataSource>): Promise<DataSource> => {
    const result = await updateMutation({
      resource: 'datasources',
      id,
      values: datasource,
    });
    return result.data;
  };

  const deleteDataSource = async (id: number): Promise<void> => {
    await deleteMutation({
      resource: 'datasources',
      id,
    });
  };

  return {
    datasources: listResult.result?.data || [],
    loading: listResult.query.isLoading,
    error: listResult.query.isError ? (listResult.query.error?.message || 'Failed to fetch datasources') : null,
    refetch: listResult.query.refetch,
    createDataSource,
    updateDataSource,
    deleteDataSource,
  };
};

/**
 * Hook for testing datasource connections
 * Uses Refine's useCustomMutation hook for custom API endpoints
 */
export const useConnectionTest = () => {
  const customMutation = useCustomMutation<ConnectionTestResult>();

  const testConnection = async (config: ConnectionConfig): Promise<ConnectionTestResult> => {
    return new Promise((resolve, reject) => {
      customMutation.mutate(
        {
          url: '/datasources/test',
          method: 'post',
          values: config,
        },
        {
          onSuccess: (data: any) => resolve(data.data),
          onError: (error: any) => reject(error),
        }
      );
    });
  };

  return {
    testConnection,
    testing: customMutation.mutation.isPending,
    testResult: customMutation.mutation.data?.data || null,
    testError: customMutation.mutation.error?.message || null,
  };
};

/**
 * Hook for fetching datasource schema
 * Uses Refine's useCustom hook
 */
export const useSchema = (datasourceId?: number) => {
  const schemaResult = useCustom<SchemaInfo>({
    url: datasourceId ? `/datasources/${datasourceId}/schema` : '',
    method: 'get',
    queryOptions: {
      enabled: !!datasourceId,
    },
  });

  const fetchSchema = async (id: number) => {
    // This will be handled by changing the datasourceId parameter
    // or by manually calling refetch
    await schemaResult.query.refetch();
  };

  return {
    schema: schemaResult.query.data?.data || null,
    loading: schemaResult.query.isLoading,
    error: schemaResult.query.isError ? (schemaResult.query.error?.message || null) : null,
    fetchSchema,
  };
};

/**
 * Hook for executing queries
 * Uses Refine's useCustomMutation hook
 */
export const useQuery = () => {
  const customMutation = useCustomMutation<QueryResult>();

  const executeQuery = async (datasourceId: number, query: string, params?: any[]): Promise<QueryResult> => {
    return new Promise((resolve, reject) => {
      customMutation.mutate(
        {
          url: `/datasources/${datasourceId}/query`,
          method: 'post',
          values: { query, params },
        },
        {
          onSuccess: (data: any) => resolve(data.data),
          onError: (error: any) => reject(error),
        }
      );
    });
  };

  return {
    executeQuery,
    loading: customMutation.mutation.isPending,
    result: customMutation.mutation.data?.data || null,
    error: customMutation.mutation.error?.message || null,
  };
};