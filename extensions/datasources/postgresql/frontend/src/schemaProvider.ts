import type { SchemaProvider, SchemaNode, PluginContext } from '@data-voyager/sdk';
import type { SchemaInfo, DatabaseInfo, TableInfo } from './types';

export const postgresSchemaProvider: SchemaProvider = {
  async getRootNodes(_ctx: PluginContext, connectionId: string): Promise<SchemaNode[]> {
    const schema = await fetchSchema(connectionId);
    // PostgreSQL: databases 배열이 실제로는 schema 목록 (public, pg_toast 등)
    return schema.databases.map((db: DatabaseInfo) => ({
      id: `schema/${db.name}`,
      label: db.name,
      type: 'schema' as const,
      hasChildren: db.tables.length > 0,
    }));
  },

  async getChildNodes(_ctx: PluginContext, connectionId: string, node: SchemaNode): Promise<SchemaNode[]> {
    if (node.type === 'schema') {
      const schema = await fetchSchema(connectionId);
      const schemaName = node.label;
      const db = schema.databases.find((d: DatabaseInfo) => d.name === schemaName);
      if (!db) return [];
      return db.tables.map((t: TableInfo) => ({
        id: `${node.id}/table/${t.name}`,
        label: t.name,
        type: (t.type?.toUpperCase().includes('VIEW') ? 'view' : 'table') as 'view' | 'table',
        hasChildren: (t.columns?.length ?? 0) > 0,
        meta: {
          rowCount: t.row_count != null ? t.row_count.toLocaleString() : undefined,
        },
      }));
    }

    if (node.type === 'table' || node.type === 'view') {
      // id 형식: schema/<schemaName>/table/<tableName>
      const schemaName = node.id.split('/')[1];
      const tableName = node.id.split('/')[3];
      const schema = await fetchSchema(connectionId);
      const db = schema.databases.find((d: DatabaseInfo) => d.name === schemaName);
      const table = db?.tables.find((t: TableInfo) => t.name === tableName);
      return (table?.columns ?? []).map((col) => ({
        id: `${node.id}/col/${col.name}`,
        label: col.name,
        type: 'column' as const,
        hasChildren: false,
        meta: { dataType: col.type, nullable: col.nullable },
      }));
    }

    return [];
  },

  getInsertText(node: SchemaNode): string {
    // id: schema/public/table/users/col/id → "public"."users"."id"
    const parts = node.id.split('/');
    // 홀수 인덱스가 실제 이름값 (schema=1, table=3, col=5)
    const names = parts.filter((_, i) => i % 2 === 1);
    return names.map((n) => `"${n}"`).join('.');
  },
};

// 스키마 캐시 (컴포넌트 언마운트 전까지 재사용)
const schemaCache = new Map<string, SchemaInfo>();

async function fetchSchema(connectionId: string): Promise<SchemaInfo> {
  if (schemaCache.has(connectionId)) {
    return schemaCache.get(connectionId)!;
  }
  const res = await fetch(`/api/v1/connections/${connectionId}/schema`);
  if (!res.ok) throw new Error('Failed to fetch schema');
  const json = await res.json();
  const schema: SchemaInfo = json.data;
  schemaCache.set(connectionId, schema);
  return schema;
}
