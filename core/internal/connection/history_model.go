package connection

import (
	"context"
	"time"
)

// ConnectionHistory is an audit record for a change to a connection/datasource.
type ConnectionHistory struct {
	ID             string    `db:"id"`
	ConnectionID   string    `db:"connection_id"`
	ConnectionName string    `db:"connection_name"`
	ConnectionType string    `db:"connection_type"`
	Action         string    `db:"action"` // created | updated | deleted
	ChangedAt      time.Time `db:"changed_at"`
}

// HistoryRepository persists and queries connection audit records.
type HistoryRepository interface {
	Record(ctx context.Context, h *ConnectionHistory) error
	List(ctx context.Context, limit, offset int) ([]*ConnectionHistory, error)
	ListByConnection(ctx context.Context, connectionID string, limit, offset int) ([]*ConnectionHistory, error)
}

// NoopHistoryRepository silently discards all writes and returns empty reads.
// Used when statistics_store is not configured.
type NoopHistoryRepository struct{}

func (NoopHistoryRepository) Record(_ context.Context, _ *ConnectionHistory) error { return nil }

func (NoopHistoryRepository) List(_ context.Context, _, _ int) ([]*ConnectionHistory, error) {
	return []*ConnectionHistory{}, nil
}

func (NoopHistoryRepository) ListByConnection(_ context.Context, _ string, _, _ int) ([]*ConnectionHistory, error) {
	return []*ConnectionHistory{}, nil
}
