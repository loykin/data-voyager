package sqlite

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"data-voyager/core/internal/connection"
	"data-voyager/sdk"
)

type connectionRepo struct {
	db *sqlx.DB
}

func NewConnectionRepo(db *sqlx.DB) connection.Repository {
	return &connectionRepo{db: db}
}

func (r *connectionRepo) Health(ctx context.Context) error {
	return r.db.PingContext(ctx)
}

func (r *connectionRepo) Create(ctx context.Context, c *connection.Connection) error {
	now := time.Now().UTC()
	c.CreatedAt = now
	c.UpdatedAt = now

	isActive := 0
	if c.IsActive {
		isActive = 1
	}

	newID, err := uuid.NewV7()
	if err != nil {
		return fmt.Errorf("generate uuid: %w", err)
	}
	c.ID = newID.String()

	const q = `
		INSERT INTO data_sources
			(id, name, type, config, description, tags, is_active, created_at, updated_at, created_by)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

	_, err = r.db.ExecContext(ctx, q,
		c.ID, c.Name, string(c.Type), string(c.Config),
		c.Description, marshalTags(c.Tags),
		isActive,
		c.CreatedAt.Format(time.RFC3339),
		c.UpdatedAt.Format(time.RFC3339),
		c.CreatedBy,
	)
	if err != nil {
		return fmt.Errorf("create connection: %w", err)
	}
	return nil
}

func (r *connectionRepo) GetByID(ctx context.Context, id string) (*connection.Connection, error) {
	var row row
	err := r.db.GetContext(ctx, &row, `SELECT * FROM data_sources WHERE id = ?`, id)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("connection %s not found", id)
	}
	if err != nil {
		return nil, fmt.Errorf("get connection: %w", err)
	}
	return row.toModel(), nil
}

func (r *connectionRepo) GetByName(ctx context.Context, name string) (*connection.Connection, error) {
	var row row
	err := r.db.GetContext(ctx, &row, `SELECT * FROM data_sources WHERE name = ?`, name)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("connection %q not found", name)
	}
	if err != nil {
		return nil, fmt.Errorf("get connection by name: %w", err)
	}
	return row.toModel(), nil
}

func (r *connectionRepo) List(ctx context.Context, filter connection.Filter) ([]*connection.Connection, error) {
	q := `SELECT * FROM data_sources WHERE 1=1`
	args := []any{}

	if filter.Type != "" {
		q += ` AND type = ?`
		args = append(args, string(filter.Type))
	}
	if filter.IsActive != nil {
		val := 0
		if *filter.IsActive {
			val = 1
		}
		q += ` AND is_active = ?`
		args = append(args, val)
	}
	if filter.CreatedBy != "" {
		q += ` AND created_by = ?`
		args = append(args, filter.CreatedBy)
	}
	q += ` ORDER BY created_at DESC`

	var rows []row
	if err := r.db.SelectContext(ctx, &rows, q, args...); err != nil {
		return nil, fmt.Errorf("list connections: %w", err)
	}

	result := make([]*connection.Connection, 0, len(rows))
	for i := range rows {
		c := rows[i].toModel()
		if len(filter.Tags) > 0 && !hasAnyTag(c.Tags, filter.Tags) {
			continue
		}
		result = append(result, c)
	}
	return result, nil
}

func (r *connectionRepo) Update(ctx context.Context, c *connection.Connection) error {
	c.UpdatedAt = time.Now().UTC()

	isActive := 0
	if c.IsActive {
		isActive = 1
	}

	const q = `
		UPDATE data_sources SET
			name = ?, type = ?, config = ?, description = ?,
			tags = ?, is_active = ?, updated_at = ?, created_by = ?
		WHERE id = ?`

	_, err := r.db.ExecContext(ctx, q,
		c.Name, string(c.Type), string(c.Config),
		c.Description, marshalTags(c.Tags),
		isActive,
		c.UpdatedAt.Format(time.RFC3339),
		c.CreatedBy, c.ID,
	)
	if err != nil {
		return fmt.Errorf("update connection: %w", err)
	}
	return nil
}

func (r *connectionRepo) Delete(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM data_sources WHERE id = ?`, id)
	if err != nil {
		return fmt.Errorf("delete connection: %w", err)
	}
	return nil
}

func (r *connectionRepo) Stats(ctx context.Context) (*connection.Stats, error) {
	stats := &connection.Stats{CountByType: make(map[sdk.DataSourceType]int64)}

	if err := r.db.GetContext(ctx, &stats.TotalCount,
		`SELECT COUNT(*) FROM data_sources`); err != nil {
		return nil, fmt.Errorf("stats total: %w", err)
	}
	if err := r.db.GetContext(ctx, &stats.ActiveCount,
		`SELECT COUNT(*) FROM data_sources WHERE is_active = 1`); err != nil {
		return nil, fmt.Errorf("stats active: %w", err)
	}

	var typeCounts []struct {
		Type  string `db:"type"`
		Count int64  `db:"count"`
	}
	if err := r.db.SelectContext(ctx, &typeCounts,
		`SELECT type, COUNT(*) as count FROM data_sources GROUP BY type`); err != nil {
		return nil, fmt.Errorf("stats by type: %w", err)
	}
	for _, tc := range typeCounts {
		stats.CountByType[sdk.DataSourceType(tc.Type)] = tc.Count
	}
	return stats, nil
}

// row is the sqlx scan target for SQLite.
type row struct {
	ID          string `db:"id"`
	Name        string `db:"name"`
	Type        string `db:"type"`
	Config      string `db:"config"`
	Description string `db:"description"`
	Tags        string `db:"tags"`
	IsActive    int8   `db:"is_active"`
	CreatedAt   string `db:"created_at"`
	UpdatedAt   string `db:"updated_at"`
	CreatedBy   string `db:"created_by"`
}

func (r *row) toModel() *connection.Connection {
	createdAt, _ := time.Parse(time.RFC3339, r.CreatedAt)
	updatedAt, _ := time.Parse(time.RFC3339, r.UpdatedAt)
	return &connection.Connection{
		ID:          r.ID,
		Name:        r.Name,
		Type:        sdk.DataSourceType(r.Type),
		Config:      json.RawMessage(r.Config),
		Description: r.Description,
		Tags:        unmarshalTags(r.Tags),
		IsActive:    r.IsActive != 0,
		CreatedAt:   createdAt,
		UpdatedAt:   updatedAt,
		CreatedBy:   r.CreatedBy,
	}
}

func marshalTags(tags []string) string {
	if len(tags) == 0 {
		return "[]"
	}
	b, _ := json.Marshal(tags)
	return string(b)
}

func unmarshalTags(s string) []string {
	if s == "" || s == "[]" || s == "null" {
		return nil
	}
	var tags []string
	_ = json.Unmarshal([]byte(s), &tags)
	return tags
}

func hasAnyTag(dsTags, filterTags []string) bool {
	set := make(map[string]struct{}, len(dsTags))
	for _, t := range dsTags {
		set[t] = struct{}{}
	}
	for _, t := range filterTags {
		if _, ok := set[t]; ok {
			return true
		}
	}
	return false
}
