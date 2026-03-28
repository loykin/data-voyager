import { cn } from '../../../../lib/utils'
import type { LegendItem } from '../hooks/useLegendState'
import type { LegendFormat, LegendPosition } from '../types'

interface ChartLegendProps {
  items:    LegendItem[]
  position: LegendPosition
  format:   LegendFormat
  onToggle: (index: number) => void
}

function fmt(value: number | null, unit?: string, decimals = 2): string {
  if (value == null) return '—'
  const s = Math.abs(value) >= 1000
    ? value.toLocaleString(undefined, { maximumFractionDigits: 1 })
    : value.toLocaleString(undefined, { maximumFractionDigits: decimals })
  return unit ? `${s} ${unit}` : s
}

// ─── List format ─────────────────────────────────────────────────────────────

function ListLegend({ items, position, onToggle }: Omit<ChartLegendProps, 'format'>) {
  const isVertical = position === 'left' || position === 'right'

  return (
    <div
      className={cn(
        'flex gap-1 text-xs select-none',
        isVertical ? 'flex-col py-1' : 'flex-row flex-wrap items-center px-1 py-1',
      )}
    >
      {items.map((item) => (
        <button
          key={item.index}
          type="button"
          onClick={() => onToggle(item.index)}
          className={cn(
            'flex items-center gap-1.5 rounded px-1.5 py-0.5 transition-opacity',
            'hover:bg-muted/60',
            !item.visible && 'opacity-35',
          )}
        >
          <Swatch color={item.color} />
          <span className="font-medium text-foreground">{item.label}</span>
          {item.value != null && (
            <span className="tabular-nums text-muted-foreground">
              {fmt(item.value, item.unit)}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

// ─── Table format ─────────────────────────────────────────────────────────────

const TABLE_COLS = ['Min', 'Max', 'Avg', 'Last'] as const

function TableLegend({ items, onToggle }: Omit<ChartLegendProps, 'format' | 'position'>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse select-none">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th className="py-1 pr-4 text-left font-medium">Name</th>
            {TABLE_COLS.map((col) => (
              <th key={col} className="py-1 px-2 text-right font-medium w-20">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.index}
              onClick={() => onToggle(item.index)}
              className={cn(
                'cursor-pointer border-b border-border/50 transition-opacity',
                'hover:bg-muted/40',
                !item.visible && 'opacity-35',
              )}
            >
              <td className="py-1 pr-4">
                <span className="flex items-center gap-1.5">
                  <Swatch color={item.color} />
                  <span className="font-medium text-foreground">{item.label}</span>
                </span>
              </td>
              <td className="py-1 px-2 text-right tabular-nums text-muted-foreground">
                {fmt(item.stats.min, item.unit)}
              </td>
              <td className="py-1 px-2 text-right tabular-nums text-muted-foreground">
                {fmt(item.stats.max, item.unit)}
              </td>
              <td className="py-1 px-2 text-right tabular-nums text-muted-foreground">
                {fmt(item.stats.avg, item.unit)}
              </td>
              <td className={cn(
                'py-1 px-2 text-right tabular-nums font-medium',
                item.value != null ? 'text-foreground' : 'text-muted-foreground',
              )}>
                {/* Show cursor value while hovering, fall back to last data point */}
                {fmt(item.value ?? item.stats.last, item.unit)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Swatch ───────────────────────────────────────────────────────────────────

function Swatch({ color }: { color: string }) {
  return (
    <span
      className="inline-block shrink-0 rounded-sm"
      style={{ width: 10, height: 10, backgroundColor: color }}
    />
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function ChartLegend({ items, position, format, onToggle }: ChartLegendProps) {
  if (format === 'table') {
    return <TableLegend items={items} onToggle={onToggle} />
  }
  return <ListLegend items={items} position={position} onToggle={onToggle} />
}
