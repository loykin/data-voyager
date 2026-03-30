import type { DatasourceConfigProps } from '@data-voyager/sdk';

interface PostgreSQLConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl_mode: string;
}

export function PostgreSQLConfigForm({ config, onChange }: DatasourceConfigProps) {
  const cfg = config as Partial<PostgreSQLConfig>;

  const handleChange = (key: keyof PostgreSQLConfig, value: string | number) => {
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
        placeholder="Port (5432)"
        value={cfg.port ?? 5432}
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
    </div>
  );
}
