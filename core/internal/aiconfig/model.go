package aiconfig

import (
	"context"
	"time"
)

// AIConfig represents a stored AI provider configuration.
type AIConfig struct {
	ID        string    `db:"id"`
	Name      string    `db:"name"`
	Provider  string    `db:"provider"` // claude | openai | copilot | ollama
	APIKey    string    `db:"api_key"`  // decrypted in memory, encrypted in DB
	Model     string    `db:"model"`
	BaseURL   string    `db:"base_url"`
	IsActive  bool      `db:"is_active"`
	CreatedAt time.Time `db:"created_at"`
	UpdatedAt time.Time `db:"updated_at"`
}

// Repository defines persistence operations for AI configs.
type Repository interface {
	List(ctx context.Context) ([]*AIConfig, error)
	GetByID(ctx context.Context, id string) (*AIConfig, error)
	Create(ctx context.Context, cfg *AIConfig) error
	Update(ctx context.Context, cfg *AIConfig) error
	Delete(ctx context.Context, id string) error
	SetActive(ctx context.Context, id string) error   // sets is_active=1 for id, 0 for all others
	GetActive(ctx context.Context) (*AIConfig, error) // returns the single active config
}
