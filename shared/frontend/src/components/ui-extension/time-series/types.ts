import type React from 'react'
import type uPlot from 'uplot'

// uPlot's aligned data format:
// [timestamps, series1, series2, ...]  — all arrays must be the same length.
// Timestamps are unix seconds (number).
export type AlignedData = uPlot.AlignedData

export type LegendPosition = 'top' | 'bottom' | 'left' | 'right' | 'none'

/**
 * 'list'  — colored labels in a row / column (default)
 * 'table' — structured table with Min / Max / Avg / Last columns
 */
export type LegendFormat  = 'list' | 'table'

export type SelectionMode = 'x' | 'y' | 'xy' | 'none'

export interface SeriesConfig {
  /** Display name shown in the legend */
  label: string
  /** Line / fill color (hex or CSS color string) */
  color: string
  /** Value unit shown in legend cells, e.g. "ms", "%" */
  unit?: string
  /** Line stroke width in px (default 1.5) */
  width?: number
  /** Chart type for this series (default: 'line') */
  type?: 'line' | 'area' | 'bars' | 'points'
  /** Fill opacity 0–1. Defaults: area=0.15, bars=1 */
  fillOpacity?: number
  /** Vertical gradient fill — fades from fillOpacity at top to 0 at bottom (area only) */
  fillGradient?: boolean
  /** Show data point dots on line / area series. Default: false */
  pointShow?: boolean
  /** Dot radius in px (default 4, points type default 6) */
  pointSize?: number
  /** Bar width as a fraction of x-axis spacing 0–1 (default 0.6) */
  barWidth?: number
  /** Dash pattern, e.g. [4, 2] for dashed lines */
  dash?: number[]
}

/** Line appearance: width, color, dash pattern */
export interface LineStyle {
  /** Line width in CSS px. 0.5 = hairline on Retina (default 0.5) */
  width?:  number
  /** CSS color string. Defaults to the theme's border color */
  stroke?: string
  /** Dash pattern, e.g. [4, 2] for dashed, [2, 2] for dotted. Solid if omitted */
  dash?:   number[]
}

/**
 * Axis line configuration — controls the border line and its tick marks together.
 * Ticks are a sub-option of the axis, not a separate concern.
 *
 * Pass `false` at the top level to hide both line and ticks entirely.
 */
export interface AxisConfig {
  /** Style of the axis border line itself (left vertical + bottom horizontal). */
  line?: LineStyle | false
  /** Style of the tick marks on the axis. `false` = hide ticks. */
  ticks?: LineStyle | false
}

/** What the generic selection plugin emits — raw data-space values */
export interface SelectionResult {
  xRange?: [number, number]
  yRange?: [number, number]
}

export interface TimeSeriesChartProps {
  // ── Data ─────────────────────────────────────────────────────────────────
  /** AlignedData: [timestamps, ...series] */
  data: AlignedData
  /** One entry per data series (data[1], data[2], …) */
  series: SeriesConfig[]

  // ── Layout ───────────────────────────────────────────────────────────────
  /** Canvas height in px (default 300) */
  height?: number
  /** Where to render the legend (default 'bottom') */
  legendPosition?: LegendPosition
  /** Legend display mode (default 'list') */
  legendFormat?: LegendFormat

  // ── Y-axis ───────────────────────────────────────────────────────────────
  yUnit?: string
  /**
   * How to display the y-axis unit:
   * - 'label': rotated text label beside the axis (default)
   * - 'tick':  unit suffix on each tick value — e.g. "30 %" (saves label space)
   */
  yUnitDisplay?: 'label' | 'tick'
  yMin?:  number
  yMax?:  number

  // ── X-axis time display ───────────────────────────────────────────────────
  /**
   * Show the date on a second line when the date changes between ticks.
   * e.g. "00:00\nJan 16" at midnight. Default: true.
   */
  xShowDate?: boolean
  /**
   * BCP 47 locale tag for date/time formatting (e.g. 'en-US', 'ko-KR', 'ja-JP').
   * Defaults to the browser's locale.
   */
  locale?: string

  // ── Grid / axis style ────────────────────────────────────────────────────
  /** Grid lines inside the plot area. `false` = hide. */
  gridStyle?: LineStyle | false
  /**
   * Axis configuration: border line + tick marks as a unit.
   * `false` = hide both line and ticks entirely.
   * Fine-grained: `{ line: false }` hides only the border, `{ ticks: false }` hides only ticks.
   */
  axisStyle?: AxisConfig | false

  // ── Bar stack ────────────────────────────────────────────────────────────
  /** Stack bar series cumulatively. Only applies when series have type='bars' */
  barStack?: boolean

  // ── Selection / zoom ─────────────────────────────────────────────────────
  /** Drag direction(s) that trigger a range selection (default 'x') */
  selectionMode?: SelectionMode
  /**
   * Called when the user finishes a drag-select.
   * xRange values are unix seconds; yRange values are in y-axis data units.
   */
  onSelect?: (selection: {
    timeRange?: [number, number]
    yRange?:    [number, number]
  }) => void

  // ── Controlled time range ────────────────────────────────────────────────
  /** [from, to] in unix seconds — controls the visible x window */
  timeRange?: [number, number]
  onTimeRangeChange?: (range: [number, number]) => void

  // ── Custom legend ────────────────────────────────────────────────────────
  /**
   * Fully replace the built-in legend with a custom renderer.
   * Receives the current legend items (visibility, cursor value, stats).
   * When provided, `legendPosition` / `legendFormat` are ignored.
   */
  renderLegend?: (items: import('./hooks/useLegendState').LegendItem[]) => React.ReactNode

  // ── Loading / error ──────────────────────────────────────────────────────
  isLoading?: boolean
  error?:     Error | null
}
