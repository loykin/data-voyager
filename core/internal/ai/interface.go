package ai

import (
	"context"
	"encoding/json"

	"data-voyager/core/internal/config"
)

// Role is a chat message role.
type Role string

const (
	RoleSystem    Role = "system"
	RoleUser      Role = "user"
	RoleAssistant Role = "assistant"
	RoleTool      Role = "tool"
)

// Message is a single chat message.
type Message struct {
	Role       Role       `json:"role"`
	Content    string     `json:"content,omitempty"`
	ToolCallID string     `json:"tool_call_id,omitempty"` // for role=tool
	ToolCalls  []ToolCall `json:"tool_calls,omitempty"`   // for role=assistant with tool calls
}

// ToolCall represents a function call requested by the model.
type ToolCall struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	ArgJSON string `json:"arguments"` // JSON-encoded arguments
}

// Tool describes a callable function exposed to the model.
type Tool struct {
	Name        string         `json:"name"`
	Description string         `json:"description"`
	Parameters  map[string]any `json:"parameters"` // JSON Schema object
}

// ChatRequest is the input to Provider.Complete.
type ChatRequest struct {
	Messages []Message
	Tools    []Tool
}

// ChunkType identifies the kind of SSE chunk sent to the client.
type ChunkType string

const (
	ChunkToken      ChunkType = "token"       // streaming text token
	ChunkToolCall   ChunkType = "tool_call"   // model requested a tool
	ChunkToolResult ChunkType = "tool_result" // tool execution result
	ChunkAction     ChunkType = "action"      // frontend action (insert_query, etc.)
	ChunkError      ChunkType = "error"       // error to display
	ChunkDone       ChunkType = "done"        // stream finished
)

// Chunk is one event emitted by the agent loop.
type Chunk struct {
	Type    ChunkType `json:"type"`
	Content string    `json:"content,omitempty"`
	Tool    string    `json:"tool,omitempty"`
	Args    any       `json:"args,omitempty"`
	Result  any       `json:"result,omitempty"`
	Action  string    `json:"action,omitempty"`
	Payload any       `json:"payload,omitempty"`
}

// ProviderResponse is the raw response from a provider.
type ProviderResponse struct {
	Content   string
	ToolCalls []ToolCall
}

// Provider is the interface every AI backend must implement.
type Provider interface {
	Complete(ctx context.Context, req ChatRequest) (*ProviderResponse, error)
}

// ── Connection dependency (avoids import cycle with connection package) ────────

// ConnInfo holds the minimal connection metadata the AI layer needs.
type ConnInfo struct {
	ID     string
	Type   string // datasource type string (e.g. "postgresql")
	Config json.RawMessage
}

// ConnRepo is the minimal repository interface used by the AI layer.
// The connection package provides an adapter that satisfies this interface
// so ai never needs to import connection (breaking the cycle).
type ConnRepo interface {
	GetConnByID(ctx context.Context, id string) (*ConnInfo, error)
}

// SettingsLoader is the minimal settings interface used by the AI layer.
// Avoids import cycle: ai never imports settings.
type SettingsLoader interface {
	LoadAIConfig(ctx context.Context, fallback *config.AIConfig) (*config.AIConfig, error)
}
