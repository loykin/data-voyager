package aiconfig

import (
	"context"
	"time"
)

// AIConfigHistory is an audit record for a change to an AI config.
type AIConfigHistory struct {
	ID         string    `db:"id"`
	ConfigID   string    `db:"config_id"`
	ConfigName string    `db:"config_name"`
	Provider   string    `db:"provider"`
	Action     string    `db:"action"` // created | updated | deleted | activated
	ChangedAt  time.Time `db:"changed_at"`
}

// HistoryRepository persists and queries AI config audit records.
type HistoryRepository interface {
	Record(ctx context.Context, h *AIConfigHistory) error
	List(ctx context.Context, limit, offset int) ([]*AIConfigHistory, error)
	ListByConfig(ctx context.Context, configID string, limit, offset int) ([]*AIConfigHistory, error)
}

// NoopHistoryRepository silently discards all writes and returns empty reads.
// Used when statistics_store is not configured.
type NoopHistoryRepository struct{}

func (NoopHistoryRepository) Record(_ context.Context, _ *AIConfigHistory) error { return nil }

func (NoopHistoryRepository) List(_ context.Context, _, _ int) ([]*AIConfigHistory, error) {
	return []*AIConfigHistory{}, nil
}

func (NoopHistoryRepository) ListByConfig(_ context.Context, _ string, _, _ int) ([]*AIConfigHistory, error) {
	return []*AIConfigHistory{}, nil
}
