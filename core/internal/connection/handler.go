package connection

import (
	"encoding/json"
	"net/http"
	"strconv"

	"data-voyager/core/internal/datasource"
	"data-voyager/sdk"
	"github.com/gin-gonic/gin"
)

// Handler handles connection API endpoints.
type Handler struct {
	repo     Repository
	registry *datasource.Registry
}

// NewHandler creates a new Handler.
func NewHandler(repo Repository, registry *datasource.Registry) *Handler {
	return &Handler{repo: repo, registry: registry}
}

// RegisterRoutes registers connection routes.
func (h *Handler) RegisterRoutes(r *gin.RouterGroup) {
	g := r.Group("/connections")
	{
		g.GET("", h.List)
		g.POST("", h.Create)
		g.GET("/:id", h.Get)
		g.PUT("/:id", h.Update)
		g.DELETE("/:id", h.Delete)
		g.POST("/:id/test", h.Test)
		g.GET("/:id/schema", h.Schema)
		g.POST("/:id/query", h.Query)
	}

	r.GET("/connection-types", h.SupportedTypes)
	r.GET("/connection-stats", h.ConnectionStats)
}

// CreateRequest is the request body for creating a connection.
type CreateRequest struct {
	Name        string                 `json:"name" binding:"required"`
	Type        sdk.DataSourceType     `json:"type" binding:"required"`
	Config      map[string]interface{} `json:"config" binding:"required"`
	Description string                 `json:"description"`
	Tags        []string               `json:"tags"`
	CreatedBy   string                 `json:"created_by"`
}

// UpdateRequest is the request body for updating a connection.
type UpdateRequest struct {
	Name        *string                `json:"name,omitempty"`
	Config      map[string]interface{} `json:"config,omitempty"`
	Description *string                `json:"description,omitempty"`
	Tags        []string               `json:"tags,omitempty"`
	IsActive    *bool                  `json:"is_active,omitempty"`
}

// QueryRequest is the request body for querying via a connection.
type QueryRequest struct {
	Query  string        `json:"query" binding:"required"`
	Params []interface{} `json:"params,omitempty"`
	Limit  *int          `json:"limit,omitempty"`
}

func (h *Handler) List(c *gin.Context) {
	filter := Filter{}

	if t := c.Query("type"); t != "" {
		filter.Type = sdk.DataSourceType(t)
	}
	if s := c.Query("is_active"); s != "" {
		if v, err := strconv.ParseBool(s); err == nil {
			filter.IsActive = &v
		}
	}
	if v := c.Query("created_by"); v != "" {
		filter.CreatedBy = v
	}

	conns, err := h.repo.List(c.Request.Context(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": conns})
}

func (h *Handler) Create(c *gin.Context) {
	var req CreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	plugin, exists := h.registry.Get(req.Type)
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unsupported connection type"})
		return
	}

	configJSON, err := json.Marshal(req.Config)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to serialize config"})
		return
	}
	cfg, err := plugin.ParseConfig(configJSON)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to parse config: " + err.Error()})
		return
	}
	if err := plugin.ValidateConfig(cfg); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid config: " + err.Error()})
		return
	}

	conn := &Connection{
		Name:        req.Name,
		Type:        req.Type,
		Config:      configJSON,
		Description: req.Description,
		Tags:        req.Tags,
		CreatedBy:   req.CreatedBy,
		IsActive:    true,
	}
	if err := h.repo.Create(c.Request.Context(), conn); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": conn})
}

func (h *Handler) Get(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	conn, err := h.repo.GetByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "connection not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": conn})
}

func (h *Handler) Update(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var req UpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	conn, err := h.repo.GetByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "connection not found"})
		return
	}

	if req.Name != nil {
		conn.Name = *req.Name
	}
	if req.Description != nil {
		conn.Description = *req.Description
	}
	if req.Tags != nil {
		conn.Tags = req.Tags
	}
	if req.IsActive != nil {
		conn.IsActive = *req.IsActive
	}
	if req.Config != nil {
		plugin, exists := h.registry.Get(conn.Type)
		if exists {
			configJSON, err := json.Marshal(req.Config)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to serialize config"})
				return
			}
			cfg, err := plugin.ParseConfig(configJSON)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "failed to parse config: " + err.Error()})
				return
			}
			if err := plugin.ValidateConfig(cfg); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid config: " + err.Error()})
				return
			}
			conn.Config = configJSON
		}
	}

	if err := h.repo.Update(c.Request.Context(), conn); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": conn})
}

func (h *Handler) Delete(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	if err := h.repo.Delete(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusNoContent, nil)
}

func (h *Handler) Test(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	conn, err := h.repo.GetByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "connection not found"})
		return
	}
	plugin, exists := h.registry.Get(conn.Type)
	if !exists {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "plugin not found for type"})
		return
	}
	cfg, err := plugin.ParseConfig(conn.Config)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse config"})
		return
	}
	result, err := plugin.TestConnection(c.Request.Context(), cfg)
	if err != nil {
		result = &sdk.ConnectionTestResult{IsConnected: false, Message: err.Error()}
	}
	c.JSON(http.StatusOK, gin.H{"data": result})
}

func (h *Handler) Schema(c *gin.Context) {
	_, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented yet"})
}

func (h *Handler) Query(c *gin.Context) {
	_, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	var req QueryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented yet"})
}

func (h *Handler) SupportedTypes(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"data": h.registry.GetSupportedTypes()})
}

func (h *Handler) ConnectionStats(c *gin.Context) {
	stats, err := h.repo.Stats(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": stats})
}
