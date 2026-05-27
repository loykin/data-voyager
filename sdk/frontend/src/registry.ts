import type { PagePlugin, PanelPlugin, DatasourcePlugin, DashboardPanelPlugin } from './extension';

// Registry — sdk에서 유일하게 허용되는 구현체 (순수 자료구조)
export class Registry<T extends { id: string }> {
  private readonly plugins = new Map<string, T>();

  register(plugin: T): void {
    if (this.plugins.has(plugin.id)) {
      console.warn(`[Registry] Plugin "${plugin.id}" is already registered. Overwriting.`);
    }
    this.plugins.set(plugin.id, plugin);
  }

  get(id: string): T | undefined {
    return this.plugins.get(id);
  }

  getAll(): T[] {
    return Array.from(this.plugins.values());
  }

  has(id: string): boolean {
    return this.plugins.has(id);
  }
}

export const panelRegistry = new Registry<PanelPlugin>();
export const dashboardPanelRegistry = new Registry<DashboardPanelPlugin>();
export const pageRegistry = new Registry<PagePlugin>();
export const datasourceRegistry = new Registry<DatasourcePlugin>();
