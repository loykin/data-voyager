import { Link, useLocation } from 'react-router-dom'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from '@data-voyager/shared-ui/components/ui/sidebar'
import { Database, LayoutGrid, LineChart, BarChart2, CalendarDays, Search, Settings, Bot } from 'lucide-react'

const navGroups = [
  {
    label: 'Data',
    items: [
      { title: 'Datasources', url: '/datasource', icon: Database },
      { title: 'Discover', url: '/discover', icon: Search },
    ],
  },
  {
    label: 'Dev',
    items: [
      { title: 'DataGrid Demo', url: '/demo', icon: LayoutGrid },
      { title: 'Time Series Demo', url: '/demo/chart', icon: LineChart },
      { title: 'Histogram Demo',  url: '/demo/histogram', icon: BarChart2    },
      { title: 'Datetime Demo',   url: '/demo/datetime',  icon: CalendarDays },
    ],
  },
]

const settingsSubItems = [
  { title: 'AI Config', url: '/settings/ai', icon: Bot },
]

export function AppSidebar() {
  const { pathname } = useLocation()

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <Database className="h-5 w-5" />
          <span className="text-base font-semibold">Data Voyager</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      render={<Link to={item.url} />}
                      isActive={pathname.startsWith(item.url)}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        {/* Settings group with sub-items */}
        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link to="/settings/ai" />}
                  isActive={pathname.startsWith('/settings')}
                >
                  <Settings />
                  <span>Settings</span>
                </SidebarMenuButton>
                <SidebarMenuSub>
                  {settingsSubItems.map((item) => (
                    <SidebarMenuSubItem key={item.title}>
                      <SidebarMenuSubButton
                        render={<Link to={item.url} />}
                        isActive={pathname === item.url}
                      >
                        <item.icon className="h-3.5 w-3.5" />
                        <span>{item.title}</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  )
}
