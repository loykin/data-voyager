package clickhouse

import (
	"context"
	"encoding/json"
	"fmt"
	"reflect"
	"strings"
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

// splitStatements splits a SQL string on `;` delimiters, respecting
// single-quoted strings and -- / # line comments.
func splitStatements(query string) []string {
	var parts []string
	var cur strings.Builder
	inString := false
	i := 0
	for i < len(query) {
		ch := query[i]
		switch {
		case !inString && ch == '-' && i+1 < len(query) && query[i+1] == '-':
			// line comment: skip to end of line
			for i < len(query) && query[i] != '\n' {
				i++
			}
			continue
		case !inString && ch == '#':
			// hash comment: skip to end of line
			for i < len(query) && query[i] != '\n' {
				i++
			}
			continue
		case ch == '\'' && !inString:
			inString = true
			cur.WriteByte(ch)
		case ch == '\'':
			cur.WriteByte(ch)
			// handle escaped single-quote ''
			if i+1 < len(query) && query[i+1] == '\'' {
				i++
				cur.WriteByte(query[i])
			} else {
				inString = false
			}
		case ch == ';' && !inString:
			if part := strings.TrimSpace(cur.String()); part != "" {
				parts = append(parts, part)
			}
			cur.Reset()
		default:
			cur.WriteByte(ch)
		}
		i++
	}
	if part := strings.TrimSpace(cur.String()); part != "" {
		parts = append(parts, part)
	}
	return parts
}

func (c *Connection) Query(ctx context.Context, query string, _ ...any) (*sdk.QueryResult, error) {
	start := time.Now()
	stmts := splitStatements(query)
	if len(stmts) == 0 {
		return &sdk.QueryResult{Frames: []*sdk.DataFrame{}}, nil
	}

	// Execute all statements; keep the last result that has fields (SELECT-like).
	// DDL/DML statements (CREATE, INSERT, …) return no fields and are skipped.
	last := &sdk.QueryResult{Frames: []*sdk.DataFrame{}}
	for _, stmt := range stmts {
		result, err := c.execOne(ctx, stmt)
		if err != nil {
			return nil, err
		}
		if len(result.Frames) > 0 && len(result.Frames[0].Fields) > 0 {
			last = result
		}
	}

	// Accumulate total execution time in Stats.
	last.Stats.ExecutionTime = time.Since(start)
	return last, nil
}

// queryRaw executes a single statement and returns column metadata + raw rows.
// Used internally by execOne (for building DataFrames) and schema helpers.
func (c *Connection) queryRaw(ctx context.Context, query string, params ...any) ([]sdk.ColumnInfo, [][]any, error) {
	rows, err := c.conn.Query(ctx, query, params...)
	if err != nil {
		return nil, nil, fmt.Errorf("query execution failed: %w", err)
	}
	defer func() { _ = rows.Close() }()

	columnTypes := rows.ColumnTypes()
	columns := make([]sdk.ColumnInfo, len(columnTypes))
	for i, ct := range columnTypes {
		columns[i] = sdk.ColumnInfo{Name: ct.Name(), Type: ct.DatabaseTypeName(), Nullable: ct.Nullable()}
	}

	var resultRows [][]any
	for rows.Next() {
		valuePtrs := make([]any, len(columnTypes))
		for i, ct := range columnTypes {
			valuePtrs[i] = reflect.New(ct.ScanType()).Interface()
		}
		if err := rows.Scan(valuePtrs...); err != nil {
			return nil, nil, fmt.Errorf("failed to scan row: %w", err)
		}
		values := make([]any, len(columnTypes))
		for i, ptr := range valuePtrs {
			values[i] = reflect.ValueOf(ptr).Elem().Interface()
		}
		resultRows = append(resultRows, values)
	}
	if err := rows.Err(); err != nil {
		return nil, nil, fmt.Errorf("rows iteration error: %w", err)
	}
	return columns, resultRows, nil
}

func (c *Connection) execOne(ctx context.Context, query string) (*sdk.QueryResult, error) {
	start := time.Now()
	columns, resultRows, err := c.queryRaw(ctx, query)
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

func (c *Connection) GetSchema(ctx context.Context) (*sdk.SchemaInfo, error) {
	databases, err := c.getDatabases(ctx)
	if err != nil {
		return nil, err
	}
	return &sdk.SchemaInfo{Databases: databases}, nil
}

// GetColumnsForTable fetches column definitions for a specific table using system.columns.
func (c *Connection) GetColumnsForTable(ctx context.Context, database, table string) ([]sdk.ColumnInfo, error) {
	query := `
		SELECT name, type
		FROM system.columns
		WHERE database = ? AND table = ?
		ORDER BY position
	`
	_, rows, err := c.queryRaw(ctx, query, database, table)
	if err != nil {
		return nil, err
	}
	cols := make([]sdk.ColumnInfo, 0, len(rows))
	for _, row := range rows {
		name, _ := row[0].(string)
		typ, _ := row[1].(string)
		cols = append(cols, sdk.ColumnInfo{Name: name, Type: typ})
	}
	return cols, nil
}

func (c *Connection) GetTables(ctx context.Context, database string) ([]sdk.TableInfo, error) {
	query := `
		SELECT name, engine as type, total_rows, total_bytes
		FROM system.tables
		WHERE database = ?
		ORDER BY name
	`
	_, rows, err := c.queryRaw(ctx, query, database)
	if err != nil {
		return nil, fmt.Errorf("failed to get tables: %w", err)
	}

	tables := make([]sdk.TableInfo, 0, len(rows))
	for _, row := range rows {
		name, _ := row[0].(string)
		tableType, _ := row[1].(string)

		var rowCount, size *int64
		// total_rows and total_bytes are Nullable(UInt64) in ClickHouse,
		// so the driver returns *uint64 not uint64.
		switch v := row[2].(type) {
		case uint64:
			c := int64(v)
			rowCount = &c
		case *uint64:
			if v != nil {
				c := int64(*v)
				rowCount = &c
			}
		}
		switch v := row[3].(type) {
		case uint64:
			b := int64(v)
			size = &b
		case *uint64:
			if v != nil {
				b := int64(*v)
				size = &b
			}
		}

		tables = append(tables, sdk.TableInfo{Name: name, Type: tableType, RowCount: rowCount, Size: size})
	}
	return tables, nil
}

func (c *Connection) getDatabases(ctx context.Context) ([]sdk.DatabaseInfo, error) {
	// Exclude built-in ClickHouse system/metadata databases so the AI only
	// sees user-created databases and tables.
	query := `
		SELECT name FROM system.databases
		WHERE name NOT IN ('system', 'information_schema', 'INFORMATION_SCHEMA', '_temporary_and_external_tables')
		ORDER BY name
	`
	_, rows, err := c.queryRaw(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to get databases: %w", err)
	}

	databases := make([]sdk.DatabaseInfo, 0, len(rows))
	for _, row := range rows {
		if dbName, ok := row[0].(string); ok {
			tables, _ := c.GetTables(ctx, dbName)
			databases = append(databases, sdk.DatabaseInfo{Name: dbName, Tables: tables})
		}
	}
	return databases, nil
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
