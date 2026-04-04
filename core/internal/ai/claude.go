package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// ClaudeConfig holds settings for the Anthropic Claude provider.
type ClaudeConfig struct {
	APIKey  string
	Model   string // e.g. "claude-opus-4-5"
	BaseURL string // defaults to "https://api.anthropic.com"
}

// claudeAdapter implements Provider for the Anthropic Messages API.
type claudeAdapter struct {
	cfg    ClaudeConfig
	client *http.Client
}

// newClaude creates a Claude provider adapter.
func newClaude(cfg ClaudeConfig) *claudeAdapter {
	if cfg.BaseURL == "" {
		cfg.BaseURL = "https://api.anthropic.com"
	}
	if cfg.Model == "" {
		cfg.Model = "claude-opus-4-5"
	}
	return &claudeAdapter{cfg: cfg, client: &http.Client{Timeout: 120 * time.Second}}
}

// ── wire types ────────────────────────────────────────────────────────────────

type claudeContentBlock struct {
	Type      string      `json:"type"`
	Text      string      `json:"text,omitempty"`
	ID        string      `json:"id,omitempty"`
	Name      string      `json:"name,omitempty"`
	Input     interface{} `json:"input,omitempty"`
	ToolUseID string      `json:"tool_use_id,omitempty"`
	Content   string      `json:"content,omitempty"`
}

type claudeMessage struct {
	Role    string      `json:"role"`
	Content interface{} `json:"content"` // string or []claudeContentBlock
}

type claudeToolInputSchema struct {
	Type       string         `json:"type"`
	Properties map[string]any `json:"properties,omitempty"`
	Required   []string       `json:"required,omitempty"`
}

type claudeToolDef struct {
	Name        string                `json:"name"`
	Description string                `json:"description"`
	InputSchema claudeToolInputSchema `json:"input_schema"`
}

type claudeRequest struct {
	Model     string          `json:"model"`
	MaxTokens int             `json:"max_tokens"`
	System    string          `json:"system,omitempty"`
	Messages  []claudeMessage `json:"messages"`
	Tools     []claudeToolDef `json:"tools,omitempty"`
}

type claudeResponse struct {
	Content []claudeContentBlock `json:"content"`
	Error   *struct {
		Type    string `json:"type"`
		Message string `json:"message"`
	} `json:"error"`
}

// Complete sends a request to the Anthropic Messages API.
func (a *claudeAdapter) Complete(ctx context.Context, req ChatRequest) (*ProviderResponse, error) {
	var systemPrompt string
	var msgs []claudeMessage

	for _, m := range req.Messages {
		switch m.Role {
		case RoleSystem:
			systemPrompt = m.Content
		case RoleUser:
			msgs = append(msgs, claudeMessage{Role: "user", Content: m.Content})
		case RoleAssistant:
			if len(m.ToolCalls) == 0 {
				msgs = append(msgs, claudeMessage{Role: "assistant", Content: m.Content})
			} else {
				var blocks []claudeContentBlock
				if m.Content != "" {
					blocks = append(blocks, claudeContentBlock{Type: "text", Text: m.Content})
				}
				for _, tc := range m.ToolCalls {
					var inputMap interface{}
					_ = json.Unmarshal([]byte(tc.ArgJSON), &inputMap)
					blocks = append(blocks, claudeContentBlock{
						Type:  "tool_use",
						ID:    tc.ID,
						Name:  tc.Name,
						Input: inputMap,
					})
				}
				msgs = append(msgs, claudeMessage{Role: "assistant", Content: blocks})
			}
		case RoleTool:
			block := claudeContentBlock{
				Type:      "tool_result",
				ToolUseID: m.ToolCallID,
				Content:   m.Content,
			}
			msgs = append(msgs, claudeMessage{Role: "user", Content: []claudeContentBlock{block}})
		}
	}

	tools := make([]claudeToolDef, 0, len(req.Tools))
	for _, t := range req.Tools {
		schema := claudeToolInputSchema{Type: "object"}
		if props, ok := t.Parameters["properties"].(map[string]any); ok {
			schema.Properties = props
		}
		if req, ok := t.Parameters["required"].([]string); ok {
			schema.Required = req
		}
		tools = append(tools, claudeToolDef{
			Name:        t.Name,
			Description: t.Description,
			InputSchema: schema,
		})
	}

	payload := claudeRequest{
		Model:     a.cfg.Model,
		MaxTokens: 4096,
		System:    systemPrompt,
		Messages:  msgs,
		Tools:     tools,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("claude: marshal: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost,
		a.cfg.BaseURL+"/v1/messages", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("claude: create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("x-api-key", a.cfg.APIKey)
	httpReq.Header.Set("anthropic-version", "2023-06-01")

	resp, err := a.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("claude: http: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("claude: read: %w", err)
	}

	var apiResp claudeResponse
	if err := json.Unmarshal(respBody, &apiResp); err != nil {
		return nil, fmt.Errorf("claude: decode: %w", err)
	}
	if apiResp.Error != nil {
		return nil, fmt.Errorf("claude API error: %s", apiResp.Error.Message)
	}

	result := &ProviderResponse{}
	for _, block := range apiResp.Content {
		switch block.Type {
		case "text":
			result.Content += block.Text
		case "tool_use":
			inputJSON, _ := json.Marshal(block.Input)
			result.ToolCalls = append(result.ToolCalls, ToolCall{
				ID:      block.ID,
				Name:    block.Name,
				ArgJSON: string(inputJSON),
			})
		}
	}
	return result, nil
}
