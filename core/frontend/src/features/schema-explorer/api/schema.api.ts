import { apiClient } from '@/generated/api/client'

// 백엔드 sdk.SchemaInfo 구조와 1:1 대응
export interface ColumnInfo {
  name: string
  type: string
  nullable: boolean
}

export interface TableInfo {
  name: string
  type: string // 'BASE TABLE' | 'VIEW' | 'MergeTree' 등 DB마다 다름
  columns?: ColumnInfo[]
  row_count?: number
  size_bytes?: number
  description?: string
}

export interface DatabaseInfo {
  name: string
  tables: TableInfo[]
  description?: string
}

export interface SchemaInfo {
  databases: DatabaseInfo[]
}

function apiError(error: unknown, fallback: string): Error {
  return new Error((error as { error?: string } | null)?.error ?? fallback)
}

export const schemaApi = {
  getSchema: async (datasourceUid: string): Promise<SchemaInfo> => {
    const { data, error } = await apiClient.GET('/datasources/{uid}/schema', {
      params: { path: { uid: datasourceUid } },
    })
    if (error || !data) throw apiError(error, 'Failed to fetch schema')
    // 백엔드가 { data: SchemaInfo } 형태로 반환
    return (data as unknown as { data: SchemaInfo }).data
  },
}
