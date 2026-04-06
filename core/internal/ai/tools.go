package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"data-voyager/core/internal/datasource"
	"data-voyager/sdk"
)

// ToolExecutor runs AI tool calls against real datasource connections.
type ToolExecutor struct {
	repo     ConnRepo
	registry *datasource.Registry
}

// NewToolExecutor creates a ToolExecutor.
func NewToolExecutor(repo ConnRepo, registry *datasource.Registry) *ToolExecutor {
	return &ToolExecutor{repo: repo, registry: registry}
}

// ── tool definitions (JSON Schema) ───────────────────────────────────────────

// AvailableTools returns the tool list to expose to the model.
func AvailableTools() []Tool {
	return []Tool{
		{
			Name:        "get_schema",
			Description: "Get the database schema. Without 'table' arg returns all tables with row counts and sizes. With 'table' arg returns only that table's columns. Always call with 'table' before writing SQL for that table.",
			Parameters: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"table": map[string]any{
						"type":        "string",
						"description": "Optional. If provided, return only this table's column definitions.",
					},
				},
				"required": []string{},
			},
		},
		{
			Name:        "run_query",
			Description: "Execute any SQL query and return results. Use this for ALL data questions: filtering, aggregation, table stats, sampling, anomaly detection, etc.",
			Parameters: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"sql": map[string]any{
						"type":        "string",
						"description": "The SQL query to execute.",
					},
					"limit": map[string]any{
						"type":        "integer",
						"description": "Maximum rows to return. Default 500.",
					},
				},
				"required": []string{"sql"},
			},
		},
	}
}

// ── execution ─────────────────────────────────────────────────────────────────

type runQueryArgs struct {
	SQL   string `json:"sql"`
	Limit int    `json:"limit"`
}

// Execute runs a tool call and returns a human-readable result string
// plus a Chunk for SSE streaming.
func (te *ToolExecutor) Execute(ctx context.Context, connID string, tc ToolCall) (resultText string, chunk Chunk, err error) {
	switch tc.Name {
	case "get_schema", "list_tables", "show_tables", "describe_schema":
		return te.execGetSchema(ctx, connID, tc)
	case "run_query", "execute_query", "execute_sql", "run_sql",
		"get_table_stats", "table_stats", "table_sizes", "table_usage":
		// route any SQL-execution alias through run_query
		return te.execRunQuery(ctx, connID, tc)
	default:
		msg := fmt.Sprintf(
			"Unknown tool %q. You only have two tools: get_schema and run_query. Use run_query with a SQL statement.",
			tc.Name,
		)
		chunk := Chunk{Type: ChunkToolResult, Tool: tc.Name, Result: map[string]any{"error": msg}}
		return msg, chunk, nil
	}
}

// sanitizeSQL strips trailing semicolons from the query and appends LIMIT
// only when the query doesn't already contain one.
func sanitizeSQL(sql string, limit int) string {
	s := strings.TrimSpace(sql)
	s = strings.TrimRight(s, ";")
	upper := strings.ToUpper(s)
	if strings.Contains(upper, " LIMIT ") || strings.HasSuffix(upper, "LIMIT") {
		return s
	}
	return fmt.Sprintf("%s LIMIT %d", s, limit)
}

func (te *ToolExecutor) openConn(ctx context.Context, connID string) (sdk.Connection, func(), error) {
	conn, err := te.repo.GetConnByID(ctx, connID)
	if err != nil {
		return nil, nil, fmt.Errorf("connection not found: %w", err)
	}
	plugin, exists := te.registry.Get(sdk.DataSourceType(conn.Type))
	if !exists {
		return nil, nil, fmt.Errorf("plugin not found for type: %s", conn.Type)
	}
	cfg, err := plugin.ParseConfig(conn.Config)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to parse config: %w", err)
	}
	dbConn, err := plugin.Connect(ctx, cfg)
	if err != nil {
		return nil, nil, fmt.Errorf("connect failed: %w", err)
	}
	return dbConn, func() { _ = dbConn.Close() }, nil
}

type getSchemaArgs struct {
	Table string `json:"table"`
}

// columnFetcher is implemented by datasource connections that support direct column queries.
type columnFetcher interface {
	GetColumnsForTable(ctx context.Context, database, table string) ([]sdk.ColumnInfo, error)
}

func (te *ToolExecutor) execGetSchema(ctx context.Context, connID string, tc ToolCall) (string, Chunk, error) {
	var args getSchemaArgs
	_ = json.Unmarshal([]byte(tc.ArgJSON), &args)
	tableFilter := strings.ToLower(strings.TrimSpace(args.Table))

	dbConn, closeConn, err := te.openConn(ctx, connID)
	if err != nil {
		return "", Chunk{}, err
	}
	defer closeConn()

	schema, err := dbConn.GetSchema(ctx)
	if err != nil {
		return "", Chunk{}, fmt.Errorf("get_schema failed: %w", err)
	}

	// If a specific table is requested, return just that table's columns.
	// Try GetColumnsForTable (direct system.columns query) first for accuracy.
	if tableFilter != "" {
		for _, db := range schema.Databases {
			for _, tbl := range db.Tables {
				if strings.ToLower(tbl.Name) == tableFilter {
					// Fetch columns via direct query if supported
					var cols []sdk.ColumnInfo
					if cf, ok := dbConn.(columnFetcher); ok {
						cols, _ = cf.GetColumnsForTable(ctx, db.Name, tbl.Name)
					}
					if len(cols) == 0 {
						cols = tbl.Columns // fallback to pre-loaded (may be empty)
					}

					var sb strings.Builder
					if tbl.RowCount != nil {
						sb.WriteString(fmt.Sprintf("Table: %s (rows=%d", tbl.Name, *tbl.RowCount))
						if tbl.Size != nil {
							sb.WriteString(fmt.Sprintf(", size=%d bytes", *tbl.Size))
						}
						sb.WriteString(")\n")
					} else {
						sb.WriteString(fmt.Sprintf("Table: %s\n", tbl.Name))
					}
					if len(cols) == 0 {
						sb.WriteString("  (no column info available)\n")
					} else {
						for _, col := range cols {
							sb.WriteString(fmt.Sprintf("  - %s (%s)\n", col.Name, col.Type))
						}
					}
					resultText := fmt.Sprintf(
						"get_schema(%s) result:\n%s\nUse ONLY these column names in SQL for table %s.",
						tbl.Name, sb.String(), tbl.Name,
					)
					chunk := Chunk{Type: ChunkToolResult, Tool: tc.Name, Result: map[string]any{"table": tbl.Name, "columns": len(cols)}}
					return resultText, chunk, nil
				}
			}
		}
		resultText := fmt.Sprintf("Table '%s' not found. Call get_schema without a table arg to see all available tables.", args.Table)
		chunk := Chunk{Type: ChunkToolResult, Tool: tc.Name, Result: map[string]any{"error": resultText}}
		return resultText, chunk, nil
	}

	// No table filter: return stats + table list only (no columns).
	// This keeps the context small so the model can pick which table to inspect.
	var sb strings.Builder
	totalTables := 0

	type tableStat struct {
		db, name     string
		rowCount     int64
		sizeBytes    int64
		hasSizeBytes bool
	}
	var stats []tableStat

	var dbNames []string
	for _, db := range schema.Databases {
		dbNames = append(dbNames, db.Name)
		sb.WriteString(fmt.Sprintf("Database: %s\n", db.Name))
		for _, tbl := range db.Tables {
			totalTables++
			meta := ""
			st := tableStat{db: db.Name, name: tbl.Name}
			if tbl.RowCount != nil {
				st.rowCount = *tbl.RowCount
				meta += fmt.Sprintf(" rows=%d", *tbl.RowCount)
			}
			if tbl.Size != nil {
				st.sizeBytes = *tbl.Size
				st.hasSizeBytes = true
				meta += fmt.Sprintf(" size=%d bytes", *tbl.Size)
			}
			stats = append(stats, st)
			// List table name + stats only — no columns (call get_schema(table=X) for columns)
			sb.WriteString(fmt.Sprintf("  %s%s\n", tbl.Name, meta))
		}
	}

	// Pre-compute top-10 tables by size so the model never needs to query system tables for this
	var statsSummary string
	hasSizeInfo := false
	for _, s := range stats {
		if s.hasSizeBytes {
			hasSizeInfo = true
			break
		}
	}
	if hasSizeInfo && len(stats) > 0 {
		// sort descending by size
		for i := 0; i < len(stats)-1; i++ {
			for j := i + 1; j < len(stats); j++ {
				if stats[j].sizeBytes > stats[i].sizeBytes {
					stats[i], stats[j] = stats[j], stats[i]
				}
			}
		}
		top := stats
		if len(top) > 10 {
			top = top[:10]
		}
		var ss strings.Builder
		ss.WriteString("\n=== TABLE USAGE STATS (already computed — use this to answer size/usage questions directly, no SQL needed) ===\n")
		ss.WriteString("Rank | Table | Rows | Size (bytes)\n")
		for i, s := range top {
			ss.WriteString(fmt.Sprintf("%d | %s | %d | %d\n", i+1, s.name, s.rowCount, s.sizeBytes))
		}
		ss.WriteString("===\n")
		statsSummary = ss.String()
	}

	var resultText string
	if totalTables == 0 {
		resultText = "Schema result: no tables found in this database."
	} else {
		dbList := strings.Join(dbNames, ", ")
		resultText = fmt.Sprintf(
			"get_schema result: database(s)=%s, %d tables found.%s\nTo query system stats use: SELECT name, total_rows, total_bytes FROM system.tables WHERE database='%s' ORDER BY total_bytes DESC\nTable list:\n%s",
			dbList, totalTables, statsSummary, dbNames[0], sb.String(),
		)
	}

	chunk := Chunk{
		Type:   ChunkToolResult,
		Tool:   tc.Name,
		Result: map[string]any{"tables": totalTables},
	}
	return resultText, chunk, nil
}

func (te *ToolExecutor) execRunQuery(ctx context.Context, connID string, tc ToolCall) (string, Chunk, error) {
	var args runQueryArgs
	if err := json.Unmarshal([]byte(tc.ArgJSON), &args); err != nil {
		return "", Chunk{}, fmt.Errorf("run_query: invalid args: %w", err)
	}
	if args.Limit <= 0 {
		args.Limit = 500
	}

	dbConn, closeConn, err := te.openConn(ctx, connID)
	if err != nil {
		return "", Chunk{}, err
	}
	defer closeConn()

	sql := sanitizeSQL(args.SQL, args.Limit)
	result, err := dbConn.Query(ctx, sql)
	if err != nil {
		errMsg := err.Error()
		hint := "Please analyze the error, fix the SQL, and call run_query again."
		// Provide ClickHouse system.tables column name hints for common mistakes
		if strings.Contains(strings.ToLower(args.SQL), "system.tables") {
			hint = "ClickHouse system.tables correct columns: name (String), total_rows (Nullable UInt64), total_bytes (Nullable UInt64), engine (String), database (String). " +
				"Do NOT use: rows, size, data_length, avg_row_size. " +
				"Example: SELECT name, total_rows, total_bytes FROM system.tables WHERE database='dbname' ORDER BY total_bytes DESC"
		}
		errText := fmt.Sprintf("Query error: %s\n\n%s", errMsg, hint)
		chunk := Chunk{Type: ChunkToolResult, Tool: tc.Name, Result: map[string]any{"error": errMsg}}
		return errText, chunk, nil
	}

	// Build a short summary for the LLM context.
	// The full data is sent to the UI via the action chunk — the LLM only needs a
	// brief confirmation + sample so it can decide the next step.
	rowsReturned := result.Stats.RowsReturned
	var resultText string
	if rowsReturned == 0 {
		resultText = "run_query succeeded: 0 rows returned. Results already displayed in UI."
	} else {
		// Send up to 5 sample rows so the LLM can verify column names etc.
		sampleFrames := result.Frames
		truncated := false
		if len(sampleFrames) > 0 && rowsReturned > 5 {
			compact := *sampleFrames[0]
			compactFields := make([]sdk.Field, len(compact.Fields))
			copy(compactFields, compact.Fields)
			for i := range compactFields {
				if len(compactFields[i].Values) > 5 {
					compactFields[i].Values = compactFields[i].Values[:5]
				}
			}
			compact.Fields = compactFields
			sampleFrames = []*sdk.DataFrame{&compact}
			truncated = true
		}
		b, _ := json.Marshal(sampleFrames)
		if truncated {
			resultText = fmt.Sprintf("run_query succeeded: %d total rows. Full table shown in UI. Sample (first 5 rows):\n%s\nDo NOT call more tools — summarize and stop.", rowsReturned, string(b))
		} else {
			resultText = fmt.Sprintf("run_query succeeded: %d rows. Results shown in UI.\n%s", rowsReturned, string(b))
		}
	}

	chunk := Chunk{
		Type:   ChunkToolResult,
		Tool:   tc.Name,
		Result: map[string]any{"rows": rowsReturned, "sql": args.SQL},
		// Surface the query + result as a frontend action so Discover can show it
		Action:  "query_result",
		Payload: map[string]any{"sql": args.SQL, "frames": result.Frames},
	}
	return resultText, chunk, nil
}
