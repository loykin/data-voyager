import type { DatasourceConfigProps } from '@data-voyager/sdk';

interface ClickHouseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  secure: boolean;
}

export function ClickHouseConfigForm({ config, onChange }: DatasourceConfigProps) {
  const cfg = config as Partial<ClickHouseConfig>;

  const handleChange = (key: keyof ClickHouseConfig, value: string | number | boolean) => {
    onChange({ ...cfg, [key]: value });
  };

  return (
    <div>
      <input
        placeholder="Host"
        value={cfg.host ?? ''}
        onChange={(e) => handleChange('host', e.target.value)}
      />
      <input
        type="number"
        placeholder="Port (9000)"
        value={cfg.port ?? 9000}
        onChange={(e) => handleChange('port', Number(e.target.value))}
      />
      <input
        placeholder="Database"
        value={cfg.database ?? ''}
        onChange={(e) => handleChange('database', e.target.value)}
      />
      <input
        placeholder="Username"
        value={cfg.username ?? ''}
        onChange={(e) => handleChange('username', e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={cfg.password ?? ''}
        onChange={(e) => handleChange('password', e.target.value)}
      />
      <label>
        <input
          type="checkbox"
          checked={cfg.secure ?? false}
          onChange={(e) => handleChange('secure', e.target.checked)}
        />
        Secure (TLS)
      </label>
    </div>
  );
}
