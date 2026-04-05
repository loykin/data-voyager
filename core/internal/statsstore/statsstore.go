package statsstore

import (
	"embed"
	"fmt"

	"github.com/jmoiron/sqlx"
	"github.com/pressly/goose/v3"

	"data-voyager/core/internal/aiconfig"
	"data-voyager/core/internal/config"
	"data-voyager/core/internal/connection"
	stclickhouse "data-voyager/core/internal/statsstore/clickhouse"
	stmysql "data-voyager/core/internal/statsstore/mysql"
	stpostgres "data-voyager/core/internal/statsstore/postgres"
	stsqlite "data-voyager/core/internal/statsstore/sqlite"

	_ "github.com/ClickHouse/clickhouse-go/v2"
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

//go:embed migrations/clickhouse/*.sql
var clickhouseMigrations embed.FS

// Repos holds statistics repository implementations for the selected driver.
type Repos struct {
	AIConfigHistory   aiconfig.HistoryRepository
	ConnectionHistory connection.HistoryRepository
}

// Open opens a sqlx.DB for the statistics store and optionally runs migrations.
func Open(cfg config.StatisticsStoreConfig) (*sqlx.DB, error) {
	driver := cfg.Driver()
	dsn, err := cfg.DSN()
	if err != nil {
		return nil, err
	}
	db, err := sqlx.Open(driver, dsn)
	if err != nil {
		return nil, fmt.Errorf("open statistics db (%s): %w", driver, err)
	}
	if err := db.Ping(); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("ping statistics db (%s): %w", driver, err)
	}
	if cfg.MigrateOnStart {
		if err := runMigrations(db, cfg.Type); err != nil {
			_ = db.Close()
			return nil, fmt.Errorf("migrate statistics db (%s): %w", driver, err)
		}
	}
	return db, nil
}

// NewRepos returns statistics repositories wired to the given driver.
func NewRepos(db *sqlx.DB, cfg config.StatisticsStoreConfig) (*Repos, error) {
	switch cfg.Type {
	case "sqlite", "sqlite3":
		return &Repos{
			AIConfigHistory:   stsqlite.NewAIConfigHistoryRepo(db),
			ConnectionHistory: stsqlite.NewConnectionHistoryRepo(db),
		}, nil
	case "postgres", "postgresql":
		return &Repos{
			AIConfigHistory:   stpostgres.NewAIConfigHistoryRepo(db),
			ConnectionHistory: stpostgres.NewConnectionHistoryRepo(db),
		}, nil
	case "mysql":
		return &Repos{
			AIConfigHistory:   stmysql.NewAIConfigHistoryRepo(db),
			ConnectionHistory: stmysql.NewConnectionHistoryRepo(db),
		}, nil
	case "clickhouse":
		return &Repos{
			AIConfigHistory:   stclickhouse.NewAIConfigHistoryRepo(db),
			ConnectionHistory: stclickhouse.NewConnectionHistoryRepo(db),
		}, nil
	default:
		return nil, fmt.Errorf("unsupported statistics_store.type: %s", cfg.Type)
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
	case "clickhouse":
		fs, dir, dialect = clickhouseMigrations, "migrations/clickhouse", "clickhouse"
	default:
		return fmt.Errorf("unsupported statistics_store.type: %s", dbType)
	}
	goose.SetBaseFS(fs)
	goose.SetTableName("statistics_version")
	if err := goose.SetDialect(dialect); err != nil {
		return err
	}
	if err := goose.Up(db.DB, dir); err != nil {
		return err
	}
	goose.SetTableName("goose_db_version")
	return nil
}
