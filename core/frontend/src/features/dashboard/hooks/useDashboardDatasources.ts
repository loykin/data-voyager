import { useEffect, useState } from 'react'
import type { DatasourceInstance } from '@loykin/datasourcekit'
import { getDatasourceManager } from '@/features/datasource/api/datasource.manager'

export function useDashboardDatasources() {
  const [items, setItems] = useState<DatasourceInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getDatasourceManager().instances.list({ filter: { enabled: true } })
      .then((result) => {
        if (cancelled) return
        setItems(result.items)
        setError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { items, loading, error }
}
