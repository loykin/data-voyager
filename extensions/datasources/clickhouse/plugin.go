package clickhouse

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"data-voyager/sdk"

	goch "github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

func init() {
	sdk.RegisterDatasource(&Plugin{})
}

// Type is the DataSourceType identifier for this extension.
const Type sdk.DataSourceType = "clickhouse"

// Plugin implements sdk.DatasourcePlugin for ClickHouse.
type Plugin struct{}

func (p *Plugin) GetType() sdk.DataSourceType { return Type }
func (p *Plugin) GetName() string             { return "ClickHouse" }

func (p *Plugin) ParseConfig(data json.RawMessage) (sdk.ConnectionConfig, error) {
	cfg := &Config{}
	if err := json.Unmarshal(data, cfg); err != nil {
		return nil, fmt.Errorf("invalid clickhouse config: %w", err)
	}
	return cfg, nil
}

func (p *Plugin) ValidateConfig(config any) error {
	cfg, ok := config.(*Config)
	if !ok {
		return fmt.Errorf("config must be *clickhouse.Config")
	}
	return cfg.Validate()
}

func (p *Plugin) Connect(ctx context.Context, config sdk.ConnectionConfig) (sdk.Connection, error) {
	cfg, ok := config.(*Config)
	if !ok {
		return nil, fmt.Errorf("invalid config type for ClickHouse")
	}
	if err := cfg.Validate(); err != nil {
		return nil, fmt.Errorf("invalid clickhouse config: %w", err)
	}

	options := &goch.Options{
		Addr: []string{fmt.Sprintf("%s:%d", cfg.Host, cfg.Port)},
		Auth: goch.Auth{
			Database: cfg.Database,
			Username: cfg.Username,
			Password: cfg.Password,
		},
		DialTimeout:      30 * time.Second,
		MaxOpenConns:     10,
		MaxIdleConns:     5,
		ConnMaxLifetime:  time.Hour,
		ConnOpenStrategy: goch.ConnOpenInOrder,
	}

	if cfg.Secure {
		options.Protocol = goch.Native
	}

	conn, err := goch.Open(options)
	if err != nil {
		return nil, fmt.Errorf("failed to open ClickHouse connection: %w", err)
	}

	if err := conn.Ping(ctx); err != nil {
		_ = conn.Close()
		return nil, fmt.Errorf("failed to ping ClickHouse: %w", err)
	}

	return &Connection{conn: conn, config: cfg}, nil
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

// Connection is an active ClickHouse connection.
type Connection struct {
	conn   driver.Conn
	config *Config
}

func (c *Connection) Query(ctx context.Context, query string, params ...any) (*sdk.QueryResult, error) {
	start := time.Now()

	rows, err := c.conn.Query(ctx, query, params...)
	if err != nil {
		return nil, fmt.Errorf("query execution failed: %w", err)
	}
	defer func() { _ = rows.Close() }()

	columnTypes := rows.ColumnTypes()
	columns := make([]sdk.ColumnInfo, len(columnTypes))
	for i, ct := range columnTypes {
		columns[i] = sdk.ColumnInfo{Name: ct.Name(), Type: ct.DatabaseTypeName(), Nullable: ct.Nullable()}
	}

	var resultRows [][]any
	for rows.Next() {
		values := make([]any, len(columnTypes))
		valuePtrs := make([]any, len(columnTypes))
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

	return &sdk.QueryResult{
		Columns: columns,
		Rows:    resultRows,
		Stats: sdk.QueryStats{
			ExecutionTime: time.Since(start),
			RowsReturned:  int64(len(resultRows)),
		},
	}, nil
}

func (c *Connection) GetSchema(ctx context.Context) (*sdk.SchemaInfo, error) {
	databases, err := c.getDatabases(ctx)
	if err != nil {
		return nil, err
	}
	return &sdk.SchemaInfo{Databases: databases}, nil
}

func (c *Connection) GetTables(ctx context.Context, database string) ([]sdk.TableInfo, error) {
	query := `
		SELECT name, engine as type, total_rows, total_bytes
		FROM system.tables
		WHERE database = ?
		ORDER BY name
	`
	result, err := c.Query(ctx, query, database)
	if err != nil {
		return nil, fmt.Errorf("failed to get tables: %w", err)
	}

	tables := make([]sdk.TableInfo, 0, len(result.Rows))
	for _, row := range result.Rows {
		name, _ := row[0].(string)
		tableType, _ := row[1].(string)

		var rowCount, size *int64
		if rc, ok := row[2].(uint64); ok {
			count := int64(rc)
			rowCount = &count
		}
		if sz, ok := row[3].(uint64); ok {
			bytes := int64(sz)
			size = &bytes
		}

		tables = append(tables, sdk.TableInfo{Name: name, Type: tableType, RowCount: rowCount, Size: size})
	}
	return tables, nil
}

func (c *Connection) Close() error {
	if c.conn != nil {
		return c.conn.Close()
	}
	return nil
}

func (c *Connection) Ping(ctx context.Context) error { return c.conn.Ping(ctx) }

func (c *Connection) GetMetrics() sdk.ConnectionMetrics {
	return sdk.ConnectionMetrics{
		OpenConnections: 1,
		LastActivity:    time.Now(),
	}
}

func (c *Connection) getDatabases(ctx context.Context) ([]sdk.DatabaseInfo, error) {
	result, err := c.Query(ctx, "SELECT name FROM system.databases ORDER BY name")
	if err != nil {
		return nil, fmt.Errorf("failed to get databases: %w", err)
	}

	databases := make([]sdk.DatabaseInfo, 0, len(result.Rows))
	for _, row := range result.Rows {
		if dbName, ok := row[0].(string); ok {
			tables, _ := c.GetTables(ctx, dbName)
			databases = append(databases, sdk.DatabaseInfo{Name: dbName, Tables: tables})
		}
	}
	return databases, nil
}
