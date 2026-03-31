package config

import "fmt"

// DBConfig is the top-level metadata store configuration.
// Type selects which sub-section is active; only that section needs to be
// populated in the config file.
type DBConfig struct {
	Type           string           `toml:"type"             mapstructure:"type"`
	MigrateOnStart bool             `toml:"migrate_on_start" mapstructure:"migrate_on_start"`
	SQLite         SQLiteConfig     `toml:"sqlite"           mapstructure:"sqlite"`
	PostgreSQL     PostgreSQLConfig `toml:"postgresql"       mapstructure:"postgresql"`
	MySQL          MySQLConfig      `toml:"mysql"            mapstructure:"mysql"`
}

// SQLiteConfig holds SQLite-specific settings.
type SQLiteConfig struct {
	Path string `toml:"path" mapstructure:"path"`
}

// PostgreSQLConfig holds PostgreSQL-specific settings.
type PostgreSQLConfig struct {
	Host     string `toml:"host"     mapstructure:"host"`
	Port     int    `toml:"port"     mapstructure:"port"`
	Database string `toml:"database" mapstructure:"database"`
	User     string `toml:"user"     mapstructure:"user"`
	Password string `toml:"password" mapstructure:"password"`
	SSLMode  string `toml:"ssl_mode" mapstructure:"ssl_mode"`
}

// MySQLConfig holds MySQL-specific settings.
type MySQLConfig struct {
	Host     string `toml:"host"     mapstructure:"host"`
	Port     int    `toml:"port"     mapstructure:"port"`
	Database string `toml:"database" mapstructure:"database"`
	User     string `toml:"user"     mapstructure:"user"`
	Password string `toml:"password" mapstructure:"password"`
}

// Driver returns the normalised driver name expected by database/sql and goose.
func (c *DBConfig) Driver() string {
	if c.Type == "postgresql" {
		return "postgres"
	}
	return c.Type
}

// DSN builds the connection string for the active driver.
func (c *DBConfig) DSN() (string, error) {
	switch c.Type {
	case "sqlite", "sqlite3":
		return c.SQLite.Path, nil
	case "postgres", "postgresql":
		pg := c.PostgreSQL
		return fmt.Sprintf(
			"host=%s port=%d dbname=%s user=%s password=%s sslmode=%s",
			pg.Host, pg.Port, pg.Database, pg.User, pg.Password, pg.SSLMode,
		), nil
	case "mysql":
		my := c.MySQL
		return fmt.Sprintf(
			"%s:%s@tcp(%s:%d)/%s?parseTime=true",
			my.User, my.Password, my.Host, my.Port, my.Database,
		), nil
	default:
		return "", fmt.Errorf("unsupported metadata_store.type: %s", c.Type)
	}
}

// Config represents the application configuration.
type Config struct {
	Server        ServerConfig   `toml:"server"`
	MetadataStore DBConfig       `toml:"metadata_store"`
	Logging       LoggingConfig  `toml:"logging"`
	Security      SecurityConfig `toml:"security"`
}

// ServerConfig represents server configuration.
type ServerConfig struct {
	Host         string `toml:"host"`
	Port         int    `toml:"port"`
	ReadTimeout  int    `toml:"read_timeout"`
	WriteTimeout int    `toml:"write_timeout"`
	MaxBodySize  int64  `toml:"max_body_size"`
}

// LoggingConfig represents logging configuration.
type LoggingConfig struct {
	Level  string `toml:"level"`
	Format string `toml:"format"` // json or text
	Output string `toml:"output"` // stdout, stderr, or file path
}

// SecurityConfig represents security configuration.
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

// Validate validates the configuration.
func (c *Config) Validate() error {
	if c.Server.Port <= 0 || c.Server.Port > 65535 {
		return fmt.Errorf("invalid server port: %d", c.Server.Port)
	}

	if err := c.MetadataStore.Validate(); err != nil {
		return err
	}

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

// Validate validates the DBConfig for the selected type.
func (c *DBConfig) Validate() error {
	switch c.Type {
	case "sqlite", "sqlite3":
		if c.SQLite.Path == "" {
			return fmt.Errorf("metadata_store.sqlite.path is required")
		}
	case "postgres", "postgresql":
		pg := c.PostgreSQL
		if pg.Host == "" {
			return fmt.Errorf("metadata_store.postgresql.host is required")
		}
		if pg.Database == "" {
			return fmt.Errorf("metadata_store.postgresql.database is required")
		}
		if pg.User == "" {
			return fmt.Errorf("metadata_store.postgresql.user is required")
		}
	case "mysql":
		my := c.MySQL
		if my.Host == "" {
			return fmt.Errorf("metadata_store.mysql.host is required")
		}
		if my.Database == "" {
			return fmt.Errorf("metadata_store.mysql.database is required")
		}
		if my.User == "" {
			return fmt.Errorf("metadata_store.mysql.user is required")
		}
	case "":
		return fmt.Errorf("metadata_store.type is required")
	default:
		return fmt.Errorf("unsupported metadata_store.type: %s", c.Type)
	}
	return nil
}
