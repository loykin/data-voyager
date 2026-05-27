import { createDashboardEngine, type CoreEngineAPI } from '@loykin/dashboardkit'
import { dashboardPanelRegistry } from '@data-voyager/sdk'
import { createDashboardDatasourceAdapter } from '../api/dashboardDatasourceAdapter'

let engine: CoreEngineAPI | null = null

export function getDashboardEngine(): CoreEngineAPI {
  if (engine) return engine

  engine = createDashboardEngine({
    datasourceAdapter: createDashboardDatasourceAdapter(),
  })

  dashboardPanelRegistry.getAll().forEach((plugin) => {
    engine?.registerPanel(plugin)
  })

  return engine
}
