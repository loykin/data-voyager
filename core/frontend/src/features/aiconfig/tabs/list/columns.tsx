import { Bot, CheckCircle2, XCircle } from 'lucide-react'
import { Badge } from '@data-voyager/shared-ui'
import type { DataGridColumnDef } from '@data-voyager/shared-ui'
import type { AIConfig } from '../../api/aiconfig.api'

export const PROVIDER_LABELS: Record<string, string> = {
  claude:  'Claude (Anthropic)',
  openai:  'OpenAI',
  copilot: 'GitHub Copilot',
  ollama:  'Ollama (local)',
}

export function getListColumns(): DataGridColumnDef<AIConfig>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Name',
      meta: { flex: 2 },
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-muted-foreground shrink-0" />
          <span>{row.original.name}</span>
        </div>
      ),
    },
    {
      accessorKey: 'provider',
      header: 'Provider',
      meta: { flex: 1.5 },
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {PROVIDER_LABELS[row.original.provider] ?? row.original.provider}
        </span>
      ),
    },
    {
      accessorKey: 'model',
      header: 'Model',
      meta: { flex: 1.5 },
      cell: ({ row }) => (
        <span className="font-mono text-muted-foreground">{row.original.model || '—'}</span>
      ),
    },
    {
      accessorKey: 'api_key_set',
      header: 'API Key',
      meta: { flex: 0.8 },
      cell: ({ row }) => row.original.api_key_set ? (
        <span className="inline-flex items-center gap-1 text-xs text-green-600">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Set
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <XCircle className="h-3.5 w-3.5" />
          Not set
        </span>
      ),
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      meta: { flex: 0.8, align: 'center' },
      cell: ({ row }) => row.original.is_active ? (
        <Badge variant="secondary" className="text-xs">Active</Badge>
      ) : null,
    },
  ]
}
