import { SidebarProvider, SidebarInset } from '@data-voyager/shared-ui/components/ui/sidebar'
import { AppSidebar } from '@/widgets/app-sidebar'

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
