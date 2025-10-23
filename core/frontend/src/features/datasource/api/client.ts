import { DataSource, ConnectionTestResult, QueryResult, SchemaInfo, ConnectionConfig } from '../types/datasource.types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

export class DataSourceApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // Data Source CRUD operations
  async createDataSource(datasource: Omit<DataSource, 'id' | 'createdAt' | 'updatedAt'>): Promise<DataSource> {
    const response = await fetch(`${this.baseUrl}/datasources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(datasource),
    });

    if (!response.ok) {
      throw new Error(`Failed to create datasource: ${response.statusText}`);
    }

    return response.json();
  }

  async getDataSources(): Promise<DataSource[]> {
    const response = await fetch(`${this.baseUrl}/datasources`);

    if (!response.ok) {
      throw new Error(`Failed to fetch datasources: ${response.statusText}`);
    }

    return response.json();
  }

  async getDataSource(id: number): Promise<DataSource> {
    const response = await fetch(`${this.baseUrl}/datasources/${id}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch datasource: ${response.statusText}`);
    }

    return response.json();
  }

  async updateDataSource(id: number, datasource: Partial<DataSource>): Promise<DataSource> {
    const response = await fetch(`${this.baseUrl}/datasources/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(datasource),
    });

    if (!response.ok) {
      throw new Error(`Failed to update datasource: ${response.statusText}`);
    }

    return response.json();
  }

  async deleteDataSource(id: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/datasources/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete datasource: ${response.statusText}`);
    }
  }

  // Connection testing
  async testConnection(config: ConnectionConfig): Promise<ConnectionTestResult> {
    const response = await fetch(`${this.baseUrl}/datasources/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      throw new Error(`Failed to test connection: ${response.statusText}`);
    }

    return response.json();
  }

  // Schema operations
  async getSchema(id: number): Promise<SchemaInfo> {
    const response = await fetch(`${this.baseUrl}/datasources/${id}/schema`);

    if (!response.ok) {
      throw new Error(`Failed to fetch schema: ${response.statusText}`);
    }

    return response.json();
  }

  // Query execution
  async executeQuery(id: number, query: string, params?: any[]): Promise<QueryResult> {
    const response = await fetch(`${this.baseUrl}/datasources/${id}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        params: params || [],
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to execute query: ${response.statusText}`);
    }

    return response.json();
  }
}

export const dataSourceApiClient = new DataSourceApiClient();