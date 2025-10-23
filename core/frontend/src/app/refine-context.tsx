"use client";

import { Refine } from "@refinedev/core";
import routerProvider from "@refinedev/nextjs-router";
import { datasourceProvider } from "@/features/datasource";

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
          list: "/explorer",
          create: "/explorer/create",
          edit: "/explorer/edit/:id",
          show: "/explorer/show/:id",
          meta: {
            canDelete: true,
          },
        },
      ]}
      options={{
        syncWithLocation: true,
        warnWhenUnsavedChanges: true,
        projectId: "explorer-project",
      }}
    >
      {children}
    </Refine>
  );
};