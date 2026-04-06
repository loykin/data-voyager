import type React from 'react';
import type { ApiClient } from './api';
import type { AuthContext } from './auth';
import type { AlertContext } from './alert';

// PluginContext — core가 런타임에 extension에게 주입하는 서비스들
// extension은 core 패키지를 직접 import하지 않고 이 타입만 사용
export interface PluginContext {
  api: ApiClient;
  auth: AuthContext;
  alert: AlertContext;
  navigate: (path: string) => void;
}

// PagePlugin — 사이드바에 새 페이지를 추가하는 extension
export interface PagePlugin {
  id: string;
  path: string;
  label: string;
  icon?: string;
  component: React.ComponentType<{ ctx: PluginContext }>;
}

// PanelPlugin — Dashboard에 새 패널 타입을 추가하는 extension
export interface PanelPlugin {
  id: string;
  name: string;
  description?: string;
  component: React.ComponentType<PanelProps>;
  configComponent?: React.ComponentType<PanelConfigProps>;
}

export interface PanelProps {
  ctx: PluginContext;
  data: QueryResult;
  options: Record<string, unknown>;
  width: number;
  height: number;
}

export interface PanelConfigProps {
  options: Record<string, unknown>;
  onChange: (options: Record<string, unknown>) => void;
}

// SchemaNodeType — 스키마 트리 노드의 종류
export type SchemaNodeType =
  | 'database'  // ClickHouse database, PostgreSQL catalog
  | 'schema'    // PostgreSQL schema (public, pg_catalog 등)
  | 'table'
  | 'view'
  | 'column'
  | 'index'     // Elasticsearch index 등
  | 'field';    // Elasticsearch field 등

// SchemaNode — 스키마 트리의 한 노드
export interface SchemaNode {
  /** 트리 내 고유 키 (예: 'schema/public/table/users/col/id') */
  id: string;
  /** 화면에 표시할 이름 */
  label: string;
  type: SchemaNodeType;
  /** false면 클릭해도 자식 fetch 안 함 */
  hasChildren: boolean;
  /** 툴팁/뱃지용 부가 정보 */
  meta?: {
    dataType?: string;
    nullable?: boolean;
    rowCount?: string;
    comment?: string;
  };
}

// SchemaProvider — 플러그인이 선택적으로 구현하는 스키마 탐색기 제공자
export interface SchemaProvider {
  /** 루트 노드 목록 반환 (DB마다 다름: schema / database / index) */
  getRootNodes(ctx: PluginContext, connectionId: string): Promise<SchemaNode[]>;
  /** 노드 클릭 시 자식 노드 lazy load */
  getChildNodes(ctx: PluginContext, connectionId: string, node: SchemaNode): Promise<SchemaNode[]>;
  /** 컬럼 노드를 클릭했을 때 에디터에 삽입할 텍스트 (방언별 따옴표 처리) */
  getInsertText?(node: SchemaNode): string;
}

// DatasourcePlugin — 새 데이터소스 타입을 추가하는 extension
export interface DatasourcePlugin {
  id: string;
  name: string;
  description?: string;
  configComponent: React.ComponentType<DatasourceConfigProps>;
  queryEditorComponent?: React.ComponentType<QueryEditorProps>;
  /** 없으면 core의 generic fallback SchemaProvider 사용 */
  schemaProvider?: SchemaProvider;
}

export interface DatasourceConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  onTest: () => Promise<void>;
}

export interface QueryEditorProps {
  ctx: PluginContext;
  query: string;
  onChange: (query: string) => void;
  onRun: () => void;
}

export interface QueryResult {
  columns: Array<{ name: string; type: string }>;
  rows: unknown[][];
}
