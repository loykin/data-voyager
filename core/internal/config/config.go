package config

import (
	"fmt"
	"os"
	"path/filepath"

	"explorer/core/internal/store"
	"github.com/BurntSushi/toml"
)

// Config represents the application configuration
type Config struct {
	Server       ServerConfig          `toml:"server"`
	MetadataStore store.MetadataStoreConfig `toml:"metadata_store"`
	Logging      LoggingConfig         `toml:"logging"`
	Security     SecurityConfig        `toml:"security"`
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
	EnableCORS      bool     `toml:"enable_cors"`
	AllowedOrigins  []string `toml:"allowed_origins"`
	AllowedMethods  []string `toml:"allowed_methods"`
	AllowedHeaders  []string `toml:"allowed_headers"`
	RateLimitRPS    int      `toml:"rate_limit_rps"`
	EnableAuth      bool     `toml:"enable_auth"`
	JWTSecret       string   `toml:"jwt_secret"`
	SessionTimeout  int      `toml:"session_timeout"`
}

// DefaultConfig returns default configuration
func DefaultConfig() *Config {
	return &Config{
		Server: ServerConfig{
			Host:         "localhost",
			Port:         8080,
			ReadTimeout:  30,
			WriteTimeout: 30,
			MaxBodySize:  10 * 1024 * 1024, // 10MB
		},
		MetadataStore: store.MetadataStoreConfig{
			Type:           "sqlite",
			ConnectionURL:  "./data/explorer.db",
			MigrateOnStart: true,
		},
		Logging: LoggingConfig{
			Level:  "info",
			Format: "text",
			Output: "stdout",
		},
		Security: SecurityConfig{
			EnableCORS: true,
			AllowedOrigins: []string{"*"},
			AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
			AllowedHeaders: []string{"Origin", "Content-Type", "Accept", "Authorization"},
			RateLimitRPS:   100,
			EnableAuth:     false,
			SessionTimeout: 3600, // 1 hour
		},
	}
}

// LoadConfig loads configuration from a TOML file
func LoadConfig(configPath string) (*Config, error) {
	config := DefaultConfig()

	// If config file doesn't exist, create it with default values
	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		if err := SaveConfig(config, configPath); err != nil {
			return nil, fmt.Errorf("failed to create default config: %w", err)
		}
		return config, nil
	}

	// Load existing config
	if _, err := toml.DecodeFile(configPath, config); err != nil {
		return nil, fmt.Errorf("failed to decode config file: %w", err)
	}

	// Validate configuration
	if err := config.Validate(); err != nil {
		return nil, fmt.Errorf("invalid configuration: %w", err)
	}

	return config, nil
}

// SaveConfig saves configuration to a TOML file
func SaveConfig(config *Config, configPath string) error {
	// Ensure directory exists
	dir := filepath.Dir(configPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create config directory: %w", err)
	}

	file, err := os.Create(configPath)
	if err != nil {
		return fmt.Errorf("failed to create config file: %w", err)
	}
	defer file.Close()

	encoder := toml.NewEncoder(file)
	if err := encoder.Encode(config); err != nil {
		return fmt.Errorf("failed to encode config: %w", err)
	}

	return nil
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

// GetConfigPath returns the default configuration file path
func GetConfigPath() string {
	// Check environment variable first
	if configPath := os.Getenv("EXPLORER_CONFIG"); configPath != "" {
		return configPath
	}

	// Check current directory
	if _, err := os.Stat("./config.toml"); err == nil {
		return "./config.toml"
	}

	// Check user config directory
	if homeDir, err := os.UserHomeDir(); err == nil {
		configDir := filepath.Join(homeDir, ".config", "explorer")
		return filepath.Join(configDir, "config.toml")
	}

	// Default fallback
	return "./config.toml"
}