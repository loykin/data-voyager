import type { SchemaProvider, SchemaNode, PluginContext } from '@data-voyager/sdk';
import type { SchemaInfo, DatabaseInfo, TableInfo } from './types';

export const clickhouseSchemaProvider: SchemaProvider = {
  async getRootNodes(_ctx: PluginContext, connectionId: string): Promise<SchemaNode[]> {
    const schema = await fetchSchema(connectionId);
    // ClickHouse: databases 배열이 실제 database 목록
    return schema.databases.map((db: DatabaseInfo) => ({
      id: `db/${db.name}`,
      label: db.name,
      type: 'database' as const,
      hasChildren: db.tables.length > 0,
    }));
  },

  async getChildNodes(_ctx: PluginContext, connectionId: string, node: SchemaNode): Promise<SchemaNode[]> {
    if (node.type === 'database') {
      const schema = await fetchSchema(connectionId);
      const dbName = node.label;
      const db = schema.databases.find((d: DatabaseInfo) => d.name === dbName);
      if (!db) return [];
      return db.tables.map((t: TableInfo) => ({
        id: `${node.id}/table/${t.name}`,
        label: t.name,
        // ClickHouse: type은 엔진 이름 (MergeTree, ReplicatedMergeTree, View 등)
        type: (t.type?.toLowerCase().includes('view') ? 'view' : 'table') as 'view' | 'table',
        hasChildren: (t.columns?.length ?? 0) > 0,
        meta: {
          rowCount: t.row_count != null ? t.row_count.toLocaleString() : undefined,
          comment: t.type, // 엔진 이름을 comment로 표시
        },
      }));
    }

    if (node.type === 'table' || node.type === 'view') {
      // id: db/<dbName>/table/<tableName>
      const dbName = node.id.split('/')[1];
      const tableName = node.id.split('/')[3];
      const schema = await fetchSchema(connectionId);
      const db = schema.databases.find((d: DatabaseInfo) => d.name === dbName);
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
    // id: db/default/table/events/col/timestamp → `default`.`events`.`timestamp`
    const parts = node.id.split('/');
    const names = parts.filter((_, i) => i % 2 === 1);
    return names.map((n) => `\`${n}\``).join('.');
  },
};

// 스키마 캐시
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
