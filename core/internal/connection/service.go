package connection

import (
	"context"

	"data-voyager/core/internal/datasource"
	"data-voyager/sdk"
)

// Service provides business logic for connection management.
type Service struct {
	repo     Repository
	registry *datasource.Registry
}

// NewService creates a new Service.
func NewService(repo Repository, registry *datasource.Registry) *Service {
	return &Service{repo: repo, registry: registry}
}

// InitializePlugins loads all extensions registered via sdk.RegisterDatasource.
func (s *Service) InitializePlugins() {
	for _, p := range sdk.GetDatasourcePlugins() {
		s.registry.Register(p)
	}
}

// HealthCheck checks the health of the metadata store.
func (s *Service) HealthCheck(ctx context.Context) error {
	return s.repo.Health(ctx)
}
