package models

import (
	"encoding/json"
	"fmt"
	"time"
)

// DataSourceType represents the type of data source
type DataSourceType string

const (
	DataSourceTypeClickHouse  DataSourceType = "clickhouse"
	DataSourceTypePostgreSQL DataSourceType = "postgresql"
	DataSourceTypeSQLite     DataSourceType = "sqlite"
	DataSourceTypeOpenSearch DataSourceType = "opensearch"
)

// DataSource represents a data source configuration
type DataSource struct {
	ID          uint                   `json:"id" gorm:"primaryKey"`
	Name        string                 `json:"name" gorm:"uniqueIndex;not null"` // Unique identifier
	Type        DataSourceType         `json:"type" gorm:"not null"`            // Database type
	Config      json.RawMessage        `json:"config" gorm:"type:text"`         // Connection config as JSON
	Description string                 `json:"description"`
	Tags        []string               `json:"tags" gorm:"serializer:json"`
	IsActive    bool                   `json:"is_active" gorm:"default:true"`
	CreatedAt   time.Time              `json:"created_at"`
	UpdatedAt   time.Time              `json:"updated_at"`
	CreatedBy   string                 `json:"created_by"`
	TestResult  *ConnectionTestResult  `json:"test_result,omitempty" gorm:"-"` // Not stored in DB
}

// ConnectionTestResult represents the result of testing a connection
type ConnectionTestResult struct {
	IsConnected bool      `json:"is_connected"`
	Message     string    `json:"message"`
	Latency     int64     `json:"latency_ms"` // in milliseconds
	TestedAt    time.Time `json:"tested_at"`
}

// ConnectionConfig is a generic interface for all connection configurations
type ConnectionConfig interface {
	Validate() error
	GetConnectionString() string
}

// ClickHouseConfig represents ClickHouse connection configuration
type ClickHouseConfig struct {
	Host     string `json:"host" toml:"host"`
	Port     int    `json:"port" toml:"port"`
	Database string `json:"database" toml:"database"`
	Username string `json:"username" toml:"username"`
	Password string `json:"password" toml:"password"`
	Secure   bool   `json:"secure" toml:"secure"`
}

func (c *ClickHouseConfig) Validate() error {
	if c.Host == "" {
		return fmt.Errorf("host is required")
	}
	if c.Port <= 0 {
		c.Port = 9000 // Default ClickHouse port
	}
	return nil
}

func (c *ClickHouseConfig) GetConnectionString() string {
	protocol := "tcp"
	if c.Secure {
		protocol = "tls"
	}
	return fmt.Sprintf("%s://%s:%d/%s?username=%s&password=%s",
		protocol, c.Host, c.Port, c.Database, c.Username, c.Password)
}

// PostgreSQLConfig represents PostgreSQL connection configuration
type PostgreSQLConfig struct {
	Host     string `json:"host" toml:"host"`
	Port     int    `json:"port" toml:"port"`
	Database string `json:"database" toml:"database"`
	Username string `json:"username" toml:"username"`
	Password string `json:"password" toml:"password"`
	SSLMode  string `json:"ssl_mode" toml:"ssl_mode"`
}

func (c *PostgreSQLConfig) Validate() error {
	if c.Host == "" {
		return fmt.Errorf("host is required")
	}
	if c.Port <= 0 {
		c.Port = 5432 // Default PostgreSQL port
	}
	if c.SSLMode == "" {
		c.SSLMode = "prefer"
	}
	return nil
}

func (c *PostgreSQLConfig) GetConnectionString() string {
	return fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		c.Host, c.Port, c.Username, c.Password, c.Database, c.SSLMode)
}

// SQLiteConfig represents SQLite connection configuration
type SQLiteConfig struct {
	Path string `json:"path" toml:"path"`
}

func (c *SQLiteConfig) Validate() error {
	if c.Path == "" {
		return fmt.Errorf("path is required")
	}
	return nil
}

func (c *SQLiteConfig) GetConnectionString() string {
	return c.Path
}

// OpenSearchConfig represents OpenSearch connection configuration
type OpenSearchConfig struct {
	URLs     []string `json:"urls" toml:"urls"`
	Username string   `json:"username" toml:"username"`
	Password string   `json:"password" toml:"password"`
	APIKey   string   `json:"api_key" toml:"api_key"`
}

func (c *OpenSearchConfig) Validate() error {
	if len(c.URLs) == 0 {
		return fmt.Errorf("at least one URL is required")
	}
	return nil
}

func (c *OpenSearchConfig) GetConnectionString() string {
	return c.URLs[0] // Return first URL as primary
}