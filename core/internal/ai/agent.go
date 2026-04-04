package ai

import (
	"context"
	"encoding/json"
	"fmt"
)

const maxIterations = 12

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

		// If no tool calls, we're done
		if len(resp.ToolCalls) == 0 {
			break
		}

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
				resultText = fmt.Sprintf("Tool error: %s", err)
				resultChunk = Chunk{Type: ChunkToolResult, Tool: tc.Name, Result: map[string]any{"error": err.Error()}}
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
