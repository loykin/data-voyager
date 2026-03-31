import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Input } from '@data-voyager/shared-ui/components/ui/input'
import { Label } from '@data-voyager/shared-ui/components/ui/label'
import { Button } from '@data-voyager/shared-ui/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@data-voyager/shared-ui/components/ui/select'
import { Switch } from '@data-voyager/shared-ui/components/ui/switch'
import { Alert, AlertDescription } from '@data-voyager/shared-ui/components/ui/alert'
import { Separator } from '@data-voyager/shared-ui/components/ui/separator'
import { Loader2, Check, X, TestTube } from 'lucide-react'
import { datasourceRegistry } from '@data-voyager/sdk'
import type { DatasourcePlugin } from '@data-voyager/sdk'
import { useQuery } from '@tanstack/react-query'
import { datasourceApi } from '@/entities/datasource'
import { useCreateDatasource } from '../model/useCreateDatasource'
import { useTestConnection } from '@/features/datasource/test-connection'

export function DatasourceCreateForm() {
  const navigate = useNavigate()

  const { data: backendTypes = [] } = useQuery({
    queryKey: ['connection-types'],
    queryFn: datasourceApi.getTypes,
  })

  const availablePlugins: DatasourcePlugin[] = datasourceRegistry
    .getAll()
    .filter((p) => backendTypes.includes(p.id))

  const [selectedType, setSelectedType] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [config, setConfig] = useState<Record<string, unknown>>({})
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  useEffect(() => {
    if (!selectedType && availablePlugins.length > 0) {
      setSelectedType(availablePlugins[0].id)
    }
  }, [availablePlugins, selectedType])

  useEffect(() => {
    setConfig({})
    setTestResult(null)
  }, [selectedType])

  const { createDatasource, creating } = useCreateDatasource()
  const { testConnection, testing } = useTestConnection()

  const plugin = datasourceRegistry.get(selectedType)
  const ConfigComponent = plugin?.configComponent

  const handleTest = async () => {
    if (!selectedType) return
    setTestResult(null)
    try {
      const result = await testConnection({ type: selectedType, config })
      setTestResult({ success: result.is_connected, message: result.message })
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Test failed',
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedType) return
    await createDatasource({
      name,
      type: selectedType,
      description: description || undefined,
      tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      config,
    })
    navigate('/datasource')
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Add Datasource</h1>
        <p className="text-sm text-muted-foreground">Connect a new database or data service</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Basic info */}
        <section className="flex flex-col gap-4 max-w-lg">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">General</h2>

          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              placeholder="My Database"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type *</Label>
            <Select value={selectedType} onValueChange={(v) => v !== null && setSelectedType(v)}>
              <SelectTrigger id="type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {availablePlugins.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Optional"
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
            <p className="text-xs text-muted-foreground">Comma-separated</p>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={isActive} onCheckedChange={setIsActive} id="isActive" />
            <Label htmlFor="isActive" className="cursor-pointer">Active</Label>
          </div>
        </section>

        <Separator />

        {/* Extension config */}
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {plugin ? `${plugin.name} Connection` : 'Connection'}
          </h2>

          {ConfigComponent ? (
            <ConfigComponent config={config} onChange={setConfig} onTest={handleTest} />
          ) : selectedType ? (
            <p className="text-sm text-muted-foreground">No configuration UI for "{selectedType}"</p>
          ) : (
            <p className="text-sm text-muted-foreground">Select a type above to configure the connection.</p>
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

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" onClick={handleTest} disabled={testing || !selectedType}>
            {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TestTube className="mr-2 h-4 w-4" />}
            Test Connection
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => navigate('/datasource')}>
              Cancel
            </Button>
            <Button type="submit" disabled={creating || !selectedType || !name}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
