import type { DatasourcePlugin } from '@data-voyager/sdk';
import { datasourceRegistry } from '@data-voyager/sdk';
import { PostgreSQLConfigForm } from './ConfigForm';
import { PostgreSQLQueryEditor } from './QueryEditorWidget';
import { postgresSchemaProvider } from './schemaProvider';

const plugin: DatasourcePlugin = {
  id: 'postgresql',
  name: 'PostgreSQL',
  description: 'Connect to PostgreSQL databases',
  configComponent: PostgreSQLConfigForm,
  queryEditorComponent: PostgreSQLQueryEditor,
  schemaProvider: postgresSchemaProvider,
};

datasourceRegistry.register(plugin);

export { plugin };
