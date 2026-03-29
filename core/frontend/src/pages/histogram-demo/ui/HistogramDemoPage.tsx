import { useMemo, useState } from 'react'
import {
  Histogram,
  type AxisConfig,
  type LineStyle,
} from '@data-voyager/shared-ui'

// ── Demo data generators ──────────────────────────────────────────────────────

function normalSample(mean: number, std: number): number {
  const u1 = Math.random() || 1e-10
  const u2 = Math.random()
  return mean + std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

type Distribution = 'normal' | 'uniform' | 'skewed' | 'bimodal'

function generateValues(dist: Distribution, n: number): number[] {
  switch (dist) {
    case 'normal':
      return Array.from({ length: n }, () => normalSample(50, 12))
    case 'uniform':
      return Array.from({ length: n }, () => Math.random() * 100)
    case 'skewed':
      return Array.from({ length: n }, () => Math.exp(normalSample(3.5, 0.6)))
    case 'bimodal':
      return Array.from({ length: n }, (_, i) =>
        i % 2 === 0 ? normalSample(30, 8) : normalSample(70, 8),
      )
  }
}

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
      <span className="text-muted-foreground w-28 shrink-0 text-xs">{label}</span>
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

type DashPreset = 'solid' | 'dashed' | 'dotted'

const DASH_PRESETS: Record<DashPreset, number[] | undefined> = {
  solid:  undefined,
  dashed: [4, 4],
  dotted: [1, 3],
}

const LINE_WIDTHS = [0.5, 1, 2] as const
const DASH_KEYS   = ['solid', 'dashed', 'dotted'] as const

// ── Page ─────────────────────────────────────────────────────────────────────

const DISTRIBUTIONS: { key: Distribution; label: string }[] = [
  { key: 'normal',  label: 'Normal'  },
  { key: 'uniform', label: 'Uniform' },
  { key: 'skewed',  label: 'Skewed'  },
  { key: 'bimodal', label: 'Bimodal' },
]

const COLORS = [
  { hex: '#3b82f6', label: 'Blue'   },
  { hex: '#10b981', label: 'Green'  },
  { hex: '#f59e0b', label: 'Amber'  },
  { hex: '#ef4444', label: 'Red'    },
  { hex: '#8b5cf6', label: 'Purple' },
]

const SAMPLE_SIZES  = [200, 500, 2000, 10000] as const
const BIN_OPTIONS   = [5, 10, 20, 40, undefined] as const
const FILL_OPACITIES = [0.3, 0.5, 0.8, 1] as const

export function HistogramDemoPage() {
  // Data
  const [dist,     setDist]     = useState<Distribution>('normal')
  const [n,        setN]        = useState(2000)
  const [binCount, setBinCount] = useState<number | undefined>(undefined)
  const [normalize, setNormalize] = useState(false)

  // Style
  const [color,       setColor]       = useState('#3b82f6')
  const [fillOpacity, setFillOpacity] = useState(0.8)
  const [height,      setHeight]      = useState(300)

  // Grid
  const [showGrid,  setShowGrid]  = useState(true)
  const [gridDash,  setGridDash]  = useState<DashPreset>('solid')
  const [gridWidth, setGridWidth] = useState(0.5)

  // Axis
  const [showAxisLine,  setShowAxisLine]  = useState(true)
  const [axisLineDash,  setAxisLineDash]  = useState<DashPreset>('solid')
  const [axisLineWidth, setAxisLineWidth] = useState(0.5)
  const [showAxisTicks, setShowAxisTicks] = useState(true)
  const [axisTickWidth, setAxisTickWidth] = useState(0.5)

  const values = useMemo(() => generateValues(dist, n), [dist, n])

  const stats = useMemo(() => {
    if (!values.length) return null
    const mean     = values.reduce((s, v) => s + v, 0) / values.length
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length
    const sorted   = [...values].sort((a, b) => a - b)
    return {
      n:    values.length,
      min:  sorted[0].toFixed(2),
      max:  sorted[sorted.length - 1].toFixed(2),
      mean: mean.toFixed(2),
      std:  Math.sqrt(variance).toFixed(2),
    }
  }, [values])

  const gridStyle: LineStyle | false = showGrid
    ? { width: gridWidth, dash: DASH_PRESETS[gridDash] }
    : false

  const axisStyle: AxisConfig | false = (!showAxisLine && !showAxisTicks)
    ? false
    : {
        line: showAxisLine
          ? { width: axisLineWidth, dash: DASH_PRESETS[axisLineDash] }
          : false,
        ticks: showAxisTicks ? { width: axisTickWidth } : false,
      }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-semibold">Histogram</h1>
        <p className="text-sm text-muted-foreground mt-1">
          uPlot · Sturges rule · touching bars
        </p>
      </div>

      <div className="flex flex-col gap-4 text-xs">

        <Section title="Data" />
        <div className="flex flex-wrap gap-x-8 gap-y-2 pl-1">
          <Row label="Distribution">
            {DISTRIBUTIONS.map(({ key, label }) => (
              <Btn key={key} active={dist === key} onClick={() => setDist(key)}>{label}</Btn>
            ))}
          </Row>
          <Row label="Sample size">
            {SAMPLE_SIZES.map(s => (
              <Btn key={s} active={n === s} onClick={() => setN(s)}>{s.toLocaleString()}</Btn>
            ))}
          </Row>
          <Row label="Bins">
            {BIN_OPTIONS.map(b => (
              <Btn key={b ?? 'auto'} active={binCount === b} onClick={() => setBinCount(b)}>
                {b ?? 'auto'}
              </Btn>
            ))}
          </Row>
          <Row label="Y axis">
            <Btn active={!normalize} onClick={() => setNormalize(false)}>count</Btn>
            <Btn active={normalize}  onClick={() => setNormalize(true)}>%</Btn>
          </Row>
        </div>

        <Section title="Grid" />
        <div className="flex flex-wrap gap-x-8 gap-y-2 pl-1">
          <Row label="Show">
            <Btn active={showGrid}  onClick={() => setShowGrid(true)}>on</Btn>
            <Btn active={!showGrid} onClick={() => setShowGrid(false)}>off</Btn>
          </Row>
          <Row label="Style">
            {DASH_KEYS.map(d => (
              <Btn key={d} active={gridDash === d} onClick={() => setGridDash(d)}>{d}</Btn>
            ))}
          </Row>
          <Row label="Width">
            {LINE_WIDTHS.map(w => (
              <Btn key={w} active={gridWidth === w} onClick={() => setGridWidth(w)}>{w}px</Btn>
            ))}
          </Row>
        </div>

        <Section title="Axis" />
        <div className="flex flex-wrap gap-x-8 gap-y-2 pl-1">
          <Row label="Line show">
            <Btn active={showAxisLine}  onClick={() => setShowAxisLine(true)}>on</Btn>
            <Btn active={!showAxisLine} onClick={() => setShowAxisLine(false)}>off</Btn>
          </Row>
          <Row label="Line style">
            {DASH_KEYS.map(d => (
              <Btn key={d} active={axisLineDash === d} onClick={() => setAxisLineDash(d)}>{d}</Btn>
            ))}
          </Row>
          <Row label="Line width">
            {LINE_WIDTHS.map(w => (
              <Btn key={w} active={axisLineWidth === w} onClick={() => setAxisLineWidth(w)}>{w}px</Btn>
            ))}
          </Row>
          <Row label="Ticks show">
            <Btn active={showAxisTicks}  onClick={() => setShowAxisTicks(true)}>on</Btn>
            <Btn active={!showAxisTicks} onClick={() => setShowAxisTicks(false)}>off</Btn>
          </Row>
          <Row label="Ticks width">
            {LINE_WIDTHS.map(w => (
              <Btn key={w} active={axisTickWidth === w} onClick={() => setAxisTickWidth(w)}>{w}px</Btn>
            ))}
          </Row>
        </div>

        <Section title="Style" />
        <div className="flex flex-wrap gap-x-8 gap-y-2 pl-1">
          <Row label="Color">
            {COLORS.map(({ hex, label }) => (
              <button
                key={hex}
                title={label}
                onClick={() => setColor(hex)}
                className="w-5 h-5 rounded-full transition-transform hover:scale-110"
                style={{
                  backgroundColor: hex,
                  outline: color === hex ? `2px solid ${hex}` : 'none',
                  outlineOffset: 2,
                }}
              />
            ))}
          </Row>
          <Row label="Fill opacity">
            {FILL_OPACITIES.map(o => (
              <Btn key={o} active={fillOpacity === o} onClick={() => setFillOpacity(o)}>{o}</Btn>
            ))}
          </Row>
          <Row label="Height">
            {[200, 300, 400].map(h => (
              <Btn key={h} active={height === h} onClick={() => setHeight(h)}>{h}px</Btn>
            ))}
          </Row>
        </div>

      </div>

      <div className="rounded-md border p-4">
        <Histogram
          values={values}
          bins={binCount}
          height={height}
          color={color}
          fillOpacity={fillOpacity}
          normalize={normalize}
          gridStyle={gridStyle}
          axisStyle={axisStyle}
        />
      </div>

      {stats && (
        <div className="flex gap-6 text-xs text-muted-foreground">
          <span>n = <strong className="text-foreground">{stats.n.toLocaleString()}</strong></span>
          <span>min = <strong className="text-foreground">{stats.min}</strong></span>
          <span>max = <strong className="text-foreground">{stats.max}</strong></span>
          <span>mean = <strong className="text-foreground">{stats.mean}</strong></span>
          <span>std = <strong className="text-foreground">{stats.std}</strong></span>
        </div>
      )}
    </div>
  )
}
