package clickhouse

import "fmt"

// Config holds ClickHouse connection parameters.
type Config struct {
	Host     string `json:"host" toml:"host"`
	Port     int    `json:"port" toml:"port"`
	Database string `json:"database" toml:"database"`
	Username string `json:"username" toml:"username"`
	Password string `json:"password" toml:"password"`
	Secure   bool   `json:"secure" toml:"secure"`
}

func (c *Config) Validate() error {
	if c.Host == "" {
		return fmt.Errorf("host is required")
	}
	if c.Port <= 0 {
		c.Port = 9000
	}
	return nil
}

func (c *Config) GetConnectionString() string {
	protocol := "tcp"
	if c.Secure {
		protocol = "tls"
	}
	return fmt.Sprintf("%s://%s:%d/%s?username=%s&password=%s",
		protocol, c.Host, c.Port, c.Database, c.Username, c.Password)
}
