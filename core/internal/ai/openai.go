package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// OpenAIConfig holds settings for any OpenAI-compatible provider
// (OpenAI, GitHub Copilot, Ollama, LM Studio).
type OpenAIConfig struct {
	BaseURL string // e.g. "https://api.openai.com/v1" or "http://localhost:11434/v1"
	APIKey  string
	Model   string // e.g. "gpt-4o", "llama3"
}

// openAIAdapter implements Provider for any OpenAI-compatible API.
type openAIAdapter struct {
	cfg    OpenAIConfig
	client *http.Client
}

// newOpenAI creates an OpenAI-compatible provider adapter.
func newOpenAI(cfg OpenAIConfig) *openAIAdapter {
	if cfg.BaseURL == "" {
		cfg.BaseURL = "https://api.openai.com/v1"
	}
	return &openAIAdapter{cfg: cfg, client: &http.Client{Timeout: 120 * time.Second}}
}

// ── wire types ────────────────────────────────────────────────────────────────

type oaiReqMessage struct {
	Role       string       `json:"role"`
	Content    interface{}  `json:"content"`
	ToolCallID string       `json:"tool_call_id,omitempty"`
	ToolCalls  []oaiReqTool `json:"tool_calls,omitempty"`
}

type oaiReqTool struct {
	ID       string         `json:"id"`
	Type     string         `json:"type"`
	Function oaiReqFunction `json:"function"`
}

type oaiReqFunction struct {
	Name      string `json:"name"`
	Arguments string `json:"arguments"`
}

type oaiToolDef struct {
	Type     string         `json:"type"`
	Function oaiFunctionDef `json:"function"`
}

type oaiFunctionDef struct {
	Name        string         `json:"name"`
	Description string         `json:"description"`
	Parameters  map[string]any `json:"parameters"`
}

type oaiRequest struct {
	Model    string          `json:"model"`
	Messages []oaiReqMessage `json:"messages"`
	Tools    []oaiToolDef    `json:"tools,omitempty"`
}

type oaiResponse struct {
	Choices []struct {
		Message struct {
			Content   string       `json:"content"`
			ToolCalls []oaiReqTool `json:"tool_calls"`
		} `json:"message"`
		FinishReason string `json:"finish_reason"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error"`
}

// Complete sends a chat completion request.
func (a *openAIAdapter) Complete(ctx context.Context, req ChatRequest) (*ProviderResponse, error) {
	msgs := make([]oaiReqMessage, 0, len(req.Messages))
	for _, m := range req.Messages {
		rm := oaiReqMessage{
			Role:       string(m.Role),
			Content:    m.Content,
			ToolCallID: m.ToolCallID,
		}
		for _, tc := range m.ToolCalls {
			rm.ToolCalls = append(rm.ToolCalls, oaiReqTool{
				ID:   tc.ID,
				Type: "function",
				Function: oaiReqFunction{
					Name:      tc.Name,
					Arguments: tc.ArgJSON,
				},
			})
		}
		msgs = append(msgs, rm)
	}

	tools := make([]oaiToolDef, 0, len(req.Tools))
	for _, t := range req.Tools {
		tools = append(tools, oaiToolDef{
			Type:     "function",
			Function: oaiFunctionDef(t),
		})
	}

	payload := oaiRequest{Model: a.cfg.Model, Messages: msgs, Tools: tools}
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("openai: marshal: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost,
		a.cfg.BaseURL+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("openai: create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	if a.cfg.APIKey != "" {
		httpReq.Header.Set("Authorization", "Bearer "+a.cfg.APIKey)
	}

	resp, err := a.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("openai: http: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("openai: read: %w", err)
	}

	var apiResp oaiResponse
	if err := json.Unmarshal(respBody, &apiResp); err != nil {
		return nil, fmt.Errorf("openai: decode: %w", err)
	}
	if apiResp.Error != nil {
		return nil, fmt.Errorf("openai API error: %s", apiResp.Error.Message)
	}
	if len(apiResp.Choices) == 0 {
		return nil, fmt.Errorf("openai: no choices in response")
	}

	choice := apiResp.Choices[0].Message
	result := &ProviderResponse{Content: choice.Content}
	for _, tc := range choice.ToolCalls {
		result.ToolCalls = append(result.ToolCalls, ToolCall{
			ID:      tc.ID,
			Name:    tc.Function.Name,
			ArgJSON: tc.Function.Arguments,
		})
	}
	return result, nil
}

// parseFallbackToolCall detects tool calls embedded in content as plain text.
// Some Ollama models output {"name":"...","arguments":{...}} as text instead
// of using the tool_calls API field. Searches the entire content for a
// fenced JSON block or a bare JSON object with a "name" field.
func parseFallbackToolCall(content string) (*ToolCall, string) {
	// 0. Look for <tool_call>...</tool_call> XML format (some Ollama models)
	const tcOpen = "<tool_call>"
	const tcClose = "</tool_call>"
	if start := strings.Index(content, tcOpen); start != -1 {
		if end := strings.Index(content, tcClose); end > start {
			candidate := strings.TrimSpace(content[start+len(tcOpen) : end])
			if tc := parseToolCallJSON(candidate); tc != nil {
				before := strings.TrimSpace(content[:start])
				after := strings.TrimSpace(content[end+len(tcClose):])
				remaining := strings.TrimSpace(before + " " + after)
				return tc, remaining
			}
		}
	}

	// 1. Look for ```json ... ``` or ``` ... ``` blocks anywhere in the content
	for _, fence := range []string{"```json", "```"} {
		start := strings.Index(content, fence)
		if start == -1 {
			continue
		}
		afterFence := content[start+len(fence):]
		// skip optional language tag line
		if nl := strings.Index(afterFence, "\n"); nl >= 0 {
			afterFence = afterFence[nl+1:]
		}
		end := strings.Index(afterFence, "```")
		if end == -1 {
			continue
		}
		candidate := strings.TrimSpace(afterFence[:end])
		if tc := parseToolCallJSON(candidate); tc != nil {
			// return text before and after the fence block as remaining content
			before := strings.TrimSpace(content[:start])
			after := strings.TrimSpace(afterFence[end+3:])
			remaining := strings.TrimSpace(before + " " + after)
			return tc, remaining
		}
	}

	// 2. Try the whole trimmed content as bare JSON
	if tc := parseToolCallJSON(strings.TrimSpace(content)); tc != nil {
		return tc, ""
	}

	return nil, content
}

func parseToolCallJSON(text string) *ToolCall {
	var raw struct {
		Name      string          `json:"name"`
		Arguments json.RawMessage `json:"arguments"`
	}
	if err := json.Unmarshal([]byte(text), &raw); err != nil || raw.Name == "" {
		return nil
	}
	args := "{}"
	if len(raw.Arguments) > 0 {
		args = string(raw.Arguments)
	}
	return &ToolCall{
		ID:      "fallback-" + raw.Name,
		Name:    raw.Name,
		ArgJSON: args,
	}
}
