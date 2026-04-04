package sdk

import (
	"context"
	"encoding/json"
	"strings"
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

// FieldKind is the semantic type of a Field, used for rendering decisions.
type FieldKind string

const (
	FieldKindTime    FieldKind = "time"
	FieldKindNumber  FieldKind = "number"
	FieldKindString  FieldKind = "string"
	FieldKindBoolean FieldKind = "boolean"
)

// FrameType hints how a DataFrame should be visualized.
type FrameType string

const (
	FrameTypeTable FrameType = "table"
	//FrameTypeTimeSeries FrameType = "time_series"
	//FrameTypeLogs       FrameType = "logs"
)

// Field is one column of a DataFrame, stored in column-oriented format.
type Field struct {
	Name   string            `json:"name"`
	Kind   FieldKind         `json:"kind"`
	Type   string            `json:"type,omitempty"`
	Labels map[string]string `json:"labels,omitempty"`
	Values []any             `json:"values"`
}

// DataFrame is a column-oriented data container returned by all datasources.
// SQL queries produce one DataFrame (FrameType="table").
// Prometheus range queries produce one DataFrame per time-series (FrameType="time_series").
type DataFrame struct {
	Name      string    `json:"name,omitempty"`
	FrameType FrameType `json:"frame_type"`
	Fields    []Field   `json:"fields"`
}

// QueryResult holds the normalized output of any datasource query.
type QueryResult struct {
	Frames []*DataFrame `json:"frames"`
	Stats  QueryStats   `json:"stats"`
}

// ColumnInfo describes a column for schema introspection (GetSchema/GetTables).
type ColumnInfo struct {
	Name     string `json:"name"`
	Type     string `json:"type"`
	Nullable bool   `json:"nullable"`
}

// InferFieldKind infers a semantic FieldKind from a native database type string.
// Handles ClickHouse types (UInt64, DateTime64, Nullable(X)) and
// PostgreSQL types (INT4, TIMESTAMPTZ, VARCHAR) and generic SQL types.
func InferFieldKind(dbType string) FieldKind {
	t := strings.ToUpper(strings.TrimSpace(dbType))
	// Strip Nullable wrapper: NULLABLE(DATETIME64(3)) → DATETIME64(3)
	if strings.HasPrefix(t, "NULLABLE(") && strings.HasSuffix(t, ")") {
		t = t[9 : len(t)-1]
	}
	// Strip precision/length suffix: VARCHAR(255) → VARCHAR, DECIMAL(10,2) → DECIMAL
	if idx := strings.IndexByte(t, '('); idx != -1 {
		t = t[:idx]
	}
	switch {
	case t == "BOOL" || t == "BOOLEAN":
		return FieldKindBoolean
	case strings.HasPrefix(t, "DATE") || strings.HasPrefix(t, "TIME") ||
		t == "TIMESTAMP" || t == "TIMESTAMPTZ":
		return FieldKindTime
	case strings.Contains(t, "INT") || strings.Contains(t, "FLOAT") ||
		strings.Contains(t, "DECIMAL") || t == "NUMERIC" || t == "DOUBLE" ||
		t == "REAL" || t == "MONEY" || t == "NUMBER":
		return FieldKindNumber
	}
	return FieldKindString
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
