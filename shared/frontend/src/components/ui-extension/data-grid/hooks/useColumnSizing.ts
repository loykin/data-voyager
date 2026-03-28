import type React from 'react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ColumnSizingState } from '@tanstack/react-table';
import type { ColumnSizingMode, DataGridColumnDef } from '../types';
import { computeAutoWidth } from '../utils/columnSizingUtils';

interface UseColumnSizingOptions<T extends object> {
  columns: DataGridColumnDef<T>[]
  data: T[]
  containerRef: React.RefObject<HTMLDivElement | null>
  mode: ColumnSizingMode
}

interface SizingState {
  sizing: ColumnSizingState
  isSized: boolean
}

export function useColumnSizing<T extends object>({
  columns,
  data,
  containerRef,
  mode,
}: UseColumnSizingOptions<T>) {
  const userResized = useRef(new Set<string>())
  const lastComputed = useRef<ColumnSizingState>({})
  const lastContainerWidth = useRef<number>(0)
  const hasSized = useRef(false)
  const [state, setState] = useState<SizingState>({ sizing: {}, isSized: false })

  // Expose a setSizing that matches Dispatch<SetStateAction<ColumnSizingState>>
  // so TanStack's onColumnSizingChange can call it directly.
  const setSizing: React.Dispatch<React.SetStateAction<ColumnSizingState>> = useCallback(
    (updater) => {
      setState((prev) => ({
        ...prev,
        sizing: typeof updater === 'function' ? updater(prev.sizing) : updater,
      }))
    },
    []
  )

  // Stable refs so recalculate() doesn't need to re-subscribe ResizeObserver
  const columnsRef = useRef(columns)
  columnsRef.current = columns
  const dataRef = useRef(data)
  dataRef.current = data
  const modeRef = useRef(mode)
  modeRef.current = mode
  const sizingRef = useRef(state.sizing)
  sizingRef.current = state.sizing

  const recalculate = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    const containerWidth = container.clientWidth
    if (containerWidth === 0) return
    const prevContainerWidth = lastContainerWidth.current
    lastContainerWidth.current = containerWidth

    const m = modeRef.current

    const cols = columnsRef.current
    const rows = dataRef.current
    const currentSizing = sizingRef.current

    // ── Detect user drag-overrides ─────────────────────────────────────────
    for (const [colId, currentSize] of Object.entries(currentSizing)) {
      const computed = lastComputed.current[colId]
      if (computed !== undefined && computed !== currentSize) {
        userResized.current.add(colId)
      }
    }

    const newSizing: ColumnSizingState = {}

    // ── Non-flex columns ───────────────────────────────────────────────────
    for (const col of cols) {
      const colId = (col.id ?? (col as { accessorKey?: string }).accessorKey) as string
      if (!colId) continue

      const meta = col.meta

      // Flex columns → handled separately below
      if (meta?.flex != null) continue

      // User-resized non-flex columns → keep current size unchanged
      if (userResized.current.has(colId)) continue

      // Canvas-measure for auto/autoSize columns
      if (m === 'auto' || meta?.autoSize) {
        const headerText = typeof col.header === 'string' ? col.header : colId

        const getValue = (row: T): unknown => {
          const accessorKey = (col as { accessorKey?: string }).accessorKey
          if (accessorKey) return (row as Record<string, unknown>)[accessorKey]
          const accessorFn = (col as { accessorFn?: (row: T, index: number) => unknown }).accessorFn
          if (accessorFn) return accessorFn(row, 0)
          return ''
        }

        newSizing[colId] = computeAutoWidth(headerText, rows, getValue, {
          minWidth: meta?.minWidth,
          maxWidth: meta?.maxWidth,
        })
      }
      // else fixed mode without flex: leave at TanStack default width
    }

    // ── Flex columns: distribute proportionally by flex ratio ──────────────
    {
      const flexCols = cols.filter((col) => col.meta?.flex != null)
      if (flexCols.length > 0) {
        const getColId = (col: DataGridColumnDef<T>) =>
          (col.id ?? (col as { accessorKey?: string }).accessorKey) as string

        const anyUserResized = flexCols.some((col) =>
          userResized.current.has(getColId(col))
        )

        const containerWidthChanged = Math.abs(containerWidth - prevContainerWidth) > 1

        if (anyUserResized && !containerWidthChanged) {
          // User has manually resized a column and container width hasn't changed:
          // freeze all flex columns at their last computed sizes.
        } else if (!containerWidthChanged && hasSized.current) {
          // Container width unchanged — skip flex redistribution to prevent
          // spurious column size changes on tab switches or data-load events.
        } else {
          // No user resizes yet — distribute proportionally to fill the container.
          const totalFlex = flexCols.reduce((sum, col) => sum + col.meta!.flex!, 0)

          // Width consumed by non-flex columns
          const fixedWidth = cols
            .filter((col) => col.meta?.flex == null)
            .reduce((sum, col) => {
              const colId = getColId(col)
              return sum + (newSizing[colId] ?? currentSizing[colId] ?? 150)
            }, 0)

          const availableWidth = Math.max(0, containerWidth - fixedWidth)

          let distributed = 0
          const freeCols = flexCols.filter((col) => !userResized.current.has(getColId(col)))
          for (let i = 0; i < freeCols.length; i++) {
            const col = freeCols[i]!
            const colId = getColId(col)
            if (!colId) continue
            const flex = col.meta!.flex!
            const minW = col.meta?.minWidth ?? 60
            const isLast = i === freeCols.length - 1
            // Use floor for all but last; give remainder to last to avoid 1px overflow
            const w = isLast
              ? Math.max(minW, availableWidth - distributed)
              : Math.max(minW, Math.floor((flex / totalFlex) * availableWidth))
            newSizing[colId] = w
            distributed += w
          }
        }
      }
    }

    const sizingChanged =
      Object.keys(newSizing).length > 0 &&
      Object.entries(newSizing).some(([id, w]) => currentSizing[id] !== w)

    const firstTime = !hasSized.current

    if (sizingChanged || firstTime) {
      if (sizingChanged) Object.assign(lastComputed.current, newSizing)
      if (firstTime) hasSized.current = true
      // Single setState call — sizing + isSized update in one render
      setState((prev) => ({
        sizing: sizingChanged ? { ...prev.sizing, ...newSizing } : prev.sizing,
        isSized: true,
      }))
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
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const width = entry.contentRect.width
      if (width === 0 || Math.abs(width - lastContainerWidth.current) < 1) return

      if (roTimerRef.current) clearTimeout(roTimerRef.current)
      roTimerRef.current = setTimeout(recalculate, 150)
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
    lastContainerWidth.current = 0
    hasSized.current = false
    setState({ sizing: {}, isSized: false })
    recalculate()
  }, [recalculate])

  return { sizing: state.sizing, isSized: state.isSized, setSizing, resetSizing }
}
