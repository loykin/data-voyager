import {
  createDatasourceManager,
  defineDatasourcePlugin,
  type BatchQueryResult,
  type DataQuery,
  type DatasourceContext,
  type DatasourceFrame,
  type DatasourceInstance,
  type DatasourceListOptions,
  type DatasourceListResult,
  type DatasourceManagerBackend,
  type DatasourceTypeInfo,
  type QueryResult,
} from '@loykin/datasourcekit'
import { datasourceRegistry } from '@data-voyager/sdk'
import { apiClient } from '@/generated/api/client'
import type { components } from '@/generated/api/schema.d.ts'

type BackendDatasource = components['schemas']['Datasource']
type BackendCreateDatasourceRequest = components['schemas']['CreateDatasourceRequest']
type BackendUpdateDatasourceRequest = components['schemas']['UpdateDatasourceRequest']
type QueryRequest = components['schemas']['QueryRequest']
type QueryResponse = components['schemas']['QueryResponse']
type BatchQueryResponse = components['schemas']['BatchQueryResponse']
type ApiDataFrame = components['schemas']['DataFrame']
type DatasourceTestResult = components['schemas']['DatasourceTestResult']
type BackendDatasourceHistory = components['schemas']['DatasourceHistory']

type SqlQuery = {
  text: string
  limit?: number
}

function toDatasourceInstance(ds: BackendDatasource): DatasourceInstance<Record<string, unknown>> {
  return {
    uid: ds.uid,
    type: ds.type,
    name: ds.name,
    options: ds.options,
    enabled: ds.enabled,
    createdAt: ds.createdAt,
    updatedAt: ds.updatedAt,
    meta: ds.meta,
  }
}

export function datasourceDescription(ds: DatasourceInstance): string | undefined {
  return typeof ds.meta?.description === 'string' ? ds.meta.description : undefined
}

export function datasourceTags(ds: DatasourceInstance): string[] {
  return Array.isArray(ds.meta?.tags) ? ds.meta.tags.filter((tag): tag is string => typeof tag === 'string') : []
}

export function datasourceCreatedBy(ds: DatasourceInstance): string | undefined {
  return typeof ds.meta?.createdBy === 'string' ? ds.meta.createdBy : undefined
}

function toCreateDatasource(input: Parameters<DatasourceManagerBackend['instances']['create']>[0]): BackendCreateDatasourceRequest {
  return {
    name: input.name,
    type: input.type,
    options: (input.options ?? {}) as Record<string, unknown>,
    meta: input.meta,
  }
}

function toUpdateDatasource(input: Parameters<DatasourceManagerBackend['instances']['update']>[1]): BackendUpdateDatasourceRequest {
  return {
    name: input.name,
    options: input.options as Record<string, unknown> | undefined,
    meta: input.meta,
    enabled: input.enabled,
  }
}

function toQueryRequest(request: DataQuery, context?: DatasourceContext): QueryRequest {
  const query = request.query as SqlQuery | string | undefined
  const text = typeof query === 'string' ? query : query?.text
  return {
    query: text ?? '',
    variables: context?.variables as Record<string, unknown> | undefined,
    time_range: context?.timeRange,
    limit: typeof query === 'object' && query.limit !== undefined ? query.limit : 10000,
  }
}

function toDatasourceFrame(frame: ApiDataFrame): DatasourceFrame {
  return {
    ...(frame.name !== undefined ? { name: frame.name } : {}),
    frameType: frame.frameType,
    fields: frame.fields.map((field) => ({
      name: field.name,
      kind: field.kind,
      ...(field.type !== undefined ? { type: field.type } : {}),
      ...(field.labels !== undefined ? { labels: field.labels } : {}),
      values: field.values,
    })),
  }
}

function toQueryResult(response: QueryResponse, requestId?: string): QueryResult {
  return {
    frames: response.data.frames.map(toDatasourceFrame),
    ...(response.stats
      ? {
          stats: {
            executionTimeMs: response.stats.executionTimeMs,
            rowsReturned: response.stats.rowsReturned,
            ...(response.stats.bytesRead !== undefined ? { bytesRead: response.stats.bytesRead } : {}),
          },
        }
      : {}),
    ...(response.inspect
      ? {
          inspect: {
            rawQuery: response.inspect.rawQuery,
            executedQuery: response.inspect.executedQuery,
            meta: response.inspect.variables ? { variables: response.inspect.variables } : undefined,
          },
        }
      : {}),
    ...(requestId !== undefined ? { requestId } : {}),
  }
}

function toBatchQueryResult(response: BatchQueryResponse): BatchQueryResult {
  return {
    items: response.results.map((item) => {
      if (item.error) return { id: item.id, error: new Error(item.error) }
      if (!item.data) return { id: item.id, error: new Error('Query returned no data') }
      return {
        id: item.id,
        data: toQueryResult({
          data: item.data,
          ...(item.stats !== undefined ? { stats: item.stats } : {}),
          ...(item.inspect !== undefined ? { inspect: item.inspect } : {}),
        }, item.id),
      }
    }),
  }
}

const backend: DatasourceManagerBackend = {
  types: {
    async list(): Promise<DatasourceTypeInfo[]> {
      const { data, error } = await apiClient.GET('/datasource-types')
      if (error) throw new Error((error as { error?: string }).error ?? 'Failed to fetch datasource types')
      return data.data.map((type) => ({ type, name: type, installed: true, enabled: true }))
    },
    async get(type): Promise<DatasourceTypeInfo> {
      return { type, name: type, installed: true, enabled: true }
    },
  },
  instances: {
    async list(options?: DatasourceListOptions): Promise<DatasourceListResult> {
      const type = Array.isArray(options?.filter?.type) ? options.filter.type[0] : options?.filter?.type
      const { data, error } = await apiClient.GET('/datasources', {
        params: { query: type ? { type } : undefined },
      })
      if (error) throw new Error((error as { error?: string }).error ?? 'Failed to fetch datasources')
      let items = data.data.map(toDatasourceInstance)
      if (options?.filter?.enabled !== undefined) {
        items = items.filter((item) => (item.enabled ?? true) === options.filter?.enabled)
      }
      if (options?.filter?.search) {
        const q = options.filter.search.toLowerCase()
        items = items.filter((item) => item.name.toLowerCase().includes(q) || item.type.toLowerCase().includes(q))
      }
      return { items, total: items.length }
    },
    async get(uid): Promise<DatasourceInstance> {
      const { data, error } = await apiClient.GET('/datasources/{uid}', {
        params: { path: { uid } },
      })
      if (error) throw new Error((error as { error?: string }).error ?? 'Datasource not found')
      return toDatasourceInstance(data.data)
    },
    async create(input): Promise<DatasourceInstance> {
      const { data, error } = await apiClient.POST('/datasources', { body: toCreateDatasource(input) })
      if (error) throw new Error((error as { error?: string }).error ?? 'Failed to create datasource')
      return toDatasourceInstance(data.data)
    },
    async update(uid, patch): Promise<DatasourceInstance> {
      const { data, error } = await apiClient.PUT('/datasources/{uid}', {
        params: { path: { uid } },
        body: toUpdateDatasource(patch),
      })
      if (error) throw new Error((error as { error?: string }).error ?? 'Failed to update datasource')
      return toDatasourceInstance(data.data)
    },
    async delete(uid): Promise<void> {
      const { error } = await apiClient.DELETE('/datasources/{uid}', {
        params: { path: { uid } },
      })
      if (error) throw new Error((error as { error?: string }).error ?? 'Failed to delete datasource')
    },
  },
  async query(request, context): Promise<QueryResult> {
    const { data, error } = await apiClient.POST('/datasources/{uid}/query', {
      params: { path: { uid: request.datasourceUid } },
      body: toQueryRequest(request, context),
    })
    if (error) throw new Error((error as { error?: string }).error ?? 'Query failed')
    return toQueryResult(data, request.id)
  },
  async batchQuery(requests, context): Promise<BatchQueryResult> {
    if (requests.length === 0) return { items: [] }
    const datasourceUid = requests[0].datasourceUid
    const { data, error } = await apiClient.POST('/datasources/{uid}/query/batch', {
      params: { path: { uid: datasourceUid } },
      body: {
        queries: requests.map((request) => ({
          id: request.id,
          request: toQueryRequest(request, context),
        })),
      },
    })
    if (error) throw new Error((error as { error?: string }).error ?? 'Batch query failed')
    return toBatchQueryResult(data)
  },
  async healthCheck(uid): Promise<{ ok: boolean; message?: string; details?: Record<string, unknown> }> {
    const { data, error } = await apiClient.POST('/datasources/{uid}/test', {
      params: { path: { uid } },
    })
    if (error) throw new Error((error as { error?: string }).error ?? 'Datasource health check failed')
    return {
      ok: data.data.ok,
      message: data.data.message,
      details: {
        latencyMs: data.data.latencyMs,
        testedAt: data.data.testedAt,
      },
    }
  },
}

export function createAppDatasourceManager() {
  return createDatasourceManager({
    plugins: datasourceRegistry.getAll().map((plugin) =>
      defineDatasourcePlugin({
        type: plugin.id,
        name: plugin.name,
        description: plugin.description,
      }),
    ),
    backend,
  })
}

let singleton: ReturnType<typeof createAppDatasourceManager> | null = null

export function getDatasourceManager() {
  singleton ??= createAppDatasourceManager()
  return singleton
}

export async function testDatasourceOptions(
  type: string,
  options: Record<string, unknown>,
): Promise<DatasourceTestResult> {
  const { data, error, response } = await apiClient.POST('/datasources/test', {
    body: { type, options },
  })
  if (error) {
    const msg = (error as { error?: string }).error
      ?? `Server error (${response?.status ?? 'unknown'})`
    throw new Error(msg)
  }
  return data.data
}

export async function listDatasourceHistory(limit = 50, offset = 0): Promise<BackendDatasourceHistory[]> {
  const { data, error } = await apiClient.GET('/datasources/history', {
    params: { query: { limit, offset } },
  })
  if (error) throw new Error((error as { error?: string }).error ?? 'Failed to fetch datasource history')
  return data.data
}
