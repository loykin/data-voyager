package service

import (
	"context"

	"data-voyager/core/internal/datasource"
	"data-voyager/core/internal/store"
	"data-voyager/sdk"
)

// DataSourceService provides business logic for data source operations.
type DataSourceService struct {
	metadataStore *store.MetadataStore
	registry      *datasource.Registry
}

// NewDataSourceService creates a new DataSourceService.
func NewDataSourceService(metadataStore *store.MetadataStore, registry *datasource.Registry) *DataSourceService {
	return &DataSourceService{
		metadataStore: metadataStore,
		registry:      registry,
	}
}

// InitializePlugins loads all extensions registered via sdk.RegisterDatasource.
// Extensions self-register through their init() functions when imported by
// core/internal/generated/extensions.go.
func (s *DataSourceService) InitializePlugins() {
	for _, p := range sdk.GetDatasourcePlugins() {
		s.registry.Register(p)
	}
}

// HealthCheck checks the health of the metadata store.
func (s *DataSourceService) HealthCheck(ctx context.Context) error {
	return s.metadataStore.HealthCheck(ctx)
}
