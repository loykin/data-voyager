package postgresql

import "fmt"

// Config holds PostgreSQL connection parameters.
type Config struct {
	Host     string `json:"host" toml:"host"`
	Port     int    `json:"port" toml:"port"`
	Database string `json:"database" toml:"database"`
	Username string `json:"username" toml:"username"`
	Password string `json:"password" toml:"password"`
	SSLMode  string `json:"ssl_mode" toml:"ssl_mode"`
}

func (c *Config) Validate() error {
	if c.Host == "" {
		return fmt.Errorf("host is required")
	}
	if c.Port <= 0 {
		c.Port = 5432
	}
	if c.SSLMode == "" {
		c.SSLMode = "prefer"
	}
	return nil
}

func (c *Config) GetConnectionString() string {
	return fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		c.Host, c.Port, c.Username, c.Password, c.Database, c.SSLMode)
}
