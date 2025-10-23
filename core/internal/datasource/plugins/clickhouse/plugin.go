package clickhouse

import (
	"context"
	"fmt"
	"time"

	"data-voyager/core/internal/datasource"
	"data-voyager/core/internal/models"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

// Plugin represents the ClickHouse plugin
type Plugin struct{}

// NewPlugin creates a new ClickHouse plugin
func NewPlugin() *Plugin {
	return &Plugin{}
}

// GetType returns the data source type
func (p *Plugin) GetType() models.DataSourceType {
	return models.DataSourceTypeClickHouse
}

// GetName returns the plugin name
func (p *Plugin) GetName() string {
	return "ClickHouse Plugin"
}

// Connect establishes a connection to ClickHouse
func (p *Plugin) Connect(ctx context.Context, config models.ConnectionConfig) (datasource.Connection, error) {
	chConfig, ok := config.(*models.ClickHouseConfig)
	if !ok {
		return nil, fmt.Errorf("invalid config type for ClickHouse")
	}

	if err := chConfig.Validate(); err != nil {
		return nil, fmt.Errorf("invalid ClickHouse config: %w", err)
	}

	options := &clickhouse.Options{
		Addr: []string{fmt.Sprintf("%s:%d", chConfig.Host, chConfig.Port)},
		Auth: clickhouse.Auth{
			Database: chConfig.Database,
			Username: chConfig.Username,
			Password: chConfig.Password,
		},
		DialTimeout:      30 * time.Second,
		MaxOpenConns:     10,
		MaxIdleConns:     5,
		ConnMaxLifetime:  time.Hour,
		ConnOpenStrategy: clickhouse.ConnOpenInOrder,
	}

	if chConfig.Secure {
		options.Protocol = clickhouse.Native
		// TLS will be handled by the native protocol when secure=true
	}

	conn, err := clickhouse.Open(options)
	if err != nil {
		return nil, fmt.Errorf("failed to open ClickHouse connection: %w", err)
	}

	if err := conn.Ping(ctx); err != nil {
		_ = conn.Close()
		return nil, fmt.Errorf("failed to ping ClickHouse: %w", err)
	}

	return &Connection{
		conn:   conn,
		config: chConfig,
	}, nil
}

// ValidateConfig validates the ClickHouse configuration
func (p *Plugin) ValidateConfig(config interface{}) error {
	chConfig, ok := config.(*models.ClickHouseConfig)
	if !ok {
		return fmt.Errorf("config must be *models.ClickHouseConfig")
	}
	return chConfig.Validate()
}

// TestConnection tests the ClickHouse connection
func (p *Plugin) TestConnection(ctx context.Context, config models.ConnectionConfig) (*models.ConnectionTestResult, error) {
	start := time.Now()

	conn, err := p.Connect(ctx, config)
	if err != nil {
		return &models.ConnectionTestResult{
			IsConnected: false,
			Message:     err.Error(),
			TestedAt:    time.Now(),
		}, nil
	}
	defer func() { _ = conn.Close() }()

	// Test with a simple query
	if err := conn.Ping(ctx); err != nil {
		return &models.ConnectionTestResult{
			IsConnected: false,
			Message:     fmt.Sprintf("ping failed: %v", err),
			TestedAt:    time.Now(),
		}, nil
	}

	latency := time.Since(start).Milliseconds()

	return &models.ConnectionTestResult{
		IsConnected: true,
		Message:     "Connection successful",
		Latency:     latency,
		TestedAt:    time.Now(),
	}, nil
}

// Connection represents a ClickHouse connection
type Connection struct {
	conn   driver.Conn
	config *models.ClickHouseConfig
}

// Query executes a query and returns results
func (c *Connection) Query(ctx context.Context, query string, params ...interface{}) (*datasource.QueryResult, error) {
	start := time.Now()

	rows, err := c.conn.Query(ctx, query, params...)
	if err != nil {
		return nil, fmt.Errorf("query execution failed: %w", err)
	}
	defer func() { _ = rows.Close() }()

	// Get column information
	columnTypes := rows.ColumnTypes()
	columns := make([]datasource.ColumnInfo, len(columnTypes))
	for i, ct := range columnTypes {
		columns[i] = datasource.ColumnInfo{
			Name:     ct.Name(),
			Type:     ct.DatabaseTypeName(),
			Nullable: ct.Nullable(),
		}
	}

	// Read rows
	var resultRows [][]interface{}
	for rows.Next() {
		values := make([]interface{}, len(columnTypes))
		valuePtrs := make([]interface{}, len(columnTypes))
		for i := range values {
			valuePtrs[i] = &values[i]
		}

		if err := rows.Scan(valuePtrs...); err != nil {
			return nil, fmt.Errorf("failed to scan row: %w", err)
		}

		resultRows = append(resultRows, values)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows iteration error: %w", err)
	}

	executionTime := time.Since(start)

	return &datasource.QueryResult{
		Columns: columns,
		Rows:    resultRows,
		Stats: datasource.QueryStats{
			ExecutionTime: executionTime,
			RowsReturned:  int64(len(resultRows)),
		},
	}, nil
}

// GetSchema returns the database schema information
func (c *Connection) GetSchema(ctx context.Context) (*datasource.SchemaInfo, error) {
	// Get databases
	databases, err := c.getDatabases(ctx)
	if err != nil {
		return nil, err
	}

	schemaInfo := &datasource.SchemaInfo{
		Databases: databases,
	}

	return schemaInfo, nil
}

// GetTables returns list of tables
func (c *Connection) GetTables(ctx context.Context, database string) ([]datasource.TableInfo, error) {
	query := `
		SELECT
			name,
			engine as type,
			total_rows,
			total_bytes
		FROM system.tables
		WHERE database = ?
		ORDER BY name
	`

	result, err := c.Query(ctx, query, database)
	if err != nil {
		return nil, fmt.Errorf("failed to get tables: %w", err)
	}

	tables := make([]datasource.TableInfo, 0, len(result.Rows))
	for _, row := range result.Rows {
		name, _ := row[0].(string)
		tableType, _ := row[1].(string)

		var rowCount *int64
		var size *int64

		if rc, ok := row[2].(uint64); ok {
			count := int64(rc)
			rowCount = &count
		}

		if sz, ok := row[3].(uint64); ok {
			bytes := int64(sz)
			size = &bytes
		}

		tables = append(tables, datasource.TableInfo{
			Name:     name,
			Type:     tableType,
			RowCount: rowCount,
			Size:     size,
		})
	}

	return tables, nil
}

// Close closes the connection
func (c *Connection) Close() error {
	if c.conn != nil {
		return c.conn.Close()
	}
	return nil
}

// Ping checks if the connection is alive
func (c *Connection) Ping(ctx context.Context) error {
	return c.conn.Ping(ctx)
}

// GetMetrics returns connection metrics
func (c *Connection) GetMetrics() datasource.ConnectionMetrics {
	// ClickHouse driver doesn't expose detailed stats like sql.DB
	// Return placeholder values for now
	return datasource.ConnectionMetrics{
		OpenConnections: 1, // Placeholder
		IdleConnections: 0, // Placeholder
		TotalQueries:    0, // Placeholder
		LastActivity:    time.Now(),
	}
}

// getDatabases retrieves all databases
func (c *Connection) getDatabases(ctx context.Context) ([]datasource.DatabaseInfo, error) {
	query := "SELECT name FROM system.databases ORDER BY name"

	result, err := c.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to get databases: %w", err)
	}

	databases := make([]datasource.DatabaseInfo, 0, len(result.Rows))
	for _, row := range result.Rows {
		if dbName, ok := row[0].(string); ok {
			// Get tables for this database
			tables, err := c.GetTables(ctx, dbName)
			if err != nil {
				// Log error but continue with other databases
				tables = []datasource.TableInfo{}
			}

			databases = append(databases, datasource.DatabaseInfo{
				Name:   dbName,
				Tables: tables,
			})
		}
	}

	return databases, nil
}
