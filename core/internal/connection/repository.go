package connection

import (
	"context"

	"data-voyager/sdk"
)

// Repository is the persistence interface for Connection.
// Implemented per-driver in store/{postgres,sqlite,mysql}/.
type Repository interface {
	Create(ctx context.Context, c *Connection) error
	GetByID(ctx context.Context, id int64) (*Connection, error)
	GetByName(ctx context.Context, name string) (*Connection, error)
	List(ctx context.Context, filter Filter) ([]*Connection, error)
	Update(ctx context.Context, c *Connection) error
	Delete(ctx context.Context, id int64) error
	Stats(ctx context.Context) (*Stats, error)
	Health(ctx context.Context) error
}

// Filter holds optional filters for List.
type Filter struct {
	Type      sdk.DataSourceType
	IsActive  *bool
	CreatedBy string
	Tags      []string
}

// Stats holds aggregate counts.
type Stats struct {
	TotalCount  int64                        `json:"total_count"`
	ActiveCount int64                        `json:"active_count"`
	CountByType map[sdk.DataSourceType]int64 `json:"count_by_type"`
}
