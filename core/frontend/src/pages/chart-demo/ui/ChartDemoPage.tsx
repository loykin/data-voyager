import { useState } from 'react'
import {
  TimeSeriesChart,
  type AlignedData,
  type AxisConfig,
  type LegendFormat,
  type LegendItem,
  type LegendPosition,
  type LineStyle,
  type SelectionMode,
} from '@data-voyager/shared-ui'

// ── Demo data ────────────────────────────────────────────────────────────────

const STEP = 60   // 1-minute intervals
const N    = 120  // 2 hours of data

// Start 1 hour before midnight so the chart always crosses a date boundary.
const midnight = new Date()
midnight.setHours(0, 0, 0, 0)
const DEMO_START = Math.floor(midnight.getTime() / 1000) - 60 * 60  // 23:00 yesterday

function generateData(): AlignedData {
  const ts:  number[]          = []
  const cpu: (number | null)[] = []
  const mem: (number | null)[] = []
  const rps: (number | null)[] = []
  for (let i = 0; i < N; i++) {
    ts.push(DEMO_START + i * STEP)
    cpu.push(30 + Math.sin(i / 10) * 20 + Math.random() * 5)
    mem.push(60 + Math.cos(i / 15) * 10 + Math.random() * 3)
    rps.push(200 + Math.sin(i / 8) * 80 + Math.random() * 20)
  }
  return [ts, cpu, mem, rps]
}

const DEMO_DATA = generateData()

const SERIES = [
  { label: 'CPU',    color: '#3b82f6', unit: '%',    fill: true },
  { label: 'Memory', color: '#10b981', unit: '%'               },
  { label: 'RPS',    color: '#f59e0b', unit: 'req/s'           },
]

// ── Shared presets ────────────────────────────────────────────────────────────

type DashPreset = 'solid' | 'dashed' | 'dotted'

const DASH_PRESETS: Record<DashPreset, number[] | undefined> = {
  solid:  undefined,
  dashed: [4, 4],
  dotted: [1, 3],
}

const LINE_WIDTHS   = [0.5, 1, 2] as const
const DASH_KEYS     = ['solid', 'dashed', 'dotted'] as const
const LEGEND_POSITIONS: LegendPosition[] = ['bottom', 'top', 'left', 'right', 'none']
const LEGEND_FORMATS:   LegendFormat[]   = ['list', 'table']
const SELECTION_MODES:  SelectionMode[]  = ['x', 'y', 'xy', 'none']

// ── UI helpers ────────────────────────────────────────────────────────────────

function Btn({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={
        'px-2 py-1 rounded text-xs font-medium transition-colors ' +
        (active
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground hover:bg-muted/80')
      }
    >
      {children}
    </button>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground w-24 shrink-0 text-xs">{label}</span>
      {children}
    </div>
  )
}

function Section({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
        {title}
      </span>
      <div className="flex-1 border-t border-border" />
    </div>
  )
}

// ── Custom legend example ─────────────────────────────────────────────────────

function CustomLegend({ items }: { items: LegendItem[] }) {
  return (
    <div className="flex gap-3 px-1 py-1 text-xs border rounded bg-muted/30">
      <span className="text-muted-foreground font-medium">Custom:</span>
      {items.map((item) => (
        <span key={item.index} className="flex items-center gap-1" style={{ opacity: item.visible ? 1 : 0.4 }}>
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, backgroundColor: item.color }} />
          <strong>{item.label}</strong>
          {item.value != null && <span className="text-muted-foreground">{item.value.toFixed(1)}</span>}
        </span>
      ))}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function ChartDemoPage() {
  // Legend
  const [legendPosition,  setLegendPosition]  = useState<LegendPosition>('bottom')
  const [legendFormat,    setLegendFormat]    = useState<LegendFormat>('list')
  const [useCustomLegend, setUseCustomLegend] = useState(false)

  // Grid (눈금선) — independent
  const [showGrid,    setShowGrid]    = useState(true)
  const [gridDash,    setGridDash]    = useState<DashPreset>('solid')
  const [gridWidth,   setGridWidth]   = useState(0.5)

  // Axis (축선) — line + ticks grouped
  const [showAxisLine,   setShowAxisLine]   = useState(true)
  const [axisLineDash,   setAxisLineDash]   = useState<DashPreset>('solid')
  const [axisLineWidth,  setAxisLineWidth]  = useState(0.5)
  const [showAxisTicks,  setShowAxisTicks]  = useState(true)
  const [axisTickWidth,  setAxisTickWidth]  = useState(0.5)

  // X-axis
  const [xShowDate, setXShowDate] = useState(true)
  const [locale,    setLocale]    = useState<string | undefined>(undefined)

  // Chart
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('x')
  const [height,        setHeight]        = useState(300)
  const [yUnitDisplay,  setYUnitDisplay]  = useState<'label' | 'tick'>('label')

  const [lastSelection, setLastSelection] = useState('')

  // Build props
  const gridStyle: LineStyle | false = showGrid
    ? { width: gridWidth, dash: DASH_PRESETS[gridDash] }
    : false

  const axisStyle: AxisConfig | false = (!showAxisLine && !showAxisTicks)
    ? false
    : {
        line: showAxisLine
          ? { width: axisLineWidth, dash: DASH_PRESETS[axisLineDash] }
          : false,
        ticks: showAxisTicks
          ? { width: axisTickWidth }
          : false,
      }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-semibold">Time Series Chart</h1>
        <p className="text-sm text-muted-foreground mt-1">
          uPlot · {N} data points · drag to select
        </p>
      </div>

      <div className="flex flex-col gap-4 text-xs">

        {/* ── Legend ── */}
        <Section title="Legend" />
        <div className="flex flex-wrap gap-x-8 gap-y-2 pl-1">
          <Row label="Position">
            {LEGEND_POSITIONS.map((p) => (
              <Btn key={p} active={legendPosition === p} onClick={() => setLegendPosition(p)}>{p}</Btn>
            ))}
          </Row>
          <Row label="Format">
            {LEGEND_FORMATS.map((f) => (
              <Btn key={f} active={legendFormat === f} onClick={() => setLegendFormat(f)}>{f}</Btn>
            ))}
            <Btn active={useCustomLegend} onClick={() => setUseCustomLegend((v) => !v)}>custom</Btn>
          </Row>
        </div>

        {/* ── Grid ── */}
        <Section title="Grid" />
        <div className="flex flex-wrap gap-x-8 gap-y-2 pl-1">
          <Row label="Show">
            <Btn active={showGrid}  onClick={() => setShowGrid(true)}>on</Btn>
            <Btn active={!showGrid} onClick={() => setShowGrid(false)}>off</Btn>
          </Row>
          <Row label="Style">
            {DASH_KEYS.map((d) => (
              <Btn key={d} active={gridDash === d} onClick={() => setGridDash(d)}>{d}</Btn>
            ))}
          </Row>
          <Row label="Width">
            {LINE_WIDTHS.map((w) => (
              <Btn key={w} active={gridWidth === w} onClick={() => setGridWidth(w)}>{w}px</Btn>
            ))}
          </Row>
        </div>

        {/* ── Axis ── */}
        <Section title="Axis" />
        <div className="flex flex-wrap gap-x-8 gap-y-2 pl-1">
          {/* Line */}
          <Row label="Line show">
            <Btn active={showAxisLine}  onClick={() => setShowAxisLine(true)}>on</Btn>
            <Btn active={!showAxisLine} onClick={() => setShowAxisLine(false)}>off</Btn>
          </Row>
          <Row label="Line style">
            {DASH_KEYS.map((d) => (
              <Btn key={d} active={axisLineDash === d} onClick={() => setAxisLineDash(d)}>{d}</Btn>
            ))}
          </Row>
          <Row label="Line width">
            {LINE_WIDTHS.map((w) => (
              <Btn key={w} active={axisLineWidth === w} onClick={() => setAxisLineWidth(w)}>{w}px</Btn>
            ))}
          </Row>
          {/* Ticks — sub-option of axis */}
          <Row label="Ticks show">
            <Btn active={showAxisTicks}  onClick={() => setShowAxisTicks(true)}>on</Btn>
            <Btn active={!showAxisTicks} onClick={() => setShowAxisTicks(false)}>off</Btn>
          </Row>
          <Row label="Ticks width">
            {LINE_WIDTHS.map((w) => (
              <Btn key={w} active={axisTickWidth === w} onClick={() => setAxisTickWidth(w)}>{w}px</Btn>
            ))}
          </Row>
        </div>

        {/* ── X-axis ── */}
        <Section title="X-axis" />
        <div className="flex flex-wrap gap-x-8 gap-y-2 pl-1">
          <Row label="Show date">
            <Btn active={xShowDate}  onClick={() => setXShowDate(true)}>on</Btn>
            <Btn active={!xShowDate} onClick={() => setXShowDate(false)}>off</Btn>
          </Row>
          <Row label="Locale">
            {([undefined, 'en-US', 'ko-KR', 'ja-JP'] as const).map((l) => (
              <Btn key={l ?? 'auto'} active={locale === l} onClick={() => setLocale(l)}>
                {l ?? 'auto'}
              </Btn>
            ))}
          </Row>
        </div>

        {/* ── Chart ── */}
        <Section title="Chart" />
        <div className="flex flex-wrap gap-x-8 gap-y-2 pl-1">
          <Row label="Selection">
            {SELECTION_MODES.map((m) => (
              <Btn key={m} active={selectionMode === m} onClick={() => setSelectionMode(m)}>{m}</Btn>
            ))}
          </Row>
          <Row label="Height">
            {[200, 300, 400].map((h) => (
              <Btn key={h} active={height === h} onClick={() => setHeight(h)}>{h}px</Btn>
            ))}
          </Row>
          <Row label="Y unit">
            <Btn active={yUnitDisplay === 'label'} onClick={() => setYUnitDisplay('label')}>label</Btn>
            <Btn active={yUnitDisplay === 'tick'}  onClick={() => setYUnitDisplay('tick')}>tick</Btn>
          </Row>
        </div>

      </div>

      {/* Chart */}
      <div className="rounded-md border p-4">
        <TimeSeriesChart
          data={DEMO_DATA}
          series={SERIES}
          height={height}
          legendPosition={legendPosition}
          legendFormat={legendFormat}
          renderLegend={useCustomLegend ? (items) => <CustomLegend items={items} /> : undefined}
          selectionMode={selectionMode}
          xShowDate={xShowDate}
          locale={locale}
          yUnit="%"
          yUnitDisplay={yUnitDisplay}
          gridStyle={gridStyle}
          axisStyle={axisStyle}
          onSelect={({ timeRange, yRange }) => {
            const parts: string[] = []
            if (timeRange) {
              const from = new Date(timeRange[0] * 1000).toLocaleTimeString()
              const to   = new Date(timeRange[1] * 1000).toLocaleTimeString()
              parts.push(`time: ${from} → ${to}`)
            }
            if (yRange) parts.push(`y: ${yRange[0].toFixed(1)} → ${yRange[1].toFixed(1)}`)
            setLastSelection(parts.join('  ·  '))
          }}
        />
      </div>

      {lastSelection && (
        <p className="text-xs text-muted-foreground">
          Last selection: <strong className="text-foreground">{lastSelection}</strong>
        </p>
      )}
    </div>
  )
}
