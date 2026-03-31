import type { components } from '@/generated/api/schema.d.ts'

// Generated API types (single source of truth from openapi.yaml)
export type Connection = components['schemas']['Connection']
export type CreateConnectionRequest = components['schemas']['CreateConnectionRequest']
export type UpdateConnectionRequest = components['schemas']['UpdateConnectionRequest']
export type ConnectionTestResult = components['schemas']['ConnectionTestResult']
export type TestConnectionRequest = components['schemas']['TestConnectionRequest']

// App alias for convenience
export type DataSource = Connection

// Config is a free-form object — typed per extension
export type ConnectionConfig = Record<string, unknown>
