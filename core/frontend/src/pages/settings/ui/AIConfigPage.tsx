import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Bot, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Button, Badge, useSidePanelStore } from '@data-voyager/shared-ui'
import { aiConfigApi } from '@/entities/aiconfig'
import type { AIConfig } from '@/entities/aiconfig'
import { AIConfigSheet } from './AIConfigSheet'

export const PROVIDER_LABELS: Record<string, string> = {
  claude:  'Claude (Anthropic)',
  openai:  'OpenAI',
  copilot: 'GitHub Copilot',
  ollama:  'Ollama (local)',
}

// ── row component ─────────────────────────────────────────────────────────────
function ConfigRow({ cfg, onClick }: { cfg: AIConfig; onClick: () => void }) {
  return (
    <tr
      className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
      onClick={onClick}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Bot className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-medium text-sm">{cfg.name}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {PROVIDER_LABELS[cfg.provider] ?? cfg.provider}
      </td>
      <td className="px-4 py-3 text-sm font-mono text-muted-foreground">{cfg.model || '—'}</td>
      <td className="px-4 py-3">
        {cfg.api_key_set ? (
          <span className="inline-flex items-center gap-1 text-xs text-green-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Set
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <XCircle className="h-3.5 w-3.5" />
            Not set
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        {cfg.is_active && (
          <Badge variant="secondary" className="text-xs">Active</Badge>
        )}
      </td>
    </tr>
  )
}

// ── page ──────────────────────────────────────────────────────────────────────
export function AIConfigPage() {
  const { open } = useSidePanelStore()
  const navigate = useNavigate()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['ai-configs'],
    queryFn: () => aiConfigApi.list(),
  })

  function openSheet(cfg: AIConfig) {
    open(
      <AIConfigSheet
        id={cfg.id}
        onChanged={() => { void refetch() }}
      />,
      560,
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">AI Config</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage AI provider configurations for the chat assistant.
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => navigate('/settings/ai/edit')}>
          <Plus className="h-4 w-4" />
          Add Config
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-hidden">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        )}

        {error && (
          <div className="py-12 text-center text-sm text-destructive">
            Failed to load AI configs: {(error as Error).message}
          </div>
        )}

        {!isLoading && !error && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">Provider</th>
                <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">Model</th>
                <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">API Key</th>
                <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {data?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No AI configs yet. Click <strong>Add Config</strong> to create one.
                  </td>
                </tr>
              )}
              {data?.map((cfg) => (
                <ConfigRow
                  key={cfg.id}
                  cfg={cfg}
                  onClick={() => openSheet(cfg)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
