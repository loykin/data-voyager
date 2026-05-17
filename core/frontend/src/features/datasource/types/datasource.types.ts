import type { components } from '@/generated/api/schema.d.ts'
import type { DatasourceInstance } from '@loykin/datasourcekit'

// Backend-generated types still used for query payloads and audit history.
export type DatasourceTestResult = components['schemas']['DatasourceTestResult']
export type QueryRequest = components['schemas']['QueryRequest']
export type QueryResponse = components['schemas']['QueryResponse']
export type QueryResult = components['schemas']['QueryResult']
export type QueryStats = components['schemas']['QueryStats']
export type QueryInspect = components['schemas']['QueryInspect']
export type TimeRange = components['schemas']['TimeRange']
export type DataFrame = components['schemas']['DataFrame']
export type DataField = components['schemas']['Field']
export type FieldKind = components['schemas']['FieldKind']
export type FrameType = components['schemas']['FrameType']
export type BatchQueryRequest = components['schemas']['BatchQueryRequest']
export type BatchQueryResponse = components['schemas']['BatchQueryResponse']
export type DatasourceHistory = components['schemas']['DatasourceHistory']

// App alias for convenience
export type DataSource = DatasourceInstance<Record<string, unknown>>

// Options are free-form and typed per extension.
export type DatasourceOptions = Record<string, unknown>
