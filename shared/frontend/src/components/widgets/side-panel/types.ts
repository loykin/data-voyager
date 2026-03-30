import type React from 'react'

export interface SidePanelConfig {
  /** Minimum panel width in px (default: 400) */
  minWidth?: number
  /** Maximum panel width in px (default: 1000) */
  maxWidth?: number
  /** Initial panel width in px (default: 560) */
  defaultWidth?: number
  /** Close panel when clicking outside (default: true) */
  closeOnOutsideClick?: boolean
}

export interface SidePanelStore {
  isOpen:   boolean
  width:    number
  content:  React.ReactNode
  open:     (content: React.ReactNode, width?: number) => void
  close:    () => void
  setWidth: (width: number) => void
}
