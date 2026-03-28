import { useState } from 'react'

export interface TabItem {
  id: string
  label: string
  content: React.ReactNode
}

interface TabbedPageTemplateProps {
  tabs: TabItem[]
  defaultTab?: string
  /** Controlled mode: manage active tab externally (e.g. URL sync) */
  activeTab?: string
  onTabChange?: (id: string) => void
  header?: React.ReactNode
}

export function TabbedPageTemplate({
  tabs,
  defaultTab,
  activeTab: controlledTab,
  onTabChange,
  header,
}: TabbedPageTemplateProps) {
  const [internalTab, setInternalTab] = useState(defaultTab ?? tabs[0]?.id ?? '')

  const isControlled = controlledTab !== undefined
  const activeTab = isControlled ? controlledTab : internalTab

  const setActiveTab = (id: string) => {
    if (isControlled) {
      onTabChange?.(id)
    } else {
      setInternalTab(id)
      onTabChange?.(id)
    }
  }

  const current = tabs.find((t) => t.id === activeTab) ?? tabs[0]

  return (
    <div className="flex flex-col gap-6 p-4">
      {header}

      <div className="flex border-b gap-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={[
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              current?.id === t.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div>{current?.content}</div>
    </div>
  )
}
