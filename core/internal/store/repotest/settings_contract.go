// Package repotest provides the shared contract test suite for settings.Repository.
// Import it in each driver-specific test package.
package repotest

import (
	"context"
	"testing"
	"time"

	"data-voyager/core/internal/settings"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Run executes all repository contract tests against the given repo.
// Call this from each driver test after setting up the schema.
func Run(t *testing.T, repo settings.Repository) {
	t.Helper()
	ctx := context.Background()

	t.Run("Set_and_Get", func(t *testing.T) {
		require.NoError(t, repo.Set(ctx, "test.key", "hello", false))
		s, err := repo.Get(ctx, "test.key")
		require.NoError(t, err)
		assert.Equal(t, "test.key", s.Key)
		assert.Equal(t, "hello", s.Value)
		assert.False(t, s.IsSecret)
		assert.NotEmpty(t, s.ID)
	})

	t.Run("Set_upsert", func(t *testing.T) {
		require.NoError(t, repo.Set(ctx, "upsert.key", "v1", false))
		require.NoError(t, repo.Set(ctx, "upsert.key", "v2", false))
		s, err := repo.Get(ctx, "upsert.key")
		require.NoError(t, err)
		assert.Equal(t, "v2", s.Value)
	})

	t.Run("Set_secret_flag", func(t *testing.T) {
		require.NoError(t, repo.Set(ctx, "secret.key", "enc-value", true))
		s, err := repo.Get(ctx, "secret.key")
		require.NoError(t, err)
		assert.True(t, s.IsSecret)
	})

	t.Run("Get_not_found", func(t *testing.T) {
		_, err := repo.Get(ctx, "nonexistent")
		require.Error(t, err)
	})

	t.Run("GetAll", func(t *testing.T) {
		require.NoError(t, repo.Set(ctx, "all.a", "1", false))
		require.NoError(t, repo.Set(ctx, "all.b", "2", false))
		rows, err := repo.GetAll(ctx)
		require.NoError(t, err)
		assert.GreaterOrEqual(t, len(rows), 2)
		for _, r := range rows {
			assert.False(t, r.UpdatedAt.IsZero(), "UpdatedAt should be set for key %s", r.Key)
		}
	})

	t.Run("Delete", func(t *testing.T) {
		require.NoError(t, repo.Set(ctx, "del.key", "bye", false))
		require.NoError(t, repo.Delete(ctx, "del.key"))
		_, err := repo.Get(ctx, "del.key")
		require.Error(t, err)
	})

	t.Run("Delete_nonexistent_no_error", func(t *testing.T) {
		require.NoError(t, repo.Delete(ctx, "no-such-key"))
	})

	t.Run("UpdatedAt_changes_on_upsert", func(t *testing.T) {
		require.NoError(t, repo.Set(ctx, "ts.key", "first", false))
		s1, err := repo.Get(ctx, "ts.key")
		require.NoError(t, err)

		time.Sleep(10 * time.Millisecond)
		require.NoError(t, repo.Set(ctx, "ts.key", "second", false))
		s2, err := repo.Get(ctx, "ts.key")
		require.NoError(t, err)

		assert.Equal(t, "second", s2.Value)
		assert.True(t, !s2.UpdatedAt.Before(s1.UpdatedAt),
			"updated_at should not go backward: %v vs %v", s1.UpdatedAt, s2.UpdatedAt)
	})
}
