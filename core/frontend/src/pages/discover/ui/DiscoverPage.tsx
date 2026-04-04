import { useState, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@data-voyager/shared-ui/components/ui/select'
import { Alert, AlertDescription } from '@data-voyager/shared-ui/components/ui/alert'
import { Button } from '@data-voyager/shared-ui/components/ui/button'
import { Play, Plus, X, ChevronDown, ChevronRight, Table2, LineChart } from 'lucide-react'
import { DatetimeRange } from '@data-voyager/shared-ui/components/widgets/datetime-range/DatetimeRange'
import { DataGrid, TimeSeriesChart } from '@data-voyager/shared-ui'
import type { DataGridColumnDef } from '@data-voyager/shared-ui'
import type { DateTimeRangeValue } from '@data-voyager/shared-ui'
import {
  relativeAgo,
  relativeNow,
} from '@data-voyager/shared-ui/components/widgets/datetime-range/datetime-utils'
import { datasourceRegistry } from '@data-voyager/sdk'
import { useDatasources } from '@/entities/datasource'
import type { TimeRange, BatchQueryResultItem } from '@/entities/datasource'
import { useBatchQueryExecution } from '@/features/explore/query-editor'
import { useVariables, VariableBar } from '@/features/explore/variable-editor'
import { usePluginContext } from '@/shared/lib/usePluginContext'
import { frameToAlignedData, canRenderAsChart } from '../lib/frameToChart'

// ─── time conversion ────────────────────────────────────────────────────────
function toBackendTimeString(v: DateTimeRangeValue): string {
  if (v.type === 'absolute') {
    const d = v.absoluteValue ?? new Date()
    return d.toISOString()
  }
  if (v.relativeNow) return 'Now'
  return `${v.relativeValue} ${v.relativeFormat}` // "5 Minutes ago", "1 Hours ago", etc.
}

function toBackendTimeRange(start: DateTimeRangeValue, end: DateTimeRangeValue): TimeRange {
  return { from: toBackendTimeString(start), to: toBackendTimeString(end) }
}

// ─── view mode ────────────────────────────────────────────────────────────────
type ViewMode = 'table' | 'timeseries'

// ─── query item ─────────────────────────────────────────────────────────────
type QueryItem = { refId: string; text: string; collapsed: boolean }
const REF_IDS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
function nextRefId(items: QueryItem[]): string {
  const used = new Set(items.map((q) => q.refId))
  return REF_IDS.split('').find((c) => !used.has(c)) ?? `Q${items.length + 1}`
}

// ─── dynamic DataGrid columns from DataFrame ─────────────────────────────────
type Row = Record<string, unknown>

function buildColumns(fieldNames: string[]): DataGridColumnDef<Row>[] {
  return fieldNames.map((name) => ({
    accessorKey: name,
    header: name,
    meta: { autoSize: true },
  }))
}

function frameToRows(frame: { fields: Array<{ name: string; values: unknown[] }> }): Row[] {
  const rowCount = frame.fields[0]?.values.length ?? 0
  return Array.from({ length: rowCount }, (_, i) => {
    const row: Row = {}
    frame.fields.forEach((f) => {
      row[f.name] = f.values[i] ?? null
    })
    return row
  })
}

// ─── ViewToggle ───────────────────────────────────────────────────────────────
function ViewToggle({
  mode,
  onChange,
  chartAvailable,
}: {
  mode: ViewMode
  onChange: (m: ViewMode) => void
  chartAvailable: boolean
}) {
  return (
    <div className="flex items-center rounded-md border overflow-hidden h-7">
      <button
        className={`flex items-center gap-1 px-2 h-full text-xs transition-colors ${
          mode === 'table'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted'
        }`}
        onClick={() => onChange('table')}
      >
        <Table2 className="h-3 w-3" />
        Table
      </button>
      <button
        className={`flex items-center gap-1 px-2 h-full text-xs transition-colors ${
          mode === 'timeseries'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted'
        } ${!chartAvailable ? 'opacity-40 cursor-not-allowed' : ''}`}
        onClick={() => chartAvailable && onChange('timeseries')}
        disabled={!chartAvailable}
        title={!chartAvailable ? 'No time + numeric fields found' : undefined}
      >
        <LineChart className="h-3 w-3" />
        Chart
      </button>
    </div>
  )
}

function ResultPanel({ item }: { item: BatchQueryResultItem }) {
  const frame = item.data?.frames?.[0] ?? null
  const chartAvailable = canRenderAsChart(frame)
  const defaultMode: ViewMode =
    frame?.frame_type === 'time_series' && chartAvailable ? 'timeseries' : 'table'
  const [mode, setMode] = useState<ViewMode>(defaultMode)

  if (item.error) {
    return (
      <Alert variant="destructive" className="m-3">
        <AlertDescription>{item.error}</AlertDescription>
      </Alert>
    )
  }

  if (!frame) {
    return (
      <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
        No data returned
      </div>
    )
  }

  const chartData = mode === 'timeseries' ? frameToAlignedData(frame) : null

  return (
    <div className="flex flex-col gap-2">
      {/* Stats + view toggle */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {item.stats && (
          <>
            <span>{item.stats.rows_returned} rows</span>
            <span>·</span>
            <span>{item.stats.execution_time_ms} ms</span>
          </>
        )}
        <div className="ml-auto flex items-center gap-2">
          {item.inspect && (
            <details>
              <summary className="cursor-pointer select-none text-xs">Inspect</summary>
              <pre className="mt-1 rounded bg-muted/50 p-2 text-[11px] font-mono whitespace-pre-wrap">
                {item.inspect.executed_query}
              </pre>
            </details>
          )}
          <ViewToggle mode={mode} onChange={setMode} chartAvailable={chartAvailable} />
        </div>
      </div>

      {/* Content */}
      {mode === 'table' ? (
        <DataGrid
          data={frameToRows(frame)}
          columns={buildColumns(frame.fields.map((f) => f.name))}
          enableSorting
          enableColumnFilters={false}
          pageSizes={[50, 100, 500]}
          emptyMessage="Query returned no rows"
        />
      ) : chartData ? (
        <div className="h-80 w-full">
          <TimeSeriesChart
            data={chartData.data}
            series={chartData.series}
            legendPosition="bottom"
            legendFormat="list"
          />
        </div>
      ) : null}
    </div>
  )
}

// ─── page ───────────────────────────────────────────────────────────────────
export function DiscoverPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const connIdParam = searchParams.get('connection')
  const selectedId = connIdParam ? parseInt(connIdParam, 10) : null

  const [queries, setQueries] = useState<QueryItem[]>([{ refId: 'A', text: 'SELECT 1', collapsed: false }])
  const [startTime, setStartTime] = useState<DateTimeRangeValue>(relativeAgo(1, 'Hours ago'))
  const [endTime, setEndTime] = useState<DateTimeRangeValue>(relativeNow())

  const { data: datasources = [] } = useDatasources()
  const { variables, setVariable, removeVariable, addVariable, toQueryVars } = useVariables()
  const { execute, results, running, error, reset } = useBatchQueryExecution(selectedId ?? 0)
  const pluginCtx = usePluginContext()

  const selectedDatasource = datasources.find((ds) => ds.id === selectedId)
  const plugin = selectedDatasource ? datasourceRegistry.get(selectedDatasource.type) : undefined
  const QueryEditorComponent = plugin?.queryEditorComponent ?? null

  const addQuery = useCallback(() => {
    setQueries((prev) => {
      const refId = nextRefId(prev)
      // collapse all existing, expand new one
      return [...prev.map((q) => ({ ...q, collapsed: true })), { refId, text: '', collapsed: false }]
    })
  }, [])

  const removeQuery = useCallback((refId: string) => {
    setQueries((prev) => {
      const next = prev.filter((q) => q.refId !== refId)
      return next.length === 0 ? [{ refId: 'A', text: '', collapsed: false }] : next
    })
  }, [])

  const updateQuery = useCallback((refId: string, text: string) => {
    setQueries((prev) => prev.map((q) => (q.refId === refId ? { ...q, text } : q)))
  }, [])

  const toggleCollapse = useCallback((refId: string) => {
    setQueries((prev) => prev.map((q) => (q.refId === refId ? { ...q, collapsed: !q.collapsed } : q)))
  }, [])

  const handleRun = useCallback(async () => {
    if (!selectedId) return
    reset()
    const tr = toBackendTimeRange(startTime, endTime)
    const vars = toQueryVars()
    await execute(
      queries.map((q) => ({ refId: q.refId, query: q.text, variables: vars, timeRange: tr, limit: 10000 }))
    ).catch(() => {})
  }, [selectedId, queries, startTime, endTime, toQueryVars, execute, reset])

  const resultMap = useMemo(() => {
    const m: Record<string, BatchQueryResultItem> = {}
    results?.forEach((r) => { m[r.ref_id] = r })
    return m
  }, [results])

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold">Discover</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">Run queries against your connections</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={selectedId?.toString() ?? ''}
          onValueChange={(v) => {
            if (v) setSearchParams({ connection: v })
            reset()
          }}
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Select a connection…" />
          </SelectTrigger>
          <SelectContent>
            {datasources.map((ds) => (
              <SelectItem key={ds.id} value={String(ds.id)}>
                {ds.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DatetimeRange
          startTime={startTime}
          endTime={endTime}
          onChange={(s, e) => { setStartTime(s); setEndTime(e) }}
        />

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={addQuery}
            disabled={!selectedId}
          >
            <Plus className="h-3 w-3" />
            Add Query
          </Button>
          <Button
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={handleRun}
            disabled={running || !selectedId || !QueryEditorComponent}
          >
            <Play className="h-3 w-3" />
            {running ? 'Running…' : 'Run'}
          </Button>
        </div>
      </div>

      {/* Variable bar */}
      <VariableBar
        variables={variables}
        setVariable={setVariable}
        removeVariable={removeVariable}
        addVariable={addVariable}
        toQueryVars={toQueryVars}
      />

      {/* Query editors — accordion panels stacked vertically */}
      <div className="flex flex-col gap-2">
        {queries.map((q) => (
          <div key={q.refId} className="rounded-md border overflow-hidden">
            {/* Panel header — click to collapse/expand */}
            <div
              className="flex cursor-pointer items-center gap-2 border-b bg-muted/30 px-3 py-1.5 select-none"
              onClick={() => toggleCollapse(q.refId)}
            >
              {q.collapsed
                ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              }
              <span className="inline-flex items-center justify-center rounded bg-muted px-1.5 py-0.5 text-[11px] font-mono font-semibold">
                {q.refId}
              </span>
              <span className="flex-1 truncate font-mono text-xs text-muted-foreground">
                {q.text.split('\n')[0] || (QueryEditorComponent ? 'empty query' : 'select a connection')}
              </span>
              {resultMap[q.refId]?.error && (
                <span className="text-xs text-destructive">error</span>
              )}
              {queries.length > 1 && (
                <button
                  className="ml-1 flex h-4 w-4 items-center justify-center rounded hover:bg-destructive hover:text-destructive-foreground text-muted-foreground"
                  onClick={(e) => { e.stopPropagation(); removeQuery(q.refId) }}
                  aria-label={`Remove query ${q.refId}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            {/* Editor body */}
            {!q.collapsed && (
              <div className="h-45 overflow-auto">
                {QueryEditorComponent ? (
                  <QueryEditorComponent
                    ctx={pluginCtx}
                    query={q.text}
                    onChange={(text) => updateQuery(q.refId, text)}
                    onRun={handleRun}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground p-4">
                    Select a connection above to open the query editor.
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Top-level error (connection/batch failure) */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Results — stacked vertically per query (Grafana-style) */}
      {results && results.length > 0 && (
        <div className="flex flex-col gap-4">
          {results.map((r) => (
            <div key={r.ref_id} className="flex flex-col gap-1">
              {results.length > 1 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center justify-center rounded bg-muted px-1.5 py-0.5 font-mono font-medium">
                    {r.ref_id}
                  </span>
                  {r.inspect?.raw_query && (
                    <span className="truncate font-mono opacity-60">{r.inspect.raw_query}</span>
                  )}
                </div>
              )}
              <ResultPanel item={r} />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!results && !error && !running && (
        <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground">
          <p className="text-sm">
            {selectedId ? 'Run a query to see results.' : 'Select a connection to get started.'}
          </p>
        </div>
      )}
    </div>
  )
}
