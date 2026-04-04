package mysql_test

import (
	"context"
	"fmt"
	"testing"
	"time"

	stmysql "data-voyager/core/internal/store/mysql"
	"data-voyager/core/internal/store/repotest"

	"github.com/jmoiron/sqlx"
	"github.com/pressly/goose/v3"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	tcmysql "github.com/testcontainers/testcontainers-go/modules/mysql"
	"github.com/testcontainers/testcontainers-go/wait"

	_ "github.com/go-sql-driver/mysql"
)

func TestSettingsRepo_MySQL(t *testing.T) {
	ctx := context.Background()

	ctr, err := tcmysql.Run(ctx,
		"mysql:8.0",
		tcmysql.WithDatabase("testdb"),
		tcmysql.WithUsername("test"),
		tcmysql.WithPassword("test"),
		testcontainers.WithWaitStrategy(
			wait.ForLog("port: 3306  MySQL Community Server").
				WithStartupTimeout(60*time.Second),
		),
	)
	require.NoError(t, err)
	t.Cleanup(func() {
		if err := testcontainers.TerminateContainer(ctr); err != nil {
			t.Logf("terminate container: %v", err)
		}
	})

	host, err := ctr.Host(ctx)
	require.NoError(t, err)
	port, err := ctr.MappedPort(ctx, "3306")
	require.NoError(t, err)

	dsn := fmt.Sprintf("test:test@tcp(%s:%s)/testdb?parseTime=true&multiStatements=true", host, port.Port())

	db, err := sqlx.Open("mysql", dsn)
	require.NoError(t, err)
	t.Cleanup(func() { _ = db.Close() })

	// MySQL takes a moment to accept connections after the log line
	require.Eventually(t, func() bool {
		return db.Ping() == nil
	}, 30*time.Second, 500*time.Millisecond, "MySQL did not become ready")

	goose.SetBaseFS(nil)
	require.NoError(t, goose.SetDialect("mysql"))
	require.NoError(t, goose.Up(db.DB, "../migrations/mysql"))

	repo := stmysql.NewSettingsRepo(db)
	repotest.Run(t, repo)
}
