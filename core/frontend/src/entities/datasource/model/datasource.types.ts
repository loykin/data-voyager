import type { components } from '@/generated/api/schema.d.ts'

// Generated API types (single source of truth from openapi.yaml)
export type Connection = components['schemas']['Connection']
export type CreateConnectionRequest = components['schemas']['CreateConnectionRequest']
export type UpdateConnectionRequest = components['schemas']['UpdateConnectionRequest']
export type ConnectionTestResult = components['schemas']['ConnectionTestResult']
export type TestConnectionRequest = components['schemas']['TestConnectionRequest']
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
export type BatchQueryResultItem = components['schemas']['BatchQueryResultItem']

// App alias for convenience
export type DataSource = Connection

// Config is a free-form object — typed per extension
export type ConnectionConfig = Record<string, unknown>
