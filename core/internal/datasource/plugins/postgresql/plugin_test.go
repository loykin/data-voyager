package postgresql

import (
	"context"
	"fmt"
	"testing"
	"time"

	"data-voyager/core/internal/datasource"
	"data-voyager/core/internal/models"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
)

func TestPostgreSQLPlugin(t *testing.T) {
	ctx := context.Background()

	// Start PostgreSQL container
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

	// Get connection details
	host, err := postgresContainer.Host(ctx)
	require.NoError(t, err)

	port, err := postgresContainer.MappedPort(ctx, "5432")
	require.NoError(t, err)

	// Create plugin
	plugin := NewPlugin()

	// Test plugin metadata
	assert.Equal(t, models.DataSourceTypePostgreSQL, plugin.GetType())
	assert.Equal(t, "PostgreSQL Plugin", plugin.GetName())

	// Create config
	config := &models.PostgreSQLConfig{
		Host:     host,
		Port:     port.Int(),
		Database: "testdb",
		Username: "testuser",
		Password: "testpass",
		SSLMode:  "disable",
	}

	t.Run("ValidateConfig", func(t *testing.T) {
		err := plugin.ValidateConfig(config)
		assert.NoError(t, err)

		// Test invalid config
		err = plugin.ValidateConfig("invalid")
		assert.Error(t, err)
	})

	t.Run("TestConnection", func(t *testing.T) {
		result, err := plugin.TestConnection(ctx, config)
		require.NoError(t, err)
		assert.True(t, result.IsConnected)
		assert.Equal(t, "Connection successful", result.Message)
		assert.Greater(t, result.Latency, int64(0))
	})

	t.Run("Connect", func(t *testing.T) {
		conn, err := plugin.Connect(ctx, config)
		require.NoError(t, err)
		defer func() { _ = conn.Close() }()

		// Test ping
		err = conn.Ping(ctx)
		assert.NoError(t, err)

		// Get metrics
		metrics := conn.GetMetrics()
		assert.GreaterOrEqual(t, metrics.OpenConnections, 0)
	})

	t.Run("Query", func(t *testing.T) {
		conn, err := plugin.Connect(ctx, config)
		require.NoError(t, err)
		defer func() { _ = conn.Close() }()

		// Create a test table
		_, err = conn.Query(ctx, `
			CREATE TABLE IF NOT EXISTS test_table (
				id SERIAL PRIMARY KEY,
				name VARCHAR(100),
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			)
		`)
		require.NoError(t, err)

		// Insert test data
		_, err = conn.Query(ctx, `
			INSERT INTO test_table (name) VALUES ($1), ($2)
		`, "test1", "test2")
		require.NoError(t, err)

		// Query data
		result, err := conn.Query(ctx, "SELECT id, name FROM test_table ORDER BY id")
		require.NoError(t, err)

		assert.Len(t, result.Columns, 2)
		assert.Equal(t, "id", result.Columns[0].Name)
		assert.Equal(t, "name", result.Columns[1].Name)

		assert.Len(t, result.Rows, 2)
		assert.Equal(t, int64(2), result.Stats.RowsReturned)
		assert.Greater(t, result.Stats.ExecutionTime, time.Duration(0))

		// Verify data types
		assert.Contains(t, result.Columns[0].Type, "int") // PostgreSQL returns int4 or similar
		assert.Contains(t, result.Columns[1].Type, "varchar")

		// Clean up
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

		// Find the public schema
		var publicSchema *datasource.DatabaseInfo
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

		// Create a test table
		_, err = conn.Query(ctx, `
			CREATE TABLE IF NOT EXISTS test_tables (
				id SERIAL PRIMARY KEY,
				data TEXT
			)
		`)
		require.NoError(t, err)

		tables, err := conn.GetTables(ctx, "public")
		require.NoError(t, err)

		// Should have at least our test table
		var found bool
		for _, table := range tables {
			if table.Name == "test_tables" {
				found = true
				assert.Equal(t, "BASE TABLE", table.Type)
				assert.NotEmpty(t, table.Columns)

				// Check columns
				var idCol, dataCol bool
				for _, col := range table.Columns {
					if col.Name == "id" {
						idCol = true
						assert.Contains(t, col.Type, "int")
						assert.False(t, col.Nullable)
					}
					if col.Name == "data" {
						dataCol = true
						assert.Equal(t, "text", col.Type)
						assert.True(t, col.Nullable)
					}
				}
				assert.True(t, idCol, "id column not found")
				assert.True(t, dataCol, "data column not found")
				break
			}
		}
		assert.True(t, found, "test_tables not found in table list")

		// Clean up
		_, err = conn.Query(ctx, "DROP TABLE test_tables")
		require.NoError(t, err)
	})

	t.Run("QueryWithParameters", func(t *testing.T) {
		conn, err := plugin.Connect(ctx, config)
		require.NoError(t, err)
		defer func() { _ = conn.Close() }()

		// Create a test table
		_, err = conn.Query(ctx, `
			CREATE TABLE IF NOT EXISTS param_test (
				id INTEGER,
				value TEXT
			)
		`)
		require.NoError(t, err)

		// Insert with parameters
		_, err = conn.Query(ctx, "INSERT INTO param_test VALUES ($1, $2)", 42, "test_value")
		require.NoError(t, err)

		// Query with parameters
		result, err := conn.Query(ctx, "SELECT * FROM param_test WHERE id = $1", 42)
		require.NoError(t, err)

		assert.Len(t, result.Rows, 1)
		assert.Equal(t, int64(42), result.Rows[0][0])
		assert.Equal(t, "test_value", result.Rows[0][1])

		// Clean up
		_, err = conn.Query(ctx, "DROP TABLE param_test")
		require.NoError(t, err)
	})

	t.Run("InvalidConnection", func(t *testing.T) {
		invalidConfig := &models.PostgreSQLConfig{
			Host:     "invalid-host",
			Port:     5432,
			Database: "testdb",
			Username: "testuser",
			Password: "wrongpass",
		}

		result, err := plugin.TestConnection(ctx, invalidConfig)
		require.NoError(t, err)
		assert.False(t, result.IsConnected)
		assert.Contains(t, result.Message, "failed to open PostgreSQL connection")
	})
}

func TestPostgreSQLConfig(t *testing.T) {
	t.Run("ValidConfig", func(t *testing.T) {
		config := &models.PostgreSQLConfig{
			Host:     "localhost",
			Port:     5432,
			Database: "testdb",
			Username: "testuser",
			Password: "testpass",
			SSLMode:  "require",
		}

		err := config.Validate()
		assert.NoError(t, err)

		connStr := config.GetConnectionString()
		assert.Contains(t, connStr, "host=localhost")
		assert.Contains(t, connStr, "port=5432")
		assert.Contains(t, connStr, "dbname=testdb")
		assert.Contains(t, connStr, "user=testuser")
		assert.Contains(t, connStr, "password=testpass")
		assert.Contains(t, connStr, "sslmode=require")
	})

	t.Run("InvalidConfig", func(t *testing.T) {
		config := &models.PostgreSQLConfig{
			Host: "", // Invalid: empty host
		}

		err := config.Validate()
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "host is required")
	})

	t.Run("DefaultPort", func(t *testing.T) {
		config := &models.PostgreSQLConfig{
			Host:     "localhost",
			Port:     0, // Should default to 5432
			Database: "testdb",
		}

		err := config.Validate()
		assert.NoError(t, err)
		assert.Equal(t, 5432, config.Port)
	})

	t.Run("DefaultSSLMode", func(t *testing.T) {
		config := &models.PostgreSQLConfig{
			Host:     "localhost",
			Port:     5432,
			Database: "testdb",
			SSLMode:  "", // Should default to "prefer"
		}

		err := config.Validate()
		assert.NoError(t, err)
		assert.Equal(t, "prefer", config.SSLMode)
	})
}

// BenchmarkPostgreSQLQuery benchmarks query performance
func BenchmarkPostgreSQLQuery(b *testing.B) {
	ctx := context.Background()

	// Start PostgreSQL container
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

	// Get connection details
	host, err := postgresContainer.Host(ctx)
	require.NoError(b, err)

	port, err := postgresContainer.MappedPort(ctx, "5432")
	require.NoError(b, err)

	// Create plugin and connect
	plugin := NewPlugin()
	config := &models.PostgreSQLConfig{
		Host:     host,
		Port:     port.Int(),
		Database: "testdb",
		Username: "testuser",
		Password: "testpass",
		SSLMode:  "disable",
	}

	conn, err := plugin.Connect(ctx, config)
	require.NoError(b, err)
	defer func() { _ = conn.Close() }()

	// Create test table with data
	_, err = conn.Query(ctx, `
		CREATE TABLE IF NOT EXISTS bench_table (
			id SERIAL PRIMARY KEY,
			value TEXT
		)
	`)
	require.NoError(b, err)

	// Insert test data
	for i := 0; i < 1000; i++ {
		_, err = conn.Query(ctx, "INSERT INTO bench_table (value) VALUES ($1)", fmt.Sprintf("value_%d", i))
		require.NoError(b, err)
	}

	b.ResetTimer()

	// Benchmark queries
	for i := 0; i < b.N; i++ {
		_, err := conn.Query(ctx, "SELECT COUNT(*) FROM bench_table")
		require.NoError(b, err)
	}
}
