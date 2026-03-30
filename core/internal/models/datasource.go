package models

import (
	"encoding/json"
	"time"

	"data-voyager/sdk"
)

// DataSource is the GORM model for persisted datasource metadata.
type DataSource struct {
	ID          uint                      `json:"id" gorm:"primaryKey"`
	Name        string                    `json:"name" gorm:"uniqueIndex;not null"`
	Type        sdk.DataSourceType        `json:"type" gorm:"not null"`
	Config      json.RawMessage           `json:"config" gorm:"type:text"`
	Description string                    `json:"description"`
	Tags        []string                  `json:"tags" gorm:"serializer:json"`
	IsActive    bool                      `json:"is_active" gorm:"default:true"`
	CreatedAt   time.Time                 `json:"created_at"`
	UpdatedAt   time.Time                 `json:"updated_at"`
	CreatedBy   string                    `json:"created_by"`
	TestResult  *sdk.ConnectionTestResult `json:"test_result,omitempty" gorm:"-"`
}
