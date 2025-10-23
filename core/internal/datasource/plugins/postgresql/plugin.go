package postgresql

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"explorer/core/internal/datasource"
	"explorer/core/internal/models"
	_ "github.com/lib/pq"
)

// Plugin represents the PostgreSQL plugin
type Plugin struct{}

// NewPlugin creates a new PostgreSQL plugin
func NewPlugin() *Plugin {
	return &Plugin{}
}

// GetType returns the data source type
func (p *Plugin) GetType() models.DataSourceType {
	return models.DataSourceTypePostgreSQL
}

// GetName returns the plugin name
func (p *Plugin) GetName() string {
	return "PostgreSQL Plugin"
}

// Connect establishes a connection to PostgreSQL
func (p *Plugin) Connect(ctx context.Context, config models.ConnectionConfig) (datasource.Connection, error) {
	pgConfig, ok := config.(*models.PostgreSQLConfig)
	if !ok {
		return nil, fmt.Errorf("invalid config type for PostgreSQL")
	}

	if err := pgConfig.Validate(); err != nil {
		return nil, fmt.Errorf("invalid PostgreSQL config: %w", err)
	}

	db, err := sql.Open("postgres", pgConfig.GetConnectionString())
	if err != nil {
		return nil, fmt.Errorf("failed to open PostgreSQL connection: %w", err)
	}

	// Set connection pool settings
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(time.Hour)

	// Test connection
	if err := db.PingContext(ctx); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to ping PostgreSQL: %w", err)
	}

	return &Connection{
		db:     db,
		config: pgConfig,
	}, nil
}

// ValidateConfig validates the PostgreSQL configuration
func (p *Plugin) ValidateConfig(config interface{}) error {
	pgConfig, ok := config.(*models.PostgreSQLConfig)
	if !ok {
		return fmt.Errorf("config must be *models.PostgreSQLConfig")
	}
	return pgConfig.Validate()
}

// TestConnection tests the PostgreSQL connection
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
	defer conn.Close()

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

// Connection represents a PostgreSQL connection
type Connection struct {
	db     *sql.DB
	config *models.PostgreSQLConfig
}

// Query executes a query and returns results
func (c *Connection) Query(ctx context.Context, query string, params ...interface{}) (*datasource.QueryResult, error) {
	start := time.Now()

	rows, err := c.db.QueryContext(ctx, query, params...)
	if err != nil {
		return nil, fmt.Errorf("query execution failed: %w", err)
	}
	defer rows.Close()

	// Get column information
	columnTypes, err := rows.ColumnTypes()
	if err != nil {
		return nil, fmt.Errorf("failed to get column types: %w", err)
	}

	columns := make([]datasource.ColumnInfo, len(columnTypes))
	for i, ct := range columnTypes {
		nullable, _ := ct.Nullable()
		columns[i] = datasource.ColumnInfo{
			Name:     ct.Name(),
			Type:     ct.DatabaseTypeName(),
			Nullable: nullable,
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

		// Convert []byte to string for better JSON serialization
		for i, v := range values {
			if b, ok := v.([]byte); ok {
				values[i] = string(b)
			}
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
	// Get databases (which are called databases in PostgreSQL)
	databases, err := c.getDatabases(ctx)
	if err != nil {
		return nil, err
	}

	schemaInfo := &datasource.SchemaInfo{
		Databases: databases,
	}

	return schemaInfo, nil
}

// GetTables returns list of tables in a schema
func (c *Connection) GetTables(ctx context.Context, schemaName string) ([]datasource.TableInfo, error) {
	if schemaName == "" {
		schemaName = "public" // Default schema
	}

	query := `
		SELECT
			t.table_name,
			t.table_type,
			pg_total_relation_size(c.oid) as size_bytes,
			c.reltuples::bigint as estimated_rows
		FROM information_schema.tables t
		LEFT JOIN pg_class c ON c.relname = t.table_name
		LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
		WHERE t.table_schema = $1
		  AND (n.nspname = $1 OR n.nspname IS NULL)
		ORDER BY t.table_name
	`

	result, err := c.Query(ctx, query, schemaName)
	if err != nil {
		return nil, fmt.Errorf("failed to get tables: %w", err)
	}

	tables := make([]datasource.TableInfo, 0, len(result.Rows))
	for _, row := range result.Rows {
		name, _ := row[0].(string)
		tableType, _ := row[1].(string)

		var size *int64
		var rowCount *int64

		if sz, ok := row[2].(int64); ok && sz > 0 {
			size = &sz
		}

		if rc, ok := row[3].(int64); ok && rc > 0 {
			rowCount = &rc
		}

		// Get columns for this table
		columns, err := c.getTableColumns(ctx, schemaName, name)
		if err != nil {
			// Log error but continue
			columns = []datasource.ColumnInfo{}
		}

		tables = append(tables, datasource.TableInfo{
			Name:     name,
			Type:     tableType,
			Columns:  columns,
			RowCount: rowCount,
			Size:     size,
		})
	}

	return tables, nil
}

// Close closes the connection
func (c *Connection) Close() error {
	if c.db != nil {
		return c.db.Close()
	}
	return nil
}

// Ping checks if the connection is alive
func (c *Connection) Ping(ctx context.Context) error {
	return c.db.PingContext(ctx)
}

// GetMetrics returns connection metrics
func (c *Connection) GetMetrics() datasource.ConnectionMetrics {
	stats := c.db.Stats()
	return datasource.ConnectionMetrics{
		OpenConnections: stats.OpenConnections,
		IdleConnections: stats.Idle,
		TotalQueries:    int64(stats.MaxOpenConnections), // Placeholder
		LastActivity:    time.Now(),                       // Placeholder
	}
}

// getDatabases retrieves all databases (schemas in PostgreSQL)
func (c *Connection) getDatabases(ctx context.Context) ([]datasource.DatabaseInfo, error) {
	query := `
		SELECT schema_name
		FROM information_schema.schemata
		WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
		ORDER BY schema_name
	`

	result, err := c.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to get schemas: %w", err)
	}

	databases := make([]datasource.DatabaseInfo, 0, len(result.Rows))
	for _, row := range result.Rows {
		if schemaName, ok := row[0].(string); ok {
			// Get tables for this schema
			tables, err := c.GetTables(ctx, schemaName)
			if err != nil {
				// Log error but continue with other schemas
				tables = []datasource.TableInfo{}
			}

			databases = append(databases, datasource.DatabaseInfo{
				Name:   schemaName,
				Tables: tables,
			})
		}
	}

	return databases, nil
}

// getTableColumns retrieves column information for a specific table
func (c *Connection) getTableColumns(ctx context.Context, schemaName, tableName string) ([]datasource.ColumnInfo, error) {
	query := `
		SELECT
			column_name,
			data_type,
			is_nullable
		FROM information_schema.columns
		WHERE table_schema = $1 AND table_name = $2
		ORDER BY ordinal_position
	`

	result, err := c.Query(ctx, query, schemaName, tableName)
	if err != nil {
		return nil, fmt.Errorf("failed to get columns: %w", err)
	}

	columns := make([]datasource.ColumnInfo, 0, len(result.Rows))
	for _, row := range result.Rows {
		name, _ := row[0].(string)
		dataType, _ := row[1].(string)
		isNullable, _ := row[2].(string)

		columns = append(columns, datasource.ColumnInfo{
			Name:     name,
			Type:     dataType,
			Nullable: isNullable == "YES",
		})
	}

	return columns, nil
}