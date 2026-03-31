import { Input } from '@data-voyager/shared-ui/components/ui/input'
import { Label } from '@data-voyager/shared-ui/components/ui/label'
import { Switch } from '@data-voyager/shared-ui/components/ui/switch'
import type { DatasourceConfigProps } from '@data-voyager/sdk'

interface ClickHouseConfig {
  host: string
  port: number
  database: string
  username: string
  password: string
  secure: boolean
}

export function ClickHouseConfigForm({ config, onChange }: DatasourceConfigProps) {
  const cfg = config as Partial<ClickHouseConfig>

  const set = (key: keyof ClickHouseConfig, value: string | number | boolean) =>
    onChange({ ...cfg, [key]: value })

  return (
    <div className="flex flex-col gap-4 max-w-lg">
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
            placeholder="9000"
            value={cfg.port || ''}
            onChange={(e) => set('port', Number(e.target.value) || 9000)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Database</Label>
        <Input
          placeholder="default"
          value={cfg.database ?? ''}
          onChange={(e) => set('database', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Username</Label>
        <Input
          placeholder="default"
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

      <div className="flex items-center gap-3">
        <Switch
          checked={cfg.secure ?? false}
          onCheckedChange={(v) => set('secure', v)}
          id="secure"
        />
        <Label htmlFor="secure" className="cursor-pointer">
          Secure (TLS)
        </Label>
      </div>
    </div>
  )
}
