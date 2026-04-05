import { createElement } from 'react'
import { LayoutGrid, LineChart, BarChart2, CalendarDays } from 'lucide-react'
import type { MenuItem } from '@/features/menu'

export const demoMenuItems: MenuItem[] = [
  {
    id: 'demo.datagrid',
    label: 'DataGrid Demo',
    path: '/demo',
    icon: createElement(LayoutGrid, { className: 'h-4 w-4' }),
    group: 'dev',
    groupLabel: 'Dev',
    groupOrder: 50,
    order: 10,
  },
  {
    id: 'demo.chart',
    label: 'Time Series Demo',
    path: '/demo/chart',
    icon: createElement(LineChart, { className: 'h-4 w-4' }),
    group: 'dev',
    groupLabel: 'Dev',
    groupOrder: 50,
    order: 20,
  },
  {
    id: 'demo.histogram',
    label: 'Histogram Demo',
    path: '/demo/histogram',
    icon: createElement(BarChart2, { className: 'h-4 w-4' }),
    group: 'dev',
    groupLabel: 'Dev',
    groupOrder: 50,
    order: 30,
  },
  {
    id: 'demo.datetime',
    label: 'Datetime Demo',
    path: '/demo/datetime',
    icon: createElement(CalendarDays, { className: 'h-4 w-4' }),
    group: 'dev',
    groupLabel: 'Dev',
    groupOrder: 50,
    order: 40,
  },
]
