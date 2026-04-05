import { createElement } from 'react'
import { Settings, Bot } from 'lucide-react'
import type { MenuItem } from '@/features/menu'

export const aiconfigMenuItems: MenuItem[] = [
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings/ai',
    icon: createElement(Settings, { className: 'h-4 w-4' }),
    group: 'system',
    groupLabel: 'System',
    groupOrder: 90,
    order: 10,
    children: [
      {
        id: 'settings.ai',
        label: 'AI Config',
        path: '/settings/ai',
        icon: createElement(Bot, { className: 'h-3.5 w-3.5' }),
      },
    ],
  },
]
