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
  SidebarRail,
} from '@data-voyager/shared-ui/components/ui/sidebar'
import { Database, LayoutGrid, LineChart } from 'lucide-react'

const navGroups = [
  {
    label: 'Data',
    items: [
      { title: 'Datasources', url: '/datasource', icon: Database },
    ],
  },
  {
    label: 'Dev',
    items: [
      { title: 'DataGrid Demo', url: '/demo',       icon: LayoutGrid },
      { title: 'Chart Demo',    url: '/demo/chart', icon: LineChart  },
    ],
  },
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
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  )
}
