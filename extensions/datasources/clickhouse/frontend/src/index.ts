import type { DatasourcePlugin } from '@data-voyager/sdk';
import { datasourceRegistry } from '@data-voyager/sdk';
import { ClickHouseConfigForm } from './ConfigForm';
import { ClickHouseQueryEditor } from './QueryEditorWidget';

const plugin: DatasourcePlugin = {
  id: 'clickhouse',
  name: 'ClickHouse',
  description: 'Connect to ClickHouse databases',
  configComponent: ClickHouseConfigForm,
  queryEditorComponent: ClickHouseQueryEditor,
};

datasourceRegistry.register(plugin);

export { plugin };
