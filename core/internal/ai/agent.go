package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
)

const maxIterations = 12

// cleanContent strips model-specific special tokens and XML wrapper tags that leak into output.
func cleanContent(s string) string {
	// Qwen / common chat template special tokens
	for _, tok := range []string{"<|im_start|>", "<|im_end|>", "<|endoftext|>", "<|start_header_id|>", "<|end_header_id|>", "<|eot_id|>"} {
		s = strings.ReplaceAll(s, tok, "")
	}
	// Strip XML wrapper tags that qwen/local models emit, preserving inner text.
	// e.g. <reply>...</reply>, <error>...</error>, <answer>...</answer>
	wrappers := []string{"reply", "error", "answer", "response", "result", "thinking", "think"}
	for _, tag := range wrappers {
		open := "<" + tag + ">"
		close := "</" + tag + ">"
		// extract content between open/close tags
		for {
			start := strings.Index(s, open)
			if start == -1 {
				break
			}
			end := strings.Index(s, close)
			if end == -1 {
				// no closing tag — just remove the open tag
				s = strings.ReplaceAll(s, open, "")
				break
			}
			innerStart := start + len(open)
			inner := strings.TrimSpace(s[innerStart:end])
			s = strings.TrimSpace(s[:start]) + "\n" + inner + "\n" + strings.TrimSpace(s[end+len(close):])
		}
		s = strings.ReplaceAll(s, close, "")
	}
	return strings.TrimSpace(s)
}

// Agent runs the tool-calling loop and emits Chunks to the provided channel.
type Agent struct {
	provider Provider
	executor *ToolExecutor
	tools    []Tool
}

// NewAgent creates an Agent.
func NewAgent(provider Provider, executor *ToolExecutor) *Agent {
	return &Agent{
		provider: provider,
		executor: executor,
		tools:    AvailableTools(),
	}
}

// Run executes the agent loop for a given conversation and connection.
// Chunks are sent to the out channel. The channel is closed when done.
func (a *Agent) Run(ctx context.Context, connID string, messages []Message, out chan<- Chunk) {
	defer close(out)

	msgs := make([]Message, len(messages))
	copy(msgs, messages)

	nudgeCount := 0        // how many nudges we've sent this session
	hadToolErrors := false // did the last round of tools produce errors?
	const maxNudges = 3

	for iter := 0; iter < maxIterations; iter++ {
		resp, err := a.provider.Complete(ctx, ChatRequest{
			Messages: msgs,
			Tools:    a.tools,
		})
		if err != nil {
			select {
			case out <- Chunk{Type: ChunkError, Content: err.Error()}:
			case <-ctx.Done():
			}
			return
		}

		resp.Content = cleanContent(resp.Content)

		// Fallback: some Ollama models emit tool calls as plain text JSON
		// instead of using the tool_calls API field.
		// Run AFTER cleanContent so special tokens (e.g. <|im_start|>) don't
		// break JSON parsing.
		if len(resp.ToolCalls) == 0 && resp.Content != "" {
			if tc, remaining := parseFallbackToolCall(resp.Content); tc != nil {
				resp.ToolCalls = []ToolCall{*tc}
				resp.Content = remaining
			}
		}

		// Append assistant message to conversation history
		assistantMsg := Message{
			Role:      RoleAssistant,
			Content:   resp.Content,
			ToolCalls: resp.ToolCalls,
		}
		msgs = append(msgs, assistantMsg)

		// Stream any text content first
		if resp.Content != "" {
			select {
			case out <- Chunk{Type: ChunkToken, Content: resp.Content}:
			case <-ctx.Done():
				return
			}
		}

		// If no tool calls: only nudge if there were actual errors last round
		if len(resp.ToolCalls) == 0 {
			if hadToolErrors && nudgeCount < maxNudges {
				nudgeCount++
				hadToolErrors = false
				msgs = append(msgs, Message{
					Role:    RoleUser,
					Content: "The previous query failed or was blocked. Please call run_query again with corrected SQL using only the column names from get_schema(table=NAME).",
				})
				continue
			}
			break
		}
		// Reset error state on any tool-call round
		hadToolErrors = false

		// Execute each tool call
		for _, tc := range resp.ToolCalls {
			// Notify frontend: tool is being called
			var argsMap any
			_ = json.Unmarshal([]byte(tc.ArgJSON), &argsMap)
			select {
			case out <- Chunk{Type: ChunkToolCall, Tool: tc.Name, Args: argsMap}:
			case <-ctx.Done():
				return
			}

			// Execute the tool
			resultText, resultChunk, err := a.executor.Execute(ctx, connID, tc)
			if err != nil {
				resultText = fmt.Sprintf("Tool error: %s. Please call run_query again with a corrected SQL statement.", err)
				resultChunk = Chunk{Type: ChunkToolResult, Tool: tc.Name, Result: map[string]any{"error": err.Error()}}
				hadToolErrors = true
			}
			// Detect query errors embedded in resultText
			if strings.Contains(resultText, "Query error:") {
				hadToolErrors = true
			}

			// Send result chunk to frontend
			select {
			case out <- resultChunk:
			case <-ctx.Done():
				return
			}

			// If run_query produced an action payload, also emit action chunk
			if resultChunk.Action != "" {
				select {
				case out <- Chunk{Type: ChunkAction, Action: resultChunk.Action, Payload: resultChunk.Payload}:
				case <-ctx.Done():
					return
				}
			}

			// Feed result back to model as tool message
			msgs = append(msgs, Message{
				Role:       RoleTool,
				Content:    resultText,
				ToolCallID: tc.ID,
			})
		}
	}

	select {
	case out <- Chunk{Type: ChunkDone}:
	case <-ctx.Done():
	}
}
