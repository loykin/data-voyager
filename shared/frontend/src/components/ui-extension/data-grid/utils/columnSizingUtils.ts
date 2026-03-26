/** Singleton canvas for text measurement — avoids repeated DOM creation */
let _canvas: HTMLCanvasElement | null = null

function getCtx(font: string): CanvasRenderingContext2D {
  if (!_canvas) _canvas = document.createElement('canvas')
  const ctx = _canvas.getContext('2d')!
  ctx.font = font
  return ctx
}

const DEFAULT_FONT =
  '14px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'

const CELL_H_PADDING = 32 // 16px left + 16px right
const SORT_ICON_WIDTH = 20

/**
 * Measure rendered text width using Canvas 2D API.
 * Matches browser rendering closely when font matches CSS.
 */
export function measureTextWidth(
  text: string,
  font = DEFAULT_FONT
): number {
  return getCtx(font).measureText(String(text ?? '')).width
}

/**
 * Compute optimal column width by measuring header text + all cell values.
 * This is the Grafana-style "auto-fit" sizing.
 */
export function computeAutoWidth<T extends object>(
  headerText: string,
  rows: T[],
  getValue: (row: T) => unknown,
  options: { minWidth?: number; maxWidth?: number; font?: string } = {}
): number {
  const { minWidth = 60, maxWidth = 600, font } = options

  const headerW =
    measureTextWidth(headerText, font) + CELL_H_PADDING + SORT_ICON_WIDTH

  const maxCellW = rows.reduce((max, row) => {
    const w =
      measureTextWidth(String(getValue(row) ?? ''), font) + CELL_H_PADDING
    return Math.max(max, w)
  }, 0)

  const result = Math.ceil(Math.max(headerW, maxCellW))
  return Math.min(Math.max(result, minWidth), maxWidth)
}

/**
 * Distribute remaining container space to flex columns proportionally.
 * Works like CSS flex-grow — columns get space based on their flex ratio.
 */
export function computeFlexWidths(
  containerWidth: number,
  flexCols: Array<{
    id: string
    flex: number
    minWidth?: number
    maxWidth?: number
  }>,
  fixedWidth: number
): Record<string, number> {
  const remaining = Math.max(0, containerWidth - fixedWidth)
  const totalFlex = flexCols.reduce((sum, c) => sum + c.flex, 0)
  const result: Record<string, number> = {}

  for (const col of flexCols) {
    let w =
      totalFlex > 0 ? Math.floor((remaining * col.flex) / totalFlex) : 0
    if (col.minWidth) w = Math.max(w, col.minWidth)
    if (col.maxWidth) w = Math.min(w, col.maxWidth)
    result[col.id] = Math.max(w, col.minWidth ?? 60)
  }

  return result
}
