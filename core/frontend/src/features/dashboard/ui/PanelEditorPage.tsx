import { useEffect, useMemo, useState } from 'react'
import type { FC } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { createEditorAddon, type DashboardConfig, type PanelInput, type PanelViewerProps, type QueryResult } from '@loykin/dashboardkit'
import { useLoadDashboard } from '@loykin/dashboardkit/react'
import { datasourceRegistry } from '@data-voyager/sdk'
import { getDashboardEngine } from '../model/dashboardEngine'
import { createDashboardConfig, findDashboardRecord, upsertDashboardRecord } from '../model/dashboardStore'
import { useDashboardDatasources } from '../hooks/useDashboardDatasources'
import { usePluginContext } from '@/shared/lib/usePluginContext'

const engine = getDashboardEngine()

function firstConfig(dashboardId: string, datasources: ReturnType<typeof useDashboardDatasources>['items']): DashboardConfig {
  return findDashboardRecord(dashboardId)?.config ?? createDashboardConfig({
    id: dashboardId,
    title: dashboardId,
    datasource: datasources[0],
  })
}

function queryToText(query: unknown): string {
  if (typeof query === 'string') return query
  if (query && typeof query === 'object' && 'text' in query) {
    return String((query as { text?: unknown }).text ?? '')
  }
  return query === undefined ? '' : JSON.stringify(query, null, 2)
}

function optionsToText(options: unknown): string {
  try {
    return JSON.stringify(options ?? {}, null, 2)
  } catch {
    return '{}'
  }
}

function parseOptions(text: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(text)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {}
  } catch {
    return {}
  }
}

export function PanelEditorPage() {
  const navigate = useNavigate()
  const pluginContext = usePluginContext()
  const { dashboardId = 'overview', panelId = '' } = useParams()
  const { items: datasources } = useDashboardDatasources()
  const [config, setConfig] = useState<DashboardConfig>(() => firstConfig(dashboardId, datasources))

  useEffect(() => setConfig(firstConfig(dashboardId, datasources)), [dashboardId, datasources])
  useLoadDashboard(engine, config)

  const originalPanel = useMemo(() => config.panels.find((panel) => panel.id === panelId) ?? null, [config, panelId])
  const [title, setTitle] = useState(originalPanel?.title ?? '')
  const [description, setDescription] = useState(originalPanel?.description ?? '')
  const [type, setType] = useState(originalPanel?.type ?? 'table')
  const [datasourceUid, setDatasourceUid] = useState(originalPanel?.dataRequests[0]?.uid ?? '')
  const [query, setQuery] = useState(queryToText(originalPanel?.dataRequests[0]?.query))
  const [optionsText, setOptionsText] = useState(optionsToText(originalPanel?.options))
  const [unit, setUnit] = useState(String(originalPanel?.options.unit ?? ''))
  const [fallbackValue, setFallbackValue] = useState(String(originalPanel?.options.fallbackValue ?? '0'))
  const [preview, setPreview] = useState<string>('No preview yet')
  const [previewData, setPreviewData] = useState<unknown>(null)
  const [previewRawData, setPreviewRawData] = useState<QueryResult[] | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  useEffect(() => {
    setTitle(originalPanel?.title ?? '')
    setDescription(originalPanel?.description ?? '')
    setType(originalPanel?.type ?? 'table')
    setDatasourceUid(originalPanel?.dataRequests[0]?.uid ?? '')
    setQuery(queryToText(originalPanel?.dataRequests[0]?.query))
    setOptionsText(optionsToText(originalPanel?.options))
    setUnit(String(originalPanel?.options.unit ?? ''))
    setFallbackValue(String(originalPanel?.options.fallbackValue ?? '0'))
  }, [originalPanel])

  const buildPanel = (): PanelInput | null => {
    if (!originalPanel) return null
    const selectedDatasource = datasources.find((datasource) => datasource.uid === datasourceUid)
    const nextOptions = {
      ...parseOptions(optionsText),
      ...(type === 'stat' || type === 'timeseries' ? { unit } : {}),
      ...(type === 'stat' ? { fallbackValue: Number(fallbackValue) || 0 } : {}),
    }
    const requests = originalPanel.dataRequests.length > 0
      ? originalPanel.dataRequests.map((request, index) => index === 0
          ? {
              ...request,
              uid: selectedDatasource?.uid ?? request.uid,
              type: selectedDatasource?.type ?? request.type,
              query: { text: query, limit: 1000 },
            }
          : request)
      : []
    return { ...originalPanel, title, description, type, dataRequests: requests, options: nextOptions }
  }

  const save = async () => {
    const panel = buildPanel()
    if (!panel) return
    await engine.updatePanel(panelId, panel)
    const next = engine.getConfig()
    if (next) {
      upsertDashboardRecord(next)
      setConfig(next)
    }
    navigate(`/dashboard/${dashboardId}`)
  }

  const runPreview = async () => {
    const panel = buildPanel()
    if (!panel) return
    const instanceId = engine.getPanelInstances().find((instance) => instance.originId === panelId)?.id ?? panelId
    setPreviewLoading(true)
    try {
      const result = await createEditorAddon(engine).previewPanel(instanceId, panel)
      setPreviewData(result.data)
      setPreviewRawData(result.rawData)
      setPreview(`Preview returned ${result.rawData.length} result set(s).`)
    } catch (error) {
      setPreviewData(null)
      setPreviewRawData(null)
      setPreview(error instanceof Error ? error.message : String(error))
    } finally {
      setPreviewLoading(false)
    }
  }

  const removePanel = async () => {
    await engine.removePanel(panelId)
    const next = engine.getConfig()
    if (next) upsertDashboardRecord(next)
    navigate(`/dashboard/${dashboardId}`)
  }

  const draftPanel = buildPanel()
  const previewPlugin = draftPanel ? engine.getPanelPlugin(draftPanel.type) : undefined
  const PreviewViewer = previewPlugin?.viewer as FC<PanelViewerProps<unknown, unknown>> | undefined
  const selectedDatasource = datasources.find((datasource) => datasource.uid === datasourceUid)
  const datasourcePlugin = selectedDatasource ? datasourceRegistry.get(selectedDatasource.type) : undefined
  const QueryEditor = datasourcePlugin?.queryEditorComponent

  return (
    <div className="dv-dashboard dv-dashboard__editor">
      <div className="dv-dashboard__editor-topbar">
        <Link className="dv-dashboard__button" to={`/dashboard/${dashboardId}`}>Back to dashboard</Link>
        <div className="dv-dashboard__title">Edit: {title || panelId}</div>
        <div className="dv-dashboard__spacer" />
        <button className="dv-dashboard__button" onClick={() => void runPreview()}>Preview</button>
        <button className="dv-dashboard__button dv-dashboard__button--primary" onClick={() => void save()}>Apply</button>
      </div>
      <div className="dv-dashboard__editor-body">
        <div className="dv-dashboard__editor-left">
          <div className="dv-dashboard__editor-preview">
            <div className="dv-dashboard__section-title">Preview</div>
            <div className="dv-dashboard__panel" style={{ minHeight: 360 }}>
              <div className="dv-dashboard__panel-header">
                <div className="dv-dashboard__panel-title">{title || panelId}</div>
                <span className="text-xs text-muted-foreground">{preview}</span>
              </div>
              <div className="dv-dashboard__panel-body">
                {draftPanel && PreviewViewer ? (
                  <PreviewViewer
                    panel={draftPanel as NonNullable<typeof originalPanel>}
                    options={draftPanel.options ?? {}}
                    data={previewData}
                    rawData={previewRawData}
                    width={0}
                    height={0}
                    loading={previewLoading}
                    error={preview.startsWith('Error:') ? preview : null}
                    variables={{}}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    No preview renderer available.
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="dv-dashboard__editor-query">
            <div className="dv-dashboard__editor-section h-full overflow-auto">
              <div className="dv-dashboard__section-title">Query</div>
              <div className="space-y-3">
                <label className="dv-dashboard__field">
                  <span className="dv-dashboard__label">Datasource</span>
                  <select className="dv-dashboard__select" value={datasourceUid} onChange={(event) => setDatasourceUid(event.target.value)}>
                    {datasources.map((datasource) => (
                      <option key={datasource.uid} value={datasource.uid}>
                        {datasource.name} ({datasource.type})
                      </option>
                    ))}
                  </select>
                </label>
                <div className="dv-dashboard__field">
                  <span className="dv-dashboard__label">Query</span>
                  <div className="h-44 overflow-hidden rounded-[var(--dv-radius)] border border-[var(--dv-border)] bg-white">
                    {QueryEditor ? (
                      <QueryEditor
                        ctx={pluginContext}
                        query={query}
                        onChange={setQuery}
                        onRun={() => void runPreview()}
                      />
                    ) : (
                      <textarea className="dv-dashboard__textarea h-full border-0" value={query} onChange={(event) => setQuery(event.target.value)} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="dv-dashboard__editor-form">
          <div className="dv-dashboard__editor-section">
            <div className="dv-dashboard__section-title">Panel</div>
            {!originalPanel && <p className="text-sm text-muted-foreground">Panel not found.</p>}
            {originalPanel && (
              <div className="space-y-3">
                <label className="dv-dashboard__field">
                  <span className="dv-dashboard__label">Title</span>
                  <input className="dv-dashboard__input" value={title} onChange={(event) => setTitle(event.target.value)} />
                </label>
                <label className="dv-dashboard__field">
                  <span className="dv-dashboard__label">Description</span>
                  <input className="dv-dashboard__input" value={description} onChange={(event) => setDescription(event.target.value)} />
                </label>
                <label className="dv-dashboard__field">
                  <span className="dv-dashboard__label">Visualization</span>
                  <select className="dv-dashboard__select" value={type} onChange={(event) => setType(event.target.value)}>
                    <option value="stat">Stat</option>
                    <option value="timeseries">Time series</option>
                    <option value="table">Table</option>
                  </select>
                </label>
              </div>
            )}
          </div>
          <div className="dv-dashboard__editor-section">
            <div className="dv-dashboard__section-title">Visualization options</div>
            {originalPanel && (
              <div className="space-y-3">
                {(type === 'stat' || type === 'timeseries') && (
                  <label className="dv-dashboard__field">
                    <span className="dv-dashboard__label">Unit</span>
                    <input className="dv-dashboard__input" value={unit} onChange={(event) => setUnit(event.target.value)} />
                  </label>
                )}
                {type === 'stat' && (
                  <label className="dv-dashboard__field">
                    <span className="dv-dashboard__label">Fallback value</span>
                    <input className="dv-dashboard__input" value={fallbackValue} onChange={(event) => setFallbackValue(event.target.value)} />
                  </label>
                )}
                <label className="dv-dashboard__field">
                  <span className="dv-dashboard__label">Raw options JSON</span>
                  <textarea className="dv-dashboard__textarea" value={optionsText} onChange={(event) => setOptionsText(event.target.value)} />
                </label>
              </div>
            )}
          </div>
          <div className="dv-dashboard__editor-section">
            <div className="dv-dashboard__section-title">Danger</div>
            <button className="dv-dashboard__button" onClick={() => void removePanel()}>Remove panel</button>
          </div>
        </div>
      </div>
    </div>
  )
}
