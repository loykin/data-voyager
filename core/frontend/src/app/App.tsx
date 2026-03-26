import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppLayout } from '@/widgets/app-layout'

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
            </Route>
          </Routes>
        </React.Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
