import { useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { HistogramCanvas } from './components/HistogramCanvas'
import { useBins } from './hooks/useBins'
import type { HistogramProps } from './types'

export function Histogram({
  values,
  bins,
  height       = 300,
  color        = '#3b82f6',
  fillOpacity  = 0.8,
  normalize    = false,
  xUnit,
  yUnit,
  yMin,
  yMax,
  gridStyle,
  axisStyle,
  isLoading,
  error,
}: HistogramProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { edges, counts } = useBins(values, bins)

  // Convert raw counts → percentage (0–100) when normalize=true.
  // The conversion happens here so HistogramCanvas stays unaware of normalize logic
  // and only receives ready-to-display values.
  const n = values.length
  const displayCounts = normalize && n > 0
    ? counts.map(c => (c / n) * 100)
    : counts

  if (error) {
    return (
      <div className="flex items-center justify-center text-sm text-destructive" style={{ height }}>
        {error.message}
      </div>
    )
  }

  if (!values.length && !isLoading) {
    return (
      <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
        No data
      </div>
    )
  }

  return (
    <div className="relative w-full min-w-0">
      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded bg-background/60 backdrop-blur-sm">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      <div ref={containerRef} className="w-full" />
      {edges.length > 0 && (
        <HistogramCanvas
          containerRef={containerRef}
          edges={edges}
          counts={displayCounts}
          height={height}
          color={color}
          fillOpacity={fillOpacity}
          normalize={normalize}
          xUnit={xUnit}
          yUnit={yUnit}
          yMin={yMin}
          yMax={yMax}
          gridStyle={gridStyle}
          axisStyle={axisStyle}
        />
      )}
    </div>
  )
}
