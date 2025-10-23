package datasource

import (
	"context"
	"time"

	"data-voyager/core/internal/models"
)

// Plugin represents a data source plugin
type Plugin interface {
	// GetType returns the data source type this plugin handles
	GetType() models.DataSourceType

	// GetName returns the plugin name
	GetName() string

	// Connect establishes a connection to the data source
	Connect(ctx context.Context, config models.ConnectionConfig) (Connection, error)

	// ValidateConfig validates the configuration for this plugin
	ValidateConfig(config interface{}) error

	// TestConnection tests if connection can be established
	TestConnection(ctx context.Context, config models.ConnectionConfig) (*models.ConnectionTestResult, error)
}

// Connection represents an active connection to a data source
type Connection interface {
	// Query executes a query and returns results
	Query(ctx context.Context, query string, params ...interface{}) (*QueryResult, error)

	// GetSchema returns the database schema information
	GetSchema(ctx context.Context) (*SchemaInfo, error)

	// GetTables returns list of tables/indices
	GetTables(ctx context.Context, database string) ([]TableInfo, error)

	// Close closes the connection
	Close() error

	// Ping checks if the connection is alive
	Ping(ctx context.Context) error

	// GetMetrics returns connection metrics
	GetMetrics() ConnectionMetrics
}

// QueryResult represents the result of a query execution
type QueryResult struct {
	Columns []ColumnInfo    `json:"columns"`
	Rows    [][]interface{} `json:"rows"`
	Stats   QueryStats      `json:"stats"`
}

// ColumnInfo represents information about a column
type ColumnInfo struct {
	Name     string `json:"name"`
	Type     string `json:"type"`
	Nullable bool   `json:"nullable"`
}

// QueryStats represents statistics about query execution
type QueryStats struct {
	ExecutionTime time.Duration `json:"execution_time"`
	RowsReturned  int64         `json:"rows_returned"`
	RowsAffected  int64         `json:"rows_affected"`
	BytesRead     int64         `json:"bytes_read"`
}

// SchemaInfo represents database schema information
type SchemaInfo struct {
	Databases []DatabaseInfo `json:"databases"`
}

// DatabaseInfo represents information about a database
type DatabaseInfo struct {
	Name        string      `json:"name"`
	Tables      []TableInfo `json:"tables"`
	Description string      `json:"description"`
}

// TableInfo represents information about a table
type TableInfo struct {
	Name        string       `json:"name"`
	Type        string       `json:"type"` // table, view, materialized_view, etc.
	Columns     []ColumnInfo `json:"columns"`
	RowCount    *int64       `json:"row_count,omitempty"`
	Size        *int64       `json:"size_bytes,omitempty"`
	Description string       `json:"description"`
}

// ConnectionMetrics represents metrics for a connection
type ConnectionMetrics struct {
	OpenConnections int           `json:"open_connections"`
	IdleConnections int           `json:"idle_connections"`
	ActiveQueries   int           `json:"active_queries"`
	TotalQueries    int64         `json:"total_queries"`
	AverageLatency  time.Duration `json:"average_latency"`
	LastActivity    time.Time     `json:"last_activity"`
}

// Registry manages data source plugins
type Registry struct {
	plugins map[models.DataSourceType]Plugin
}

// NewRegistry creates a new plugin registry
func NewRegistry() *Registry {
	return &Registry{
		plugins: make(map[models.DataSourceType]Plugin),
	}
}

// Register registers a plugin
func (r *Registry) Register(plugin Plugin) {
	r.plugins[plugin.GetType()] = plugin
}

// Get retrieves a plugin by type
func (r *Registry) Get(dsType models.DataSourceType) (Plugin, bool) {
	plugin, exists := r.plugins[dsType]
	return plugin, exists
}

// List returns all registered plugins
func (r *Registry) List() map[models.DataSourceType]Plugin {
	result := make(map[models.DataSourceType]Plugin)
	for k, v := range r.plugins {
		result[k] = v
	}
	return result
}

// GetSupportedTypes returns all supported data source types
func (r *Registry) GetSupportedTypes() []models.DataSourceType {
	types := make([]models.DataSourceType, 0, len(r.plugins))
	for dsType := range r.plugins {
		types = append(types, dsType)
	}
	return types
}
