package sqlite

import (
	"context"
	"fmt"
	"time"

	"github.com/jmoiron/sqlx"

	"data-voyager/core/internal/aiconfig"
)

type aiConfigHistoryRepo struct {
	db *sqlx.DB
}

// NewAIConfigHistoryRepo returns an aiconfig.HistoryRepository backed by SQLite.
func NewAIConfigHistoryRepo(db *sqlx.DB) aiconfig.HistoryRepository {
	return &aiConfigHistoryRepo{db: db}
}

type historyRow struct {
	ID         string `db:"id"`
	ConfigID   string `db:"config_id"`
	ConfigName string `db:"config_name"`
	Provider   string `db:"provider"`
	Action     string `db:"action"`
	ChangedAt  string `db:"changed_at"`
}

func (r historyRow) toModel() *aiconfig.AIConfigHistory {
	t, _ := time.Parse("2006-01-02 15:04:05", r.ChangedAt)
	if t.IsZero() {
		t, _ = time.Parse(time.RFC3339, r.ChangedAt)
	}
	return &aiconfig.AIConfigHistory{
		ID:         r.ID,
		ConfigID:   r.ConfigID,
		ConfigName: r.ConfigName,
		Provider:   r.Provider,
		Action:     r.Action,
		ChangedAt:  t,
	}
}

func (repo *aiConfigHistoryRepo) Record(ctx context.Context, h *aiconfig.AIConfigHistory) error {
	_, err := repo.db.ExecContext(ctx,
		`INSERT INTO ai_config_history (id, config_id, config_name, provider, action, changed_at)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		h.ID, h.ConfigID, h.ConfigName, h.Provider, h.Action,
		h.ChangedAt.UTC().Format("2006-01-02 15:04:05"),
	)
	if err != nil {
		return fmt.Errorf("record ai_config_history: %w", err)
	}
	return nil
}

func (repo *aiConfigHistoryRepo) List(ctx context.Context, limit, offset int) ([]*aiconfig.AIConfigHistory, error) {
	var rows []historyRow
	err := repo.db.SelectContext(ctx, &rows,
		`SELECT * FROM ai_config_history ORDER BY changed_at DESC LIMIT ? OFFSET ?`,
		limit, offset,
	)
	if err != nil {
		return nil, fmt.Errorf("list ai_config_history: %w", err)
	}
	return toModels(rows), nil
}

func (repo *aiConfigHistoryRepo) ListByConfig(ctx context.Context, configID string, limit, offset int) ([]*aiconfig.AIConfigHistory, error) {
	var rows []historyRow
	err := repo.db.SelectContext(ctx, &rows,
		`SELECT * FROM ai_config_history WHERE config_id = ? ORDER BY changed_at DESC LIMIT ? OFFSET ?`,
		configID, limit, offset,
	)
	if err != nil {
		return nil, fmt.Errorf("list ai_config_history by config: %w", err)
	}
	return toModels(rows), nil
}

func toModels(rows []historyRow) []*aiconfig.AIConfigHistory {
	out := make([]*aiconfig.AIConfigHistory, len(rows))
	for i, r := range rows {
		out[i] = r.toModel()
	}
	return out
}
