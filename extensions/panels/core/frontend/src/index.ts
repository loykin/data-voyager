import { dashboardPanelRegistry } from '@data-voyager/sdk'
import { statPanelPlugin } from './StatPanel'
import { tablePanelPlugin } from './TablePanel'
import { timeSeriesPanelPlugin } from './TimeSeriesPanel'

const plugins = [statPanelPlugin, tablePanelPlugin, timeSeriesPanelPlugin]

plugins.forEach((plugin) => dashboardPanelRegistry.register(plugin))

export { plugins, statPanelPlugin, tablePanelPlugin, timeSeriesPanelPlugin }
