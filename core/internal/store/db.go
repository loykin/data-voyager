package store

import (
	"embed"
	"fmt"

	"github.com/jmoiron/sqlx"
	"github.com/pressly/goose/v3"

	"data-voyager/core/internal/connection"
	stmysql "data-voyager/core/internal/store/mysql"
	stpostgres "data-voyager/core/internal/store/postgres"
	stsqlite "data-voyager/core/internal/store/sqlite"

	_ "github.com/go-sql-driver/mysql"
	_ "github.com/lib/pq"
	_ "modernc.org/sqlite"
)

//go:embed migrations/postgres/*.sql
var postgresMigrations embed.FS

//go:embed migrations/sqlite/*.sql
var sqliteMigrations embed.FS

//go:embed migrations/mysql/*.sql
var mysqlMigrations embed.FS

// DBConfig holds connection and migration settings for the metadata store.
type DBConfig struct {
	Driver  string `toml:"driver" mapstructure:"driver"`
	DSN     string `toml:"dsn" mapstructure:"dsn"`
	Migrate bool   `toml:"migrate_on_start" mapstructure:"migrate_on_start"`
}

// Repos holds all repository implementations for the selected driver.
// New service repositories are added here as fields.
type Repos struct {
	Connection connection.Repository
}

// Open opens a sqlx.DB connection and optionally runs goose migrations.
func Open(cfg DBConfig) (*sqlx.DB, error) {
	driver := normalizeDriver(cfg.Driver)

	db, err := sqlx.Open(driver, cfg.DSN)
	if err != nil {
		return nil, fmt.Errorf("open db (%s): %w", driver, err)
	}
	if err := db.Ping(); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("ping db (%s): %w", driver, err)
	}
	if cfg.Migrate {
		if err := runMigrations(db, cfg.Driver); err != nil {
			_ = db.Close()
			return nil, fmt.Errorf("migrate (%s): %w", driver, err)
		}
	}
	return db, nil
}

// NewRepos returns all repositories wired to the given driver.
// Callers depend only on Repos — driver selection is fully encapsulated here.
func NewRepos(db *sqlx.DB, driver string) (*Repos, error) {
	switch driver {
	case "postgres", "postgresql":
		return &Repos{
			Connection: stpostgres.NewConnectionRepo(db),
		}, nil
	case "sqlite", "sqlite3":
		return &Repos{
			Connection: stsqlite.NewConnectionRepo(db),
		}, nil
	case "mysql":
		return &Repos{
			Connection: stmysql.NewConnectionRepo(db),
		}, nil
	default:
		return nil, fmt.Errorf("unsupported driver: %s", driver)
	}
}

func normalizeDriver(driver string) string {
	if driver == "postgresql" {
		return "postgres"
	}
	return driver
}

func runMigrations(db *sqlx.DB, driver string) error {
	var (
		fs      embed.FS
		dir     string
		dialect string
	)
	switch driver {
	case "postgres", "postgresql":
		fs, dir, dialect = postgresMigrations, "migrations/postgres", "postgres"
	case "sqlite", "sqlite3":
		fs, dir, dialect = sqliteMigrations, "migrations/sqlite", "sqlite3"
	case "mysql":
		fs, dir, dialect = mysqlMigrations, "migrations/mysql", "mysql"
	default:
		return fmt.Errorf("unsupported driver: %s", driver)
	}

	goose.SetBaseFS(fs)
	if err := goose.SetDialect(dialect); err != nil {
		return err
	}
	return goose.Up(db.DB, dir)
}
