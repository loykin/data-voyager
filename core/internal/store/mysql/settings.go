package mysql

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"data-voyager/core/internal/settings"
)

type settingsRepo struct {
	db *sqlx.DB
}

func NewSettingsRepo(db *sqlx.DB) settings.Repository {
	return &settingsRepo{db: db}
}

type settingRow struct {
	ID        string    `db:"id"`
	Key       string    `db:"key"`
	Value     string    `db:"value"`
	IsSecret  int       `db:"is_secret"`
	UpdatedAt time.Time `db:"updated_at"`
}

func (r settingRow) toModel() *settings.Setting {
	return &settings.Setting{
		ID:        r.ID,
		Key:       r.Key,
		Value:     r.Value,
		IsSecret:  r.IsSecret == 1,
		UpdatedAt: r.UpdatedAt,
	}
}

func (r *settingsRepo) Get(ctx context.Context, key string) (*settings.Setting, error) {
	var row settingRow
	err := r.db.GetContext(ctx, &row, "SELECT * FROM ai_settings WHERE `key` = ?", key)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("setting %q not found", key)
	}
	if err != nil {
		return nil, fmt.Errorf("get setting: %w", err)
	}
	return row.toModel(), nil
}

func (r *settingsRepo) Set(ctx context.Context, key, value string, isSecret bool) error {
	newID, err := uuid.NewV7()
	if err != nil {
		return fmt.Errorf("generate uuid: %w", err)
	}

	isSecretInt := 0
	if isSecret {
		isSecretInt = 1
	}

	const q = "INSERT INTO ai_settings (id, `key`, value, is_secret, updated_at) VALUES (?, ?, ?, ?, ?)" +
		" ON DUPLICATE KEY UPDATE value = VALUES(value), is_secret = VALUES(is_secret), updated_at = VALUES(updated_at)"

	_, err = r.db.ExecContext(ctx, q,
		newID.String(), key, value, isSecretInt, time.Now().UTC())
	if err != nil {
		return fmt.Errorf("set setting: %w", err)
	}
	return nil
}

func (r *settingsRepo) GetAll(ctx context.Context) ([]*settings.Setting, error) {
	var rows []settingRow
	if err := r.db.SelectContext(ctx, &rows, "SELECT * FROM ai_settings ORDER BY `key`"); err != nil {
		return nil, fmt.Errorf("list settings: %w", err)
	}
	result := make([]*settings.Setting, len(rows))
	for i := range rows {
		result[i] = rows[i].toModel()
	}
	return result, nil
}

func (r *settingsRepo) Delete(ctx context.Context, key string) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM ai_settings WHERE `key` = ?", key)
	if err != nil {
		return fmt.Errorf("delete setting: %w", err)
	}
	return nil
}
