package ai

import (
	"context"
	"encoding/json"
	"fmt"

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
			Description: "Get the database schema for the current connection: list of tables with their columns and types.",
			Parameters: map[string]any{
				"type":       "object",
				"properties": map[string]any{},
				"required":   []string{},
			},
		},
		{
			Name:        "run_query",
			Description: "Execute a SQL query and return the results as rows. Use this to answer questions about the data.",
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
	case "get_schema":
		return te.execGetSchema(ctx, connID, tc)
	case "run_query":
		return te.execRunQuery(ctx, connID, tc)
	default:
		return "", Chunk{}, fmt.Errorf("unknown tool: %s", tc.Name)
	}
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

func (te *ToolExecutor) execGetSchema(ctx context.Context, connID string, tc ToolCall) (string, Chunk, error) {
	dbConn, closeConn, err := te.openConn(ctx, connID)
	if err != nil {
		return "", Chunk{}, err
	}
	defer closeConn()

	schema, err := dbConn.GetSchema(ctx)
	if err != nil {
		return "", Chunk{}, fmt.Errorf("get_schema failed: %w", err)
	}

	// Build compact text summary for LLM context
	var result string
	for _, db := range schema.Databases {
		for _, tbl := range db.Tables {
			result += fmt.Sprintf("Table: %s\n", tbl.Name)
			for _, col := range tbl.Columns {
				result += fmt.Sprintf("  - %s (%s)\n", col.Name, col.Type)
			}
		}
	}
	if result == "" {
		result = "(no tables found)"
	}

	chunk := Chunk{
		Type:   ChunkToolResult,
		Tool:   tc.Name,
		Result: map[string]any{"tables": len(schema.Databases)},
	}
	return result, chunk, nil
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

	result, err := dbConn.Query(ctx, fmt.Sprintf("%s LIMIT %d", args.SQL, args.Limit))
	if err != nil {
		// Return the error as tool result text so the LLM can react to it
		errText := fmt.Sprintf("Query error: %s", err)
		chunk := Chunk{Type: ChunkToolResult, Tool: tc.Name, Result: map[string]any{"error": err.Error()}}
		return errText, chunk, nil
	}

	// Serialize DataFrame as compact JSON for LLM
	b, _ := json.Marshal(result.Frames)
	resultText := string(b)

	rowsReturned := result.Stats.RowsReturned
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
