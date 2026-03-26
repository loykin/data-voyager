import { Link } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent } from '@data-voyager/shared-ui/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@data-voyager/shared-ui/components/ui/table'
import { Badge } from '@data-voyager/shared-ui/components/ui/badge'
import { Button } from '@data-voyager/shared-ui/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@data-voyager/shared-ui/components/ui/dropdown-menu'
import { MoreHorizontal, Edit, Eye, Trash2, Plus, Loader2 } from 'lucide-react'
import { useDatasources, useDeleteDatasource, DataSourceType } from '@/entities/datasource'
import type { DataSource } from '@/entities/datasource'

function getTypeBadgeVariant(type: DataSourceType) {
  switch (type) {
    case DataSourceType.PostgreSQL: return 'default' as const
    case DataSourceType.ClickHouse: return 'secondary' as const
    case DataSourceType.SQLite: return 'outline' as const
    case DataSourceType.OpenSearch: return 'destructive' as const
    default: return 'default' as const
  }
}

export function DataSourceList() {
  const { data: datasources, isLoading, isError, error } = useDatasources()
  const { mutate: deleteDatasource } = useDeleteDatasource()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Error: {error?.message}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Sources</h1>
          <p className="text-muted-foreground">Manage your database connections and data sources</p>
        </div>
        <Link to="/datasource/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Data Source
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Data Sources ({datasources?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {datasources?.map((datasource: DataSource) => (
                <TableRow key={datasource.id}>
                  <TableCell className="font-medium">{datasource.id}</TableCell>
                  <TableCell className="font-semibold">{datasource.name}</TableCell>
                  <TableCell>
                    <Badge variant={getTypeBadgeVariant(datasource.type)}>
                      {datasource.type.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {datasource.description ?? '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={datasource.isActive ? 'default' : 'secondary'}>
                      {datasource.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {datasource.tags?.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" className="h-8 w-8 p-0" />}>
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem render={<Link to={`/datasource/show?id=${datasource.id}`} className="flex items-center" />}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem render={<Link to={`/datasource/edit?id=${datasource.id}`} className="flex items-center" />}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deleteDatasource(datasource.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {(!datasources || datasources.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No data sources found. Create your first data source to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
