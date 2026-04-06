// 백엔드 sdk.SchemaInfo 구조와 대응하는 프론트엔드 타입
export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
}

export interface TableInfo {
  name: string;
  type: string;
  columns?: ColumnInfo[];
  row_count?: number;
  size_bytes?: number;
  description?: string;
}

export interface DatabaseInfo {
  name: string;
  tables: TableInfo[];
  description?: string;
}

export interface SchemaInfo {
  databases: DatabaseInfo[];
}
