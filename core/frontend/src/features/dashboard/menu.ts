import { createElement } from 'react'
import { LayoutDashboard } from 'lucide-react'
import type { MenuItem } from '@/features/menu'

export const dashboardMenuItems: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboards',
    path: '/dashboard',
    icon: createElement(LayoutDashboard, { className: 'h-4 w-4' }),
    group: 'data',
    groupLabel: 'Data',
    groupOrder: 10,
    order: 30,
  },
]
