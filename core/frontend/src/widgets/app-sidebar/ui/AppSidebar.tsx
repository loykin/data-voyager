import { Link, useLocation } from 'react-router-dom'
import { cn } from '@data-voyager/shared-ui/lib/utils'
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
} from '@data-voyager/shared-ui/components/ui/sidebar'
import { Button } from '@data-voyager/shared-ui/components/ui/button'
import { Database, Plus } from 'lucide-react'

const navItems = [
  { key: 'datasources', label: 'Datasources', route: '/datasource', icon: <Database className="h-4 w-4" /> },
]

export function AppSidebar() {
  const { pathname } = useLocation()

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <Database className="h-6 w-6" />
          <span className="text-lg font-semibold">Data Voyager</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <nav className="space-y-1 px-2">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.route)
            return (
              <Link
                key={item.key}
                to={item.route}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </SidebarContent>

      <SidebarFooter>
        <Button variant="outline" className="w-full" nativeButton={false} render={<Link to="/datasource/create" />}>
          <Plus className="mr-2 h-4 w-4" />
          New Datasource
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}
