package store

import (
	"embed"
	"fmt"

	"github.com/jmoiron/sqlx"
	"github.com/pressly/goose/v3"

	"data-voyager/core/internal/aiconfig"
	"data-voyager/core/internal/config"
	"data-voyager/core/internal/connection"
	"data-voyager/core/internal/settings"
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

// Repos holds all repository implementations for the selected driver.
// New service repositories are added here as fields.
type Repos struct {
	Connection connection.Repository
	Settings   settings.Repository
	AIConfigs  aiconfig.Repository
}

// Open opens a sqlx.DB connection and optionally runs goose migrations.
func Open(cfg config.DBConfig) (*sqlx.DB, error) {
	driver := cfg.Driver()

	dsn, err := cfg.DSN()
	if err != nil {
		return nil, err
	}

	db, err := sqlx.Open(driver, dsn)
	if err != nil {
		return nil, fmt.Errorf("open db (%s): %w", driver, err)
	}
	if err := db.Ping(); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("ping db (%s): %w", driver, err)
	}
	if cfg.MigrateOnStart {
		if err := runMigrations(db, cfg.Type); err != nil {
			_ = db.Close()
			return nil, fmt.Errorf("migrate (%s): %w", driver, err)
		}
	}
	return db, nil
}

// NewRepos returns all repositories wired to the given driver.
// Callers depend only on Repos — driver selection is fully encapsulated here.
func NewRepos(db *sqlx.DB, cfg config.DBConfig) (*Repos, error) {
	switch cfg.Type {
	case "postgres", "postgresql":
		return &Repos{
			Connection: stpostgres.NewConnectionRepo(db),
			Settings:   stpostgres.NewSettingsRepo(db),
			AIConfigs:  stpostgres.NewAIConfigRepo(db),
		}, nil
	case "sqlite", "sqlite3":
		return &Repos{
			Connection: stsqlite.NewConnectionRepo(db),
			Settings:   stsqlite.NewSettingsRepo(db),
			AIConfigs:  stsqlite.NewAIConfigRepo(db),
		}, nil
	case "mysql":
		return &Repos{
			Connection: stmysql.NewConnectionRepo(db),
			Settings:   stmysql.NewSettingsRepo(db),
			AIConfigs:  stmysql.NewAIConfigRepo(db),
		}, nil
	default:
		return nil, fmt.Errorf("unsupported metadata_store.type: %s", cfg.Type)
	}
}

func runMigrations(db *sqlx.DB, dbType string) error {
	var (
		fs      embed.FS
		dir     string
		dialect string
	)
	switch dbType {
	case "postgres", "postgresql":
		fs, dir, dialect = postgresMigrations, "migrations/postgres", "postgres"
	case "sqlite", "sqlite3":
		fs, dir, dialect = sqliteMigrations, "migrations/sqlite", "sqlite3"
	case "mysql":
		fs, dir, dialect = mysqlMigrations, "migrations/mysql", "mysql"
	default:
		return fmt.Errorf("unsupported metadata_store.type: %s", dbType)
	}

	goose.SetBaseFS(fs)
	if err := goose.SetDialect(dialect); err != nil {
		return err
	}
	return goose.Up(db.DB, dir)
}
