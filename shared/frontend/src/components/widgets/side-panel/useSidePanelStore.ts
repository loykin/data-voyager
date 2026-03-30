import type React from 'react'
import { create } from 'zustand'
import type { SidePanelStore } from './types'

export const DEFAULT_PANEL_WIDTH = 560

// Set by open() and checked by SidePanelHost's outside-click handler.
// React's synthetic onClick (on #root) fires before the document's click
// listener, so the flag is already true when the document handler runs.
// Resets via microtask after the entire click event dispatch completes.
let _skipNextOutsideClose = false
export const shouldSkipOutsideClose = () => _skipNextOutsideClose

export const useSidePanelStore = create<SidePanelStore>((set) => ({
  isOpen:  false,
  width:   DEFAULT_PANEL_WIDTH,
  content: null,

  open: (content: React.ReactNode, width?: number) => {
    _skipNextOutsideClose = true
    // setTimeout(0) is a macrotask — fires after ALL click listeners for this
    // event have run. Promise.resolve().then() is a microtask and would fire
    // between listeners (React root → microtask checkpoint → document listener),
    // resetting the flag too early and causing the panel to immediately close.
    setTimeout(() => { _skipNextOutsideClose = false }, 0)
    set((state) => ({
      isOpen:  true,
      content,
      // Preserve user-resized width when switching rows; apply default only on first open
      width: state.isOpen ? state.width : (width ?? DEFAULT_PANEL_WIDTH),
    }))
  },

  close: () => set({ isOpen: false }),

  setWidth: (width: number) => set({ width }),
}))
