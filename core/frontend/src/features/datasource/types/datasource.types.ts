export enum DataSourceType {
  ClickHouse = 'clickhouse',
  PostgreSQL = 'postgresql',
  SQLite = 'sqlite',
  OpenSearch = 'opensearch',
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
}

export interface TableInfo {
  name: string;
  type: string;
  columns?: ColumnInfo[];
  rowCount?: number;
  size?: number;
}

export interface DatabaseInfo {
  name: string;
  tables: TableInfo[];
}

export interface SchemaInfo {
  databases: DatabaseInfo[];
}

export interface QueryStats {
  executionTime: number; // in milliseconds
  rowsReturned: number;
}

export interface QueryResult {
  columns: ColumnInfo[];
  rows: any[][];
  stats: QueryStats;
}

export interface ConnectionConfig {
  type: DataSourceType;
  host: string;
  port: number;
  database: string;
  username?: string;
  password?: string;
  [key: string]: any;
}

export interface DataSource {
  id: number;
  name: string;
  type: DataSourceType;
  config: ConnectionConfig;
  description?: string;
  tags?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface ConnectionTestResult {
  isConnected: boolean;
  message: string;
  latency?: number;
  testedAt: string;
}

export interface ConnectionMetrics {
  openConnections: number;
  idleConnections: number;
  totalQueries: number;
  lastActivity: string;
}