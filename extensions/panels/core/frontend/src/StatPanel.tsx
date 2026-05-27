import { definePanel, type PanelViewerProps } from '@loykin/dashboardkit'
import { firstNumericValue } from './data'

interface StatOptions extends Record<string, unknown> {
  unit?: string
  fallbackValue?: number
}

function StatViewer({ rawData, options }: PanelViewerProps<StatOptions, unknown>) {
  const value = firstNumericValue(rawData) ?? options.fallbackValue ?? 0

  return (
    <div className="flex h-full flex-col justify-center">
      <div className="truncate text-3xl font-semibold tabular-nums">{value.toLocaleString()}</div>
      {options.unit && <div className="mt-1 text-xs text-muted-foreground">{options.unit}</div>}
    </div>
  )
}

export const statPanelPlugin = definePanel<StatOptions>({
  id: 'stat',
  name: 'Stat',
  description: 'Single value panel',
  optionsSchema: {},
  defaultOptions: { unit: '' },
  viewer: StatViewer,
})
