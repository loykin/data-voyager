package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

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

	const q = `
		INSERT INTO data_sources
			(name, type, config, description, tags, is_active, created_at, updated_at, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id`

	err := r.db.QueryRowContext(ctx, q,
		c.Name, string(c.Type), string(c.Config),
		c.Description, marshalTags(c.Tags),
		c.IsActive, c.CreatedAt, c.UpdatedAt, c.CreatedBy,
	).Scan(&c.ID)
	if err != nil {
		return fmt.Errorf("create connection: %w", err)
	}
	return nil
}

func (r *connectionRepo) GetByID(ctx context.Context, id int64) (*connection.Connection, error) {
	var row row
	err := r.db.GetContext(ctx, &row, `SELECT * FROM data_sources WHERE id = $1`, id)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("connection %d not found", id)
	}
	if err != nil {
		return nil, fmt.Errorf("get connection: %w", err)
	}
	return row.toModel(), nil
}

func (r *connectionRepo) GetByName(ctx context.Context, name string) (*connection.Connection, error) {
	var row row
	err := r.db.GetContext(ctx, &row, `SELECT * FROM data_sources WHERE name = $1`, name)
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
	n := 1

	if filter.Type != "" {
		q += fmt.Sprintf(` AND type = $%d`, n)
		args = append(args, string(filter.Type))
		n++
	}
	if filter.IsActive != nil {
		q += fmt.Sprintf(` AND is_active = $%d`, n)
		args = append(args, *filter.IsActive)
		n++
	}
	if filter.CreatedBy != "" {
		q += fmt.Sprintf(` AND created_by = $%d`, n)
		args = append(args, filter.CreatedBy)
		n++
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

	const q = `
		UPDATE data_sources SET
			name = $1, type = $2, config = $3, description = $4,
			tags = $5, is_active = $6, updated_at = $7, created_by = $8
		WHERE id = $9`

	_, err := r.db.ExecContext(ctx, q,
		c.Name, string(c.Type), string(c.Config),
		c.Description, marshalTags(c.Tags),
		c.IsActive, c.UpdatedAt, c.CreatedBy, c.ID,
	)
	if err != nil {
		return fmt.Errorf("update connection: %w", err)
	}
	return nil
}

func (r *connectionRepo) Delete(ctx context.Context, id int64) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM data_sources WHERE id = $1`, id)
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
		`SELECT COUNT(*) FROM data_sources WHERE is_active = TRUE`); err != nil {
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

// row is the sqlx scan target for PostgreSQL.
type row struct {
	ID          int64     `db:"id"`
	Name        string    `db:"name"`
	Type        string    `db:"type"`
	Config      string    `db:"config"`
	Description string    `db:"description"`
	Tags        string    `db:"tags"`
	IsActive    bool      `db:"is_active"`
	CreatedAt   time.Time `db:"created_at"`
	UpdatedAt   time.Time `db:"updated_at"`
	CreatedBy   string    `db:"created_by"`
}

func (r *row) toModel() *connection.Connection {
	return &connection.Connection{
		ID:          r.ID,
		Name:        r.Name,
		Type:        sdk.DataSourceType(r.Type),
		Config:      json.RawMessage(r.Config),
		Description: r.Description,
		Tags:        unmarshalTags(r.Tags),
		IsActive:    r.IsActive,
		CreatedAt:   r.CreatedAt,
		UpdatedAt:   r.UpdatedAt,
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
