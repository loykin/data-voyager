package config

import (
	"fmt"
	"strings"

	"github.com/spf13/viper"
)

// ViperConfig mirrors Config but uses mapstructure tags for Viper unmarshaling.
type ViperConfig struct {
	Server        ServerConfig   `mapstructure:"server"`
	MetadataStore DBConfig       `mapstructure:"metadata_store"`
	Logging       LoggingConfig  `mapstructure:"logging"`
	Security      SecurityConfig `mapstructure:"security"`
}

// InitViper initializes Viper configuration.
func InitViper(configName, configPath string) (*ViperConfig, error) {
	v := viper.New()

	setDefaults(v)

	v.SetConfigName(configName)
	v.SetConfigType("toml")
	if configPath != "" {
		v.AddConfigPath(configPath)
	}
	v.AddConfigPath(".")
	v.AddConfigPath("$HOME/.config/data-voyager")
	v.AddConfigPath("/etc/data-voyager")

	v.SetEnvPrefix("VOYAGER")
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	v.AutomaticEnv()

	if err := v.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, fmt.Errorf("failed to read config file: %w", err)
		}
		fmt.Println("Config file not found, using defaults")
	} else {
		fmt.Printf("Using config file: %s\n", v.ConfigFileUsed())
	}

	var cfg ViperConfig
	if err := v.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("failed to unmarshal config: %w", err)
	}

	if err := cfg.Validate(); err != nil {
		return nil, fmt.Errorf("invalid configuration: %w", err)
	}

	return &cfg, nil
}

func setDefaults(v *viper.Viper) {
	v.SetDefault("server.host", "localhost")
	v.SetDefault("server.port", 8080)
	v.SetDefault("server.read_timeout", 30)
	v.SetDefault("server.write_timeout", 30)
	v.SetDefault("server.max_body_size", 10*1024*1024)

	v.SetDefault("metadata_store.driver", "sqlite")
	v.SetDefault("metadata_store.dsn", "./data/voyager.db")
	v.SetDefault("metadata_store.migrate_on_start", true)

	v.SetDefault("logging.level", "info")
	v.SetDefault("logging.format", "text")
	v.SetDefault("logging.output", "stdout")

	v.SetDefault("security.enable_cors", true)
	v.SetDefault("security.allowed_origins", []string{"*"})
	v.SetDefault("security.allowed_methods", []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"})
	v.SetDefault("security.allowed_headers", []string{"Origin", "Content-Type", "Accept", "Authorization"})
	v.SetDefault("security.rate_limit_rps", 100)
	v.SetDefault("security.enable_auth", false)
	v.SetDefault("security.session_timeout", 3600)
}

// Validate validates the Viper configuration.
func (c *ViperConfig) Validate() error {
	if c.Server.Port <= 0 || c.Server.Port > 65535 {
		return fmt.Errorf("invalid server port: %d", c.Server.Port)
	}

	if c.MetadataStore.Driver == "" {
		return fmt.Errorf("metadata_store.driver is required")
	}
	validDrivers := map[string]bool{
		"sqlite": true, "postgres": true, "postgresql": true, "mysql": true,
	}
	if !validDrivers[c.MetadataStore.Driver] {
		return fmt.Errorf("unsupported metadata_store.driver: %s", c.MetadataStore.Driver)
	}
	if c.MetadataStore.DSN == "" {
		return fmt.Errorf("metadata_store.dsn is required")
	}

	validLevels := map[string]bool{"debug": true, "info": true, "warn": true, "error": true}
	if !validLevels[c.Logging.Level] {
		return fmt.Errorf("invalid log level: %s", c.Logging.Level)
	}

	validFormats := map[string]bool{"json": true, "text": true}
	if !validFormats[c.Logging.Format] {
		return fmt.Errorf("invalid log format: %s", c.Logging.Format)
	}

	return nil
}

// WriteDefaultConfig writes a default configuration file.
func WriteDefaultConfig(configPath string) error {
	v := viper.New()
	setDefaults(v)
	v.SetConfigFile(configPath)
	v.SetConfigType("toml")
	return v.WriteConfig()
}
