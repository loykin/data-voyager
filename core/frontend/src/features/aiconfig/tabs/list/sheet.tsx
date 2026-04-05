import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2, X, CheckCircle2, XCircle, Bot, AlertTriangle, Loader2, Zap } from 'lucide-react'
import { Button, Badge, useSidePanelStore } from '@data-voyager/shared-ui'
import { aiConfigApi } from '@/features/aiconfig'
import { PROVIDER_LABELS } from './columns'

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <div className="text-sm">{value}</div>
    </div>
  )
}

interface AIConfigSheetProps {
  id: string
  onChanged: () => void
}

export function AIConfigSheet({ id, onChanged }: AIConfigSheetProps) {
  const { close } = useSidePanelStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { data: cfg, isLoading } = useQuery({
    queryKey: ['ai-config', id],
    queryFn: () => aiConfigApi.getById(id),
  })

  const deleteMutation = useMutation({
    mutationFn: () => aiConfigApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-configs'] })
      onChanged()
      close()
    },
  })

  const activateMutation = useMutation({
    mutationFn: () => aiConfigApi.activate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-configs'] })
      queryClient.invalidateQueries({ queryKey: ['ai-config', id] })
      onChanged()
    },
  })

  function handleEdit() {
    close()
    navigate(`/settings/ai/edit?id=${id}`)
  }

  if (isLoading || !cfg) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading…</span>
      </div>
    )
  }

  const isOllama = cfg.provider === 'ollama'

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <Bot className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-semibold text-base truncate">{cfg.name}</span>
          {cfg.is_active && (
            <Badge variant="secondary" className="text-xs shrink-0">Active</Badge>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {!cfg.is_active && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={() => activateMutation.mutate()}
              disabled={activateMutation.isPending}
            >
              <Zap className="h-3 w-3" />
              Set Active
            </Button>
          )}
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

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <InfoRow
            label="Status"
            value={
              cfg.is_active ? (
                <span className="inline-flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Active
                </span>
              ) : (
                <span className="text-muted-foreground">Inactive</span>
              )
            }
          />
          {!isOllama && (
            <InfoRow
              label="API Key"
              value={
                cfg.api_key_set ? (
                  <span className="inline-flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Configured
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <XCircle className="h-3.5 w-3.5" /> Not set
                  </span>
                )
              }
            />
          )}
        </div>

        <div className="border-t" />

        <div className="space-y-4">
          <InfoRow label="Provider" value={PROVIDER_LABELS[cfg.provider] ?? cfg.provider} />
          <InfoRow
            label="Model"
            value={
              <span className="font-mono">
                {cfg.model || <span className="text-muted-foreground">(default)</span>}
              </span>
            }
          />
          {cfg.base_url && (
            <InfoRow label="Base URL" value={<span className="font-mono break-all">{cfg.base_url}</span>} />
          )}
        </div>
      </div>

      {confirmDelete && (
        <div className="border-t px-4 py-3 bg-destructive/5 space-y-2 shrink-0">
          <div className="flex items-start gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <p>Delete <strong>{cfg.name}</strong>? This cannot be undone.</p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              className="h-7 text-xs"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              Delete
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
