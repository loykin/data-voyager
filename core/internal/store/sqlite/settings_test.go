package sqlite_test

import (
	"testing"

	"data-voyager/core/internal/store/repotest"
	stsqlite "data-voyager/core/internal/store/sqlite"

	"github.com/jmoiron/sqlx"
	"github.com/pressly/goose/v3"
	"github.com/stretchr/testify/require"

	_ "modernc.org/sqlite"
)

func TestSettingsRepo_SQLite(t *testing.T) {
	db, err := sqlx.Open("sqlite", ":memory:")
	require.NoError(t, err)
	t.Cleanup(func() { _ = db.Close() })

	goose.SetBaseFS(nil)
	require.NoError(t, goose.SetDialect("sqlite3"))
	require.NoError(t, goose.Up(db.DB, "../migrations/sqlite"))

	repo := stsqlite.NewSettingsRepo(db)
	repotest.Run(t, repo)
}
