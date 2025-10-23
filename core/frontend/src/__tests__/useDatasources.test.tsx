import { renderHook, act, waitFor } from '@testing-library/react';
import { useDatasources, useConnectionTest } from '@/features/datasource';
import { dataSourceApiClient } from '@/features/datasource/api/client';
import { DataSourceType } from '@/features/datasource';

// Mock the API client
jest.mock('@/features/datasource/api/client', () => ({
  dataSourceApiClient: {
    getDataSources: jest.fn(),
    createDataSource: jest.fn(),
    updateDataSource: jest.fn(),
    deleteDataSource: jest.fn(),
    testConnection: jest.fn(),
  },
}));

const mockApiClient = dataSourceApiClient as jest.Mocked<typeof dataSourceApiClient>;

describe('useDatasources', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch datasources on mount', async () => {
    const mockDatasources = [
      {
        id: 1,
        name: 'Test DB',
        type: DataSourceType.PostgreSQL,
        config: {
          type: DataSourceType.PostgreSQL,
          host: 'localhost',
          port: 5432,
          database: 'testdb',
        },
        isActive: true,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      },
    ];

    mockApiClient.getDataSources.mockResolvedValue(mockDatasources);

    const { result } = renderHook(() => useDatasources());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.datasources).toEqual(mockDatasources);
    expect(result.current.error).toBeNull();
    expect(mockApiClient.getDataSources).toHaveBeenCalledTimes(1);
  });

  it('should handle fetch error', async () => {
    const errorMessage = 'Failed to fetch';
    mockApiClient.getDataSources.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useDatasources());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.datasources).toEqual([]);
    expect(result.current.error).toBe(errorMessage);
  });

  it('should create datasource', async () => {
    const existingDatasource = {
      id: 1,
      name: 'Existing DB',
      type: DataSourceType.PostgreSQL,
      config: {
        type: DataSourceType.PostgreSQL,
        host: 'localhost',
        port: 5432,
        database: 'existing',
      },
      isActive: true,
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
    };

    const newDatasourceInput = {
      name: 'New DB',
      type: DataSourceType.ClickHouse,
      config: {
        type: DataSourceType.ClickHouse,
        host: 'localhost',
        port: 9000,
        database: 'default',
      },
      isActive: true,
    };

    const createdDatasource = {
      id: 2,
      ...newDatasourceInput,
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
    };

    mockApiClient.getDataSources.mockResolvedValue([existingDatasource]);
    mockApiClient.createDataSource.mockResolvedValue(createdDatasource);

    const { result } = renderHook(() => useDatasources());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      const created = await result.current.createDataSource(newDatasourceInput);
      expect(created).toEqual(createdDatasource);
    });

    expect(result.current.datasources).toHaveLength(2);
    expect(result.current.datasources).toContain(createdDatasource);
  });

  it('should delete datasource', async () => {
    const datasources = [
      {
        id: 1,
        name: 'DB 1',
        type: DataSourceType.PostgreSQL,
        config: {
          type: DataSourceType.PostgreSQL,
          host: 'localhost',
          port: 5432,
          database: 'db1',
        },
        isActive: true,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      },
      {
        id: 2,
        name: 'DB 2',
        type: DataSourceType.ClickHouse,
        config: {
          type: DataSourceType.ClickHouse,
          host: 'localhost',
          port: 9000,
          database: 'default',
        },
        isActive: true,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      },
    ];

    mockApiClient.getDataSources.mockResolvedValue(datasources);
    mockApiClient.deleteDataSource.mockResolvedValue();

    const { result } = renderHook(() => useDatasources());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.deleteDataSource(1);
    });

    expect(result.current.datasources).toHaveLength(1);
    expect(result.current.datasources[0].id).toBe(2);
    expect(mockApiClient.deleteDataSource).toHaveBeenCalledWith(1);
  });
});

describe('useConnectionTest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should test connection successfully', async () => {
    const config = {
      type: DataSourceType.PostgreSQL,
      host: 'localhost',
      port: 5432,
      database: 'testdb',
    };

    const testResult = {
      isConnected: true,
      message: 'Connection successful',
      latency: 50,
      testedAt: '2023-01-01T00:00:00Z',
    };

    mockApiClient.testConnection.mockResolvedValue(testResult);

    const { result } = renderHook(() => useConnectionTest());

    expect(result.current.testing).toBe(false);
    expect(result.current.testResult).toBeNull();

    await act(async () => {
      const result_ = await result.current.testConnection(config);
      expect(result_).toEqual(testResult);
    });

    expect(result.current.testing).toBe(false);
    expect(result.current.testResult).toEqual(testResult);
    expect(result.current.testError).toBeNull();
  });

  it('should handle connection test error', async () => {
    const config = {
      type: DataSourceType.PostgreSQL,
      host: 'invalid-host',
      port: 5432,
      database: 'testdb',
    };

    const errorMessage = 'Connection failed';
    mockApiClient.testConnection.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useConnectionTest());

    await act(async () => {
      try {
        await result.current.testConnection(config);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    expect(result.current.testing).toBe(false);
    expect(result.current.testError).toBe(errorMessage);
  });
});