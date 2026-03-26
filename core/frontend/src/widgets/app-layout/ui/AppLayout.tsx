import { SidebarProvider, SidebarInset, SidebarTrigger } from '@data-voyager/shared-ui/components/ui/sidebar'
import { Separator } from '@data-voyager/shared-ui/components/ui/separator'
import { AppSidebar } from '@/widgets/app-sidebar'

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
