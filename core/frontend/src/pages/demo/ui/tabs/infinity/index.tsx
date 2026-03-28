import { useState } from 'react'
import { DataGridInfinity } from '@data-voyager/shared-ui'
import { ALL_DATA } from '../../data'
import { columns } from '../../columns'

const PAGE = 50

export function InfinityTab() {
  const [infinityData, setInfinityData] = useState(() => ALL_DATA.slice(0, PAGE))
  const [isFetching, setIsFetching] = useState(false)
  const hasNextPage = infinityData.length < ALL_DATA.length

  const fetchNextPage = () => {
    if (isFetching || !hasNextPage) return
    setIsFetching(true)
    setTimeout(() => {
      setInfinityData((prev) => ALL_DATA.slice(0, prev.length + PAGE))
      setIsFetching(false)
    }, 400)
  }

  return (
    <section className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">
        Loads {PAGE} rows at a time on scroll ({infinityData.length} / {ALL_DATA.length} loaded)
      </p>
      <DataGridInfinity
        data={infinityData}
        columns={columns}
        enableColumnFilters
        enableSorting
        tableHeight={480}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetching}
        fetchNextPage={fetchNextPage}
        emptyMessage="No employees found"
      />
    </section>
  )
}
