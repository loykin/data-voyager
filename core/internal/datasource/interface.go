package datasource

import "data-voyager/sdk"

// Re-export sdk types so existing code in core can reference them
// via the shorter "datasource." prefix without changing call sites.
type (
	Plugin            = sdk.DatasourcePlugin
	Connection        = sdk.Connection
	QueryResult       = sdk.QueryResult
	ColumnInfo        = sdk.ColumnInfo
	QueryStats        = sdk.QueryStats
	SchemaInfo        = sdk.SchemaInfo
	DatabaseInfo      = sdk.DatabaseInfo
	TableInfo         = sdk.TableInfo
	ConnectionMetrics = sdk.ConnectionMetrics
)

// Registry manages registered datasource plugins within core.
type Registry struct {
	plugins map[sdk.DataSourceType]sdk.DatasourcePlugin
}

// NewRegistry creates an empty Registry.
func NewRegistry() *Registry {
	return &Registry{
		plugins: make(map[sdk.DataSourceType]sdk.DatasourcePlugin),
	}
}

// Register adds a plugin to the registry.
func (r *Registry) Register(plugin sdk.DatasourcePlugin) {
	r.plugins[plugin.GetType()] = plugin
}

// Get retrieves a plugin by datasource type.
func (r *Registry) Get(dsType sdk.DataSourceType) (sdk.DatasourcePlugin, bool) {
	plugin, exists := r.plugins[dsType]
	return plugin, exists
}

// List returns all registered plugins.
func (r *Registry) List() map[sdk.DataSourceType]sdk.DatasourcePlugin {
	result := make(map[sdk.DataSourceType]sdk.DatasourcePlugin, len(r.plugins))
	for k, v := range r.plugins {
		result[k] = v
	}
	return result
}

// GetSupportedTypes returns all registered datasource type identifiers.
func (r *Registry) GetSupportedTypes() []sdk.DataSourceType {
	types := make([]sdk.DataSourceType, 0, len(r.plugins))
	for dsType := range r.plugins {
		types = append(types, dsType)
	}
	return types
}
