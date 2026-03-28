# DataGrid

A feature-rich data table component built on [TanStack Table](https://tanstack.com/table) with support for sorting, filtering, pagination, infinite scroll, virtual rendering, column resizing, and row actions.

---

## Components

| Component | Description |
|---|---|
| `DataGrid` | Standard table with optional pagination |
| `DataGridInfinity` | Infinite scroll variant (no pagination) |

---

## Quick Start

```tsx
import { DataGrid, type DataGridColumnDef } from '@data-voyager/shared-ui'

interface User {
  id: number
  name: string
  email: string
  role: string
}

const columns: DataGridColumnDef<User>[] = [
  { accessorKey: 'name',  header: 'Name',  meta: { flex: 2 } },
  { accessorKey: 'email', header: 'Email', meta: { flex: 3 } },
  { accessorKey: 'role',  header: 'Role',  meta: { flex: 1 } },
]

function UserTable({ users }: { users: User[] }) {
  return <DataGrid data={users} columns={columns} />
}
```

---

## DataGrid Props

### Data

| Prop | Type | Default | Description |
|---|---|---|---|
| `data` | `T[]` | `[]` | Row data array |
| `columns` | `DataGridColumnDef<T>[]` | — | Column definitions (required) |
| `error` | `Error \| null` | — | Renders an error message instead of the table |
| `isLoading` | `boolean` | — | Shows skeleton rows |
| `emptyMessage` | `string` | `'No data'` | Message shown when `data` is empty |

### Sorting

| Prop | Type | Default | Description |
|---|---|---|---|
| `enableSorting` | `boolean` | `true` | Click headers to sort |
| `initialSorting` | `SortingState` | — | Initial sort state |
| `manualSorting` | `boolean` | `false` | Disable client-side sorting (server-side) |
| `onSortingChange` | `(sorting: SortingState) => void` | — | Called on sort change |

### Filtering

| Prop | Type | Default | Description |
|---|---|---|---|
| `enableColumnFilters` | `boolean` | `false` | Show per-column filter row below headers |
| `searchableColumns` | `string[]` | — | Column IDs included in the global search input |
| `globalFilter` | `string` | — | Controlled global filter value |
| `onGlobalFilterChange` | `(value: string) => void` | — | Called on global filter change |
| `columnFilters` | `ColumnFiltersState` | — | Controlled column filter state (server-side) |
| `leftFilters` | `(table: Table<T>) => ReactNode` | — | Custom filter controls rendered left of the search bar |
| `rightFilters` | `(table: Table<T>) => ReactNode` | — | Custom filter controls rendered right of the search bar |

### Pagination

| Prop | Type | Default | Description |
|---|---|---|---|
| `enablePagination` | `boolean` | `true` | Show pagination bar |
| `pageSizes` | `number[]` | `[10, 20, 50, 100]` | Page size options |
| `paginationConfig` | `{ pageSize?: number; initialPageIndex?: number }` | — | Initial pagination state |
| `totalCount` | `number` | — | Server-side total row count; enables manual pagination |
| `onPageChange` | `(pageIndex: number, pageSize: number) => void` | — | Called on page change |

### Columns

| Prop | Type | Default | Description |
|---|---|---|---|
| `enableColumnResizing` | `boolean` | `true` | Drag column dividers to resize |
| `enableColumnVisibility` | `boolean` | `false` | Show column visibility toggle dropdown |
| `columnSizingMode` | `'auto' \| 'flex' \| 'fixed'` | `'auto'` | See [Column Sizing Modes](#column-sizing-modes) |
| `visibilityState` | `VisibilityState` | — | Controlled column visibility |
| `initialPinning` | `ColumnPinningState` | — | `{ left: ['id', ...], right: ['id', ...] }` |
| `onColumnSizingChange` | `(sizing: ColumnSizingState) => void` | — | Called on column resize |

### Display

| Prop | Type | Default | Description |
|---|---|---|---|
| `tableHeight` | `string \| number \| 'auto'` | — | Fixed scroll height. Virtualizer auto-enables when rows ≥ 100 |
| `estimateRowHeight` | `number` | `37` | Estimated row height in px for the virtualizer |
| `overscan` | `number` | `10` | Extra rows rendered outside the visible area (virtualizer) |
| `bordered` | `boolean` | `false` | Show vertical dividers between columns |
| `onRowClick` | `(row: T) => void` | — | Row click handler |
| `rowCursor` | `boolean` | `false` | Show `cursor-pointer` on rows without `onRowClick` |

### Selection

| Prop | Type | Description |
|---|---|---|
| `checkboxConfig` | `CheckboxConfig<T>` | Adds a checkbox column for multi-row selection |

```ts
interface CheckboxConfig<T> {
  getRowId:    (row: T) => string
  selectedIds: Set<string>
  onSelectAll: (rows: Row<T>[], checked: boolean) => void
  onSelectOne: (rowId: string, checked: boolean) => void
}
```

### State Persistence

| Prop | Type | Default | Description |
|---|---|---|---|
| `tableKey` | `string` | — | Unique key for this table instance |
| `persistState` | `boolean` | `false` | Persist pagination and search state via Zustand |

When both `tableKey` and `persistState` are set, the current page, page size, and search term survive component unmounts.

### Callbacks

| Prop | Type | Description |
|---|---|---|
| `onTableReady` | `(table: Table<T>) => void` | Called once after the table is initialized |

---

## DataGridInfinity Props

Extends all `DataGridBaseProps` (same as `DataGrid` minus pagination props) with:

| Prop | Type | Default | Description |
|---|---|---|---|
| `hasNextPage` | `boolean` | — | Whether more data is available |
| `isFetchingNextPage` | `boolean` | — | Shows loading spinner at the bottom |
| `fetchNextPage` | `() => void` | — | Called when the sentinel enters the viewport |
| `rootMargin` | `string` | `'100px'` | IntersectionObserver margin to pre-trigger load |

```tsx
<DataGridInfinity
  data={flatData}
  columns={columns}
  hasNextPage={hasNextPage}
  isFetchingNextPage={isFetchingNextPage}
  fetchNextPage={fetchNextPage}
  tableHeight={600}
/>
```

---

## Column Definition

Columns use the standard [TanStack `ColumnDef`](https://tanstack.com/table/v8/docs/api/core/column-def) with additional `meta` fields.

### `meta` Options

| Field | Type | Description |
|---|---|---|
| `flex` | `number` | Flex ratio for distributing remaining container width |
| `autoSize` | `boolean` | Auto-fit column width to content via canvas measurement |
| `minWidth` | `number` | Minimum column width in px |
| `maxWidth` | `number` | Maximum column width in px |
| `align` | `'left' \| 'center' \| 'right'` | Cell text alignment |
| `pin` | `'left' \| 'right'` | Stick column to the left or right edge |
| `wrap` | `boolean` | Allow cell content to wrap (default: truncate with ellipsis) |
| `filterType` | `'text' \| 'select' \| 'number' \| false` | Per-column filter control type |
| `actions` | `(row: T) => ActionItem[]` | Row action menu items (see [Row Actions](#row-actions)) |

### Filter Types

| Value | Renders | Behavior |
|---|---|---|
| `'text'` | Text input | Case-insensitive substring match |
| `'select'` | Dropdown | Unique values from current data |
| `'number'` | Min / Max inputs | Numeric range filter |
| `false` | Empty cell | No filter for this column |

```tsx
const columns: DataGridColumnDef<User>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    meta: { flex: 2, filterType: 'text' },
  },
  {
    accessorKey: 'role',
    header: 'Role',
    meta: { flex: 1, filterType: 'select' },
  },
  {
    accessorKey: 'age',
    header: 'Age',
    meta: { flex: 0.8, align: 'right', filterType: 'number' },
  },
]
```

---

## Column Sizing Modes

Controlled by the `columnSizingMode` prop.

| Mode | Behavior |
|---|---|
| `'auto'` *(default)* | Reads rendered cell `scrollWidth` — expands columns to fit content, never shrinks below the initial size. User-resized columns are frozen. |
| `'flex'` | Distributes remaining container width proportionally using `meta.flex`. User-resized columns are frozen. |
| `'fixed'` | No automatic sizing. Column widths come from `size` in the column definition. |

---

## Row Actions

Define `meta.actions` on a column to render a `⋯` trigger button. The DataGrid manages a single shared dropdown at the table level — no per-row popup instances, so the menu stays open during live data refreshes.

```tsx
{
  id: '__actions__',
  header: '',
  size: 48,
  enableSorting: false,
  enableResizing: false,
  meta: {
    filterType: false,
    actions: (row) => [
      {
        label: 'Edit',
        onClick: (row) => openEditDialog(row),
      },
      {
        label: 'Delete',
        onClick: (row) => deleteRow(row.id),
        variant: 'destructive',
      },
      {
        label: 'Export',
        onClick: (row) => exportRow(row),
        disabled: !row.exportable,
        icon: <Download className="h-4 w-4" />,
      },
    ],
  },
}
```

### `ActionItem` type

| Field | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | — | Menu item label |
| `onClick` | `(row: T) => void` | — | Click handler |
| `variant` | `'default' \| 'destructive'` | `'default'` | Renders in red when `'destructive'` |
| `disabled` | `boolean` | `false` | Disables the menu item |
| `icon` | `ReactNode` | — | Icon rendered before the label |

---

## Virtual Scrolling

The virtualizer is enabled automatically when **both** conditions are met:

- `tableHeight` is set to a fixed value (number or CSS string, not `'auto'`)
- The row count is ≥ 100

No configuration is needed — it activates transparently.

```tsx
{/* 120 rows → virtualizer auto-enables */}
<DataGrid
  data={pods}          // 120 items
  columns={columns}
  tableHeight={520}
  estimateRowHeight={37}
  overscan={10}
/>
```

For variable-height rows (e.g. multi-line cells), set `meta.wrap: true` on the relevant columns. The virtualizer uses `measureElement` to track actual row heights after render.

---

## State Persistence

Page, page size, and search term are persisted in a Zustand store that survives route changes and component remounts.

```tsx
<DataGrid
  data={users}
  columns={columns}
  tableKey="users-table"
  persistState
/>
```

Access or reset the store externally:

```tsx
import { useTableStore } from '@data-voyager/shared-ui'

const { tables, reset } = useTableStore()

// Reset pagination and search for a specific table
reset('users-table')
```

---

## Server-Side Operations

### Sorting + Filtering

```tsx
const [sorting, setSorting] = useState<SortingState>([])
const [filters, setFilters] = useState<ColumnFiltersState>([])

<DataGrid
  data={serverData}
  columns={columns}
  manualSorting
  onSortingChange={setSorting}
  columnFilters={filters}
/>
```

### Pagination

Pass `totalCount` to enable server-side pagination. The table renders the correct page count without having all rows in memory.

```tsx
<DataGrid
  data={pageData}
  columns={columns}
  totalCount={totalRows}
  onPageChange={(pageIndex, pageSize) => fetchPage(pageIndex, pageSize)}
/>
```

---

## Column Pinning

Pin columns at definition level via `meta.pin`, or pass `initialPinning` to the table:

```tsx
// Option A — pin in column definition
{ accessorKey: 'name', header: 'Name', meta: { pin: 'left' } }

// Option B — pin via prop
<DataGrid
  columns={columns}
  initialPinning={{ left: ['name'], right: ['actions'] }}
/>
```

---

## Custom Toolbar Filters

Inject custom controls into the toolbar using `leftFilters` / `rightFilters`:

```tsx
<DataGrid
  data={data}
  columns={columns}
  leftFilters={(table) => (
    <Select onValueChange={(v) => table.getColumn('status')?.setFilterValue(v)}>
      ...
    </Select>
  )}
  rightFilters={() => (
    <Button onClick={exportCSV}>Export</Button>
  )}
/>
```
