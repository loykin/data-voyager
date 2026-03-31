import { Input } from '@data-voyager/shared-ui/components/ui/input'
import { Label } from '@data-voyager/shared-ui/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@data-voyager/shared-ui/components/ui/select'
import type { DatasourceConfigProps } from '@data-voyager/sdk'

interface PostgreSQLConfig {
  host: string
  port: number
  database: string
  username: string
  password: string
  ssl_mode: string
}

const SSL_MODES = ['disable', 'allow', 'prefer', 'require', 'verify-ca', 'verify-full']

export function PostgreSQLConfigForm({ config, onChange }: DatasourceConfigProps) {
  const cfg = config as Partial<PostgreSQLConfig>

  const set = (key: keyof PostgreSQLConfig, value: string | number) =>
    onChange({ ...cfg, [key]: value })

  return (
    <div className="flex flex-col gap-4 max-w-lg">
      {/* host + port: 예외적으로 2열 — 포트는 짧고 host와 쌍이므로 */}
      <div className="grid grid-cols-[1fr_120px] gap-3">
        <div className="space-y-2">
          <Label>Host</Label>
          <Input
            placeholder="localhost"
            value={cfg.host ?? ''}
            onChange={(e) => set('host', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Port</Label>
          <Input
            placeholder="5432"
            value={cfg.port || ''}
            onChange={(e) => set('port', Number(e.target.value) || 5432)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Database</Label>
        <Input
          placeholder="postgres"
          value={cfg.database ?? ''}
          onChange={(e) => set('database', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Username</Label>
        <Input
          placeholder="postgres"
          value={cfg.username ?? ''}
          onChange={(e) => set('username', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Password</Label>
        <Input
          type="password"
          placeholder="••••••••"
          value={cfg.password ?? ''}
          onChange={(e) => set('password', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>SSL Mode</Label>
        <Select
          value={cfg.ssl_mode ?? 'disable'}
          onValueChange={(v) => v !== null && set('ssl_mode', v)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SSL_MODES.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
