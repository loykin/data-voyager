import { definePanel, type PanelViewerProps } from '@loykin/dashboardkit'
import { resultToSeries } from './data'

interface TimeSeriesOptions extends Record<string, unknown> {
  unit?: string
}

function TimeSeriesViewer({ rawData, options }: PanelViewerProps<TimeSeriesOptions, unknown>) {
  const points = resultToSeries(rawData)
  const width = 420
  const height = 150

  if (points.length === 0) {
    return <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No series</div>
  }

  const minX = Math.min(...points.map((point) => point.x))
  const maxX = Math.max(...points.map((point) => point.x))
  const minY = Math.min(...points.map((point) => point.y))
  const maxY = Math.max(...points.map((point) => point.y))
  const spanX = Math.max(1, maxX - minX)
  const spanY = Math.max(1, maxY - minY)
  const d = points
    .map((point, index) => {
      const x = ((point.x - minX) / spanX) * width
      const y = height - ((point.y - minY) / spanY) * height
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
  const latest = points.at(-1)?.y

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-xs text-muted-foreground">Latest</span>
        <span className="text-sm font-medium tabular-nums">
          {latest?.toLocaleString()}{options.unit ? ` ${options.unit}` : ''}
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="min-h-0 flex-1 overflow-visible">
        <path d={d} fill="none" stroke="var(--primary)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  )
}

export const timeSeriesPanelPlugin = definePanel<TimeSeriesOptions>({
  id: 'timeseries',
  name: 'Time series',
  description: 'Line chart from time/value query result',
  optionsSchema: {},
  defaultOptions: { unit: '' },
  viewer: TimeSeriesViewer,
})
