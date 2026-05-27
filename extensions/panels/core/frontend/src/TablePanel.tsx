import { definePanel, type PanelViewerProps } from '@loykin/dashboardkit'
import { resultToTable } from './data'

function TableViewer({ rawData }: PanelViewerProps<Record<string, unknown>, unknown>) {
  const table = resultToTable(rawData)

  if (table.columns.length === 0) {
    return <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No rows</div>
  }

  return (
    <div className="h-full overflow-auto">
      <table className="w-full border-collapse text-xs">
        <thead className="sticky top-0 bg-card">
          <tr className="border-b">
            {table.columns.map((column) => (
              <th key={column} className="px-2 py-1.5 text-left font-medium text-muted-foreground">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b last:border-b-0">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="max-w-64 truncate px-2 py-1.5 tabular-nums">
                  {cell === null || cell === undefined ? '' : String(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export const tablePanelPlugin = definePanel({
  id: 'table',
  name: 'Table',
  description: 'Tabular query result',
  optionsSchema: {},
  viewer: TableViewer,
})
