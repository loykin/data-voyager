import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil, Trash2, X, CheckCircle2, XCircle, Database, Loader2, Wifi } from 'lucide-react'
import { Button, Badge, useSidePanelStore } from '@data-voyager/shared-ui'
import {
  datasourceCreatedBy,
  datasourceDescription,
  datasourceKeys,
  datasourceTags,
  getDatasourceManager,
  useDatasource,
  useDeleteDatasource,
} from '@/features/datasource'
import { useMutation } from '@tanstack/react-query'

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <div className="text-sm">{value}</div>
    </div>
  )
}

interface DatasourceSheetProps {
  id: string
  onChanged: () => void
}

export function DatasourceSheet({ id, onChanged }: DatasourceSheetProps) {
  const { close } = useSidePanelStore()
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; latency?: number } | null>(null)

  const { data: conn, isLoading } = useDatasource(id)

  const deleteDatasource = useDeleteDatasource()
  const deleteMutation = {
    mutate: () => deleteDatasource.mutate(id, {
      onSuccess: () => {
        onChanged()
        close()
      },
    }),
    isPending: deleteDatasource.isPending,
  }

  const testMutation = useMutation({
    mutationKey: [...datasourceKeys.one(id), 'health'],
    mutationFn: () => getDatasourceManager().instances.healthCheck(id, conn?.type ?? ''),
    onSuccess: (result) => {
      setTestResult({
        ok: result.ok,
        message: result.message ?? (result.ok ? 'Datasource healthy' : 'Datasource check failed'),
        latency: typeof result.details?.latencyMs === 'number' ? result.details.latencyMs : undefined,
      })
    },
    onError: (err) => {
      setTestResult({ ok: false, message: err instanceof Error ? err.message : 'Test failed' })
    },
  })

  function handleEdit() {
    close()
    navigate(`/datasource/edit?id=${id}`)
  }

  if (isLoading || !conn) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading…</span>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <Database className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-semibold text-base truncate">{conn.name}</span>
          <Badge variant={conn.enabled ? 'default' : 'outline'} className="text-xs shrink-0">
            {conn.enabled ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1"
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending}
          >
            {testMutation.isPending
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <Wifi className="h-3 w-3" />}
            Test
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleEdit}>
            <Pencil className="h-3 w-3" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 text-destructive hover:bg-destructive/10"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="h-3 w-3" />
            Delete
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={close}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
        {/* Test result banner */}
        {testResult && (
          <div className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${testResult.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {testResult.ok
              ? <CheckCircle2 className="h-4 w-4 shrink-0" />
              : <XCircle className="h-4 w-4 shrink-0" />}
            <span>{testResult.message}</span>
            {testResult.latency != null && (
              <span className="ml-auto text-xs opacity-70">{testResult.latency}ms</span>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <InfoRow label="Type" value={<Badge variant="secondary">{conn.type}</Badge>} />
          <InfoRow
            label="Status"
            value={
              conn.enabled
                ? <span className="inline-flex items-center gap-1 text-green-600"><CheckCircle2 className="h-3.5 w-3.5" />Active</span>
                : <span className="text-muted-foreground">Inactive</span>
            }
          />
        </div>

        {datasourceDescription(conn) && (
          <InfoRow label="Description" value={datasourceDescription(conn)} />
        )}

        {datasourceTags(conn).length > 0 && (
          <InfoRow
            label="Tags"
            value={
              <div className="flex flex-wrap gap-1 mt-0.5">
                {datasourceTags(conn).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                ))}
              </div>
            }
          />
        )}

        <div className="border-t" />

        <div className="grid grid-cols-2 gap-4">
          <InfoRow
            label="Created"
            value={<span className="text-muted-foreground">{conn.createdAt ? new Date(conn.createdAt).toLocaleString() : '—'}</span>}
          />
          <InfoRow
            label="Updated"
            value={<span className="text-muted-foreground">{conn.updatedAt ? new Date(conn.updatedAt).toLocaleString() : '—'}</span>}
          />
          {datasourceCreatedBy(conn) && (
            <InfoRow label="Created by" value={datasourceCreatedBy(conn)} />
          )}
        </div>
      </div>

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="border-t px-4 py-3 bg-destructive/5 shrink-0 space-y-2">
          <p className="text-sm font-medium text-destructive">Delete "{conn.name}"?</p>
          <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              className="h-7 text-xs"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Delete'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
