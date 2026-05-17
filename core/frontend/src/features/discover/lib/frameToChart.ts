import type { SeriesConfig, AlignedData } from '@data-voyager/shared-ui'

export interface FrameField {
  name: string
  kind?: string
  values: unknown[]
}

export interface FrameLike {
  frameType?: string
  fields: FrameField[]
}

export interface ChartData {
  data: AlignedData
  series: SeriesConfig[]
}

export const SERIES_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
  '#8b5cf6', '#06b6d4', '#f97316', '#ec4899',
]

export function isTimeValue(v: unknown): boolean {
  if (v instanceof Date) return true
  if (typeof v === 'string') return !isNaN(Date.parse(v))
  if (typeof v === 'number') return v > 1_000_000_000
  return false
}

export function toUnixSeconds(v: unknown): number {
  if (v instanceof Date) return v.getTime() / 1000
  if (typeof v === 'string') return new Date(v).getTime() / 1000
  if (typeof v === 'number') return v > 1e12 ? v / 1000 : v
  return 0
}

export function frameToAlignedData(frame: FrameLike): ChartData | null {
  // ── 1. time field ──────────────────────────────────────────────────────────
  const timeField =
    frame.fields.find((f) => f.kind === 'time') ??
    frame.fields.find((f) => ['time', 'timestamp', 'ts', 'datetime'].includes(f.name.toLowerCase())) ??
    frame.fields.find((f) => f.values.length > 0 && isTimeValue(f.values[0]))

  if (!timeField) return null

  // ── 2. classify remaining fields ───────────────────────────────────────────
  const stringFields = frame.fields.filter(
    (f) => f !== timeField &&
      (f.kind === 'string' || (f.values.length > 0 && typeof f.values[0] === 'string')),
  )
  const numericFields = frame.fields.filter(
    (f) => f !== timeField &&
      (f.kind === 'number' || (f.values.length > 0 && typeof f.values[0] === 'number')),
  )

  if (numericFields.length === 0) return null

  const rowCount = timeField.values.length

  // ── 3. no string fields — simple case ──────────────────────────────────────
  if (stringFields.length === 0) {
    const timestamps = timeField.values.map(toUnixSeconds) as number[]
    const alignedData: AlignedData = [timestamps, ...numericFields.map((f) => f.values as number[])]
    const series: SeriesConfig[] = numericFields.map((f, i) => ({
      label: f.name,
      color: SERIES_COLORS[i % SERIES_COLORS.length],
      type: 'line',
    }))
    return { data: alignedData, series }
  }

  // ── 4. pivot: string fields define group dimensions ────────────────────────
  const seriesKeyFor = (groupKey: string, numField: FrameField): string =>
    numericFields.length === 1 ? groupKey : `${groupKey} · ${numField.name}`

  const tsArr: number[] = []
  const rowKeys: string[] = []
  for (let i = 0; i < rowCount; i++) {
    tsArr.push(toUnixSeconds(timeField.values[i]))
    rowKeys.push(stringFields.map((f) => String(f.values[i] ?? '')).join(' | '))
  }

  // Discover series names in appearance order
  const seriesNames: string[] = []
  for (let i = 0; i < rowCount; i++) {
    for (const nf of numericFields) {
      const name = seriesKeyFor(rowKeys[i], nf)
      if (!seriesNames.includes(name)) seriesNames.push(name)
    }
  }

  // Unique sorted timestamps
  const timestamps = Array.from(new Set(tsArr)).sort((a, b) => a - b)

  // Lookup: seriesName → (timestamp → value)
  const lookup = new Map<string, Map<number, number | null>>()
  for (const name of seriesNames) lookup.set(name, new Map())

  for (let i = 0; i < rowCount; i++) {
    for (const nf of numericFields) {
      const name = seriesKeyFor(rowKeys[i], nf)
      const v = nf.values[i]
      lookup.get(name)!.set(tsArr[i], typeof v === 'number' ? v : null)
    }
  }

  const alignedData: AlignedData = [
    timestamps,
    ...seriesNames.map((name) =>
      timestamps.map((ts) => lookup.get(name)!.get(ts) ?? null) as number[],
    ),
  ]
  const series: SeriesConfig[] = seriesNames.map((name, i) => ({
    label: name,
    color: SERIES_COLORS[i % SERIES_COLORS.length],
    type: 'line',
  }))

  return { data: alignedData, series }
}

export function canRenderAsChart(frame: FrameLike | null | undefined): boolean {
  if (!frame) return false
  return frameToAlignedData(frame) !== null
}
