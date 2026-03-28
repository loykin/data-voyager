import { useSearchParams } from 'react-router-dom'
import { TabbedPageTemplate } from '@data-voyager/shared-ui'
import { PaginationTab }  from './tabs/pagination'
import { InfinityTab }    from './tabs/infinity'
import { FixedHeightTab } from './tabs/fixed-height'
import { PinningTab }     from './tabs/pinning'
import { DashboardTab }   from './tabs/dashboard'
import { SelectionTab }   from './tabs/selection'
import { BorderedTab }    from './tabs/bordered'
import { LargeListTab }   from './tabs/large-list'
import { LiveUpdateTab }  from './tabs/live-update'

const tabs = [
  { id: 'pagination',   label: 'Pagination',       content: <PaginationTab /> },
  { id: 'infinity',     label: 'Infinite Scroll',  content: <InfinityTab /> },
  { id: 'fixed',        label: 'Fixed Height',     content: <FixedHeightTab /> },
  { id: 'large-list',   label: 'Large List',       content: <LargeListTab /> },
  { id: 'live-update',  label: 'Live Update',      content: <LiveUpdateTab /> },
  { id: 'pinning',      label: 'Column Pinning',   content: <PinningTab /> },
  { id: 'dashboard',    label: 'Dashboard',        content: <DashboardTab /> },
  { id: 'selection',    label: 'Row Selection',    content: <SelectionTab /> },
  { id: 'bordered',     label: 'Bordered',         content: <BorderedTab /> },
]

export function DataGridDemoPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') ?? tabs[0]!.id

  const handleTabChange = (id: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('tab', id)
      return next
    })
  }

  return (
    <TabbedPageTemplate
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      header={
        <div>
          <h1 className="text-xl font-semibold">DataGrid Demo</h1>
          <p className="text-sm text-muted-foreground mt-1">
            TanStack Table · DOM auto-sizing · virtual rendering (rows ≥ 100 + fixed height) · column filters
          </p>
        </div>
      }
    />
  )
}
