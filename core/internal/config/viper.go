package config

import (
	"fmt"
	"log/slog"
	"strings"

	"github.com/spf13/viper"
)

// ViperConfig mirrors Config but uses mapstructure tags for Viper unmarshaling.
type ViperConfig struct {
	Server          ServerConfig          `mapstructure:"server"`
	MetadataStore   DBConfig              `mapstructure:"metadata_store"`
	StatisticsStore StatisticsStoreConfig `mapstructure:"statistics_store"`
	Logging         LoggingConfig         `mapstructure:"logging"`
	Security        SecurityConfig        `mapstructure:"security"`
	AI              AIConfig              `mapstructure:"ai"`
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
		slog.Warn("config file not found, using defaults")
	} else {
		slog.Info("loaded config file", "path", v.ConfigFileUsed())
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

	v.SetDefault("metadata_store.type", "sqlite")
	v.SetDefault("metadata_store.migrate_on_start", true)
	v.SetDefault("metadata_store.sqlite.path", "./data/voyager.db")
	v.SetDefault("metadata_store.postgresql.port", 5432)
	v.SetDefault("metadata_store.postgresql.ssl_mode", "disable")
	v.SetDefault("metadata_store.mysql.port", 3306)

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
	return c.Config().Validate()
}

// Config converts ViperConfig to Config.
func (c *ViperConfig) Config() *Config {
	return &Config{
		Server:          c.Server,
		MetadataStore:   c.MetadataStore,
		StatisticsStore: c.StatisticsStore,
		Logging:         c.Logging,
		Security:        c.Security,
	}
}

// WriteDefaultConfig writes a default configuration file.
func WriteDefaultConfig(configPath string) error {
	v := viper.New()
	setDefaults(v)
	v.SetConfigFile(configPath)
	v.SetConfigType("toml")
	return v.WriteConfig()
}
