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

// DatasourcePlugin — 새 데이터소스 타입을 추가하는 extension
export interface DatasourcePlugin {
  id: string;
  name: string;
  description?: string;
  configComponent: React.ComponentType<DatasourceConfigProps>;
  queryEditorComponent?: React.ComponentType<QueryEditorProps>;
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
