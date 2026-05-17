import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { SchemaNode, SchemaProvider, PluginContext } from '@data-voyager/sdk'
import { schemaApi } from './api/schema.api'
import type { SchemaInfo, DatabaseInfo, TableInfo } from './api/schema.api'

// ─── generic fallback ────────────────────────────────────────────────────────
// schemaProvider 없는 플러그인을 위한 3단계 고정 트리 (database → table → column)

function dbToRootNodes(db: DatabaseInfo): SchemaNode {
  return {
    id: `db/${db.name}`,
    label: db.name,
    type: 'database',
    hasChildren: db.tables.length > 0,
  }
}

function tableToNode(dbId: string, table: TableInfo): SchemaNode {
  const type = table.type?.toLowerCase().includes('view') ? 'view' : 'table'
  return {
    id: `${dbId}/table/${table.name}`,
    label: table.name,
    type,
    hasChildren: (table.columns?.length ?? 0) > 0,
    meta: {
      rowCount: table.row_count != null ? table.row_count.toLocaleString() : undefined,
    },
  }
}

function buildFallbackProvider(schema: SchemaInfo): SchemaProvider {
  return {
    async getRootNodes() {
      return schema.databases.map(dbToRootNodes)
    },

    async getChildNodes(_ctx: PluginContext, _datasourceUid: string, node) {
      const parts = node.id.split('/')

      if (node.type === 'database') {
        const dbName = parts[1]
        const db = schema.databases.find((d: DatabaseInfo) => d.name === dbName)
        if (!db) return []
        return db.tables.map((t: TableInfo) => tableToNode(node.id, t))
      }

      if (node.type === 'table' || node.type === 'view') {
        // parts: ['db', dbName, 'table', tableName]
        const dbName = parts[1]
        const tableName = parts[3]
        const db = schema.databases.find((d: DatabaseInfo) => d.name === dbName)
        const table = db?.tables.find((t: TableInfo) => t.name === tableName)
        return (table?.columns ?? []).map((col: { name: string; type: string; nullable: boolean }) => ({
          id: `${node.id}/col/${col.name}`,
          label: col.name,
          type: 'column' as const,
          hasChildren: false,
          meta: { dataType: col.type, nullable: col.nullable },
        }))
      }

      return []
    },

    getInsertText(node) {
      return `"${node.label}"`
    },
  }
}

// ─── useSchemaTree ────────────────────────────────────────────────────────────

interface UseSchemaTreeOptions {
  datasourceUid: string
  provider?: SchemaProvider // 플러그인 제공, 없으면 fallback
  ctx: PluginContext
}

export interface TreeNode extends SchemaNode {
  children?: TreeNode[]
  loading?: boolean
  expanded?: boolean
}

export function useSchemaTree({ datasourceUid, provider, ctx }: UseSchemaTreeOptions) {
  const [nodes, setNodes] = useState<TreeNode[]>([])
  const [initialized, setInitialized] = useState(false)

  // 스키마 전체를 먼저 fetch (캐시 5분)
  const { isLoading, error, refetch } = useQuery({
    queryKey: ['datasource-schema', datasourceUid],
    queryFn: () => schemaApi.getSchema(datasourceUid),
    staleTime: 5 * 60 * 1000,
    enabled: !!datasourceUid,
    retry: 1,
    // 결과를 받으면 루트 노드 초기화
    select: (schema) => schema,
  })

  // 초기화: 스키마 fetch 완료 후 루트 노드 빌드
  const initialize = useCallback(
    async (schema: SchemaInfo) => {
      if (initialized) return
      const p = provider ?? buildFallbackProvider(schema)
      const roots = await p.getRootNodes(ctx, datasourceUid)
      setNodes(roots.map((n) => ({ ...n })))
      setInitialized(true)
    },
    [initialized, provider, ctx, datasourceUid],
  )

  // 노드 토글 (열기/닫기 + lazy load)
  const toggleNode = useCallback(
    async (nodeId: string, schema: SchemaInfo | undefined) => {
      const p = provider ?? (schema ? buildFallbackProvider(schema) : null)
      if (!p) return

      setNodes((prev) => updateNode(prev, nodeId, (node) => ({ ...node, loading: !node.expanded })))

      const targetNode = findNode(nodes, nodeId)
      if (!targetNode) return

      if (targetNode.expanded) {
        // 닫기
        setNodes((prev) => updateNode(prev, nodeId, (n) => ({ ...n, expanded: false })))
        return
      }

      // 열기: 자식이 이미 있으면 그냥 expand, 없으면 fetch
      if (targetNode.children && targetNode.children.length > 0) {
        setNodes((prev) => updateNode(prev, nodeId, (n) => ({ ...n, expanded: true, loading: false })))
        return
      }

      const children = await p.getChildNodes(ctx, datasourceUid, targetNode)
      setNodes((prev) =>
        updateNode(prev, nodeId, (n) => ({
          ...n,
          expanded: true,
          loading: false,
          children: children.map((c) => ({ ...c })),
        })),
      )
    },
    [nodes, provider, ctx, datasourceUid],
  )

  return { nodes, setNodes, initialize, toggleNode, isLoading, error, refetch }
}

// ─── 트리 유틸 ────────────────────────────────────────────────────────────────

function findNode(nodes: TreeNode[], id: string): TreeNode | undefined {
  for (const n of nodes) {
    if (n.id === id) return n
    if (n.children) {
      const found = findNode(n.children, id)
      if (found) return found
    }
  }
  return undefined
}

function updateNode(
  nodes: TreeNode[],
  id: string,
  updater: (n: TreeNode) => TreeNode,
): TreeNode[] {
  return nodes.map((n) => {
    if (n.id === id) return updater(n)
    if (n.children) return { ...n, children: updateNode(n.children, id, updater) }
    return n
  })
}
