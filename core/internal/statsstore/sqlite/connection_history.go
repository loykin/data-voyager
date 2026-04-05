package sqlite

import (
	"context"
	"fmt"
	"time"

	"github.com/jmoiron/sqlx"

	"data-voyager/core/internal/connection"
)

type connectionHistoryRepo struct {
	db *sqlx.DB
}

// NewConnectionHistoryRepo returns a connection.HistoryRepository backed by SQLite.
func NewConnectionHistoryRepo(db *sqlx.DB) connection.HistoryRepository {
	return &connectionHistoryRepo{db: db}
}

type connHistoryRow struct {
	ID             string `db:"id"`
	ConnectionID   string `db:"connection_id"`
	ConnectionName string `db:"connection_name"`
	ConnectionType string `db:"connection_type"`
	Action         string `db:"action"`
	ChangedAt      string `db:"changed_at"`
}

func (r connHistoryRow) toModel() *connection.ConnectionHistory {
	t, _ := time.Parse("2006-01-02 15:04:05", r.ChangedAt)
	if t.IsZero() {
		t, _ = time.Parse(time.RFC3339, r.ChangedAt)
	}
	return &connection.ConnectionHistory{
		ID:             r.ID,
		ConnectionID:   r.ConnectionID,
		ConnectionName: r.ConnectionName,
		ConnectionType: r.ConnectionType,
		Action:         r.Action,
		ChangedAt:      t,
	}
}

func (repo *connectionHistoryRepo) Record(ctx context.Context, h *connection.ConnectionHistory) error {
	_, err := repo.db.ExecContext(ctx,
		`INSERT INTO connection_history (id, connection_id, connection_name, connection_type, action, changed_at)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		h.ID, h.ConnectionID, h.ConnectionName, h.ConnectionType, h.Action,
		h.ChangedAt.UTC().Format("2006-01-02 15:04:05"),
	)
	if err != nil {
		return fmt.Errorf("record connection_history: %w", err)
	}
	return nil
}

func (repo *connectionHistoryRepo) List(ctx context.Context, limit, offset int) ([]*connection.ConnectionHistory, error) {
	var rows []connHistoryRow
	err := repo.db.SelectContext(ctx, &rows,
		`SELECT * FROM connection_history ORDER BY changed_at DESC LIMIT ? OFFSET ?`,
		limit, offset,
	)
	if err != nil {
		return nil, fmt.Errorf("list connection_history: %w", err)
	}
	return toConnModels(rows), nil
}

func (repo *connectionHistoryRepo) ListByConnection(ctx context.Context, connectionID string, limit, offset int) ([]*connection.ConnectionHistory, error) {
	var rows []connHistoryRow
	err := repo.db.SelectContext(ctx, &rows,
		`SELECT * FROM connection_history WHERE connection_id = ? ORDER BY changed_at DESC LIMIT ? OFFSET ?`,
		connectionID, limit, offset,
	)
	if err != nil {
		return nil, fmt.Errorf("list connection_history by connection: %w", err)
	}
	return toConnModels(rows), nil
}

func toConnModels(rows []connHistoryRow) []*connection.ConnectionHistory {
	out := make([]*connection.ConnectionHistory, len(rows))
	for i, r := range rows {
		out[i] = r.toModel()
	}
	return out
}
