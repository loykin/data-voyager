import { createElement } from 'react'
import { Search } from 'lucide-react'
import type { MenuItem } from '@/features/menu'

export const discoverMenuItems: MenuItem[] = [
  {
    id: 'discover',
    label: 'Discover',
    path: '/discover',
    icon: createElement(Search, { className: 'h-4 w-4' }),
    group: 'data',
    groupLabel: 'Data',
    groupOrder: 10,
    order: 20,
  },
]
