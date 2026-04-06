import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { getSections } from '@/features/menu'
import type { MenuItem, ChildMenuItem } from '@/features/menu'

export interface Breadcrumb {
  label: string
  href?: string
}

interface BreadcrumbMatch {
  item: MenuItem | ChildMenuItem
  parent?: MenuItem
}

/**
 * 현재 pathname을 menuRegistry와 대조해 breadcrumb 배열을 반환.
 * @param currentLabel 마지막 항목의 레이블을 override (동적 타이틀 등)
 */
export function useBreadcrumb(currentLabel?: string): Breadcrumb[] {
  const { pathname } = useLocation()

  return useMemo(() => {
    const sections = getSections()

    let best: BreadcrumbMatch | null = null
    let bestLen = 0

    const tryItem = (item: MenuItem | ChildMenuItem, parent?: MenuItem) => {
      const p = item.path
      if (!p) return
      if (pathname === p || pathname.startsWith(p + '/')) {
        if (p.length > bestLen) {
          bestLen = p.length
          best = { item, parent }
        }
      }
    }

    for (const section of sections) {
      for (const item of section.items) {
        tryItem(item)
        item.children?.forEach((child) => tryItem(child, item))
      }
    }

    if (!best) return []

    // TypeScript loses track of `best` through inner-function mutations → assert
    const resolved = best as BreadcrumbMatch
    const crumbs: Breadcrumb[] = []
    if (resolved.parent) {
      crumbs.push({ label: resolved.parent.label, href: resolved.parent.path })
    }
    crumbs.push({ label: currentLabel ?? resolved.item.label })
    return crumbs
  }, [pathname, currentLabel])
}
