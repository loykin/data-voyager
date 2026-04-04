package postgresql

import (
	"context"
	"fmt"
	"testing"
	"time"

	"data-voyager/sdk"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
)

func TestPostgreSQLPlugin(t *testing.T) {
	ctx := context.Background()

	postgresContainer, err := postgres.Run(ctx,
		"postgres:15.3-alpine",
		postgres.WithDatabase("testdb"),
		postgres.WithUsername("testuser"),
		postgres.WithPassword("testpass"),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").
				WithOccurrence(2).
				WithStartupTimeout(30*time.Second)),
	)
	require.NoError(t, err)
	defer func() {
		if err := testcontainers.TerminateContainer(postgresContainer); err != nil {
			t.Logf("failed to terminate container: %s", err)
		}
	}()

	host, err := postgresContainer.Host(ctx)
	require.NoError(t, err)
	port, err := postgresContainer.MappedPort(ctx, "5432")
	require.NoError(t, err)

	plugin := &Plugin{}

	assert.Equal(t, Type, plugin.GetType())
	assert.Equal(t, "PostgreSQL", plugin.GetName())

	config := &Config{
		Host:     host,
		Port:     port.Int(),
		Database: "testdb",
		Username: "testuser",
		Password: "testpass",
		SSLMode:  "disable",
	}

	t.Run("TestConnection", func(t *testing.T) {
		result, err := plugin.TestConnection(ctx, config)
		require.NoError(t, err)
		assert.True(t, result.IsConnected)
		assert.Equal(t, "Connection successful", result.Message)
		assert.Greater(t, result.Latency, int64(0))
	})

	t.Run("Query", func(t *testing.T) {
		conn, err := plugin.Connect(ctx, config)
		require.NoError(t, err)
		defer func() { _ = conn.Close() }()

		_, err = conn.Query(ctx, `
			CREATE TABLE IF NOT EXISTS test_table (
				id SERIAL PRIMARY KEY,
				name VARCHAR(100),
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			)
		`)
		require.NoError(t, err)

		_, err = conn.Query(ctx, `INSERT INTO test_table (name) VALUES ($1), ($2)`, "test1", "test2")
		require.NoError(t, err)

		result, err := conn.Query(ctx, "SELECT id, name FROM test_table ORDER BY id")
		require.NoError(t, err)

		require.Len(t, result.Frames, 1)
		assert.Len(t, result.Frames[0].Fields, 2)
		assert.Equal(t, "id", result.Frames[0].Fields[0].Name)
		assert.Equal(t, "name", result.Frames[0].Fields[1].Name)
		assert.Len(t, result.Frames[0].Fields[0].Values, 2)
		assert.Equal(t, int64(2), result.Stats.RowsReturned)
		assert.Greater(t, result.Stats.ExecutionTime, time.Duration(0))

		_, err = conn.Query(ctx, "DROP TABLE test_table")
		require.NoError(t, err)
	})

	t.Run("GetSchema", func(t *testing.T) {
		conn, err := plugin.Connect(ctx, config)
		require.NoError(t, err)
		defer func() { _ = conn.Close() }()

		schema, err := conn.GetSchema(ctx)
		require.NoError(t, err)
		assert.NotEmpty(t, schema.Databases)

		var publicSchema *sdk.DatabaseInfo
		for i, db := range schema.Databases {
			if db.Name == "public" {
				publicSchema = &schema.Databases[i]
				break
			}
		}
		assert.NotNil(t, publicSchema)
	})

	t.Run("GetTables", func(t *testing.T) {
		conn, err := plugin.Connect(ctx, config)
		require.NoError(t, err)
		defer func() { _ = conn.Close() }()

		_, err = conn.Query(ctx, `
			CREATE TABLE IF NOT EXISTS test_tables (id SERIAL PRIMARY KEY, data TEXT)
		`)
		require.NoError(t, err)

		tables, err := conn.GetTables(ctx, "public")
		require.NoError(t, err)

		var found bool
		for _, table := range tables {
			if table.Name == "test_tables" {
				found = true
				assert.Equal(t, "BASE TABLE", table.Type)
				assert.NotEmpty(t, table.Columns)
				break
			}
		}
		assert.True(t, found, "test_tables not found")

		_, err = conn.Query(ctx, "DROP TABLE test_tables")
		require.NoError(t, err)
	})

	t.Run("InvalidConnection", func(t *testing.T) {
		invalidConfig := &Config{Host: "invalid-host", Port: 5432, Database: "testdb"}
		result, err := plugin.TestConnection(ctx, invalidConfig)
		require.NoError(t, err)
		assert.False(t, result.IsConnected)
		assert.Contains(t, result.Message, "failed to open PostgreSQL connection")
	})
}

func TestPostgreSQLConfig(t *testing.T) {
	t.Run("ValidConfig", func(t *testing.T) {
		config := &Config{Host: "localhost", Port: 5432, Database: "testdb", Username: "u", Password: "p", SSLMode: "require"}
		err := config.Validate()
		assert.NoError(t, err)
		connStr := config.GetConnectionString()
		assert.Contains(t, connStr, "host=localhost")
		assert.Contains(t, connStr, "sslmode=require")
	})

	t.Run("InvalidConfig", func(t *testing.T) {
		err := (&Config{Host: ""}).Validate()
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "host is required")
	})

	t.Run("DefaultPort", func(t *testing.T) {
		config := &Config{Host: "localhost", Port: 0}
		require.NoError(t, config.Validate())
		assert.Equal(t, 5432, config.Port)
	})

	t.Run("DefaultSSLMode", func(t *testing.T) {
		config := &Config{Host: "localhost", Port: 5432}
		require.NoError(t, config.Validate())
		assert.Equal(t, "prefer", config.SSLMode)
	})
}

func BenchmarkPostgreSQLQuery(b *testing.B) {
	ctx := context.Background()

	postgresContainer, err := postgres.Run(ctx,
		"postgres:15.3-alpine",
		postgres.WithDatabase("testdb"),
		postgres.WithUsername("testuser"),
		postgres.WithPassword("testpass"),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").
				WithOccurrence(2).
				WithStartupTimeout(30*time.Second)),
	)
	require.NoError(b, err)
	defer func() {
		if err := testcontainers.TerminateContainer(postgresContainer); err != nil {
			b.Logf("failed to terminate container: %s", err)
		}
	}()

	host, err := postgresContainer.Host(ctx)
	require.NoError(b, err)
	port, err := postgresContainer.MappedPort(ctx, "5432")
	require.NoError(b, err)

	plugin := &Plugin{}
	config := &Config{Host: host, Port: port.Int(), Database: "testdb", Username: "testuser", Password: "testpass", SSLMode: "disable"}

	conn, err := plugin.Connect(ctx, config)
	require.NoError(b, err)
	defer func() { _ = conn.Close() }()

	_, err = conn.Query(ctx, `CREATE TABLE IF NOT EXISTS bench_table (id SERIAL PRIMARY KEY, value TEXT)`)
	require.NoError(b, err)

	for i := 0; i < 1000; i++ {
		_, err = conn.Query(ctx, "INSERT INTO bench_table (value) VALUES ($1)", fmt.Sprintf("value_%d", i))
		require.NoError(b, err)
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := conn.Query(ctx, "SELECT COUNT(*) FROM bench_table")
		require.NoError(b, err)
	}
}
