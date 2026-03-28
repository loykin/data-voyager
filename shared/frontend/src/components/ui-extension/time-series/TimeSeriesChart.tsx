import { useCallback, useRef } from 'react'
import type uPlot from 'uplot'
import { Loader2 } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { ChartCanvas } from './components/ChartCanvas'
import { ChartLegend } from './components/ChartLegend'
import { useLegendState } from './hooks/useLegendState'
import type { SelectionResult, TimeSeriesChartProps } from './types'

export function TimeSeriesChart({
  data,
  series,
  height         = 300,
  legendPosition = 'bottom',
  legendFormat   = 'list',
  yUnit,
  yUnitDisplay,
  yMin,
  yMax,
  xShowDate,
  locale,
  gridStyle,
  axisStyle,
  renderLegend,
  selectionMode  = 'x',
  onSelect,
  timeRange,
  onTimeRangeChange,
  isLoading,
  error,
}: TimeSeriesChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { items, setChart, toggle, updateValues } = useLegendState(series, data)

  const handleReady = useCallback((chart: uPlot) => {
    setChart(chart)
  }, [setChart])

  const handleCursorMove = useCallback((chart: uPlot, idx: number | null) => {
    updateValues(chart, idx)
  }, [updateValues])

  // Bridge generic SelectionResult → time-series API
  const handleSelect = useCallback((result: SelectionResult) => {
    if (result.xRange) onTimeRangeChange?.(result.xRange)
    onSelect?.({ timeRange: result.xRange, yRange: result.yRange })
  }, [onSelect, onTimeRangeChange])

  if (error) {
    return (
      <div className="flex items-center justify-center text-sm text-destructive" style={{ height }}>
        {error.message}
      </div>
    )
  }

  // Custom renderer takes priority over built-in legend
  const customLegend = renderLegend ? renderLegend(items) : null
  const showLegend   = !renderLegend && legendPosition !== 'none' && series.length > 0
  const isVertical   = legendPosition === 'left' || legendPosition === 'right'

  const legend = showLegend ? (
    <ChartLegend
      items={items}
      position={legendPosition}
      format={legendFormat}
      onToggle={toggle}
    />
  ) : null

  // Layout: use DOM order to control visual position — no flex-reverse tricks.
  //
  //  top    → flex-col  + legend first  → legend on top
  //  bottom → flex-col  + legend last   → legend on bottom
  //  left   → flex-row  + legend first  → legend on left
  //  right  → flex-row  + legend last   → legend on right
  return (
    <div
      className={cn(
        'relative w-full min-w-0',
        isVertical ? 'flex flex-row items-start gap-2' : 'flex flex-col gap-1',
      )}
    >
      {/* custom legend — rendered above canvas by default */}
      {customLegend}

      {/* top / left — renders before the canvas */}
      {(legendPosition === 'top' || legendPosition === 'left') && legend}

      {/* Chart canvas */}
      <div className="relative min-w-0 flex-1">
        {isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded bg-background/60 backdrop-blur-sm">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        <div ref={containerRef} className="w-full" />
        <ChartCanvas
          containerRef={containerRef}
          data={data}
          series={series}
          height={height}
          selectionMode={selectionMode}
          yUnit={yUnit}
          yUnitDisplay={yUnitDisplay}
          yMin={yMin}
          yMax={yMax}
          xShowDate={xShowDate}
          locale={locale}
          gridStyle={gridStyle}
          axisStyle={axisStyle}
          timeRange={timeRange}
          onSelect={handleSelect}
          onReady={handleReady}
          onCursorMove={handleCursorMove}
        />
      </div>

      {/* bottom / right — renders after the canvas */}
      {(legendPosition === 'bottom' || legendPosition === 'right') && legend}
    </div>
  )
}
