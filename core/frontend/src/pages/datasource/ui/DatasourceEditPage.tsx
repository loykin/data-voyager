import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@data-voyager/shared-ui/components/ui/card'
import { Button } from '@data-voyager/shared-ui/components/ui/button'
import { Input } from '@data-voyager/shared-ui/components/ui/input'
import { Label } from '@data-voyager/shared-ui/components/ui/label'
import { Switch } from '@data-voyager/shared-ui/components/ui/switch'
import { Loader2 } from 'lucide-react'
import { useDatasource, useUpdateDatasource } from '@/entities/datasource'
import { useState, useEffect } from 'react'

export function DatasourceEditPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const id = Number(searchParams.get('id'))

  const { data: datasource, isLoading } = useDatasource(id)
  const { mutate: updateDatasource, isPending } = useUpdateDatasource()

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isActive: true,
  })

  useEffect(() => {
    if (datasource) {
      setFormData({
        name: datasource.name,
        description: datasource.description ?? '',
        isActive: datasource.isActive,
      })
    }
  }, [datasource])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateDatasource(
      { id, data: formData },
      { onSuccess: () => navigate('/datasource') }
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (!datasource) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-destructive mb-4">Datasource not found</p>
          <Button onClick={() => navigate('/datasource')}>Back to List</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
        <CardHeader>
          <CardTitle>Edit Data Source — {datasource.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Input id="type" value={datasource.type} disabled className="bg-muted" />
              <p className="text-sm text-muted-foreground">Type cannot be changed</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/datasource')}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
  )
}
