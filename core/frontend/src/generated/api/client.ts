/**
 * Type-safe API client generated from shared/openapi/openapi.yaml.
 * Do not manually edit — run `make generate-api` to regenerate.
 */
import createClient from 'openapi-fetch'
import type { paths } from './schema.d.ts'

export const apiClient = createClient<paths>({ baseUrl: '/api/v1' })

// Re-export component types for convenience
export type { components, operations } from './schema.d.ts'
export type Datasource = import('./schema.d.ts').components['schemas']['Datasource']
export type CreateDatasourceRequest = import('./schema.d.ts').components['schemas']['CreateDatasourceRequest']
export type UpdateDatasourceRequest = import('./schema.d.ts').components['schemas']['UpdateDatasourceRequest']
export type DatasourceTestResult = import('./schema.d.ts').components['schemas']['DatasourceTestResult']
export type DatasourceStats = import('./schema.d.ts').components['schemas']['DatasourceStats']
export type QueryRequest = import('./schema.d.ts').components['schemas']['QueryRequest']
export type QueryResult = import('./schema.d.ts').components['schemas']['QueryResult']
export type ErrorResponse = import('./schema.d.ts').components['schemas']['ErrorResponse']
export type AIConfig = import('./schema.d.ts').components['schemas']['AIConfig']
export type CreateAIConfigRequest = import('./schema.d.ts').components['schemas']['CreateAIConfigRequest']
export type UpdateAIConfigRequest = import('./schema.d.ts').components['schemas']['UpdateAIConfigRequest']
