package connection

import (
	"encoding/json"
	"time"

	"data-voyager/sdk"
)

// Connection is a stored datasource connection configuration.
type Connection struct {
	ID          int64              `json:"id"          db:"id"`
	Name        string             `json:"name"        db:"name"`
	Type        sdk.DataSourceType `json:"type"        db:"type"`
	Config      json.RawMessage    `json:"config"      db:"config"`
	Description string             `json:"description" db:"description"`
	IsActive    bool               `json:"is_active"   db:"is_active"`
	CreatedAt   time.Time          `json:"created_at"  db:"created_at"`
	UpdatedAt   time.Time          `json:"updated_at"  db:"updated_at"`
	CreatedBy   string             `json:"created_by"  db:"created_by"`

	Tags       []string                  `json:"tags,omitempty"        db:"-"`
	TestResult *sdk.ConnectionTestResult `json:"test_result,omitempty" db:"-"`
}
