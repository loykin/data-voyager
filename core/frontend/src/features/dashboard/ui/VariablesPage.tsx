import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Input } from '@loykin/designkit'
import { useConfigChanged } from '@loykin/dashboardkit/react'
import type { VariableInput } from '@loykin/dashboardkit'
import { Plus, Trash2 } from 'lucide-react'
import type { DatasourceInstance } from '@loykin/datasourcekit'
import { getDashboardEngine } from '../model/dashboardEngine'
import { createDashboardConfig, findDashboardRecord, upsertDashboardRecord } from '../model/dashboardStore'
import { useDashboardDatasources } from '../hooks/useDashboardDatasources'

const engine = getDashboardEngine()

function firstDatasource(datasources: DatasourceInstance[]): DatasourceInstance | undefined {
  return datasources.find((item) => item.enabled ?? true) ?? datasources[0]
}

function ensureDashboard(id: string, datasources: DatasourceInstance[]) {
  const stored = findDashboardRecord(id)
  if (stored) return stored.config
  const config = createDashboardConfig({ id, title: id, datasource: firstDatasource(datasources) })
  upsertDashboardRecord(config)
  return config
}

export function VariablesPage() {
  const { dashboardId = 'overview' } = useParams()
  const { items: datasources } = useDashboardDatasources()
  const [name, setName] = useState('')
  const [values, setValues] = useState('')
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

  const add = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    const options = values.split(',').map((value) => value.trim()).filter(Boolean)
    const variable: VariableInput = options.length > 0
      ? { name: trimmed, type: 'custom', label: trimmed, defaultValue: options[0], options: { values: options } }
      : { name: trimmed, type: 'textbox', label: trimmed, defaultValue: '' }
    const exists = config.variables.some((item) => item.name === trimmed)
    const change = exists
      ? engine.updateVariable(trimmed, variable, { refresh: true })
      : engine.addVariable(variable, { refresh: true })
    void change
    setName('')
    setValues('')
  }

  return (
    <div className="dv-dashboard">
      <div className="dv-dashboard__topbar">
        <Link to={`/dashboard/${dashboardId}`} className="text-muted-foreground hover:text-foreground">Dashboard</Link>
        <span className="text-muted-foreground">/</span>
        <div className="dv-dashboard__title">Variables</div>
      </div>
      <div className="dv-dashboard__editor-body">
        <main className="dv-dashboard__editor-left">
          <div className="dv-dashboard__editor-section">
          <div className="dv-dashboard__section-title">Variables</div>
          <div className="divide-y border">
            {config.variables.map((variable) => (
              <div key={variable.name} className="flex items-center justify-between gap-3 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">${variable.name}</p>
                  <p className="text-xs text-muted-foreground">{variable.type}</p>
                </div>
                <button
                  className="dv-dashboard__icon-button"
                  onClick={() => void engine.removeVariable(variable.name, { refresh: true })}
                  title="Remove variable"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          </div>
        </main>
        <aside className="dv-dashboard__editor-form">
          <div className="dv-dashboard__editor-section">
          <div className="dv-dashboard__section-title">Add variable</div>
          <div className="space-y-3">
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">Name</span>
              <Input value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">Values</span>
              <Input placeholder="prod, staging, dev" value={values} onChange={(event) => setValues(event.target.value)} />
            </label>
            <button className="dv-dashboard__button dv-dashboard__button--primary inline-flex items-center gap-1.5" onClick={add}>
              <Plus className="h-4 w-4" />
              Add variable
            </button>
          </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
