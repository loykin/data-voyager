import { useEffect, useRef, useState } from 'react'
import { DataGrid } from '@data-voyager/shared-ui'
import { generatePods, tickPods, type Pod } from './data'
import { columns } from './columns'

const INTERVALS = [500, 1000, 2000, 5000] as const
type Interval = typeof INTERVALS[number]

/**
 * Simulates a k8s list-watch: pods update at a configurable interval.
 * Tests:
 * - Column resizing stability under live data (user-resized widths preserved)
 * - Sort/filter state preserved across updates
 * - Virtual rendering (120 rows + fixed height → auto virtualizer)
 * - Columns only grow, never shrink (layout stability)
 */
export function LiveUpdateTab() {
  const [pods, setPods] = useState<Pod[]>(() => generatePods(120))
  const [interval, setInterval_] = useState<Interval>(2000)
  const [running, setRunning] = useState(true)
  const [tickCount, setTickCount] = useState(0)
  const intervalRef = useRef<ReturnType<typeof globalThis.setInterval> | null>(null)
  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = globalThis.setInterval(() => {
      setPods((prev) => tickPods(prev))
      setTickCount((n) => n + 1)
    }, interval)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [running, interval])

  const runningCount = pods.filter((p) => p.status === 'Running').length
  const crashCount  = pods.filter((p) => p.status === 'CrashLoopBackOff').length

  return (
    <section className="flex flex-col gap-3">
      {/* Controls */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Interval:</span>
          {INTERVALS.map((ms) => (
            <button
              key={ms}
              onClick={() => setInterval_(ms)}
              className={
                `px-2 py-1 rounded text-xs font-medium transition-colors ` +
                (interval === ms
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80')
              }
            >
              {ms >= 1000 ? `${ms / 1000}s` : `${ms}ms`}
            </button>
          ))}
        </div>

        <button
          onClick={() => setRunning((r) => !r)}
          className={
            `px-3 py-1 rounded text-xs font-medium transition-colors ` +
            (running
              ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
              : 'bg-green-100 text-green-800 hover:bg-green-200')
          }
        >
          {running ? 'Pause' : 'Resume'}
        </button>

        <button
          onClick={() => { setPods(generatePods(120)); setTickCount(0) }}
          className="px-3 py-1 rounded text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80"
        >
          Reset
        </button>

        {/* Live stats */}
        <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
          <span>Ticks: <strong className="text-foreground">{tickCount}</strong></span>
          <span className="text-green-700">Running: <strong>{runningCount}</strong></span>
          {crashCount > 0 && (
            <span className="text-orange-600">CrashLoop: <strong>{crashCount}</strong></span>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        120 pods · virtualizer auto-enabled · resize columns while updates run ·
        sort/filter state preserved across ticks
      </p>

      <DataGrid
        data={pods}
        columns={columns}
        enablePagination={false}
        enableSorting
        enableColumnFilters
        bordered
        tableHeight={520}
        emptyMessage="No pods"
      />
    </section>
  )
}
