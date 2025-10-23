package config

import (
	"data-voyager/core/internal/store"
	"fmt"
)

// Config represents the application configuration
type Config struct {
	Server        ServerConfig              `toml:"server"`
	MetadataStore store.MetadataStoreConfig `toml:"metadata_store"`
	Logging       LoggingConfig             `toml:"logging"`
	Security      SecurityConfig            `toml:"security"`
}

// ServerConfig represents server configuration
type ServerConfig struct {
	Host         string `toml:"host"`
	Port         int    `toml:"port"`
	ReadTimeout  int    `toml:"read_timeout"`
	WriteTimeout int    `toml:"write_timeout"`
	MaxBodySize  int64  `toml:"max_body_size"`
}

// LoggingConfig represents logging configuration
type LoggingConfig struct {
	Level  string `toml:"level"`
	Format string `toml:"format"` // json or text
	Output string `toml:"output"` // stdout, stderr, or file path
}

// SecurityConfig represents security configuration
type SecurityConfig struct {
	EnableCORS     bool     `toml:"enable_cors"`
	AllowedOrigins []string `toml:"allowed_origins"`
	AllowedMethods []string `toml:"allowed_methods"`
	AllowedHeaders []string `toml:"allowed_headers"`
	RateLimitRPS   int      `toml:"rate_limit_rps"`
	EnableAuth     bool     `toml:"enable_auth"`
	JWTSecret      string   `toml:"jwt_secret"`
	SessionTimeout int      `toml:"session_timeout"`
}

// Validate validates the configuration
func (c *Config) Validate() error {
	// Validate server config
	if c.Server.Port <= 0 || c.Server.Port > 65535 {
		return fmt.Errorf("invalid server port: %d", c.Server.Port)
	}

	// Validate metadata store config
	if c.MetadataStore.Type == "" {
		return fmt.Errorf("metadata store type is required")
	}
	if c.MetadataStore.Type != "sqlite" && c.MetadataStore.Type != "postgresql" {
		return fmt.Errorf("unsupported metadata store type: %s", c.MetadataStore.Type)
	}
	if c.MetadataStore.ConnectionURL == "" {
		return fmt.Errorf("metadata store connection URL is required")
	}

	// Validate logging config
	validLevels := map[string]bool{
		"debug": true, "info": true, "warn": true, "error": true,
	}
	if !validLevels[c.Logging.Level] {
		return fmt.Errorf("invalid log level: %s", c.Logging.Level)
	}

	validFormats := map[string]bool{"json": true, "text": true}
	if !validFormats[c.Logging.Format] {
		return fmt.Errorf("invalid log format: %s", c.Logging.Format)
	}

	return nil
}
