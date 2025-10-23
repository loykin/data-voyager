package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"explorer/core/internal/datasource"
	"explorer/core/internal/models"
	"explorer/core/internal/store"
	"github.com/gin-gonic/gin"
)

// DataSourceHandler handles data source API endpoints
type DataSourceHandler struct {
	metadataStore *store.MetadataStore
	registry      *datasource.Registry
}

// NewDataSourceHandler creates a new data source handler
func NewDataSourceHandler(metadataStore *store.MetadataStore, registry *datasource.Registry) *DataSourceHandler {
	return &DataSourceHandler{
		metadataStore: metadataStore,
		registry:      registry,
	}
}

// RegisterRoutes registers data source routes
func (h *DataSourceHandler) RegisterRoutes(r *gin.RouterGroup) {
	ds := r.Group("/datasources")
	{
		ds.GET("", h.ListDataSources)
		ds.POST("", h.CreateDataSource)
		ds.GET("/:id", h.GetDataSource)
		ds.PUT("/:id", h.UpdateDataSource)
		ds.DELETE("/:id", h.DeleteDataSource)
		ds.POST("/:id/test", h.TestDataSource)
		ds.GET("/:id/schema", h.GetDataSourceSchema)
		ds.POST("/:id/query", h.QueryDataSource)
	}

	// Additional endpoints
	r.GET("/datasource-types", h.GetSupportedTypes)
	r.GET("/datasource-stats", h.GetDataSourceStats)
}

// CreateDataSourceRequest represents the request for creating a data source
type CreateDataSourceRequest struct {
	Name        string                 `json:"name" binding:"required"`
	Type        models.DataSourceType  `json:"type" binding:"required"`
	Config      map[string]interface{} `json:"config" binding:"required"`
	Description string                 `json:"description"`
	Tags        []string               `json:"tags"`
	CreatedBy   string                 `json:"created_by"`
}

// UpdateDataSourceRequest represents the request for updating a data source
type UpdateDataSourceRequest struct {
	Name        *string                `json:"name,omitempty"`
	Config      map[string]interface{} `json:"config,omitempty"`
	Description *string                `json:"description,omitempty"`
	Tags        []string               `json:"tags,omitempty"`
	IsActive    *bool                  `json:"is_active,omitempty"`
}

// QueryRequest represents a query request
type QueryRequest struct {
	Query  string        `json:"query" binding:"required"`
	Params []interface{} `json:"params,omitempty"`
	Limit  *int          `json:"limit,omitempty"`
}

// ListDataSources handles GET /api/v1/datasources
func (h *DataSourceHandler) ListDataSources(c *gin.Context) {
	// Parse query parameters for filtering
	filter := &store.DataSourceFilter{}

	if dsType := c.Query("type"); dsType != "" {
		filter.Type = models.DataSourceType(dsType)
	}

	if isActiveStr := c.Query("is_active"); isActiveStr != "" {
		if isActive, err := strconv.ParseBool(isActiveStr); err == nil {
			filter.IsActive = &isActive
		}
	}

	if createdBy := c.Query("created_by"); createdBy != "" {
		filter.CreatedBy = createdBy
	}

	dataSources, err := h.metadataStore.ListDataSources(c.Request.Context(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": dataSources})
}

// CreateDataSource handles POST /api/v1/datasources
func (h *DataSourceHandler) CreateDataSource(c *gin.Context) {
	var req CreateDataSourceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate that the plugin exists
	plugin, exists := h.registry.Get(req.Type)
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unsupported data source type"})
		return
	}

	// Validate configuration
	if err := plugin.ValidateConfig(req.Config); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid configuration: " + err.Error()})
		return
	}

	// Convert config to JSON
	configJSON, err := json.Marshal(req.Config)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to serialize configuration"})
		return
	}

	// Create data source
	ds := &models.DataSource{
		Name:        req.Name,
		Type:        req.Type,
		Config:      configJSON,
		Description: req.Description,
		Tags:        req.Tags,
		CreatedBy:   req.CreatedBy,
		IsActive:    true,
	}

	if err := h.metadataStore.CreateDataSource(c.Request.Context(), ds); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": ds})
}

// GetDataSource handles GET /api/v1/datasources/:id
func (h *DataSourceHandler) GetDataSource(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid ID"})
		return
	}

	ds, err := h.metadataStore.GetDataSource(c.Request.Context(), uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "data source not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": ds})
}

// UpdateDataSource handles PUT /api/v1/datasources/:id
func (h *DataSourceHandler) UpdateDataSource(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid ID"})
		return
	}

	var req UpdateDataSourceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get existing data source
	ds, err := h.metadataStore.GetDataSource(c.Request.Context(), uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "data source not found"})
		return
	}

	// Update fields
	if req.Name != nil {
		ds.Name = *req.Name
	}
	if req.Description != nil {
		ds.Description = *req.Description
	}
	if req.Tags != nil {
		ds.Tags = req.Tags
	}
	if req.IsActive != nil {
		ds.IsActive = *req.IsActive
	}
	if req.Config != nil {
		// Validate configuration if provided
		plugin, exists := h.registry.Get(ds.Type)
		if exists {
			if err := plugin.ValidateConfig(req.Config); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid configuration: " + err.Error()})
				return
			}
		}

		configJSON, err := json.Marshal(req.Config)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to serialize configuration"})
			return
		}
		ds.Config = configJSON
	}

	if err := h.metadataStore.UpdateDataSource(c.Request.Context(), ds); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": ds})
}

// DeleteDataSource handles DELETE /api/v1/datasources/:id
func (h *DataSourceHandler) DeleteDataSource(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid ID"})
		return
	}

	if err := h.metadataStore.DeleteDataSource(c.Request.Context(), uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusNoContent, nil)
}

// TestDataSource handles POST /api/v1/datasources/:id/test
func (h *DataSourceHandler) TestDataSource(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid ID"})
		return
	}

	ds, err := h.metadataStore.GetDataSource(c.Request.Context(), uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "data source not found"})
		return
	}

	plugin, exists := h.registry.Get(ds.Type)
	if !exists {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "plugin not found for data source type"})
		return
	}

	// Parse config based on type
	var config models.ConnectionConfig
	switch ds.Type {
	case models.DataSourceTypeClickHouse:
		config = &models.ClickHouseConfig{}
	case models.DataSourceTypePostgreSQL:
		config = &models.PostgreSQLConfig{}
	case models.DataSourceTypeSQLite:
		config = &models.SQLiteConfig{}
	case models.DataSourceTypeOpenSearch:
		config = &models.OpenSearchConfig{}
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "unsupported data source type"})
		return
	}

	if err := json.Unmarshal(ds.Config, config); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse configuration"})
		return
	}

	// Test connection
	result, err := plugin.TestConnection(c.Request.Context(), config)
	if err != nil {
		result = &models.ConnectionTestResult{
			IsConnected: false,
			Message:     err.Error(),
		}
	}

	c.JSON(http.StatusOK, gin.H{"data": result})
}

// GetDataSourceSchema handles GET /api/v1/datasources/:id/schema
func (h *DataSourceHandler) GetDataSourceSchema(c *gin.Context) {
	_, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid ID"})
		return
	}

	// Implementation for getting schema would go here
	// This would use the connection to get table/column information
	c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented yet"})
}

// QueryDataSource handles POST /api/v1/datasources/:id/query
func (h *DataSourceHandler) QueryDataSource(c *gin.Context) {
	_, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid ID"})
		return
	}

	var req QueryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Implementation for executing queries would go here
	c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented yet"})
}

// GetSupportedTypes handles GET /api/v1/datasource-types
func (h *DataSourceHandler) GetSupportedTypes(c *gin.Context) {
	types := h.registry.GetSupportedTypes()
	c.JSON(http.StatusOK, gin.H{"data": types})
}

// GetDataSourceStats handles GET /api/v1/datasource-stats
func (h *DataSourceHandler) GetDataSourceStats(c *gin.Context) {
	stats, err := h.metadataStore.GetDataSourceStats(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": stats})
}