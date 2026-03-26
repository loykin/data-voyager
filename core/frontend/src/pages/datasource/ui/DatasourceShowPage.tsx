import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@data-voyager/shared-ui/components/ui/card'
import { Button } from '@data-voyager/shared-ui/components/ui/button'
import { Badge } from '@data-voyager/shared-ui/components/ui/badge'
import { Loader2 } from 'lucide-react'
import { useDatasource } from '@/entities/datasource'

export function DatasourceShowPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const id = Number(searchParams.get('id'))

  const { data: datasource, isLoading } = useDatasource(id)

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Data Source Details {id ? `#${id}` : ''}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {datasource ? (
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="font-medium text-muted-foreground">Name</dt>
                <dd>{datasource.name}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted-foreground">Type</dt>
                <dd><Badge>{datasource.type}</Badge></dd>
              </div>
              <div>
                <dt className="font-medium text-muted-foreground">Status</dt>
                <dd>
                  <Badge variant={datasource.isActive ? 'default' : 'secondary'}>
                    {datasource.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </dd>
              </div>
              {datasource.description && (
                <div className="col-span-2">
                  <dt className="font-medium text-muted-foreground">Description</dt>
                  <dd>{datasource.description}</dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="text-muted-foreground">Datasource not found.</p>
          )}
          <Button onClick={() => navigate('/datasource')}>Back to List</Button>
        </CardContent>
      </Card>
    </div>
  )
}
