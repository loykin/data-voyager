import { useCallback, useMemo } from 'react'
import uPlot from 'uplot'
import 'uplot/dist/uPlot.min.css'
import { useUPlot } from '../hooks/useUPlot'
import { selectionPlugin } from '../plugins/selectionPlugin'
import type { AxisConfig, LineStyle, SeriesConfig, SelectionMode, SelectionResult } from '../types'

interface ChartCanvasProps {
  containerRef:  React.RefObject<HTMLDivElement | null>
  data:          uPlot.AlignedData
  series:        SeriesConfig[]
  height:        number
  selectionMode: SelectionMode
  yUnit?:        string
  yUnitDisplay?: 'label' | 'tick'
  yMin?:         number
  yMax?:         number
  xShowDate?: boolean
  locale?:    string
  gridStyle?: LineStyle | false
  axisStyle?: AxisConfig | false
  timeRange?: [number, number]
  barStack?:  boolean
  onSelect?:     (result: SelectionResult) => void
  onReady?:      (chart: uPlot) => void
  onCursorMove?: (chart: uPlot, idx: number | null) => void
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  if (isNaN(r) || isNaN(g) || isNaN(b)) return hex
  return `rgba(${r},${g},${b},${alpha})`
}

/**
 * Canvas ctx.strokeStyle / fillStyle cannot resolve CSS custom properties.
 * Read the computed value from the document root and return it as-is
 * (the value is already a complete color string such as `oklch(0.556 0 0)`).
 */
function resolveCssVar(variable: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const val = getComputedStyle(document.documentElement)
    .getPropertyValue(variable)
    .trim()
  return val || fallback
}

/**
 * Plugin that draws the axis border lines (left + bottom frame) in the
 * `draw` hook — fires AFTER all axes/series — so they are never buried
 * under grid lines or fill areas.
 *
 * Completely independent from gridStyle: each has its own defaults.
 */
function makeAxisBorderPlugin(
  style:         LineStyle | false | undefined,
  defaultStroke: string,
  defaultWidth:  number,
): uPlot.Plugin {
  if (style === false) return { hooks: {} }

  const stroke = style?.stroke ?? defaultStroke
  const width  = style?.width  ?? defaultWidth
  const dash   = style?.dash

  return {
    hooks: {
      draw: [(u: uPlot) => {
        const { ctx, bbox } = u
        const dpr    = devicePixelRatio
        const lw     = Math.round(width * dpr * 2) / 2   // snap to 0.5-px grid
        const offset = (lw % 2) / 2

        ctx.save()
        ctx.strokeStyle = stroke
        ctx.lineWidth   = lw
        ctx.setLineDash(dash ? dash.map(d => d * dpr) : [])
        ctx.lineCap = 'square'
        ctx.translate(offset, offset)

        ctx.beginPath()
        // left vertical line (y-axis border)
        ctx.moveTo(bbox.left, bbox.top)
        ctx.lineTo(bbox.left, bbox.top + bbox.height)
        // bottom horizontal line (x-axis border)
        ctx.moveTo(bbox.left,              bbox.top + bbox.height)
        ctx.lineTo(bbox.left + bbox.width, bbox.top + bbox.height)
        ctx.stroke()

        ctx.restore()
      }],
    },
  }
}

export function ChartCanvas({
  containerRef,
  data,
  series,
  height,
  selectionMode,
  yUnit,
  yUnitDisplay = 'label',
  yMin,
  yMax,
  xShowDate = true,
  locale,
  gridStyle,
  axisStyle,
  timeRange,
  barStack = false,
  onSelect,
  onReady,
  onCursorMove,
}: ChartCanvasProps) {
  const getOptions = useCallback((): uPlot.Options => {
    // Resolve CSS variables to actual color values — canvas cannot parse var().
    // The project uses oklch() colors directly, so return the value as-is.
    const mutedFgColor = resolveCssVar('--muted-foreground', 'oklch(0.556 0 0)')
    const borderColor  = resolveCssVar('--border',           'oklch(0.922 0 0)')

    const DEFAULT_LINE_WIDTH = 0.5

    // Bar stacking: draw in reverse order (background → foreground)
    const isBarStack   = barStack && series.some(s => s.type === 'bars')
    const orderedSeries = isBarStack ? [...series].reverse() : series

    const uSeries: uPlot.Series[] = [
      {},  // x (timestamps)
      ...orderedSeries.map((s) => {
        const type      = s.type ?? 'line'
        const isArea    = type === 'area'
        const isBars    = type === 'bars'
        const isPoints  = type === 'points'
        const opacity   = s.fillOpacity ?? (isArea ? 0.15 : 1)

        let fill: uPlot.Series['fill']
        if (isArea || isBars) {
          if (isArea && s.fillGradient) {
            fill = (u: uPlot) => {
              const { ctx, bbox } = u
              const grad = ctx.createLinearGradient(0, bbox.top, 0, bbox.top + bbox.height)
              grad.addColorStop(0, hexToRgba(s.color, opacity))
              grad.addColorStop(1, hexToRgba(s.color, 0))
              return grad
            }
          } else {
            fill = hexToRgba(s.color, opacity)
          }
        }

        return {
          label:  s.label,
          stroke: isPoints ? undefined : s.color,
          width:  (isPoints || isBars) ? 0 : (s.width ?? 1.5),
          fill,
          dash:   s.dash,
          show:   true,
          points: isBars ? undefined : {
            show:  isPoints || (s.pointShow ?? false),
            fill:  s.color,
            size:  s.pointSize ?? (isPoints ? 6 : 4),
            width: 0,
          },
          paths: isBars
            ? (uPlot.paths.bars?.({ size: [s.barWidth ?? 0.6, 100] }))
            : undefined,
        }
      }),
    ]

    const scales: uPlot.Scales = {
      x: timeRange ? { min: timeRange[0], max: timeRange[1] } : {},
      y: { min: yMin, max: yMax },
    }

    // ── Grid lines — fully independent ───────────────────────────────────────
    const resolvedGrid: uPlot.Axis.Grid =
      gridStyle === false
        ? { show: false }
        : {
            stroke: gridStyle?.stroke ?? borderColor,
            width:  gridStyle?.width  ?? DEFAULT_LINE_WIDTH,
            dash:   gridStyle?.dash,
          }

    // ── Axis line + ticks — grouped under axisStyle ───────────────────────────
    // axisStyle === false          → hide both line and ticks
    // axisStyle.line === false     → hide only the border line
    // axisStyle.ticks === false    → hide only the tick marks
    const tickConfig = axisStyle === false ? false : (axisStyle?.ticks ?? undefined)
    const resolvedTicks: uPlot.Axis.Ticks =
      tickConfig === false
        ? { show: false }
        : {
            stroke: tickConfig?.stroke ?? borderColor,
            width:  tickConfig?.width  ?? DEFAULT_LINE_WIDTH,
            dash:   tickConfig?.dash,
          }

    // Border line style extracted for the plugin
    const axisLineStyle: LineStyle | false | undefined =
      axisStyle === false ? false : axisStyle?.line

    const yInTickMode = yUnitDisplay === 'tick' && !!yUnit
    const yAxisValues: uPlot.Axis['values'] = yInTickMode
      ? (_u, vals) => vals.map((v) => {
          if (v == null) return ''
          const n = Math.abs(v) >= 1000
            ? v.toLocaleString(undefined, { maximumFractionDigits: 0 })
            : Number.isInteger(v) ? String(v) : v.toPrecision(3)
          return `${n}\u202f${yUnit}`
        })
      : undefined

    // X-axis time formatter.
    // xShowDate=true → shows date on a second line when the date changes.
    // locale controls toLocaleDateString (undefined = browser default).
    //
    // Size calculation for x-axis (horizontal, bottom):
    //   ticks(10) + gap(5) + line0(12) + lineHeight(18) + line1(12) = 57 → use 60
    //   Without date: ticks(10) + gap(5) + line0(12) = 27 → use 32
    const xAxisValues: uPlot.Axis['values'] = (_u, vals) => {
      let lastDay = -1
      return vals.map((ts) => {
        if (ts == null) return null
        const d   = new Date(ts * 1000)
        const hh  = String(d.getHours()).padStart(2, '0')
        const mm  = String(d.getMinutes()).padStart(2, '0')
        const time = `${hh}:${mm}`

        if (!xShowDate) return time

        const day = d.getFullYear() * 10000 + d.getMonth() * 100 + d.getDate()
        if (day !== lastDay) {
          lastDay = day
          const date = d.toLocaleDateString(locale, { month: 'short', day: 'numeric' })
          return `${time}\n${date}`
        }
        return time
      })
    }

    const axes: uPlot.Axis[] = [
      {
        space:  60,
        size:   xShowDate ? 60 : 32,
        stroke: mutedFgColor,
        values: xAxisValues,
        ticks:  resolvedTicks,
        grid:   resolvedGrid,
      },
      {
        // labelSize:16 — just wide enough for a rotated unit character,
        // keeping it visually close to the tick values.
        size:      yInTickMode ? 50 : 54,
        labelSize: 16,
        label:     yInTickMode ? undefined : yUnit,
        values:    yAxisValues,
        stroke:    mutedFgColor,
        ticks:     resolvedTicks,
        grid:      resolvedGrid,
      },
    ]

    // Axis border has its own independent defaults — no fallback to gridStyle.
    // Grid and axis border are completely separate concerns.

    return {
      width:     300,  // overridden by ResizeObserver in useUPlot
      height,
      drawOrder: ['series', 'axes'] as uPlot.DrawOrderKey[],
      legend:    { show: false },
      cursor:    {
        drag: { x: false, y: false },
        sync: { key: 'chart' },
      },
      series: uSeries,
      scales,
      axes,
      plugins: [
        // Axis border line: drawn last via draw hook, fully independent of gridStyle
        makeAxisBorderPlugin(axisLineStyle, borderColor, DEFAULT_LINE_WIDTH),
        selectionPlugin({ mode: selectionMode, onSelect }),
        ...(onCursorMove
          ? [{
              hooks: {
                setCursor: [(chart: uPlot) => {
                  onCursorMove(chart, chart.cursor.idx ?? null)
                }],
              },
            }]
          : []),
      ],
    }
  }, [series, height, selectionMode, yUnit, yUnitDisplay, xShowDate, locale, yMin, yMax, gridStyle, axisStyle, timeRange, barStack, onSelect, onCursorMove])

  // Bar stacking: transform data to cumulative sums, then reverse order
  const resolvedData = useMemo<uPlot.AlignedData>(() => {
    const hasBars = series.some(s => s.type === 'bars')
    if (!barStack || !hasBars || data.length < 3) return data

    const timestamps  = data[0]
    const arrays      = data.slice(1) as (number | null)[][]

    const cumulative = arrays.map((_, idx) =>
      (timestamps as number[]).map((__, i) => {
        let sum = 0
        for (let k = 0; k <= idx; k++) {
          const v = arrays[k][i]
          if (v != null) sum += v
        }
        return sum
      })
    )

    return [data[0], ...cumulative.reverse()] as uPlot.AlignedData
  }, [data, barStack, series])

  useUPlot({ containerRef, getOptions, data: resolvedData, onReady })

  return null
}
