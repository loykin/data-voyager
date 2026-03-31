package connection

import (
	"encoding/json"
	"fmt"
	"net/http"

	"data-voyager/core/internal/api"
	"data-voyager/core/internal/datasource"
	"data-voyager/sdk"

	"github.com/gin-gonic/gin"
)

// Handler implements api.ServerInterface for the connection domain.
type Handler struct {
	repo     Repository
	registry *datasource.Registry
}

// NewHandler creates a new Handler.
func NewHandler(repo Repository, registry *datasource.Registry) *Handler {
	return &Handler{repo: repo, registry: registry}
}

func (h *Handler) ListConnections(c *gin.Context, params api.ListConnectionsParams) {
	filter := Filter{}
	if params.Type != nil {
		filter.Type = sdk.DataSourceType(*params.Type)
	}
	if params.IsActive != nil {
		filter.IsActive = params.IsActive
	}
	if params.CreatedBy != nil {
		filter.CreatedBy = *params.CreatedBy
	}

	conns, err := h.repo.List(c.Request.Context(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, api.ErrorResponse{Error: err.Error()})
		return
	}

	apiConns := make([]api.Connection, len(conns))
	for i, conn := range conns {
		apiConns[i] = toAPIConnection(conn)
	}
	c.JSON(http.StatusOK, api.ConnectionListResponse{Data: apiConns})
}

func (h *Handler) CreateConnection(c *gin.Context) {
	var body api.CreateConnectionRequest
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, api.ErrorResponse{Error: err.Error()})
		return
	}

	plugin, exists := h.registry.Get(sdk.DataSourceType(body.Type))
	if !exists {
		c.JSON(http.StatusBadRequest, api.ErrorResponse{Error: "unsupported connection type"})
		return
	}

	configJSON, err := json.Marshal(body.Config)
	if err != nil {
		c.JSON(http.StatusInternalServerError, api.ErrorResponse{Error: "failed to serialize config"})
		return
	}
	cfg, err := plugin.ParseConfig(configJSON)
	if err != nil {
		c.JSON(http.StatusBadRequest, api.ErrorResponse{Error: fmt.Sprintf("failed to parse config: %s", err)})
		return
	}
	if err := plugin.ValidateConfig(cfg); err != nil {
		c.JSON(http.StatusBadRequest, api.ErrorResponse{Error: fmt.Sprintf("invalid config: %s", err)})
		return
	}

	conn := &Connection{
		Name:        body.Name,
		Type:        sdk.DataSourceType(body.Type),
		Config:      configJSON,
		Description: strVal(body.Description),
		Tags:        sliceVal(body.Tags),
		CreatedBy:   strVal(body.CreatedBy),
		IsActive:    true,
	}
	if err := h.repo.Create(c.Request.Context(), conn); err != nil {
		c.JSON(http.StatusInternalServerError, api.ErrorResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusCreated, api.ConnectionResponse{Data: toAPIConnection(conn)})
}

func (h *Handler) GetConnection(c *gin.Context, id int64) {
	conn, err := h.repo.GetByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, api.ErrorResponse{Error: "connection not found"})
		return
	}
	c.JSON(http.StatusOK, api.ConnectionResponse{Data: toAPIConnection(conn)})
}

func (h *Handler) UpdateConnection(c *gin.Context, id int64) {
	conn, err := h.repo.GetByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, api.ErrorResponse{Error: "connection not found"})
		return
	}

	var body api.UpdateConnectionRequest
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, api.ErrorResponse{Error: err.Error()})
		return
	}

	if body.Name != nil {
		conn.Name = *body.Name
	}
	if body.Description != nil {
		conn.Description = *body.Description
	}
	if body.Tags != nil {
		conn.Tags = *body.Tags
	}
	if body.IsActive != nil {
		conn.IsActive = *body.IsActive
	}
	if body.Config != nil {
		plugin, exists := h.registry.Get(conn.Type)
		if !exists {
			c.JSON(http.StatusBadRequest, api.ErrorResponse{Error: "plugin not found for type"})
			return
		}
		configJSON, err := json.Marshal(body.Config)
		if err != nil {
			c.JSON(http.StatusInternalServerError, api.ErrorResponse{Error: "failed to serialize config"})
			return
		}
		cfg, err := plugin.ParseConfig(configJSON)
		if err != nil {
			c.JSON(http.StatusBadRequest, api.ErrorResponse{Error: fmt.Sprintf("failed to parse config: %s", err)})
			return
		}
		if err := plugin.ValidateConfig(cfg); err != nil {
			c.JSON(http.StatusBadRequest, api.ErrorResponse{Error: fmt.Sprintf("invalid config: %s", err)})
			return
		}
		conn.Config = configJSON
	}

	if err := h.repo.Update(c.Request.Context(), conn); err != nil {
		c.JSON(http.StatusInternalServerError, api.ErrorResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, api.ConnectionResponse{Data: toAPIConnection(conn)})
}

func (h *Handler) DeleteConnection(c *gin.Context, id int64) {
	if err := h.repo.Delete(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, api.ErrorResponse{Error: err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) TestConnection(c *gin.Context, id int64) {
	conn, err := h.repo.GetByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, api.ErrorResponse{Error: "connection not found"})
		return
	}
	plugin, exists := h.registry.Get(conn.Type)
	if !exists {
		c.JSON(http.StatusInternalServerError, api.ErrorResponse{Error: "plugin not found for type"})
		return
	}
	cfg, err := plugin.ParseConfig(conn.Config)
	if err != nil {
		c.JSON(http.StatusInternalServerError, api.ErrorResponse{Error: "failed to parse config"})
		return
	}
	result, err := plugin.TestConnection(c.Request.Context(), cfg)
	if err != nil {
		result = &sdk.ConnectionTestResult{IsConnected: false, Message: err.Error()}
	}
	c.JSON(http.StatusOK, api.ConnectionTestResponse{
		Data: api.ConnectionTestResult{
			IsConnected: result.IsConnected,
			Message:     result.Message,
			LatencyMs:   &result.Latency,
		},
	})
}

func (h *Handler) GetConnectionSchema(c *gin.Context, _ int64) {
	c.JSON(http.StatusNotImplemented, api.ErrorResponse{Error: "not implemented yet"})
}

func (h *Handler) QueryConnection(c *gin.Context, _ int64) {
	var body api.QueryRequest
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, api.ErrorResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusNotImplemented, api.ErrorResponse{Error: "not implemented yet"})
}

func (h *Handler) ListConnectionTypes(c *gin.Context) {
	types := h.registry.GetSupportedTypes()
	strs := make([]string, len(types))
	for i, t := range types {
		strs[i] = string(t)
	}
	c.JSON(http.StatusOK, api.ConnectionTypesResponse{Data: strs})
}

func (h *Handler) GetConnectionStats(c *gin.Context) {
	stats, err := h.repo.Stats(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, api.ErrorResponse{Error: err.Error()})
		return
	}
	countByType := make(map[string]int64, len(stats.CountByType))
	for k, v := range stats.CountByType {
		countByType[string(k)] = v
	}
	c.JSON(http.StatusOK, api.ConnectionStatsResponse{
		Data: api.ConnectionStats{
			TotalCount:  stats.TotalCount,
			ActiveCount: stats.ActiveCount,
			CountByType: countByType,
		},
	})
}

// -- helpers --

func toAPIConnection(c *Connection) api.Connection {
	conn := api.Connection{
		Id:        c.ID,
		Name:      c.Name,
		Type:      string(c.Type),
		Config:    c.Config,
		IsActive:  c.IsActive,
		CreatedAt: c.CreatedAt,
		UpdatedAt: c.UpdatedAt,
	}
	if c.Description != "" {
		conn.Description = &c.Description
	}
	if c.CreatedBy != "" {
		conn.CreatedBy = &c.CreatedBy
	}
	if len(c.Tags) > 0 {
		conn.Tags = &c.Tags
	}
	return conn
}

func strVal(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func sliceVal(s *[]string) []string {
	if s == nil {
		return nil
	}
	return *s
}
