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
		return newClaude(ClaudeConfig{
			APIKey:  cfg.Claude.APIKey,
			Model:   cfg.Claude.Model,
			BaseURL: cfg.Claude.BaseURL,
		}), nil

	case "openai":
		return newOpenAI(OpenAIConfig{
			BaseURL: cfg.OpenAI.BaseURL,
			APIKey:  cfg.OpenAI.APIKey,
			Model:   cfg.OpenAI.Model,
		}), nil

	case "copilot":
		return newOpenAI(OpenAIConfig{
			BaseURL: cfg.Copilot.BaseURL,
			APIKey:  cfg.Copilot.APIKey,
			Model:   cfg.Copilot.Model,
		}), nil

	case "ollama":
		return newOpenAI(OpenAIConfig{
			BaseURL: cfg.Ollama.BaseURL,
			APIKey:  "", // Ollama doesn't need an API key
			Model:   cfg.Ollama.Model,
		}), nil

	default:
		return nil, fmt.Errorf("unknown AI provider: %s", cfg.Provider)
	}
}
