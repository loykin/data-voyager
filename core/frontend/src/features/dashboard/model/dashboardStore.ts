import type { DashboardConfig, PanelInput, VariableInput } from '@loykin/dashboardkit'
import type { DatasourceInstance } from '@loykin/datasourcekit'

const STORAGE_KEY = 'data-voyager:dashboards'

export interface DashboardRecord {
  id: string
  title: string
  description: string
  updatedAt: string
  config: DashboardConfig
}

function sqlRequest(id: string, datasource: DatasourceInstance, text: string) {
  return {
    id,
    uid: datasource.uid,
    type: datasource.type,
    query: { text, limit: 1000 },
    options: {},
    hide: false,
    permissions: [],
    staleWhileRevalidate: false,
  }
}

function fallbackPanel(id: string, type: string, title: string, gridPos: PanelInput['gridPos'], datasource?: DatasourceInstance): PanelInput {
  return {
    id,
    type,
    title,
    description: datasource?.name ?? '',
    gridPos,
    dataRequests: datasource ? [sqlRequest('main', datasource, 'SELECT 1 AS value')] : [],
    isRow: false,
    collapsed: false,
    repeatDirection: 'h',
    transparent: false,
    links: [],
    permissions: [],
    options: type === 'stat' ? { unit: 'value', fallbackValue: 0 } : {},
  }
}

export function completeVariable(input: VariableInput): DashboardConfig['variables'][number] {
  const dataRequest = input.dataRequest
  return {
    name: input.name,
    type: input.type,
    ...(input.label !== undefined ? { label: input.label } : {}),
    defaultValue: input.defaultValue ?? null,
    multi: input.multi ?? false,
    includeAll: input.includeAll ?? false,
    ...(input.allValue !== undefined ? { allValue: input.allValue } : {}),
    hide: input.hide ?? 'none',
    sort: input.sort ?? 'none',
    refreshOnTimeRangeChange: input.refreshOnTimeRangeChange ?? false,
    permissions: (input.permissions ?? []).map((permission) => ({
      ...permission,
      effect: permission.effect ?? 'allow',
    })),
    options: input.options ?? {},
    ...(dataRequest !== undefined
      ? {
          dataRequest: {
            id: dataRequest.id ?? 'main',
            uid: dataRequest.uid,
            type: dataRequest.type,
            ...(dataRequest.query !== undefined ? { query: dataRequest.query } : {}),
            options: dataRequest.options ?? {},
            hide: dataRequest.hide ?? false,
            permissions: (dataRequest.permissions ?? []).map((permission) => ({
              ...permission,
              effect: permission.effect ?? 'allow',
            })),
            staleWhileRevalidate: dataRequest.staleWhileRevalidate ?? false,
          },
        }
      : {}),
  }
}

export function createDashboardConfig(input: {
  id: string
  title: string
  description?: string
  datasource?: DatasourceInstance
}): DashboardConfig {
  const envVariable = completeVariable({
    name: 'env',
    type: 'custom',
    label: 'Environment',
    defaultValue: 'production',
    options: { values: ['production', 'staging', 'development'] },
  })

  return {
    schemaVersion: 1,
    id: input.id,
    title: input.title,
    description: input.description ?? '',
    tags: [],
    variables: [envVariable],
    panels: [
      fallbackPanel('quick-stat', 'stat', 'Query Result', { x: 0, y: 0, w: 6, h: 4 }, input.datasource) as DashboardConfig['panels'][number],
      fallbackPanel('trend', 'timeseries', 'Time Series', { x: 6, y: 0, w: 18, h: 8 }, input.datasource) as DashboardConfig['panels'][number],
      fallbackPanel('table', 'table', 'Rows', { x: 0, y: 8, w: 24, h: 9 }, input.datasource) as DashboardConfig['panels'][number],
    ],
    layout: { cols: 24, rowHeight: 30 },
    timeRange: { from: 'now-6h', to: 'now' },
    refresh: '',
    links: [],
    permissions: [],
    annotations: [],
  }
}

export function loadDashboardRecords(): DashboardRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as DashboardRecord[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveDashboardRecords(records: DashboardRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

export function upsertDashboardRecord(config: DashboardConfig): DashboardRecord {
  const records = loadDashboardRecords()
  const record: DashboardRecord = {
    id: config.id,
    title: config.title,
    description: config.description ?? '',
    updatedAt: new Date().toISOString(),
    config,
  }
  const next = records.some((item) => item.id === config.id)
    ? records.map((item) => (item.id === config.id ? record : item))
    : [record, ...records]
  saveDashboardRecords(next)
  return record
}

export function deleteDashboardRecord(id: string): void {
  saveDashboardRecords(loadDashboardRecords().filter((record) => record.id !== id))
}

export function findDashboardRecord(id: string): DashboardRecord | undefined {
  return loadDashboardRecords().find((record) => record.id === id)
}
