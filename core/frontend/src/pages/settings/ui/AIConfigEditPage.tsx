import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, Loader2, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react'
import { Button, Input, Label, Switch } from '@data-voyager/shared-ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@data-voyager/shared-ui/components/ui/select'
import { aiConfigApi } from '@/entities/aiconfig'
import type { CreateAIConfigRequest, UpdateAIConfigRequest } from '@/entities/aiconfig'
import { PROVIDER_LABELS } from './AIConfigPage'

type ProviderKey = 'claude' | 'openai' | 'copilot' | 'ollama'
const PROVIDERS: ProviderKey[] = ['claude', 'openai', 'copilot', 'ollama']

const DEFAULT_MODELS: Record<ProviderKey, string> = {
  claude:  'claude-opus-4-5',
  openai:  'gpt-4o',
  copilot: 'gpt-4o',
  ollama:  'qwen2.5-coder:7b',
}

const DEFAULT_BASE_URLS: Record<ProviderKey, string> = {
  claude:  'https://api.anthropic.com',
  openai:  'https://api.openai.com/v1',
  copilot: 'https://api.githubcopilot.com',
  ollama:  'http://localhost:11434/v1',
}

// ── APIKeyInput ───────────────────────────────────────────────────────────────
function APIKeyInput({
  isSet,
  value,
  touched,
  onChange,
  onTouch,
  placeholder,
}: {
  isSet: boolean
  value: string
  touched: boolean
  onChange: (v: string) => void
  onTouch: () => void
  placeholder?: string
}) {
  return (
    <div className="relative">
      <Input
        type="text"
        placeholder={isSet && !touched ? '••••••••' : (placeholder ?? 'sk-…')}
        value={value}
        onFocus={() => { if (!touched) onTouch() }}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        // type="text" prevents browser "generate password" popup;
        // CSS masking replicates the visual effect of type="password".
        style={value ? ({ WebkitTextSecurity: 'disc' } as React.CSSProperties) : undefined}
      />
      {isSet && !touched && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-green-600 font-medium">
          set
        </span>
      )}
    </div>
  )
}

// ── page ──────────────────────────────────────────────────────────────────────
export function AIConfigEditPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()

  const paramId = searchParams.get('id')
  const isNew = !paramId

  const [name, setName]           = useState('')
  const [provider, setProvider]   = useState<ProviderKey>('openai')
  const [apiKey, setApiKey]       = useState('')
  const [apiKeyTouched, setTouched] = useState(false)
  const [model, setModel]         = useState('')
  const [baseUrl, setBaseUrl]     = useState('')
  const [shouldActivate, setShouldActivate] = useState(false)

  // Load existing config when editing
  const { data: remote } = useQuery({
    queryKey: ['ai-config', paramId],
    queryFn: () => aiConfigApi.getById(paramId!),
    enabled: !isNew,
  })

  const [synced, setSynced] = useState(false)
  useEffect(() => {
    if (!remote || synced) return
    setSynced(true)
    setName(remote.name)
    setProvider(remote.provider as ProviderKey)
    setModel(remote.model ?? '')
    setBaseUrl(remote.base_url ?? '')
    setShouldActivate(remote.is_active)
    setApiKey('')
    setTouched(false)
  }, [remote, synced])

  const isOllama      = provider === 'ollama'
  const apiKeyAlready = !isOllama && (remote?.api_key_set === true)

  const createMutation = useMutation({
    mutationFn: (body: CreateAIConfigRequest) => aiConfigApi.create(body),
    onSuccess: async (created) => {
      if (shouldActivate) {
        await aiConfigApi.activate(created.id)
      }
      queryClient.invalidateQueries({ queryKey: ['ai-configs'] })
      navigate('/settings/ai')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (body: UpdateAIConfigRequest) => aiConfigApi.update(paramId!, body),
    onSuccess: async () => {
      if (shouldActivate && !remote?.is_active) {
        await aiConfigApi.activate(paramId!)
      }
      queryClient.invalidateQueries({ queryKey: ['ai-configs'] })
      queryClient.invalidateQueries({ queryKey: ['ai-config', paramId] })
      navigate('/settings/ai')
    },
  })

  const isPending = createMutation.isPending || updateMutation.isPending
  const error     = createMutation.error || updateMutation.error

  function handleSave() {
    if (isNew) {
      createMutation.mutate({
        name:     name.trim(),
        provider,
        api_key:  isOllama ? undefined : (apiKey || undefined),
        model:    model || undefined,
        base_url: baseUrl || undefined,
      })
    } else {
      updateMutation.mutate({
        name:     name.trim(),
        provider,
        api_key:  isOllama ? undefined : (apiKeyTouched ? apiKey : undefined),
        model:    model || undefined,
        base_url: baseUrl || undefined,
      })
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 -ml-2"
          onClick={() => navigate('/settings/ai')}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-xl font-semibold">
            {isNew ? 'Add AI Config' : `Edit ${remote?.name ?? '…'}`}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isNew ? 'Configure a new AI provider.' : 'Update provider settings.'}
          </p>
        </div>
      </div>

      {/* Name */}
      <div className="space-y-1.5">
        <Label>Name</Label>
        <Input
          placeholder="My OpenAI config"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">A short label to identify this config.</p>
      </div>

      {/* Provider */}
      <div className="space-y-1.5">
        <Label>Provider</Label>
        <Select value={provider} onValueChange={(v) => setProvider(v as ProviderKey)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROVIDERS.map((p) => (
              <SelectItem key={p} value={p}>{PROVIDER_LABELS[p] ?? p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Set as active */}
      <div className="flex items-center justify-between rounded-md border p-3">
        <div>
          <p className="text-sm font-medium">Set as active</p>
          <p className="text-xs text-muted-foreground">Use this config in the AI chat assistant.</p>
        </div>
        <Switch checked={shouldActivate} onCheckedChange={setShouldActivate} />
      </div>

      {/* Model */}
      <div className="space-y-1.5">
        <Label>Model</Label>
        <Input
          placeholder={DEFAULT_MODELS[provider]}
          value={model}
          onChange={(e) => setModel(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Default: <code className="font-mono">{DEFAULT_MODELS[provider]}</code>
        </p>
      </div>

      {/* Base URL */}
      <div className="space-y-1.5">
        <Label>Base URL</Label>
        <Input
          placeholder={DEFAULT_BASE_URLS[provider]}
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Default: <code className="font-mono text-[11px]">{DEFAULT_BASE_URLS[provider]}</code>
        </p>
      </div>

      {/* API Key */}
      {!isOllama && (
        <div className="space-y-1.5">
          <Label>API Key</Label>
          <APIKeyInput
            isSet={apiKeyAlready}
            value={apiKey}
            touched={apiKeyTouched}
            onChange={setApiKey}
            onTouch={() => setTouched(true)}
            placeholder={
              provider === 'claude'  ? 'sk-ant-…' :
              provider === 'copilot' ? 'gho_…'    : 'sk-…'
            }
          />
          {apiKeyAlready && !apiKeyTouched && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              API key is already set. Click the field to replace it.
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <Button onClick={handleSave} disabled={isPending || !name.trim()}>
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
          ) : (
            <Save className="h-4 w-4 mr-1.5" />
          )}
          Save
        </Button>
        <Button variant="outline" onClick={() => navigate('/settings/ai')}>
          Cancel
        </Button>

        {error && (
          <span className="flex items-center gap-1 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {(error as Error).message}
          </span>
        )}
      </div>
    </div>
  )
}
