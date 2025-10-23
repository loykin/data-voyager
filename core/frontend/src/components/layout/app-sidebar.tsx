"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMenu } from "@refinedev/core";
import { cn } from "@data-voyager/shared-ui/lib/utils";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
} from "@data-voyager/shared-ui/components/ui/sidebar";
import { Button } from "@data-voyager/shared-ui/components/ui/button";
import { Database, Plus } from "lucide-react";

export function AppSidebar() {
  const pathname = usePathname();
  const { menuItems, selectedKey } = useMenu();

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <Database className="h-6 w-6" />
          <span className="text-lg">Data Voyager</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <nav className="space-y-1 px-2">
          {menuItems.map((item) => {
            const isActive = selectedKey === item.key || pathname === item.route;
            
            return (
              <Link
                key={item.key}
                href={item.route || "#"}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </SidebarContent>

      <SidebarFooter>
        <Button variant="outline" className="w-full" asChild>
          <Link href="/datasource/create">
            <Plus className="mr-2 h-4 w-4" />
            New Datasource
          </Link>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
