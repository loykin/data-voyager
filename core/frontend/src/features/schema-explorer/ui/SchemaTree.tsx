import { useEffect, useRef, useState } from 'react'
import { cn } from '@data-voyager/shared-ui/lib/utils'
import {
  Database,
  Layers,
  Table2,
  Eye,
  Columns3,
  ChevronRight,
  ChevronDown,
  Loader2,
  Search,
  RefreshCw,
} from 'lucide-react'
import { Input } from '@data-voyager/shared-ui/components/ui/input'
import { Button } from '@data-voyager/shared-ui/components/ui/button'
import type { SchemaNodeType, SchemaProvider, PluginContext } from '@data-voyager/sdk'
import { useQuery } from '@tanstack/react-query'
import { schemaApi } from '../api/schema.api'
import { useSchemaTree } from '../model'
import type { TreeNode } from '../model'

// ─── 노드 타입별 아이콘 ───────────────────────────────────────────────────────

function NodeIcon({ type, className }: { type: SchemaNodeType; className?: string }) {
  const cls = cn('h-3.5 w-3.5 shrink-0', className)
  switch (type) {
    case 'database':  return <Database className={cn(cls, 'text-blue-500')} />
    case 'schema':    return <Layers className={cn(cls, 'text-purple-500')} />
    case 'table':     return <Table2 className={cn(cls, 'text-green-600')} />
    case 'view':      return <Eye className={cn(cls, 'text-orange-500')} />
    case 'column':
    case 'field':     return <Columns3 className={cn(cls, 'text-muted-foreground')} />
    case 'index':     return <Database className={cn(cls, 'text-yellow-500')} />
    default:          return <Database className={cls} />
  }
}

// ─── 단일 노드 ────────────────────────────────────────────────────────────────

function SchemaNodeItem({
  node,
  depth,
  onToggle,
  onInsert,
  filter,
}: {
  node: TreeNode
  depth: number
  onToggle: (id: string) => void
  onInsert?: (node: TreeNode) => void
  filter: string
}) {
  const matchesFilter =
    !filter || node.label.toLowerCase().includes(filter.toLowerCase())

  // 자식 중 매칭이 있으면 부모도 표시
  const hasMatchingChild = filter
    ? hasAnyMatch(node.children ?? [], filter)
    : true

  if (!matchesFilter && !hasMatchingChild) return null

  const canExpand = node.hasChildren
  const isLeaf = !node.hasChildren

  return (
    <>
      <div
        className={cn(
          'group flex items-center gap-1 rounded px-1.5 py-0.5 text-sm cursor-pointer select-none',
          'hover:bg-muted/60 transition-colors',
          isLeaf && onInsert && 'hover:bg-accent/40',
        )}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
        onClick={() => {
          if (canExpand) onToggle(node.id)
          else if (onInsert) onInsert(node)
        }}
        title={
          node.meta?.dataType
            ? `${node.meta.dataType}${node.meta.nullable ? ' (nullable)' : ''}`
            : node.label
        }
      >
        {/* 펼침 화살표 */}
        <span className="w-3.5 shrink-0">
          {canExpand && !node.loading && (
            node.expanded
              ? <ChevronDown className="h-3 w-3 text-muted-foreground" />
              : <ChevronRight className="h-3 w-3 text-muted-foreground" />
          )}
          {node.loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        </span>

        <NodeIcon type={node.type} />

        {/* 레이블 */}
        <span className={cn(
          'flex-1 truncate',
          !matchesFilter && hasMatchingChild && 'text-muted-foreground',
        )}>
          {node.label}
        </span>

        {/* 부가 정보 */}
        {node.meta?.dataType && (
          <span className="hidden group-hover:inline text-[10px] text-muted-foreground font-mono shrink-0">
            {node.meta.dataType}
          </span>
        )}
        {node.meta?.rowCount && !node.meta.dataType && (
          <span className="text-[10px] text-muted-foreground shrink-0">
            {node.meta.rowCount}
          </span>
        )}
      </div>

      {/* 자식 */}
      {node.expanded && node.children && (
        <div>
          {node.children.map((child) => (
            <SchemaNodeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              onToggle={onToggle}
              onInsert={onInsert}
              filter={filter}
            />
          ))}
        </div>
      )}
    </>
  )
}

function hasAnyMatch(nodes: TreeNode[], filter: string): boolean {
  return nodes.some(
    (n) =>
      n.label.toLowerCase().includes(filter.toLowerCase()) ||
      hasAnyMatch(n.children ?? [], filter),
  )
}

// ─── SchemaTree ───────────────────────────────────────────────────────────────

interface SchemaTreeProps {
  connectionId: string
  provider?: SchemaProvider
  ctx: PluginContext
  /** 컬럼 클릭 시 콜백 */
  onInsert?: (text: string) => void
  className?: string
}

export function SchemaTree({ connectionId, provider, ctx, onInsert, className }: SchemaTreeProps) {
  const [filter, setFilter] = useState('')
  const initialized = useRef(false)

  const { data: schema, isLoading: schemaLoading, error: schemaError, refetch } = useQuery({
    queryKey: ['connection-schema', connectionId],
    queryFn: () => schemaApi.getSchema(connectionId),
    staleTime: 5 * 60 * 1000,
    enabled: !!connectionId,
    retry: 1,
  })

  const { nodes, initialize, toggleNode } = useSchemaTree({ connectionId, provider, ctx })

  // 스키마 로드 완료 시 단 한 번만 초기화
  useEffect(() => {
    if (schema && !initialized.current) {
      initialized.current = true
      initialize(schema)
    }
  }, [schema, initialize])

  const handleInsert = (node: TreeNode) => {
    if (!onInsert) return
    const p = provider
    if (p?.getInsertText) {
      onInsert(p.getInsertText(node))
    } else {
      onInsert(`"${node.label}"`)
    }
  }

  return (
    <div className={cn('flex flex-col h-full overflow-hidden', className)}>
      {/* 검색 + 새로고침 */}
      <div className="flex items-center gap-1 p-2 border-b shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            className="h-7 pl-6 text-xs"
            placeholder="Filter tables, columns…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={() => { initialized.current = false; refetch() }}
          title="Refresh schema"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* 트리 */}
      <div className="flex-1 overflow-y-auto py-1">
        {schemaLoading && (
          <div className="flex items-center justify-center py-8 gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading schema…
          </div>
        )}

        {schemaError && (
          <div className="px-3 py-4 text-xs text-destructive">
            Failed to load schema.{' '}
            <button className="underline" onClick={() => refetch()}>Retry</button>
          </div>
        )}

        {!schemaLoading && !schemaError && nodes.length === 0 && (
          <div className="px-3 py-4 text-xs text-muted-foreground">No schema available.</div>
        )}

        {nodes.map((node) => (
          <SchemaNodeItem
            key={node.id}
            node={node}
            depth={0}
            onToggle={(id) => toggleNode(id, schema)}
            onInsert={onInsert ? handleInsert : undefined}
            filter={filter}
          />
        ))}
      </div>
    </div>
  )
}
