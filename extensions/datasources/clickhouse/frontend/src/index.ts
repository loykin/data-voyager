import type { DatasourcePlugin } from '@data-voyager/sdk';
import { datasourceRegistry } from '@data-voyager/sdk';
import { ClickHouseConfigForm } from './ConfigForm';

const plugin: DatasourcePlugin = {
  id: 'clickhouse',
  name: 'ClickHouse',
  description: 'Connect to ClickHouse databases',
  configComponent: ClickHouseConfigForm,
};

datasourceRegistry.register(plugin);

export { plugin };
