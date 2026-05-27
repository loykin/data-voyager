import type { QueryResult } from '@loykin/dashboardkit'

export type TableCell = string | number | boolean | null | undefined

export interface TableData {
  columns: string[]
  rows: TableCell[][]
}

function fieldValues(field: { values?: unknown[] }): unknown[] {
  return Array.isArray(field.values) ? field.values : []
}

export function resultToTable(result: QueryResult[] | null | undefined): TableData {
  const frame = result?.[0]?.frames?.[0]
  if (!frame) return { columns: [], rows: [] }
  const columns = frame.fields.map((field) => field.name)
  const maxRows = Math.max(0, ...frame.fields.map((field) => fieldValues(field).length))
  const rows = Array.from({ length: maxRows }, (_, rowIndex) =>
    frame.fields.map((field) => fieldValues(field)[rowIndex] as TableCell),
  )
  return { columns, rows }
}

export function firstNumericValue(result: QueryResult[] | null | undefined): number | null {
  const frame = result?.[0]?.frames?.[0]
  if (!frame) return null
  for (const field of frame.fields) {
    for (const value of fieldValues(field)) {
      if (typeof value === 'number' && Number.isFinite(value)) return value
      if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value)
        if (Number.isFinite(parsed)) return parsed
      }
    }
  }
  return null
}

export interface SeriesPoint {
  x: number
  y: number
}

export function resultToSeries(result: QueryResult[] | null | undefined): SeriesPoint[] {
  const frame = result?.[0]?.frames?.[0]
  if (!frame || frame.fields.length === 0) return []
  const timeField = frame.fields.find((field) => /time|date/i.test(field.name)) ?? frame.fields[0]
  const valueField = frame.fields.find((field) => field !== timeField && fieldValues(field).some((value) => Number.isFinite(Number(value))))
  if (!valueField) return []

  const times = fieldValues(timeField)
  const values = fieldValues(valueField)
  return values
    .map((value, index) => {
      const parsedY = Number(value)
      const rawX = times[index]
      const parsedX = typeof rawX === 'number' ? rawX : Date.parse(String(rawX))
      return Number.isFinite(parsedY) && Number.isFinite(parsedX)
        ? { x: parsedX, y: parsedY }
        : null
    })
    .filter((point): point is SeriesPoint => point !== null)
}
