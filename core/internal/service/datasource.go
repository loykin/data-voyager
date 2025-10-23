package service

import (
	"context"

	"data-voyager/core/internal/datasource"
	"data-voyager/core/internal/datasource/plugins/clickhouse"
	"data-voyager/core/internal/datasource/plugins/postgresql"
	"data-voyager/core/internal/store"
)

// DataSourceService provides business logic for data source operations
type DataSourceService struct {
	metadataStore *store.MetadataStore
	registry      *datasource.Registry
}

// NewDataSourceService creates a new data source service
func NewDataSourceService(metadataStore *store.MetadataStore, registry *datasource.Registry) *DataSourceService {
	return &DataSourceService{
		metadataStore: metadataStore,
		registry:      registry,
	}
}

// InitializePlugins initializes and registers all built-in plugins
func (s *DataSourceService) InitializePlugins() {
	// Import and register ClickHouse plugin
	clickhousePlugin := clickhouse.NewPlugin()
	s.registry.Register(clickhousePlugin)

	// Import and register PostgreSQL plugin
	postgresqlPlugin := postgresql.NewPlugin()
	s.registry.Register(postgresqlPlugin)

	// TODO: Add more plugins as they are implemented
	// - SQLite plugin
	// - OpenSearch plugin
	// - Future HashiCorp plugin architecture
}

// HealthCheck checks the health of the data source service
func (s *DataSourceService) HealthCheck(ctx context.Context) error {
	return s.metadataStore.HealthCheck(ctx)
}
