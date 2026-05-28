import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Badge,
  Button,
  DashboardBodyTemplate,
  DashboardPanel,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  PageTopBar,
} from '@loykin/designkit';
import { DashboardGrid, useConfigChanged, useVariable } from '@loykin/dashboardkit/react';
import type { DashboardConfig, PanelInput, PanelViewerProps } from '@loykin/dashboardkit';
import { Check, MoreVertical, PencilLine, RefreshCw, Trash2 } from 'lucide-react';
import type { DatasourceInstance } from '@loykin/datasourcekit';
import { getDashboardEngine } from '../model/dashboardEngine';
import {
  createDashboardConfig,
  type DashboardRecord,
  deleteDashboardRecord,
  findDashboardRecord,
  loadDashboardRecords,
  upsertDashboardRecord,
} from '../model/dashboardStore';
import { useDashboardDatasources } from '../hooks/useDashboardDatasources';

const engine = getDashboardEngine()

function firstDatasource(datasources: DatasourceInstance[]): DatasourceInstance | undefined {
  return datasources.find((item) => item.enabled ?? true) ?? datasources[0]
}

function uniqueId(base: string): string {
  return `${base}-${Date.now().toString(36)}`
}

function ensureDashboard(id: string, datasources: DatasourceInstance[]): DashboardConfig {
  const stored = findDashboardRecord(id)
  const datasource = firstDatasource(datasources)
  if (stored) {
    const hasRequests = stored.config.panels.some((panel) => panel.dataRequests.length > 0)
    if (hasRequests || !datasource) return stored.config
    const repaired = createDashboardConfig({
      id: stored.config.id,
      title: stored.config.title,
      description: stored.config.description,
      datasource,
    })
    upsertDashboardRecord(repaired)
    return repaired
  }
  const config = createDashboardConfig({
    id,
    title: id === 'overview' ? 'Data Voyager Overview' : id,
    datasource,
  })
  upsertDashboardRecord(config)
  return config
}

function createPanel(type: string, datasource?: DatasourceInstance): PanelInput {
  const id = uniqueId(type)
  return {
    id,
    type,
    title: type === 'stat' ? 'New stat' : type === 'timeseries' ? 'New time series' : 'New table',
    description: datasource?.name ?? '',
    gridPos: { x: 0, y: 99, w: type === 'stat' ? 6 : 12, h: type === 'stat' ? 4 : 8 },
    dataRequests: datasource
      ? [{
        id: 'main',
        uid: datasource.uid,
        type: datasource.type,
        query: { text: 'SELECT 1 AS value', limit: 1000 },
        options: {},
      }]
      : [],
    options: type === 'stat' ? { unit: 'value', fallbackValue: 0 } : {},
  }
}

function clonePanelInput(panel: DashboardConfig['panels'][number]): PanelInput {
  return {
    ...panel,
    id: uniqueId(panel.id),
    title: `${panel.title || 'Panel'} copy`,
    gridPos: {
      ...panel.gridPos,
      x: Math.min(panel.gridPos.x + 1, 23),
      y: panel.gridPos.y + 1,
    },
    dataRequests: panel.dataRequests.map((request) => ({
      ...request,
      query: structuredClone(request.query),
      options: structuredClone(request.options),
      permissions: request.permissions.map((permission) => ({ ...permission })),
    })),
    options: structuredClone(panel.options),
    links: panel.links.map((link) => ({ ...link })),
    permissions: panel.permissions.map((permission) => ({ ...permission })),
  }
}

function VariablePicker({ name }: { name: string }) {
  const variable = useVariable(engine, name)
  if (variable.options.length === 0) return null
  return (
    <label className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">{name}</span>
      <select
        className="h-7 rounded-(--radius) border bg-background px-2 text-xs"
        value={String(variable.value ?? '')}
        onChange={(event) => variable.setValue(event.target.value)}
      >
        {variable.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function DashboardListItem({ record, onDelete }: { record: DashboardRecord; onDelete(id: string): void }) {
  return (
    <div className="group flex items-center justify-between gap-4 border-b px-6 py-4 hover:bg-muted/40">
      <Link to={`/dashboard/${record.id}`} className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h2 className="truncate text-sm font-medium">{record.title}</h2>
          <Badge variant="secondary" className="h-5 text-[10px]">{record.config.panels.length} panels</Badge>
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {record.description || 'No description'} · updated {new Date(record.updatedAt).toLocaleString()}
        </p>
      </Link>
      <Button
        variant="ghost"
        size="icon-sm"
        className="opacity-0 group-hover:opacity-100"
        onClick={() => onDelete(record.id)}
        title="Delete dashboard"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

function PanelActionsMenu({ dashboardId, panelId }: { dashboardId: string; panelId: string }) {
  const navigate = useNavigate()

  const duplicatePanel = async () => {
    const config = engine.getConfig()
    const panel = config?.panels.find((item) => item.id === panelId)
    if (!panel) return
    await engine.addPanel(clonePanelInput(panel), { refresh: true })
  }

  const removePanel = async () => {
    await engine.removePanel(panelId, { refresh: false, invalidateCache: true })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-muted-foreground/60 hover:text-foreground"
            title="Panel options"
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuItem disabled>
          View
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate(`/dashboard/${dashboardId}/panels/${panelId}/edit`)}>
          Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void duplicatePanel()}>
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => void removePanel()}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function DashboardHomePage() {
  const navigate = useNavigate()
  const { items: datasources } = useDashboardDatasources()
  const [records, setRecords] = useState<DashboardRecord[]>(() => loadDashboardRecords())
  const [title, setTitle] = useState('')

  useEffect(() => {
    if (records.length > 0 || datasources.length === 0) return
    const config = createDashboardConfig({
      id: 'overview',
      title: 'Data Voyager Overview',
      datasource: firstDatasource(datasources),
    })
    const record = upsertDashboardRecord(config)
    setRecords([record])
  }, [datasources, records.length])

  const createDashboard = () => {
    const safeTitle = title.trim() || 'New Dashboard'
    const id = uniqueId(safeTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'dashboard')
    const record = upsertDashboardRecord(createDashboardConfig({
      id,
      title: safeTitle,
      datasource: firstDatasource(datasources),
    }))
    setRecords(loadDashboardRecords())
    navigate(`/dashboard/${record.id}`)
  }

  const remove = (id: string) => {
    deleteDashboardRecord(id)
    setRecords(loadDashboardRecords())
  }

  return (
    <div className="dv-dashboard">
      <div className="dv-dashboard__topbar">
        <div className="dv-dashboard__title">Dashboards</div>
        <div className="dv-dashboard__spacer" />
        <Input
          className="h-7 w-56 text-xs"
          placeholder="Dashboard name"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <button className="dv-dashboard__button dv-dashboard__button--primary" onClick={createDashboard}>
          New dashboard
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {records.length === 0 && (
          <div className="px-6 py-10 text-sm text-muted-foreground">No dashboards yet.</div>
        )}
        {records.map((record) => (
          <DashboardListItem key={record.id} record={record} onDelete={remove} />
        ))}
      </div>
    </div>
  )
}

export function DashboardPage() {
  const { dashboardId = 'overview' } = useParams()
  const { items: datasources, loading: datasourceLoading, error: datasourceError } = useDashboardDatasources()
  const [editable, setEditable] = useState(true)
  const [dirty, setDirty] = useState(false)
  const [, rerender] = useState(0)

  useEffect(() => {
    if (datasources.length === 0 && !findDashboardRecord(dashboardId)) return
    const next = ensureDashboard(dashboardId, datasources)
    void engine.load(next)
    setDirty(false)
    rerender((value) => value + 1)
  }, [dashboardId, datasources])

  useConfigChanged(engine, (next) => {
    upsertDashboardRecord(next)
    setDirty(true)
    rerender((value) => value + 1)
  })

  const loadedConfig = engine.getConfig()
  const config = loadedConfig?.id === dashboardId
    ? loadedConfig
    : findDashboardRecord(dashboardId)?.config ?? createDashboardConfig({ id: dashboardId, title: dashboardId })
  const variableNames = config.variables.map((variable) => variable.name)
  const datasource = firstDatasource(datasources)

  const variables = useMemo<Record<string, string | string[]>>(() => {
    const result: Record<string, string | string[]> = {}
    for (const variable of config.variables) {
      const value = engine.getVariable(variable.name)?.value
      if (value !== undefined) result[variable.name] = value
    }
    return result
  }, [config.variables])

  const addPanel = async (type: string) => {
    await engine.addPanel(createPanel(type, datasource))
  }

  return (
    <DashboardBodyTemplate
      className="layout-dashboard"
      topBar={
        <PageTopBar
          left={`Dashboards / ${config.title}`}
          right={
            <div className="flex items-center gap-2">
              {dirty && <span className="h-2 w-2 rounded-full bg-amber-500" title="Saved changes" />}
              <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => void engine.refreshAll()}>
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </Button>
              <Button render={<Link to={`/dashboard/${dashboardId}/variables`} />} variant="outline" size="sm" className="h-7 text-xs">
                Variables
              </Button>
              <Button render={<Link to={`/dashboard/${dashboardId}/settings`} />} variant="outline" size="sm" className="h-7 text-xs">
                Settings
              </Button>
              <select className="h-7 rounded-(--radius) border bg-background px-2 text-xs" onChange={(event) => event.target.value && void addPanel(event.target.value)} value="">
          <option value="">Add panel</option>
          <option value="stat">Stat</option>
          <option value="timeseries">Time series</option>
          <option value="table">Table</option>
              </select>
              <Button
                variant={editable ? 'default' : 'outline'}
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={() => setEditable((current) => !current)}
              >
                {editable ? <Check className="h-3.5 w-3.5" /> : <PencilLine className="h-3.5 w-3.5" />}
                {editable ? 'Done' : 'Edit'}
              </Button>
            </div>
          }
        />
      }
      variableBar={
        <>
        {variableNames.map((name) => <VariablePicker key={name} name={name} />)}
        {datasourceLoading && <span className="text-xs text-muted-foreground">Loading datasources...</span>}
        {datasourceError && <span className="text-xs text-destructive">{datasourceError}</span>}
        </>
      }
      contentClassName="pb-6"
    >
      <DashboardGrid engine={engine} editable={editable}>
        {({ panelId, panelType, instance, config: panelConfig, data, rawData, loading, error, ref }) => {
          const plugin = engine.getPanelPlugin(panelType)
          const Viewer = plugin?.viewer as React.FC<PanelViewerProps<unknown, unknown>> | undefined
          const originId = instance.originId ?? panelId
          return (
            <DashboardPanel
              ref={ref}
              title={panelConfig.title || '(untitled)'}
              loading={loading}
              error={error ?? undefined}
              editable={editable}
              headerRight={
                <PanelActionsMenu dashboardId={dashboardId} panelId={originId} />
              }
              style={{ height: '100%' }}
            >
              {Viewer && (
                <Viewer
                  panel={panelConfig}
                  options={panelConfig.options}
                  data={data}
                  rawData={rawData}
                  width={0}
                  height={0}
                  loading={loading}
                  error={error}
                  variables={variables}
                />
              )}
              {!Viewer && (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  Unknown panel: {panelType} ({panelId})
                </div>
              )}
            </DashboardPanel>
          )
        }}
      </DashboardGrid>
    </DashboardBodyTemplate>
  )
}

export function DashboardSettingsPage() {
  const navigate = useNavigate()
  const { dashboardId = 'overview' } = useParams()
  const { items: datasources } = useDashboardDatasources()
  const [, rerender] = useState(0)

  useEffect(() => {
    if (datasources.length === 0 && !findDashboardRecord(dashboardId)) return
    void engine.load(ensureDashboard(dashboardId, datasources), { statePolicy: 'preserve' })
    rerender((value) => value + 1)
  }, [dashboardId, datasources])

  useConfigChanged(engine, (next) => {
    upsertDashboardRecord(next)
    rerender((value) => value + 1)
  })

  const loadedConfig = engine.getConfig()
  const config = loadedConfig?.id === dashboardId
    ? loadedConfig
    : findDashboardRecord(dashboardId)?.config ?? createDashboardConfig({ id: dashboardId, title: dashboardId })

  const update = (patch: Partial<Pick<DashboardConfig, 'title' | 'description' | 'timeRange'>>) => {
    void engine.updateDashboard(patch, { refresh: false })
  }

  return (
    <div className="dv-dashboard">
      <div className="dv-dashboard__topbar">
        <Link to={`/dashboard/${dashboardId}`} className="text-muted-foreground hover:text-foreground">Dashboard</Link>
        <span className="text-muted-foreground">/</span>
        <div className="dv-dashboard__title">Settings</div>
      </div>
      <div className="dv-dashboard__editor-body">
        <main className="dv-dashboard__editor-left">
          <div className="dv-dashboard__editor-section">
          <div className="dv-dashboard__section-title">General</div>
          <div className="space-y-3">
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">Title</span>
              <Input value={config.title} onChange={(event) => update({ title: event.target.value })} />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">Description</span>
              <textarea
                className="min-h-24 w-full rounded-(--radius) border bg-background p-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                value={config.description}
                onChange={(event) => update({ description: event.target.value })}
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block space-y-1">
                <span className="text-xs text-muted-foreground">From</span>
                <Input value={config.timeRange.from} onChange={(event) => update({ timeRange: { ...config.timeRange, from: event.target.value } })} />
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-muted-foreground">To</span>
                <Input value={config.timeRange.to} onChange={(event) => update({ timeRange: { ...config.timeRange, to: event.target.value } })} />
              </label>
            </div>
          </div>
          </div>
        </main>
        <aside className="dv-dashboard__editor-form">
          <div className="dv-dashboard__editor-section">
          <div className="dv-dashboard__section-title">Danger</div>
          <Button
            variant="destructive"
            className="gap-1.5"
            onClick={() => {
              deleteDashboardRecord(dashboardId)
              navigate('/dashboard')
            }}
          >
            <Trash2 className="h-4 w-4" />
            Delete dashboard
          </Button>
          </div>
        </aside>
      </div>
    </div>
  )
}
