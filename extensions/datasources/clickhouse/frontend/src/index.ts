import type { DatasourcePlugin } from '@data-voyager/sdk';
import { datasourceRegistry } from '@data-voyager/sdk';
import { ClickHouseConfigForm } from './ConfigForm';
import { ClickHouseQueryEditor } from './QueryEditorWidget';
import { clickhouseSchemaProvider } from './schemaProvider';

const plugin: DatasourcePlugin = {
  id: 'clickhouse',
  name: 'ClickHouse',
  description: 'Connect to ClickHouse databases',
  configComponent: ClickHouseConfigForm,
  queryEditorComponent: ClickHouseQueryEditor,
  schemaProvider: clickhouseSchemaProvider,
};

datasourceRegistry.register(plugin);

export { plugin };
