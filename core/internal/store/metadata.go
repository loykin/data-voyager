package store

import (
	"context"
	"fmt"

	"explorer/core/internal/models"
	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// MetadataStore manages datasource metadata
type MetadataStore struct {
	db *gorm.DB
}

// MetadataStoreConfig represents configuration for metadata store
type MetadataStoreConfig struct {
	Type           string `toml:"type"`           // sqlite or postgresql
	ConnectionURL  string `toml:"connection_url"` // Connection string
	MigrateOnStart bool   `toml:"migrate_on_start"`
}

// NewMetadataStore creates a new metadata store
func NewMetadataStore(config MetadataStoreConfig) (*MetadataStore, error) {
	var db *gorm.DB
	var err error

	gormConfig := &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	}

	switch config.Type {
	case "sqlite":
		db, err = gorm.Open(sqlite.Open(config.ConnectionURL), gormConfig)
	case "postgresql":
		db, err = gorm.Open(postgres.Open(config.ConnectionURL), gormConfig)
	default:
		return nil, fmt.Errorf("unsupported metadata store type: %s", config.Type)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to connect to metadata store: %w", err)
	}

	store := &MetadataStore{db: db}

	if config.MigrateOnStart {
		if err := store.Migrate(); err != nil {
			return nil, fmt.Errorf("failed to migrate metadata store: %w", err)
		}
	}

	return store, nil
}

// Migrate runs database migrations
func (s *MetadataStore) Migrate() error {
	return s.db.AutoMigrate(&models.DataSource{})
}

// CreateDataSource creates a new datasource
func (s *MetadataStore) CreateDataSource(ctx context.Context, ds *models.DataSource) error {
	result := s.db.WithContext(ctx).Create(ds)
	return result.Error
}

// GetDataSource retrieves a datasource by ID
func (s *MetadataStore) GetDataSource(ctx context.Context, id uint) (*models.DataSource, error) {
	var ds models.DataSource
	result := s.db.WithContext(ctx).First(&ds, id)
	if result.Error != nil {
		return nil, result.Error
	}
	return &ds, nil
}

// GetDataSourceByName retrieves a datasource by name
func (s *MetadataStore) GetDataSourceByName(ctx context.Context, name string) (*models.DataSource, error) {
	var ds models.DataSource
	result := s.db.WithContext(ctx).Where("name = ?", name).First(&ds)
	if result.Error != nil {
		return nil, result.Error
	}
	return &ds, nil
}

// ListDataSources retrieves all datasources with optional filters
func (s *MetadataStore) ListDataSources(ctx context.Context, filter *DataSourceFilter) ([]*models.DataSource, error) {
	query := s.db.WithContext(ctx)

	if filter != nil {
		if filter.Type != "" {
			query = query.Where("type = ?", filter.Type)
		}
		if filter.IsActive != nil {
			query = query.Where("is_active = ?", *filter.IsActive)
		}
		if filter.CreatedBy != "" {
			query = query.Where("created_by = ?", filter.CreatedBy)
		}
		if len(filter.Tags) > 0 {
			// Search for any of the provided tags
			for _, tag := range filter.Tags {
				query = query.Where("JSON_EXTRACT(tags, '$') LIKE ?", "%"+tag+"%")
			}
		}
	}

	var datasources []*models.DataSource
	result := query.Find(&datasources)
	return datasources, result.Error
}

// UpdateDataSource updates an existing datasource
func (s *MetadataStore) UpdateDataSource(ctx context.Context, ds *models.DataSource) error {
	result := s.db.WithContext(ctx).Save(ds)
	return result.Error
}

// DeleteDataSource deletes a datasource by ID
func (s *MetadataStore) DeleteDataSource(ctx context.Context, id uint) error {
	result := s.db.WithContext(ctx).Delete(&models.DataSource{}, id)
	return result.Error
}

// GetDataSourceStats returns statistics about datasources
func (s *MetadataStore) GetDataSourceStats(ctx context.Context) (*DataSourceStats, error) {
	var stats DataSourceStats

	// Total count
	if err := s.db.WithContext(ctx).Model(&models.DataSource{}).Count(&stats.TotalCount).Error; err != nil {
		return nil, err
	}

	// Active count
	if err := s.db.WithContext(ctx).Model(&models.DataSource{}).
		Where("is_active = ?", true).Count(&stats.ActiveCount).Error; err != nil {
		return nil, err
	}

	// Count by type
	var typeCounts []struct {
		Type  models.DataSourceType `json:"type"`
		Count int64                 `json:"count"`
	}
	if err := s.db.WithContext(ctx).Model(&models.DataSource{}).
		Select("type, count(*) as count").
		Group("type").
		Find(&typeCounts).Error; err != nil {
		return nil, err
	}

	stats.CountByType = make(map[models.DataSourceType]int64)
	for _, tc := range typeCounts {
		stats.CountByType[tc.Type] = tc.Count
	}

	return &stats, nil
}

// DataSourceFilter represents filters for listing datasources
type DataSourceFilter struct {
	Type      models.DataSourceType `json:"type,omitempty"`
	IsActive  *bool                 `json:"is_active,omitempty"`
	CreatedBy string                `json:"created_by,omitempty"`
	Tags      []string              `json:"tags,omitempty"`
}

// DataSourceStats represents statistics about datasources
type DataSourceStats struct {
	TotalCount    int64                            `json:"total_count"`
	ActiveCount   int64                            `json:"active_count"`
	CountByType   map[models.DataSourceType]int64  `json:"count_by_type"`
}

// Close closes the database connection
func (s *MetadataStore) Close() error {
	sqlDB, err := s.db.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}

// HealthCheck verifies the metadata store is healthy
func (s *MetadataStore) HealthCheck(ctx context.Context) error {
	sqlDB, err := s.db.DB()
	if err != nil {
		return err
	}
	return sqlDB.PingContext(ctx)
}