import { cn } from "@/lib/utils"

export function Sidebar({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <aside
      className={cn(
        "flex h-screen w-64 flex-col border-r bg-background",
        className
      )}
    >
      {children}
    </aside>
  )
}

export function SidebarHeader({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "flex h-14 items-center border-b px-4 font-semibold",
        className
      )}
    >
      {children}
    </div>
  )
}

export function SidebarContent({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("flex-1 overflow-auto py-2", className)}>
      {children}
    </div>
  )
}

export function SidebarFooter({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("border-t px-4 py-2", className)}>
      {children}
    </div>
  )
}
