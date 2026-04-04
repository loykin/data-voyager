package settings

import (
	"context"
	"time"
)

// Setting represents a single AI settings entry stored in the DB.
type Setting struct {
	ID        string    `db:"id"`
	Key       string    `db:"key"`
	Value     string    `db:"value"`
	IsSecret  bool      `db:"is_secret"`
	UpdatedAt time.Time `db:"updated_at"`
}

// Repository defines the persistence operations for AI settings.
type Repository interface {
	Get(ctx context.Context, key string) (*Setting, error)
	Set(ctx context.Context, key, value string, isSecret bool) error
	GetAll(ctx context.Context) ([]*Setting, error)
	Delete(ctx context.Context, key string) error
}
