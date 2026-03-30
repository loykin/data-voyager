import { useEffect, useRef } from 'react'
import { Resizable } from 're-resizable'
import { useSidePanelStore, shouldSkipOutsideClose } from './useSidePanelStore'
import type { SidePanelConfig } from './types'

const SNAP_GAP = 20

/**
 * Mount once near the app root — outside any scroll/overflow container.
 * Uses `position: fixed` so it is always viewport-relative.
 *
 * ```tsx
 * // App.tsx
 * <>
 *   <Router>...</Router>
 *   <SidePanelHost />
 * </>
 * ```
 *
 * Open from anywhere:
 * ```tsx
 * const { open } = useSidePanelStore()
 * open(<UserDetail user={row} />)
 * ```
 */
export function SidePanelHost({
  minWidth            = 400,
  maxWidth            = 1000,
  closeOnOutsideClick = true,
}: SidePanelConfig = {}) {
  const { isOpen, width, content, close, setWidth } = useSidePanelStore()
  const panelRef    = useRef<HTMLDivElement>(null)
  const resizingRef = useRef(false)

  useEffect(() => {
    if (!closeOnOutsideClick || !isOpen) return

    const handler = (e: MouseEvent) => {
      if (resizingRef.current) return
      // open() was called during this same click (e.g. clicking another row) — skip close.
      // React's synthetic onClick fires before the document's click listener,
      // so the flag is already set when this handler runs.
      if (shouldSkipOutsideClose()) return
      if (!panelRef.current?.contains(e.target as Node)) {
        close()
      }
    }

    // 'click' (not 'mousedown') so that React's onClick runs first,
    // giving open() a chance to set the skip flag before we check it.
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [closeOnOutsideClick, isOpen, close])

  if (!isOpen) return null

  return (
    <Resizable
      style={{ position: 'fixed', right: 0, top: 0 }}
      size={{ width, height: '100dvh' }}
      minWidth={minWidth}
      maxWidth={maxWidth}
      snap={{ x: [minWidth, maxWidth] }}
      snapGap={SNAP_GAP}
      enable={{
        left:        true,
        right:       false,
        top:         false,
        bottom:      false,
        topLeft:     false,
        topRight:    false,
        bottomLeft:  false,
        bottomRight: false,
      }}
      onResizeStart={() => { resizingRef.current = true }}
      onResizeStop={(_e, _dir, _el, delta) => {
        setWidth(width + delta.width)
        resizingRef.current = false
      }}
      className="overflow-hidden border-l border-border bg-card z-50 shadow-xl"
    >
      <div ref={panelRef} className="flex bg-background h-full overflow-auto">
        {content}
      </div>
    </Resizable>
  )
}
