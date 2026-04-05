package ai

import (
	"fmt"

	"data-voyager/core/internal/config"
)

// NewProvider constructs the AI provider from config.
func NewProvider(cfg *config.AIConfig) (Provider, error) {
	if cfg == nil || !cfg.Enabled {
		return nil, fmt.Errorf("AI is not enabled in config")
	}

	switch cfg.Provider {
	case "claude":
		model := cfg.Claude.Model
		if model == "" {
			model = "claude-opus-4-5"
		}
		return newClaude(ClaudeConfig{
			APIKey:  cfg.Claude.APIKey,
			Model:   model,
			BaseURL: cfg.Claude.BaseURL,
		}), nil

	case "openai":
		model := cfg.OpenAI.Model
		if model == "" {
			model = "gpt-4o"
		}
		return newOpenAI(OpenAIConfig{
			BaseURL: cfg.OpenAI.BaseURL,
			APIKey:  cfg.OpenAI.APIKey,
			Model:   model,
		}), nil

	case "copilot":
		model := cfg.Copilot.Model
		if model == "" {
			model = "gpt-4o"
		}
		return newOpenAI(OpenAIConfig{
			BaseURL: cfg.Copilot.BaseURL,
			APIKey:  cfg.Copilot.APIKey,
			Model:   model,
		}), nil

	case "ollama":
		model := cfg.Ollama.Model
		if model == "" {
			model = "qwen2.5-coder:7b"
		}
		return newOpenAI(OpenAIConfig{
			BaseURL: cfg.Ollama.BaseURL,
			APIKey:  "", // Ollama doesn't need an API key
			Model:   model,
		}), nil

	default:
		return nil, fmt.Errorf("unknown AI provider: %s", cfg.Provider)
	}
}
