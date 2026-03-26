import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type React from 'react'
import type { Table, ColumnSizingState } from '@tanstack/react-table'
import type { DataGridColumnDef, ColumnSizingMode } from '../types'
import {
  computeAutoWidth,
  computeFlexWidths,
} from '../utils/columnSizingUtils'

interface UseColumnSizingOptions<T extends object> {
  table: Table<T>
  columns: DataGridColumnDef<T>[]
  data: T[]
  containerRef: React.RefObject<HTMLDivElement | null>
  mode: ColumnSizingMode
  /** Current sizing state — used to detect user manual overrides */
  sizing: ColumnSizingState
  onSizeChange: React.Dispatch<React.SetStateAction<ColumnSizingState>>
}

export function useColumnSizing<T extends object>({
  table,
  columns,
  data,
  containerRef,
  mode,
  sizing,
  onSizeChange,
}: UseColumnSizingOptions<T>) {
  const userResized = useRef(new Set<string>())
  const lastComputed = useRef<ColumnSizingState>({})
  const hasSized = useRef(false)
  /** true after first successful recalculate — used to hide the table until ready */
  const [isSized, setIsSized] = useState(false)

  // Stable refs so recalculate() doesn't need to re-subscribe ResizeObserver
  const tableRef = useRef(table)
  tableRef.current = table
  const columnsRef = useRef(columns)
  columnsRef.current = columns
  const dataRef = useRef(data)
  dataRef.current = data
  const modeRef = useRef(mode)
  modeRef.current = mode
  const sizingRef = useRef(sizing)
  sizingRef.current = sizing
  const onSizeChangeRef = useRef(onSizeChange)
  onSizeChangeRef.current = onSizeChange

  const recalculate = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    const containerWidth = container.clientWidth
    if (containerWidth === 0) return

    const m = modeRef.current

    // ── flex mode: CSS handles distribution — no JS sizing needed ─────────
    if (m === 'flex') {
      if (!hasSized.current) {
        hasSized.current = true
        setIsSized(true)
      }
      return
    }

    const cols = columnsRef.current
    const rows = dataRef.current
    const currentSizing = sizingRef.current
    const tbl = tableRef.current

    // ── Detect user drag-overrides ─────────────────────────────────────────
    for (const [colId, currentSize] of Object.entries(currentSizing)) {
      const computed = lastComputed.current[colId]
      if (computed !== undefined && computed !== currentSize) {
        userResized.current.add(colId)
      }
    }

    // Once ANY column has been manually resized, freeze all non-dragged flex
    // columns at their current pixel widths instead of redistributing.
    const hasAnyUserResized = userResized.current.size > 0

    const newSizing: ColumnSizingState = {}
    let fixedWidth = 0

    const flexQueue: Array<{
      id: string
      flex: number
      minWidth?: number
      maxWidth?: number
    }> = []

    for (const col of cols) {
      const colId = (col.id ?? (col as { accessorKey?: string }).accessorKey) as string
      if (!colId) continue

      if (userResized.current.has(colId)) {
        fixedWidth += tbl.getColumn(colId)?.getSize() ?? 150
        continue
      }

      const meta = col.meta

      if (meta?.flex != null && m !== 'fixed') {
        if (hasAnyUserResized) {
          // Lock at last-computed (or current) size — do not redistribute
          const frozen = lastComputed.current[colId] ?? sizingRef.current[colId] ?? tbl.getColumn(colId)?.getSize() ?? 150
          fixedWidth += frozen
          // No need to write to newSizing — sizing state already has this value
        } else {
          flexQueue.push({
            id: colId,
            flex: meta.flex,
            minWidth: meta.minWidth,
            maxWidth: meta.maxWidth,
          })
        }
      } else if (m === 'auto' || meta?.autoSize) {
        const headerText = typeof col.header === 'string' ? col.header : colId

        const getValue = (row: T): unknown => {
          const accessorKey = (col as { accessorKey?: string }).accessorKey
          if (accessorKey) return (row as Record<string, unknown>)[accessorKey]
          const accessorFn = (col as { accessorFn?: (row: T, index: number) => unknown }).accessorFn
          if (accessorFn) return accessorFn(row, 0)
          return ''
        }

        const w = computeAutoWidth(headerText, rows, getValue, {
          minWidth: meta?.minWidth,
          maxWidth: meta?.maxWidth,
        })
        newSizing[colId] = w
        fixedWidth += w
      } else {
        fixedWidth += tbl.getColumn(colId)?.getSize() ?? 150
      }
    }

    if (flexQueue.length > 0) {
      const flexSizing = computeFlexWidths(containerWidth, flexQueue, fixedWidth)
      Object.assign(newSizing, flexSizing)
    }

    if (Object.keys(newSizing).length > 0) {
      Object.assign(lastComputed.current, newSizing)
      onSizeChangeRef.current((prev) => ({ ...prev, ...newSizing }))
      // Mark as sized — batched with setSizing so both apply in the same render
      if (!hasSized.current) {
        hasSized.current = true
        setIsSized(true)
      }
    }
  }, [containerRef]) // stable — everything else via refs

  // ── Initial sizing: runs sync before first paint ───────────────────────────
  useLayoutEffect(() => {
    recalculate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── ResizeObserver: debounced to avoid oscillation after initial sizing ────
  const roTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      if (roTimerRef.current) clearTimeout(roTimerRef.current)
      roTimerRef.current = setTimeout(recalculate, 200)
    })
    ro.observe(el)
    return () => {
      ro.disconnect()
      if (roTimerRef.current) clearTimeout(roTimerRef.current)
    }
  }, [recalculate, containerRef])

  // ── Re-size when row count changes ────────────────────────────────────────
  const dataLenRef = useRef(data.length)
  useEffect(() => {
    if (data.length !== dataLenRef.current) {
      dataLenRef.current = data.length
      recalculate()
    }
  }, [data.length, recalculate])

  const resetSizing = useCallback(() => {
    userResized.current.clear()
    lastComputed.current = {}
    hasSized.current = false
    setIsSized(false)
    onSizeChangeRef.current({})
    recalculate()
  }, [recalculate])

  return { isSized, resetSizing }
}
