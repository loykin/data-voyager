"use client";

import { Refine } from "@refinedev/core";
import routerProvider from "@refinedev/nextjs-router/app";
import { datasourceProvider } from "@/features/datasource";
import { Database } from "lucide-react";

interface RefineContextProviderProps {
  children: React.ReactNode;
}

export const RefineContextProvider: React.FC<RefineContextProviderProps> = ({
  children,
}) => {
  return (
    <Refine
      dataProvider={datasourceProvider}
      routerProvider={routerProvider}
      resources={[
        {
          name: "datasources",
          list: "/datasource",
          create: "/datasource/create",
          edit: "/datasource/edit",
          show: "/datasource/show",
          meta: {
            label: "Datasources",
            icon: <Database className="h-4 w-4" />,
            canDelete: true,
          },
        },
      ]}
      options={{
        syncWithLocation: false,
        warnWhenUnsavedChanges: true,
        disableTelemetry: true,
      }}
    >
      {children}
    </Refine>
  );
};