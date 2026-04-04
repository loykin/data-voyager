import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@data-voyager/shared-ui/components/ui/card'
import { Button } from '@data-voyager/shared-ui/components/ui/button'
import { Input } from '@data-voyager/shared-ui/components/ui/input'
import { Label } from '@data-voyager/shared-ui/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@data-voyager/shared-ui/components/ui/select'
import { Switch } from '@data-voyager/shared-ui/components/ui/switch'
import { settingsApi } from '@/entities/settings'
import type { UpdateAISettingsRequest } from '@/entities/settings'

// ── Provider field types ───────────────────────────────────────────────────────
type Provider = 'claude' | 'openai' | 'copilot' | 'ollama'

type ProviderFields = {
  apiKey: string
  apiKeyTouched: boolean
  model: string
  baseUrl: string
}

type FormState = {
  enabled: boolean
  provider: Provider
  claude: ProviderFields
  openai: ProviderFields
  copilot: ProviderFields
  ollama: { model: string; baseUrl: string }
}

function emptyProvider(): ProviderFields {
  return { apiKey: '', apiKeyTouched: false, model: '', baseUrl: '' }
}

// ── API key input with masking UX ─────────────────────────────────────────────
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
        type="password"
        placeholder={isSet && !touched ? '••••••••' : placeholder ?? 'sk-…'}
        value={value}
        onFocus={() => {
          if (!touched) onTouch()
        }}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="new-password"
      />
      {isSet && !touched && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          set
        </span>
      )}
    </div>
  )
}

// ── Provider forms ─────────────────────────────────────────────────────────────
function ClaudeForm({
  fields,
  apiKeySet,
  onChange,
}: {
  fields: ProviderFields
  apiKeySet: boolean
  onChange: (f: Partial<ProviderFields>) => void
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>API Key</Label>
        <APIKeyInput
          isSet={apiKeySet}
          value={fields.apiKey}
          touched={fields.apiKeyTouched}
          onChange={(v) => onChange({ apiKey: v })}
          onTouch={() => onChange({ apiKeyTouched: true })}
          placeholder="sk-ant-…"
        />
      </div>
      <div className="space-y-1">
        <Label>Model</Label>
        <Input
          placeholder="claude-opus-4-5"
          value={fields.model}
          onChange={(e) => onChange({ model: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label>Base URL <span className="text-muted-foreground">(optional)</span></Label>
        <Input
          placeholder="https://api.anthropic.com"
          value={fields.baseUrl}
          onChange={(e) => onChange({ baseUrl: e.target.value })}
        />
      </div>
    </div>
  )
}

function OpenAIForm({
  fields,
  apiKeySet,
  onChange,
  providerLabel,
  placeholder,
}: {
  fields: ProviderFields
  apiKeySet: boolean
  onChange: (f: Partial<ProviderFields>) => void
  providerLabel?: string
  placeholder?: string
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>API Key</Label>
        <APIKeyInput
          isSet={apiKeySet}
          value={fields.apiKey}
          touched={fields.apiKeyTouched}
          onChange={(v) => onChange({ apiKey: v })}
          onTouch={() => onChange({ apiKeyTouched: true })}
          placeholder={placeholder ?? 'sk-…'}
        />
      </div>
      <div className="space-y-1">
        <Label>Model</Label>
        <Input
          placeholder={providerLabel === 'Copilot' ? 'gpt-4o' : 'gpt-4o'}
          value={fields.model}
          onChange={(e) => onChange({ model: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label>Base URL <span className="text-muted-foreground">(optional)</span></Label>
        <Input
          placeholder={
            providerLabel === 'Copilot'
              ? 'https://api.githubcopilot.com'
              : 'https://api.openai.com/v1'
          }
          value={fields.baseUrl}
          onChange={(e) => onChange({ baseUrl: e.target.value })}
        />
      </div>
    </div>
  )
}

function OllamaForm({
  model,
  baseUrl,
  onChange,
}: {
  model: string
  baseUrl: string
  onChange: (f: { model?: string; baseUrl?: string }) => void
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>Model</Label>
        <Input
          placeholder="qwen2.5-coder:7b"
          value={model}
          onChange={(e) => onChange({ model: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label>Base URL</Label>
        <Input
          placeholder="http://localhost:11434/v1"
          value={baseUrl}
          onChange={(e) => onChange({ baseUrl: e.target.value })}
        />
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export function SettingsPage() {
  const queryClient = useQueryClient()
  const [saveSuccess, setSaveSuccess] = useState(false)

  const { data: remote, isLoading, error: loadError } = useQuery({
    queryKey: ['ai-settings'],
    queryFn: () => settingsApi.getAI(),
  })

  const [form, setForm] = useState<FormState>(() => ({
    enabled: false,
    provider: 'claude',
    claude: emptyProvider(),
    openai: emptyProvider(),
    copilot: emptyProvider(),
    ollama: { model: '', baseUrl: '' },
  }))

  // Sync form once remote data arrives (only on first load)
  const [synced, setSynced] = useState(false)
  if (remote && !synced) {
    setSynced(true)
    setForm({
      enabled: remote.enabled ?? false,
      provider: (remote.provider ?? 'claude') as Provider,
      claude: {
        apiKey: '',
        apiKeyTouched: false,
        model: remote.claude?.model ?? '',
        baseUrl: remote.claude?.base_url ?? '',
      },
      openai: {
        apiKey: '',
        apiKeyTouched: false,
        model: remote.openai?.model ?? '',
        baseUrl: remote.openai?.base_url ?? '',
      },
      copilot: {
        apiKey: '',
        apiKeyTouched: false,
        model: remote.copilot?.model ?? '',
        baseUrl: remote.copilot?.base_url ?? '',
      },
      ollama: {
        model: remote.ollama?.model ?? '',
        baseUrl: remote.ollama?.base_url ?? '',
      },
    })
  }

  const mutation = useMutation({
    mutationFn: (body: UpdateAISettingsRequest) => settingsApi.updateAI(body),
    onSuccess: () => {
      setSaveSuccess(true)
      setSynced(false) // re-sync on next load
      queryClient.invalidateQueries({ queryKey: ['ai-settings'] })
      setTimeout(() => setSaveSuccess(false), 3000)
    },
  })

  function handleSave() {
    const body: UpdateAISettingsRequest = {
      enabled: form.enabled,
      provider: form.provider,
      claude: {
        api_key: form.claude.apiKeyTouched ? form.claude.apiKey : '',
        model: form.claude.model || undefined,
        base_url: form.claude.baseUrl || undefined,
      },
      openai: {
        api_key: form.openai.apiKeyTouched ? form.openai.apiKey : '',
        model: form.openai.model || undefined,
        base_url: form.openai.baseUrl || undefined,
      },
      copilot: {
        api_key: form.copilot.apiKeyTouched ? form.copilot.apiKey : '',
        model: form.copilot.model || undefined,
        base_url: form.copilot.baseUrl || undefined,
      },
      ollama: {
        model: form.ollama.model || undefined,
        base_url: form.ollama.baseUrl || undefined,
      },
    }
    mutation.mutate(body)
  }

  function patchProvider<K extends 'claude' | 'openai' | 'copilot'>(
    key: K,
    patch: Partial<ProviderFields>
  ) {
    setForm((f) => ({ ...f, [key]: { ...f[key], ...patch } }))
  }

  const apiKeySet = {
    claude: remote?.claude?.api_key_set ?? false,
    openai: remote?.openai?.api_key_set ?? false,
    copilot: remote?.copilot?.api_key_set ?? false,
  }

  return (
    <div className="container max-w-2xl py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure AI and other application settings.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>AI Assistant</CardTitle>
          <CardDescription>
            Configure the AI provider used for the chat assistant in Discover.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading settings…
            </div>
          )}

          {loadError && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {(loadError as Error).message}
            </div>
          )}

          {!isLoading && (
            <>
              {/* Enable toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Enable AI Assistant</Label>
                  <p className="text-xs text-muted-foreground">
                    Show the AI chat panel in Discover.
                  </p>
                </div>
                <Switch
                  checked={form.enabled}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, enabled: v }))}
                />
              </div>

              <div className="border-t" />

              {/* Provider select */}
              <div className="space-y-1">
                <Label>Provider</Label>
                <Select
                  value={form.provider}
                  onValueChange={(v) => setForm((f) => ({ ...f, provider: v as Provider }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="claude">Claude (Anthropic)</SelectItem>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="copilot">GitHub Copilot</SelectItem>
                    <SelectItem value="ollama">Ollama (local)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Provider-specific form */}
              {form.provider === 'claude' && (
                <ClaudeForm
                  fields={form.claude}
                  apiKeySet={apiKeySet.claude}
                  onChange={(p) => patchProvider('claude', p)}
                />
              )}
              {form.provider === 'openai' && (
                <OpenAIForm
                  fields={form.openai}
                  apiKeySet={apiKeySet.openai}
                  onChange={(p) => patchProvider('openai', p)}
                />
              )}
              {form.provider === 'copilot' && (
                <OpenAIForm
                  fields={form.copilot}
                  apiKeySet={apiKeySet.copilot}
                  onChange={(p) => patchProvider('copilot', p)}
                  providerLabel="Copilot"
                  placeholder="gho_…"
                />
              )}
              {form.provider === 'ollama' && (
                <OllamaForm
                  model={form.ollama.model}
                  baseUrl={form.ollama.baseUrl}
                  onChange={(p) => setForm((f) => ({ ...f, ollama: { ...f.ollama, ...p } }))}
                />
              )}

              <div className="border-t" />

              {/* Save bar */}
              <div className="flex items-center gap-3">
                <Button onClick={handleSave} disabled={mutation.isPending}>
                  {mutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save
                </Button>

                {saveSuccess && (
                  <span className="flex items-center gap-1 text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Saved
                  </span>
                )}

                {mutation.isError && (
                  <span className="flex items-center gap-1 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {(mutation.error as Error).message}
                  </span>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
