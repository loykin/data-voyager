import { createElement } from 'react'
import { Database } from 'lucide-react'
import type { MenuItem } from '@/features/menu'

export const datasourceMenuItems: MenuItem[] = [
  {
    id: 'datasource',
    label: 'Datasources',
    path: '/datasource',
    icon: createElement(Database, { className: 'h-4 w-4' }),
    group: 'data',
    groupLabel: 'Data',
    groupOrder: 10,
    order: 10,
  },
]
