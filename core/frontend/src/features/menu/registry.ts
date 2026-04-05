import type { MenuItem, MenuSection } from './model'

const items = new Map<string, MenuItem>()

export function register(item: MenuItem): void {
  if (items.has(item.id)) {
    console.warn(`[menu] "${item.id}" is already registered. Overwriting.`)
  }
  items.set(item.id, item)
}

export function registerAll(batch: MenuItem[]): void {
  batch.forEach(register)
}

/** 등록된 항목을 groupOrder → order 순으로 정렬해 섹션 배열로 반환. */
export function getSections(): MenuSection[] {
  const groupMap = new Map<string, { label: string; order: number; items: MenuItem[] }>()

  for (const item of items.values()) {
    const key = item.group
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        label: item.groupLabel ?? item.group,
        order: item.groupOrder ?? 100,
        items: [],
      })
    }
    groupMap.get(key)!.items.push(item)
  }

  for (const group of groupMap.values()) {
    group.items.sort((a, b) => (a.order ?? 100) - (b.order ?? 100))
  }

  return Array.from(groupMap.entries())
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([group, { label, items }]) => ({ group, label, items }))
}

/** 테스트 용도 */
export function clear(): void {
  items.clear()
}
