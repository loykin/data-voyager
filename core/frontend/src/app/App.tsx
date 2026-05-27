import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SidePanelHost } from '@data-voyager/shared-ui'
import { AppLayout } from '@/widgets/app-layout'
import { registerAll } from '@/features/menu'
import { datasourceMenuItems } from '@/features/datasource/menu'
import { discoverMenuItems } from '@/features/discover/menu'
import { aiconfigMenuItems } from '@/features/aiconfig/menu'
import { dashboardMenuItems } from '@/features/dashboard/menu'
import { demoMenuItems } from '@/pages/demo/menu'

// Bootstrap: register all menu items at module load time
registerAll([
  ...datasourceMenuItems,
  ...discoverMenuItems,
  ...dashboardMenuItems,
  ...aiconfigMenuItems,
  ...demoMenuItems,
])

const DatasourcePage = React.lazy(() =>
  import('@/pages/datasource').then((m) => ({ default: m.DatasourcePage }))
)
const DatasourceCreatePage = React.lazy(() =>
  import('@/pages/datasource').then((m) => ({ default: m.DatasourceCreatePage }))
)
const DatasourceEditPage = React.lazy(() =>
  import('@/pages/datasource').then((m) => ({ default: m.DatasourceEditPage }))
)
const DatasourceShowPage = React.lazy(() =>
  import('@/pages/datasource').then((m) => ({ default: m.DatasourceShowPage }))
)
const DataGridDemoPage = React.lazy(() =>
  import('@/pages/demo').then((m) => ({ default: m.DataGridDemoPage }))
)
const ChartDemoPage = React.lazy(() =>
  import('@/pages/demo').then((m) => ({ default: m.ChartDemoPage }))
)
const HistogramDemoPage = React.lazy(() =>
  import('@/pages/demo').then((m) => ({ default: m.HistogramDemoPage }))
)
const DatetimeDemoPage = React.lazy(() =>
  import('@/pages/demo').then((m) => ({ default: m.DatetimeDemoPage }))
)
const DiscoverPage = React.lazy(() =>
  import('@/pages/discover').then((m) => ({ default: m.DiscoverPage }))
)
const DashboardPage = React.lazy(() =>
  import('@/features/dashboard').then((m) => ({ default: m.DashboardPage }))
)
const DashboardHomePage = React.lazy(() =>
  import('@/features/dashboard').then((m) => ({ default: m.DashboardHomePage }))
)
const DashboardSettingsPage = React.lazy(() =>
  import('@/features/dashboard').then((m) => ({ default: m.DashboardSettingsPage }))
)
const PanelEditorPage = React.lazy(() =>
  import('@/features/dashboard').then((m) => ({ default: m.PanelEditorPage }))
)
const VariablesPage = React.lazy(() =>
  import('@/features/dashboard').then((m) => ({ default: m.VariablesPage }))
)
const AIConfigPage = React.lazy(() =>
  import('@/pages/settings').then((m) => ({ default: m.AIConfigPage }))
)
const AIConfigEditPage = React.lazy(() =>
  import('@/pages/settings').then((m) => ({ default: m.AIConfigEditPage }))
)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function AppLayoutRoute() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  )
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename="/ui">
        <SidePanelHost />
        <React.Suspense
          fallback={
            <div className="flex min-h-screen items-center justify-center">Loading...</div>
          }
        >
          <Routes>
            <Route path="/" element={<Navigate to="/datasource" replace />} />
            <Route element={<AppLayoutRoute />}>
              <Route path="/datasource" element={<DatasourcePage />} />
              <Route path="/datasource/create" element={<DatasourceCreatePage />} />
              <Route path="/datasource/edit" element={<DatasourceEditPage />} />
              <Route path="/datasource/show" element={<DatasourceShowPage />} />
              <Route path="/demo" element={<DataGridDemoPage />} />
              <Route path="/demo/chart" element={<ChartDemoPage />} />
              <Route path="/demo/histogram" element={<HistogramDemoPage />} />
              <Route path="/demo/datetime" element={<DatetimeDemoPage />} />
              <Route path="/discover" element={<DiscoverPage />} />
              <Route path="/dashboard" element={<DashboardHomePage />} />
              <Route path="/dashboard/:dashboardId" element={<DashboardPage />} />
              <Route path="/dashboard/:dashboardId/settings" element={<DashboardSettingsPage />} />
              <Route path="/dashboard/:dashboardId/variables" element={<VariablesPage />} />
              <Route path="/dashboard/:dashboardId/panels/:panelId/edit" element={<PanelEditorPage />} />
              <Route path="/settings" element={<Navigate to="/settings/ai" replace />} />
              <Route path="/settings/ai" element={<AIConfigPage />} />
              <Route path="/settings/ai/edit" element={<AIConfigEditPage />} />
            </Route>
          </Routes>
        </React.Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
