import { DataSourceApiClient } from '@/features/datasource/api/client';
import { DataSourceType } from '@/features/datasource';

// Mock fetch
global.fetch = jest.fn();

describe('DataSourceApiClient', () => {
  let client: DataSourceApiClient;
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    client = new DataSourceApiClient('http://test-api.com');
    mockFetch.mockClear();
  });

  describe('getDataSources', () => {
    it('should fetch datasources successfully', async () => {
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

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockDatasources,
      } as Response);

      const result = await client.getDataSources();

      expect(mockFetch).toHaveBeenCalledWith('http://test-api.com/datasources');
      expect(result).toEqual(mockDatasources);
    });

    it('should throw error when fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      } as Response);

      await expect(client.getDataSources()).rejects.toThrow('Failed to fetch datasources: Internal Server Error');
    });
  });

  describe('createDataSource', () => {
    it('should create datasource successfully', async () => {
      const newDatasource = {
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
        ...newDatasource,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createdDatasource,
      } as Response);

      const result = await client.createDataSource(newDatasource);

      expect(mockFetch).toHaveBeenCalledWith('http://test-api.com/datasources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newDatasource),
      });
      expect(result).toEqual(createdDatasource);
    });
  });

  describe('testConnection', () => {
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

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => testResult,
      } as Response);

      const result = await client.testConnection(config);

      expect(mockFetch).toHaveBeenCalledWith('http://test-api.com/datasources/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });
      expect(result).toEqual(testResult);
    });
  });

  describe('executeQuery', () => {
    it('should execute query successfully', async () => {
      const query = 'SELECT * FROM users';
      const params = ['test'];
      const queryResult = {
        columns: [
          { name: 'id', type: 'int', nullable: false },
          { name: 'name', type: 'varchar', nullable: true },
        ],
        rows: [[1, 'John'], [2, 'Jane']],
        stats: {
          executionTime: 100,
          rowsReturned: 2,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => queryResult,
      } as Response);

      const result = await client.executeQuery(1, query, params);

      expect(mockFetch).toHaveBeenCalledWith('http://test-api.com/datasources/1/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          params,
        }),
      });
      expect(result).toEqual(queryResult);
    });
  });
});