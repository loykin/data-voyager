package postgresql

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"data-voyager/sdk"

	_ "github.com/lib/pq"
)

func init() {
	sdk.RegisterDatasource(&Plugin{})
}

// Type is the DataSourceType identifier for this extension.
const Type sdk.DataSourceType = "postgresql"

// Plugin implements sdk.DatasourcePlugin for PostgreSQL.
type Plugin struct{}

func (p *Plugin) GetType() sdk.DataSourceType { return Type }
func (p *Plugin) GetName() string             { return "PostgreSQL" }

func (p *Plugin) ParseConfig(data json.RawMessage) (sdk.ConnectionConfig, error) {
	cfg := &Config{}
	if err := json.Unmarshal(data, cfg); err != nil {
		return nil, fmt.Errorf("invalid postgresql config: %w", err)
	}
	return cfg, nil
}

func (p *Plugin) ValidateConfig(config any) error {
	cfg, ok := config.(*Config)
	if !ok {
		return fmt.Errorf("config must be *postgresql.Config")
	}
	return cfg.Validate()
}

func (p *Plugin) Connect(ctx context.Context, config sdk.ConnectionConfig) (sdk.Connection, error) {
	cfg, ok := config.(*Config)
	if !ok {
		return nil, fmt.Errorf("invalid config type for PostgreSQL")
	}
	if err := cfg.Validate(); err != nil {
		return nil, fmt.Errorf("invalid postgresql config: %w", err)
	}

	db, err := sql.Open("postgres", cfg.GetConnectionString())
	if err != nil {
		return nil, fmt.Errorf("failed to open PostgreSQL connection: %w", err)
	}

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(time.Hour)

	if err := db.PingContext(ctx); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("failed to ping PostgreSQL: %w", err)
	}

	return &Connection{db: db, config: cfg}, nil
}

func (p *Plugin) TestConnection(ctx context.Context, config sdk.ConnectionConfig) (*sdk.ConnectionTestResult, error) {
	start := time.Now()

	conn, err := p.Connect(ctx, config)
	if err != nil {
		return &sdk.ConnectionTestResult{
			IsConnected: false,
			Message:     err.Error(),
			TestedAt:    time.Now(),
		}, nil
	}
	defer func() { _ = conn.Close() }()

	if err := conn.Ping(ctx); err != nil {
		return &sdk.ConnectionTestResult{
			IsConnected: false,
			Message:     fmt.Sprintf("ping failed: %v", err),
			TestedAt:    time.Now(),
		}, nil
	}

	return &sdk.ConnectionTestResult{
		IsConnected: true,
		Message:     "Connection successful",
		Latency:     time.Since(start).Milliseconds(),
		TestedAt:    time.Now(),
	}, nil
}

// Connection is an active PostgreSQL connection.
type Connection struct {
	db     *sql.DB
	config *Config
}

func (c *Connection) Query(ctx context.Context, query string, params ...any) (*sdk.QueryResult, error) {
	start := time.Now()
	columns, resultRows, err := c.queryRaw(ctx, query, params...)
	if err != nil {
		return nil, err
	}

	// Transpose row-oriented data into column-oriented Fields.
	fields := make([]sdk.Field, len(columns))
	for i, col := range columns {
		values := make([]any, len(resultRows))
		for j, row := range resultRows {
			values[j] = row[i]
		}
		fields[i] = sdk.Field{
			Name:   col.Name,
			Kind:   sdk.InferFieldKind(col.Type),
			Type:   col.Type,
			Values: values,
		}
	}

	return &sdk.QueryResult{
		Frames: []*sdk.DataFrame{{
			FrameType: sdk.FrameTypeTable,
			Fields:    fields,
		}},
		Stats: sdk.QueryStats{
			ExecutionTime: time.Since(start),
			RowsReturned:  int64(len(resultRows)),
		},
	}, nil
}

// queryRaw executes a query and returns column metadata + raw rows.
// Used internally by Query (for building DataFrames) and schema helpers.
func (c *Connection) queryRaw(ctx context.Context, query string, params ...any) ([]sdk.ColumnInfo, [][]any, error) {
	rows, err := c.db.QueryContext(ctx, query, params...)
	if err != nil {
		return nil, nil, fmt.Errorf("query execution failed: %w", err)
	}
	defer func() { _ = rows.Close() }()

	columnTypes, err := rows.ColumnTypes()
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get column types: %w", err)
	}

	columns := make([]sdk.ColumnInfo, len(columnTypes))
	for i, ct := range columnTypes {
		nullable, _ := ct.Nullable()
		columns[i] = sdk.ColumnInfo{Name: ct.Name(), Type: ct.DatabaseTypeName(), Nullable: nullable}
	}

	var resultRows [][]any
	for rows.Next() {
		values := make([]any, len(columnTypes))
		valuePtrs := make([]any, len(columnTypes))
		for i := range values {
			valuePtrs[i] = &values[i]
		}
		if err := rows.Scan(valuePtrs...); err != nil {
			return nil, nil, fmt.Errorf("failed to scan row: %w", err)
		}
		for i, v := range values {
			if b, ok := v.([]byte); ok {
				values[i] = string(b)
			}
		}
		resultRows = append(resultRows, values)
	}
	if err := rows.Err(); err != nil {
		return nil, nil, fmt.Errorf("rows iteration error: %w", err)
	}
	return columns, resultRows, nil
}

func (c *Connection) GetSchema(ctx context.Context) (*sdk.SchemaInfo, error) {
	databases, err := c.getDatabases(ctx)
	if err != nil {
		return nil, err
	}
	return &sdk.SchemaInfo{Databases: databases}, nil
}

func (c *Connection) GetTables(ctx context.Context, schemaName string) ([]sdk.TableInfo, error) {
	if schemaName == "" {
		schemaName = "public"
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

	_, rows, err := c.queryRaw(ctx, query, schemaName)
	if err != nil {
		return nil, fmt.Errorf("failed to get tables: %w", err)
	}

	tables := make([]sdk.TableInfo, 0, len(rows))
	for _, row := range rows {
		name, _ := row[0].(string)
		tableType, _ := row[1].(string)

		var size, rowCount *int64
		if sz, ok := row[2].(int64); ok && sz > 0 {
			size = &sz
		}
		if rc, ok := row[3].(int64); ok && rc > 0 {
			rowCount = &rc
		}

		columns, _ := c.getTableColumns(ctx, schemaName, name)
		tables = append(tables, sdk.TableInfo{
			Name:     name,
			Type:     tableType,
			Columns:  columns,
			RowCount: rowCount,
			Size:     size,
		})
	}

	return tables, nil
}

func (c *Connection) Close() error {
	if c.db != nil {
		return c.db.Close()
	}
	return nil
}

func (c *Connection) Ping(ctx context.Context) error {
	return c.db.PingContext(ctx)
}

func (c *Connection) GetMetrics() sdk.ConnectionMetrics {
	stats := c.db.Stats()
	return sdk.ConnectionMetrics{
		OpenConnections: stats.OpenConnections,
		IdleConnections: stats.Idle,
		LastActivity:    time.Now(),
	}
}

func (c *Connection) getDatabases(ctx context.Context) ([]sdk.DatabaseInfo, error) {
	query := `
		SELECT schema_name
		FROM information_schema.schemata
		WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
		ORDER BY schema_name
	`
	_, rows, err := c.queryRaw(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to get schemas: %w", err)
	}

	databases := make([]sdk.DatabaseInfo, 0, len(rows))
	for _, row := range rows {
		if schemaName, ok := row[0].(string); ok {
			tables, _ := c.GetTables(ctx, schemaName)
			databases = append(databases, sdk.DatabaseInfo{Name: schemaName, Tables: tables})
		}
	}
	return databases, nil
}

func (c *Connection) getTableColumns(ctx context.Context, schemaName, tableName string) ([]sdk.ColumnInfo, error) {
	query := `
		SELECT column_name, data_type, is_nullable
		FROM information_schema.columns
		WHERE table_schema = $1 AND table_name = $2
		ORDER BY ordinal_position
	`
	_, rows, err := c.queryRaw(ctx, query, schemaName, tableName)
	if err != nil {
		return nil, fmt.Errorf("failed to get columns: %w", err)
	}

	columns := make([]sdk.ColumnInfo, 0, len(rows))
	for _, row := range rows {
		name, _ := row[0].(string)
		dataType, _ := row[1].(string)
		isNullable, _ := row[2].(string)
		columns = append(columns, sdk.ColumnInfo{Name: name, Type: dataType, Nullable: isNullable == "YES"})
	}
	return columns, nil
}
