import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Input } from '@data-voyager/shared-ui/components/ui/input'
import { Label } from '@data-voyager/shared-ui/components/ui/label'
import { Button } from '@data-voyager/shared-ui/components/ui/button'
import { Switch } from '@data-voyager/shared-ui/components/ui/switch'
import { Alert, AlertDescription } from '@data-voyager/shared-ui/components/ui/alert'
import { Separator } from '@data-voyager/shared-ui/components/ui/separator'
import { Loader2, Check, X, TestTube } from 'lucide-react'
import { datasourceRegistry } from '@data-voyager/sdk'
import { useDatasource, useUpdateDatasource } from '@/entities/datasource'
import { useTestConnection } from '@/features/datasource/test-connection'

export function DatasourceEditPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const id = Number(searchParams.get('id'))

  const { data: datasource, isLoading } = useDatasource(id)
  const { mutate: updateDatasource, isPending } = useUpdateDatasource()
  const { testConnection, testing } = useTestConnection()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [config, setConfig] = useState<Record<string, unknown>>({})
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  useEffect(() => {
    if (datasource) {
      setName(datasource.name)
      setDescription(datasource.description ?? '')
      setTags((datasource.tags ?? []).join(', '))
      setIsActive(datasource.is_active)
      try {
        setConfig(
          typeof datasource.config === 'string'
            ? JSON.parse(datasource.config)
            : (datasource.config as Record<string, unknown>) ?? {}
        )
      } catch {
        setConfig({})
      }
    }
  }, [datasource])

  const plugin = datasource ? datasourceRegistry.get(datasource.type) : undefined
  const ConfigComponent = plugin?.configComponent

  const handleTest = async () => {
    if (!datasource) return
    setTestResult(null)
    try {
      const result = await testConnection({ type: datasource.type, config })
      setTestResult({ success: result.is_connected, message: result.message })
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Test failed',
      })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateDatasource(
      {
        id,
        data: {
          name,
          description: description || undefined,
          tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
          is_active: isActive,
          config,
        },
      },
      { onSuccess: () => navigate('/datasource') }
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!datasource) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-destructive">Datasource not found</p>
        <Button onClick={() => navigate('/datasource')}>Back to List</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit — {datasource.name}</h1>
        <p className="text-sm text-muted-foreground">Update connection settings</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <section className="flex flex-col gap-4 max-w-lg">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">General</h2>

          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <Input value={datasource.type} disabled className="bg-muted" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              placeholder="tag1, tag2"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={isActive} onCheckedChange={setIsActive} id="isActive" />
            <Label htmlFor="isActive" className="cursor-pointer">Active</Label>
          </div>
        </section>

        <Separator />

        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {plugin ? `${plugin.name} Connection` : `${datasource.type} Connection`}
          </h2>
          {ConfigComponent ? (
            <ConfigComponent config={config} onChange={setConfig} onTest={handleTest} />
          ) : (
            <p className="text-sm text-muted-foreground">No configuration UI registered for "{datasource.type}"</p>
          )}
        </section>

        {testResult && (
          <Alert className={testResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            <div className="flex items-center gap-2">
              {testResult.success
                ? <Check className="h-4 w-4 text-green-600" />
                : <X className="h-4 w-4 text-red-600" />}
              <AlertDescription className={testResult.success ? 'text-green-800' : 'text-red-800'}>
                {testResult.message}
              </AlertDescription>
            </div>
          </Alert>
        )}

        <Separator />

        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" onClick={handleTest} disabled={testing}>
            {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TestTube className="mr-2 h-4 w-4" />}
            Test Connection
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => navigate('/datasource')}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
