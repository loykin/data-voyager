package postgres

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

// NewAIConfigHistoryRepo returns an aiconfig.HistoryRepository backed by PostgreSQL.
func NewAIConfigHistoryRepo(db *sqlx.DB) aiconfig.HistoryRepository {
	return &aiConfigHistoryRepo{db: db}
}

type historyRow struct {
	ID         string    `db:"id"`
	ConfigID   string    `db:"config_id"`
	ConfigName string    `db:"config_name"`
	Provider   string    `db:"provider"`
	Action     string    `db:"action"`
	ChangedAt  time.Time `db:"changed_at"`
}

func (r historyRow) toModel() *aiconfig.AIConfigHistory {
	return &aiconfig.AIConfigHistory{
		ID:         r.ID,
		ConfigID:   r.ConfigID,
		ConfigName: r.ConfigName,
		Provider:   r.Provider,
		Action:     r.Action,
		ChangedAt:  r.ChangedAt,
	}
}

func (repo *aiConfigHistoryRepo) Record(ctx context.Context, h *aiconfig.AIConfigHistory) error {
	_, err := repo.db.ExecContext(ctx,
		`INSERT INTO ai_config_history (id, config_id, config_name, provider, action, changed_at)
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		h.ID, h.ConfigID, h.ConfigName, h.Provider, h.Action, h.ChangedAt,
	)
	if err != nil {
		return fmt.Errorf("record ai_config_history: %w", err)
	}
	return nil
}

func (repo *aiConfigHistoryRepo) List(ctx context.Context, limit, offset int) ([]*aiconfig.AIConfigHistory, error) {
	var rows []historyRow
	err := repo.db.SelectContext(ctx, &rows,
		`SELECT * FROM ai_config_history ORDER BY changed_at DESC LIMIT $1 OFFSET $2`,
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
		`SELECT * FROM ai_config_history WHERE config_id = $1 ORDER BY changed_at DESC LIMIT $2 OFFSET $3`,
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
