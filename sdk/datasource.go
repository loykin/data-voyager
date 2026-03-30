package sdk

import (
	"context"
	"encoding/json"
	"time"
)

// DataSourceType identifies a datasource driver.
type DataSourceType string

// ConnectionConfig is implemented by each driver's config struct.
type ConnectionConfig interface {
	Validate() error
	GetConnectionString() string
}

// ConnectionTestResult is returned by DatasourcePlugin.TestConnection.
type ConnectionTestResult struct {
	IsConnected bool      `json:"is_connected"`
	Message     string    `json:"message"`
	Latency     int64     `json:"latency_ms"`
	TestedAt    time.Time `json:"tested_at"`
}

// DatasourcePlugin is the interface every datasource extension must implement.
type DatasourcePlugin interface {
	// GetType returns the datasource type string this driver handles.
	GetType() DataSourceType

	// GetName returns a human-readable name for the driver.
	GetName() string

	// ParseConfig deserializes raw JSON config into the driver's config struct.
	// This removes the need for switch statements in core.
	ParseConfig(data json.RawMessage) (ConnectionConfig, error)

	// Connect opens a connection using the provided config.
	Connect(ctx context.Context, config ConnectionConfig) (Connection, error)

	// ValidateConfig validates the configuration without connecting.
	ValidateConfig(config any) error

	// TestConnection opens a temporary connection and verifies it works.
	TestConnection(ctx context.Context, config ConnectionConfig) (*ConnectionTestResult, error)
}

// Connection is an active connection returned by DatasourcePlugin.Connect.
type Connection interface {
	Query(ctx context.Context, query string, params ...any) (*QueryResult, error)
	GetSchema(ctx context.Context) (*SchemaInfo, error)
	GetTables(ctx context.Context, database string) ([]TableInfo, error)
	Close() error
	Ping(ctx context.Context) error
	GetMetrics() ConnectionMetrics
}

// QueryResult holds the output of a datasource query.
type QueryResult struct {
	Columns []ColumnInfo `json:"columns"`
	Rows    [][]any      `json:"rows"`
	Stats   QueryStats   `json:"stats"`
}

// ColumnInfo describes a single column in a QueryResult.
type ColumnInfo struct {
	Name     string `json:"name"`
	Type     string `json:"type"`
	Nullable bool   `json:"nullable"`
}

// QueryStats holds execution metrics.
type QueryStats struct {
	ExecutionTime time.Duration `json:"execution_time"`
	RowsReturned  int64         `json:"rows_returned"`
	RowsAffected  int64         `json:"rows_affected"`
	BytesRead     int64         `json:"bytes_read"`
}

// SchemaInfo describes a datasource's full schema tree.
type SchemaInfo struct {
	Databases []DatabaseInfo `json:"databases"`
}

// DatabaseInfo describes one database or schema.
type DatabaseInfo struct {
	Name        string      `json:"name"`
	Tables      []TableInfo `json:"tables"`
	Description string      `json:"description"`
}

// TableInfo describes one table or view.
type TableInfo struct {
	Name        string       `json:"name"`
	Type        string       `json:"type"`
	Columns     []ColumnInfo `json:"columns"`
	RowCount    *int64       `json:"row_count,omitempty"`
	Size        *int64       `json:"size_bytes,omitempty"`
	Description string       `json:"description"`
}

// ConnectionMetrics holds runtime metrics for an active connection.
type ConnectionMetrics struct {
	OpenConnections int           `json:"open_connections"`
	IdleConnections int           `json:"idle_connections"`
	ActiveQueries   int           `json:"active_queries"`
	TotalQueries    int64         `json:"total_queries"`
	AverageLatency  time.Duration `json:"average_latency"`
	LastActivity    time.Time     `json:"last_activity"`
}

// datasourcePlugins holds all drivers registered via RegisterDatasource.
var datasourcePlugins []DatasourcePlugin

// RegisterDatasource is called by extension init() functions to self-register.
// Core reads these via GetDatasourcePlugins() at startup.
func RegisterDatasource(p DatasourcePlugin) {
	datasourcePlugins = append(datasourcePlugins, p)
}

// GetDatasourcePlugins returns all registered datasource drivers.
func GetDatasourcePlugins() []DatasourcePlugin {
	return datasourcePlugins
}
