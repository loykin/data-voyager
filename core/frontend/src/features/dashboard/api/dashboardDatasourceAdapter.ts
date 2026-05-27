import type {
  DashboardDatasourceAdapter,
  DashboardDatasourceContext,
  DatasourceValidationResult,
  DataRequestConfig,
} from '@loykin/dashboardkit'
import type { DataQuery, DatasourceContext, DatasourceManager } from '@loykin/datasourcekit'
import { getDatasourceManager } from '@/features/datasource/api/datasource.manager'

function toDatasourceContext(context: DashboardDatasourceContext): DatasourceContext {
  return {
    ...(context.timeRange !== undefined ? { timeRange: context.timeRange } : {}),
    variables: context.variables,
    ...(context.authContext !== undefined ? { authContext: context.authContext } : {}),
    ...(context.signal !== undefined ? { signal: context.signal } : {}),
  }
}

function toDataQuery(request: DataRequestConfig): DataQuery {
  return {
    id: request.id,
    datasourceUid: request.uid,
    datasourceType: request.type,
    ...(request.query !== undefined ? { query: request.query } : {}),
    ...(request.options !== undefined ? { options: request.options } : {}),
  }
}

export function createDashboardDatasourceAdapter(
  manager: DatasourceManager = getDatasourceManager(),
): DashboardDatasourceAdapter {
  return {
    async query(request, context) {
      return manager.instances.query(toDataQuery(request), toDatasourceContext(context))
    },
    async healthCheck(uid, context) {
      const instance = await manager.instances.get(uid, toDatasourceContext(context))
      return manager.instances.healthCheck(uid, instance.type, toDatasourceContext(context))
    },
    async validateQuery(uid, query, context) {
      const instance = await manager.instances.get(uid, toDatasourceContext(context))
      const result = await manager.instances.validateQuery(uid, instance.type, query, toDatasourceContext(context))
      return {
        valid: result.valid,
        ...(result.errors !== undefined
          ? { errors: result.errors.map((message) => ({ message })) }
          : {}),
      } satisfies DatasourceValidationResult
    },
    async listNamespaces(uid, context) {
      const instance = await manager.instances.get(uid, toDatasourceContext(context))
      return manager.instances.listNamespaces(uid, instance.type, toDatasourceContext(context))
    },
    async listFields(uid, request, context) {
      const instance = await manager.instances.get(uid, toDatasourceContext(context))
      return manager.instances.listFields(uid, instance.type, request, toDatasourceContext(context))
    },
  }
}
