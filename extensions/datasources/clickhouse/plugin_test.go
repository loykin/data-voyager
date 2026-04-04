package clickhouse

import (
	"context"
	"fmt"
	"testing"
	"time"

	"data-voyager/sdk"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/clickhouse"
)

func TestClickHousePlugin(t *testing.T) {
	ctx := context.Background()

	clickHouseContainer, err := clickhouse.Run(ctx,
		"clickhouse/clickhouse-server:23.8",
		clickhouse.WithUsername("default"),
		clickhouse.WithPassword("password"),
		clickhouse.WithDatabase("testdb"),
	)
	require.NoError(t, err)
	defer func() {
		if err := testcontainers.TerminateContainer(clickHouseContainer); err != nil {
			t.Logf("failed to terminate container: %s", err)
		}
	}()

	host, err := clickHouseContainer.Host(ctx)
	require.NoError(t, err)
	port, err := clickHouseContainer.MappedPort(ctx, "9000")
	require.NoError(t, err)

	plugin := &Plugin{}

	assert.Equal(t, Type, plugin.GetType())
	assert.Equal(t, "ClickHouse", plugin.GetName())

	config := &Config{
		Host:     host,
		Port:     port.Int(),
		Database: "testdb",
		Username: "default",
		Password: "password",
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
				id UInt32, name String, created_at DateTime
			) ENGINE = Memory
		`)
		require.NoError(t, err)

		_, err = conn.Query(ctx, `
			INSERT INTO test_table VALUES
			(1, 'test1', '2023-01-01 10:00:00'),
			(2, 'test2', '2023-01-01 11:00:00')
		`)
		require.NoError(t, err)

		result, err := conn.Query(ctx, "SELECT * FROM test_table ORDER BY id")
		require.NoError(t, err)

		require.Len(t, result.Frames, 1)
		assert.Len(t, result.Frames[0].Fields, 3)
		assert.Equal(t, "id", result.Frames[0].Fields[0].Name)
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

		var testDB *sdk.DatabaseInfo
		for i, db := range schema.Databases {
			if db.Name == "testdb" {
				testDB = &schema.Databases[i]
				break
			}
		}
		assert.NotNil(t, testDB)
	})

	t.Run("GetTables", func(t *testing.T) {
		conn, err := plugin.Connect(ctx, config)
		require.NoError(t, err)
		defer func() { _ = conn.Close() }()

		_, err = conn.Query(ctx, `CREATE TABLE IF NOT EXISTS test_tables (id UInt32) ENGINE = Memory`)
		require.NoError(t, err)

		tables, err := conn.GetTables(ctx, "testdb")
		require.NoError(t, err)

		var found bool
		for _, table := range tables {
			if table.Name == "test_tables" {
				found = true
				assert.Equal(t, "Memory", table.Type)
				break
			}
		}
		assert.True(t, found, "test_tables not found")

		_, err = conn.Query(ctx, "DROP TABLE test_tables")
		require.NoError(t, err)
	})

	t.Run("InvalidConnection", func(t *testing.T) {
		invalidConfig := &Config{Host: "invalid-host", Port: 9999, Database: "testdb"}
		result, err := plugin.TestConnection(ctx, invalidConfig)
		require.NoError(t, err)
		assert.False(t, result.IsConnected)
		assert.Contains(t, result.Message, "failed to open ClickHouse connection")
	})
}

func TestClickHouseConfig(t *testing.T) {
	t.Run("ValidConfig", func(t *testing.T) {
		config := &Config{Host: "localhost", Port: 9000, Database: "default", Username: "default", Password: "password"}
		err := config.Validate()
		assert.NoError(t, err)
		assert.Contains(t, config.GetConnectionString(), "tcp://localhost:9000")
	})

	t.Run("InvalidConfig", func(t *testing.T) {
		err := (&Config{Host: ""}).Validate()
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "host is required")
	})

	t.Run("DefaultPort", func(t *testing.T) {
		config := &Config{Host: "localhost", Port: 0}
		require.NoError(t, config.Validate())
		assert.Equal(t, 9000, config.Port)
	})

	t.Run("SecureConnection", func(t *testing.T) {
		config := &Config{Host: "localhost", Port: 9440, Secure: true}
		_ = config.Validate()
		assert.Contains(t, config.GetConnectionString(), "tls://localhost:9440")
	})
}

func BenchmarkClickHouseQuery(b *testing.B) {
	ctx := context.Background()

	clickHouseContainer, err := clickhouse.Run(ctx,
		"clickhouse/clickhouse-server:23.8",
		clickhouse.WithUsername("default"),
		clickhouse.WithPassword("password"),
		clickhouse.WithDatabase("testdb"),
	)
	require.NoError(b, err)
	defer func() {
		if err := testcontainers.TerminateContainer(clickHouseContainer); err != nil {
			b.Logf("failed to terminate container: %s", err)
		}
	}()

	host, err := clickHouseContainer.Host(ctx)
	require.NoError(b, err)
	port, err := clickHouseContainer.MappedPort(ctx, "9000")
	require.NoError(b, err)

	plugin := &Plugin{}
	config := &Config{Host: host, Port: port.Int(), Database: "testdb", Username: "default", Password: "password"}

	conn, err := plugin.Connect(ctx, config)
	require.NoError(b, err)
	defer func() { _ = conn.Close() }()

	_, err = conn.Query(ctx, `CREATE TABLE IF NOT EXISTS bench_table (id UInt32, value String) ENGINE = Memory`)
	require.NoError(b, err)

	for i := 0; i < 1000; i++ {
		_, err = conn.Query(ctx, "INSERT INTO bench_table VALUES (?, ?)", i, fmt.Sprintf("value_%d", i))
		require.NoError(b, err)
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := conn.Query(ctx, "SELECT COUNT(*) FROM bench_table")
		require.NoError(b, err)
	}
}
