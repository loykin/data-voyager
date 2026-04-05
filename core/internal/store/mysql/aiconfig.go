package mysql

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/jmoiron/sqlx"

	"data-voyager/core/internal/aiconfig"
)

type aiConfigRepo struct {
	db *sqlx.DB
}

// NewAIConfigRepo returns an aiconfig.Repository backed by MySQL.
func NewAIConfigRepo(db *sqlx.DB) aiconfig.Repository {
	return &aiConfigRepo{db: db}
}

type aiConfigRow struct {
	ID        string `db:"id"`
	Name      string `db:"name"`
	Provider  string `db:"provider"`
	APIKey    string `db:"api_key"`
	Model     string `db:"model"`
	BaseURL   string `db:"base_url"`
	IsActive  int    `db:"is_active"`
	CreatedAt string `db:"created_at"`
	UpdatedAt string `db:"updated_at"`
}

func (r aiConfigRow) toModel() *aiconfig.AIConfig {
	createdAt, _ := time.Parse(time.RFC3339, r.CreatedAt)
	updatedAt, _ := time.Parse(time.RFC3339, r.UpdatedAt)
	return &aiconfig.AIConfig{
		ID:        r.ID,
		Name:      r.Name,
		Provider:  r.Provider,
		APIKey:    r.APIKey,
		Model:     r.Model,
		BaseURL:   r.BaseURL,
		IsActive:  r.IsActive == 1,
		CreatedAt: createdAt,
		UpdatedAt: updatedAt,
	}
}

func (r *aiConfigRepo) List(ctx context.Context) ([]*aiconfig.AIConfig, error) {
	var rows []aiConfigRow
	if err := r.db.SelectContext(ctx, &rows, `SELECT * FROM ai_configs ORDER BY created_at DESC`); err != nil {
		return nil, fmt.Errorf("list ai_configs: %w", err)
	}
	result := make([]*aiconfig.AIConfig, len(rows))
	for i := range rows {
		result[i] = rows[i].toModel()
	}
	return result, nil
}

func (r *aiConfigRepo) GetByID(ctx context.Context, id string) (*aiconfig.AIConfig, error) {
	var row aiConfigRow
	err := r.db.GetContext(ctx, &row, `SELECT * FROM ai_configs WHERE id = ?`, id)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("ai config %s not found", id)
	}
	if err != nil {
		return nil, fmt.Errorf("get ai_config: %w", err)
	}
	return row.toModel(), nil
}

func (r *aiConfigRepo) Create(ctx context.Context, cfg *aiconfig.AIConfig) error {
	isActive := 0
	if cfg.IsActive {
		isActive = 1
	}
	const q = `
		INSERT INTO ai_configs (id, name, provider, api_key, model, base_url, is_active, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
	_, err := r.db.ExecContext(ctx, q,
		cfg.ID, cfg.Name, cfg.Provider, cfg.APIKey, cfg.Model, cfg.BaseURL, isActive,
		cfg.CreatedAt.Format(time.RFC3339),
		cfg.UpdatedAt.Format(time.RFC3339),
	)
	if err != nil {
		return fmt.Errorf("create ai_config: %w", err)
	}
	return nil
}

func (r *aiConfigRepo) Update(ctx context.Context, cfg *aiconfig.AIConfig) error {
	cfg.UpdatedAt = time.Now().UTC()
	isActive := 0
	if cfg.IsActive {
		isActive = 1
	}
	const q = `
		UPDATE ai_configs
		SET name=?, provider=?, api_key=?, model=?, base_url=?, is_active=?, updated_at=?
		WHERE id=?`
	_, err := r.db.ExecContext(ctx, q,
		cfg.Name, cfg.Provider, cfg.APIKey, cfg.Model, cfg.BaseURL, isActive,
		cfg.UpdatedAt.Format(time.RFC3339),
		cfg.ID,
	)
	if err != nil {
		return fmt.Errorf("update ai_config: %w", err)
	}
	return nil
}

func (r *aiConfigRepo) Delete(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM ai_configs WHERE id = ?`, id)
	if err != nil {
		return fmt.Errorf("delete ai_config: %w", err)
	}
	return nil
}

func (r *aiConfigRepo) SetActive(ctx context.Context, id string) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	var count int
	if err := tx.QueryRowContext(ctx, `SELECT COUNT(*) FROM ai_configs WHERE id = ?`, id).Scan(&count); err != nil {
		return fmt.Errorf("check ai_config exists: %w", err)
	}
	if count == 0 {
		return fmt.Errorf("ai config %s not found", id)
	}

	if _, err := tx.ExecContext(ctx, `UPDATE ai_configs SET is_active = 0`); err != nil {
		return fmt.Errorf("clear active: %w", err)
	}
	if _, err := tx.ExecContext(ctx, `UPDATE ai_configs SET is_active = 1 WHERE id = ?`, id); err != nil {
		return fmt.Errorf("set active: %w", err)
	}
	return tx.Commit()
}

func (r *aiConfigRepo) GetActive(ctx context.Context) (*aiconfig.AIConfig, error) {
	var row aiConfigRow
	err := r.db.GetContext(ctx, &row, `SELECT * FROM ai_configs WHERE is_active = 1 LIMIT 1`)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get active ai_config: %w", err)
	}
	return row.toModel(), nil
}
