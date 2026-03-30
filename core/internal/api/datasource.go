package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"data-voyager/core/internal/datasource"
	"data-voyager/core/internal/models"
	"data-voyager/core/internal/store"
	"data-voyager/sdk"
	"github.com/gin-gonic/gin"
)

// DataSourceHandler handles data source API endpoints.
type DataSourceHandler struct {
	metadataStore *store.MetadataStore
	registry      *datasource.Registry
}

// NewDataSourceHandler creates a new DataSourceHandler.
func NewDataSourceHandler(metadataStore *store.MetadataStore, registry *datasource.Registry) *DataSourceHandler {
	return &DataSourceHandler{
		metadataStore: metadataStore,
		registry:      registry,
	}
}

// RegisterRoutes registers data source routes.
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

	r.GET("/datasource-types", h.GetSupportedTypes)
	r.GET("/datasource-stats", h.GetDataSourceStats)
}

// CreateDataSourceRequest is the request body for creating a datasource.
type CreateDataSourceRequest struct {
	Name        string                 `json:"name" binding:"required"`
	Type        sdk.DataSourceType     `json:"type" binding:"required"`
	Config      map[string]interface{} `json:"config" binding:"required"`
	Description string                 `json:"description"`
	Tags        []string               `json:"tags"`
	CreatedBy   string                 `json:"created_by"`
}

// UpdateDataSourceRequest is the request body for updating a datasource.
type UpdateDataSourceRequest struct {
	Name        *string                `json:"name,omitempty"`
	Config      map[string]interface{} `json:"config,omitempty"`
	Description *string                `json:"description,omitempty"`
	Tags        []string               `json:"tags,omitempty"`
	IsActive    *bool                  `json:"is_active,omitempty"`
}

// QueryRequest is the request body for querying a datasource.
type QueryRequest struct {
	Query  string        `json:"query" binding:"required"`
	Params []interface{} `json:"params,omitempty"`
	Limit  *int          `json:"limit,omitempty"`
}

// ListDataSources handles GET /api/v1/datasources
func (h *DataSourceHandler) ListDataSources(c *gin.Context) {
	filter := &store.DataSourceFilter{}

	if dsType := c.Query("type"); dsType != "" {
		filter.Type = sdk.DataSourceType(dsType)
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

	plugin, exists := h.registry.Get(req.Type)
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unsupported data source type"})
		return
	}

	configJSON, err := json.Marshal(req.Config)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to serialize configuration"})
		return
	}

	// Each plugin deserializes its own config — no switch statement needed.
	config, err := plugin.ParseConfig(configJSON)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to parse configuration: " + err.Error()})
		return
	}

	if err := plugin.ValidateConfig(config); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid configuration: " + err.Error()})
		return
	}

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

	ds, err := h.metadataStore.GetDataSource(c.Request.Context(), uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "data source not found"})
		return
	}

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
		plugin, exists := h.registry.Get(ds.Type)
		if exists {
			configJSON, err := json.Marshal(req.Config)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to serialize configuration"})
				return
			}
			config, err := plugin.ParseConfig(configJSON)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "failed to parse configuration: " + err.Error()})
				return
			}
			if err := plugin.ValidateConfig(config); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid configuration: " + err.Error()})
				return
			}
			ds.Config = configJSON
		}
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

	config, err := plugin.ParseConfig(ds.Config)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse configuration"})
		return
	}

	result, err := plugin.TestConnection(c.Request.Context(), config)
	if err != nil {
		result = &sdk.ConnectionTestResult{IsConnected: false, Message: err.Error()}
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

	c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented yet"})
}

// GetSupportedTypes handles GET /api/v1/datasource-types
func (h *DataSourceHandler) GetSupportedTypes(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"data": h.registry.GetSupportedTypes()})
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
