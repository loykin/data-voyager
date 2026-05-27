import React from 'react'
import { useLocation } from 'react-router-dom'
import { SidebarProvider, SidebarInset, SidebarTrigger, useSidebar } from '@data-voyager/shared-ui/components/ui/sidebar'
import { AppSidebar } from '@/widgets/app-sidebar'
import { PageBreadcrumb } from '@/features/breadcrumb'

/**
 * 사이드바 컨텍스트가 필요한 내부 레이아웃.
 * SidebarProvider 내부에서만 useSidebar() 호출 가능해 분리.
 */
function AppLayoutInset({ children }: { children: React.ReactNode }) {
  const { open } = useSidebar()
  const { pathname } = useLocation()
  const hideBreadcrumbBar = pathname.startsWith('/dashboard')

  return (
    <SidebarInset className="overflow-hidden flex flex-col h-screen">
      {hideBreadcrumbBar ? (
        !open && (
          <div className="absolute left-3 top-2 z-20">
            <SidebarTrigger className="shrink-0 bg-background/90 shadow-sm" />
          </div>
        )
      ) : (
        <div className="flex h-12 shrink-0 items-center gap-1 px-3">
          {!open && <SidebarTrigger className="-ml-0.5 shrink-0" />}
          <PageBreadcrumb />
        </div>
      )}
      <div className="flex-1 min-w-0 overflow-auto">
        {children}
      </div>
    </SidebarInset>
  )
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider className="h-screen overflow-hidden">
      <AppSidebar />
      <AppLayoutInset>{children}</AppLayoutInset>
    </SidebarProvider>
  )
}
