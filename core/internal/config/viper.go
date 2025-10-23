package config

import (
	"fmt"
	"strings"

	"explorer/core/internal/store"
	"github.com/spf13/viper"
)

// Config represents the application configuration using Viper
type ViperConfig struct {
	Server        ServerConfig                  `mapstructure:"server"`
	MetadataStore store.MetadataStoreConfig     `mapstructure:"metadata_store"`
	Logging       LoggingConfig                 `mapstructure:"logging"`
	Security      SecurityConfig                `mapstructure:"security"`
}

// InitViper initializes Viper configuration
func InitViper(configName, configPath string) (*ViperConfig, error) {
	v := viper.New()

	// Set defaults
	setDefaults(v)

	// Configuration file settings
	v.SetConfigName(configName)
	v.SetConfigType("toml")
	if configPath != "" {
		v.AddConfigPath(configPath)
	}
	v.AddConfigPath(".")
	v.AddConfigPath("$HOME/.config/explorer")
	v.AddConfigPath("/etc/explorer")

	// Environment variables
	v.SetEnvPrefix("EXPLORER")
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	v.AutomaticEnv()

	// Read config file if exists
	if err := v.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, fmt.Errorf("failed to read config file: %w", err)
		}
		// Config file not found, use defaults
		fmt.Printf("Config file not found, using defaults\n")
	} else {
		fmt.Printf("Using config file: %s\n", v.ConfigFileUsed())
	}

	var config ViperConfig
	if err := v.Unmarshal(&config); err != nil {
		return nil, fmt.Errorf("failed to unmarshal config: %w", err)
	}

	// Validate configuration
	if err := config.Validate(); err != nil {
		return nil, fmt.Errorf("invalid configuration: %w", err)
	}

	return &config, nil
}

// setDefaults sets default configuration values
func setDefaults(v *viper.Viper) {
	// Server defaults
	v.SetDefault("server.host", "localhost")
	v.SetDefault("server.port", 8080)
	v.SetDefault("server.read_timeout", 30)
	v.SetDefault("server.write_timeout", 30)
	v.SetDefault("server.max_body_size", 10*1024*1024) // 10MB

	// Metadata store defaults
	v.SetDefault("metadata_store.type", "sqlite")
	v.SetDefault("metadata_store.connection_url", "./data/explorer.db")
	v.SetDefault("metadata_store.migrate_on_start", true)

	// Logging defaults
	v.SetDefault("logging.level", "info")
	v.SetDefault("logging.format", "text")
	v.SetDefault("logging.output", "stdout")

	// Security defaults
	v.SetDefault("security.enable_cors", true)
	v.SetDefault("security.allowed_origins", []string{"*"})
	v.SetDefault("security.allowed_methods", []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"})
	v.SetDefault("security.allowed_headers", []string{"Origin", "Content-Type", "Accept", "Authorization"})
	v.SetDefault("security.rate_limit_rps", 100)
	v.SetDefault("security.enable_auth", false)
	v.SetDefault("security.session_timeout", 3600)
}

// Validate validates the Viper configuration
func (c *ViperConfig) Validate() error {
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

// WriteDefaultConfig writes a default configuration file
func WriteDefaultConfig(configPath string) error {
	v := viper.New()
	setDefaults(v)

	v.SetConfigFile(configPath)
	v.SetConfigType("toml")

	return v.WriteConfig()
}