package postgres_test

import (
	"context"
	"testing"
	"time"

	stpostgres "data-voyager/core/internal/store/postgres"
	"data-voyager/core/internal/store/repotest"

	"github.com/jmoiron/sqlx"
	"github.com/pressly/goose/v3"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	tcpostgres "github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"

	_ "github.com/lib/pq"
)

func TestSettingsRepo_Postgres(t *testing.T) {
	ctx := context.Background()

	ctr, err := tcpostgres.Run(ctx,
		"postgres:15-alpine",
		tcpostgres.WithDatabase("testdb"),
		tcpostgres.WithUsername("test"),
		tcpostgres.WithPassword("test"),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").
				WithOccurrence(2).
				WithStartupTimeout(30*time.Second),
		),
	)
	require.NoError(t, err)
	t.Cleanup(func() {
		if err := testcontainers.TerminateContainer(ctr); err != nil {
			t.Logf("terminate container: %v", err)
		}
	})

	dsn, err := ctr.ConnectionString(ctx, "sslmode=disable")
	require.NoError(t, err)

	db, err := sqlx.Open("postgres", dsn)
	require.NoError(t, err)
	t.Cleanup(func() { _ = db.Close() })
	require.NoError(t, db.Ping())

	goose.SetBaseFS(nil)
	require.NoError(t, goose.SetDialect("postgres"))
	require.NoError(t, goose.Up(db.DB, "../migrations/postgres"))

	repo := stpostgres.NewSettingsRepo(db)
	repotest.Run(t, repo)
}
