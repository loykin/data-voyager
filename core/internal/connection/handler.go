package connection

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"data-voyager/core/internal/api"
	"data-voyager/core/internal/datasource"
	qb "data-voyager/core/internal/query_builder"
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

// parseAndValidateConfig marshals config map → JSON, parses and validates via plugin.
// Returns the serialized JSON on success, or writes an error response and returns nil.
func (h *Handler) parseAndValidateConfig(c *gin.Context, dsType sdk.DataSourceType, rawConfig map[string]interface{}) (json.RawMessage, bool) {
	plugin, exists := h.registry.Get(dsType)
	if !exists {
		c.JSON(http.StatusBadRequest, api.ErrorResponse{Error: "unsupported connection type"})
		return nil, false
	}
	configJSON, err := json.Marshal(rawConfig)
	if err != nil {
		c.JSON(http.StatusInternalServerError, api.ErrorResponse{Error: "failed to serialize config"})
		return nil, false
	}
	cfg, err := plugin.ParseConfig(configJSON)
	if err != nil {
		c.JSON(http.StatusBadRequest, api.ErrorResponse{Error: fmt.Sprintf("failed to parse config: %s", err)})
		return nil, false
	}
	if err := plugin.ValidateConfig(cfg); err != nil {
		c.JSON(http.StatusBadRequest, api.ErrorResponse{Error: fmt.Sprintf("invalid config: %s", err)})
		return nil, false
	}
	return configJSON, true
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

	configJSON, ok := h.parseAndValidateConfig(c, sdk.DataSourceType(body.Type), body.Config)
	if !ok {
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
		configJSON, ok := h.parseAndValidateConfig(c, conn.Type, *body.Config)
		if !ok {
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

func (h *Handler) TestConnectionConfig(c *gin.Context) {
	var body api.TestConnectionRequest
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, api.ErrorResponse{Error: err.Error()})
		return
	}
	dsType := sdk.DataSourceType(body.Type)
	configJSON, ok := h.parseAndValidateConfig(c, dsType, body.Config)
	if !ok {
		return
	}
	plugin, _ := h.registry.Get(dsType)
	cfg, err := plugin.ParseConfig(configJSON)
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

func (h *Handler) QueryConnection(c *gin.Context, id int64) {
	var body api.QueryRequest
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, api.ErrorResponse{Error: err.Error()})
		return
	}

	// 1. Load the stored connection.
	conn, err := h.repo.GetByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, api.ErrorResponse{Error: "connection not found"})
		return
	}

	// 2. Resolve plugin and open a live connection.
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
	dbConn, err := plugin.Connect(c.Request.Context(), cfg)
	if err != nil {
		c.JSON(http.StatusBadGateway, api.ErrorResponse{Error: fmt.Sprintf("connection failed: %s", err)})
		return
	}
	defer func() { _ = dbConn.Close() }()

	// 3. Parse time range and build template context.
	var fromStr, toStr string
	if body.TimeRange != nil {
		if body.TimeRange.From != nil {
			fromStr = *body.TimeRange.From
		}
		if body.TimeRange.To != nil {
			toStr = *body.TimeRange.To
		}
	}
	tr, err := qb.ParseTimeRange(fromStr, toStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, api.ErrorResponse{Error: err.Error()})
		return
	}

	limit := 1000
	if body.Limit != nil {
		limit = *body.Limit
	}

	var userVars map[string]any
	if body.Variables != nil {
		userVars = make(map[string]any, len(*body.Variables))
		for k, v := range *body.Variables {
			userVars[k] = v
		}
	}

	tmplCtx := qb.BuildContext(tr, userVars, limit)

	// 4. Render the query template.
	renderedSQL, err := qb.RenderQuery(body.Query, tmplCtx)
	if err != nil {
		c.JSON(http.StatusBadRequest, api.ErrorResponse{Error: err.Error()})
		return
	}

	// 5. Execute the query.
	start := time.Now()
	result, err := dbConn.Query(c.Request.Context(), renderedSQL)
	elapsed := time.Since(start)
	if err != nil {
		c.JSON(http.StatusBadGateway, api.ErrorResponse{Error: fmt.Sprintf("query failed: %s", err)})
		return
	}

	// 6. Map sdk.QueryResult → API response.
	bytesRead := result.Stats.BytesRead
	ctxAsMap := map[string]interface{}{}
	for k, v := range tmplCtx {
		ctxAsMap[k] = v
	}

	c.JSON(http.StatusOK, api.QueryResponse{
		Data: sdkResultToAPI(result),
		Stats: &api.QueryStats{
			ExecutionTimeMs: elapsed.Milliseconds(),
			RowsReturned:    result.Stats.RowsReturned,
			BytesRead:       &bytesRead,
		},
		Inspect: &api.QueryInspect{
			RawQuery:      body.Query,
			ExecutedQuery: renderedSQL,
			Variables:     &ctxAsMap,
		},
	})
}

func (h *Handler) BatchQueryConnection(c *gin.Context, id int64) {
	var body api.BatchQueryRequest
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, api.ErrorResponse{Error: err.Error()})
		return
	}
	if len(body.Queries) == 0 {
		c.JSON(http.StatusBadRequest, api.ErrorResponse{Error: "queries must not be empty"})
		return
	}

	// Resolve connection + plugin once for all queries.
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
	dbConn, err := plugin.Connect(c.Request.Context(), cfg)
	if err != nil {
		c.JSON(http.StatusBadGateway, api.ErrorResponse{Error: fmt.Sprintf("connection failed: %s", err)})
		return
	}
	defer func() { _ = dbConn.Close() }()

	results := make([]api.BatchQueryResultItem, len(body.Queries))
	for idx, item := range body.Queries {
		refID := item.RefId
		req := item.Request

		var fromStr, toStr string
		if req.TimeRange != nil {
			if req.TimeRange.From != nil {
				fromStr = *req.TimeRange.From
			}
			if req.TimeRange.To != nil {
				toStr = *req.TimeRange.To
			}
		}
		tr, err := qb.ParseTimeRange(fromStr, toStr)
		if err != nil {
			errMsg := err.Error()
			results[idx] = api.BatchQueryResultItem{RefId: refID, Error: &errMsg}
			continue
		}

		limit := 10000
		if req.Limit != nil {
			limit = *req.Limit
		}
		var userVars map[string]any
		if req.Variables != nil {
			userVars = make(map[string]any, len(*req.Variables))
			for k, v := range *req.Variables {
				userVars[k] = v
			}
		}

		tmplCtx := qb.BuildContext(tr, userVars, limit)
		renderedSQL, err := qb.RenderQuery(req.Query, tmplCtx)
		if err != nil {
			errMsg := err.Error()
			results[idx] = api.BatchQueryResultItem{RefId: refID, Error: &errMsg}
			continue
		}

		start := time.Now()
		result, err := dbConn.Query(c.Request.Context(), renderedSQL)
		elapsed := time.Since(start)
		if err != nil {
			errMsg := fmt.Sprintf("query failed: %s", err)
			results[idx] = api.BatchQueryResultItem{RefId: refID, Error: &errMsg}
			continue
		}

		bytesRead := result.Stats.BytesRead
		ctxAsMap := map[string]interface{}{}
		for k, v := range tmplCtx {
			ctxAsMap[k] = v
		}
		apiResult := sdkResultToAPI(result)
		results[idx] = api.BatchQueryResultItem{
			RefId: refID,
			Data:  &apiResult,
			Stats: &api.QueryStats{
				ExecutionTimeMs: elapsed.Milliseconds(),
				RowsReturned:    result.Stats.RowsReturned,
				BytesRead:       &bytesRead,
			},
			Inspect: &api.QueryInspect{
				RawQuery:      req.Query,
				ExecutedQuery: renderedSQL,
				Variables:     &ctxAsMap,
			},
		}
	}

	c.JSON(http.StatusOK, api.BatchQueryResponse{Results: results})
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

// sdkResultToAPI converts a sdk.QueryResult (DataFrame-based) to the API type.
func sdkResultToAPI(r *sdk.QueryResult) api.QueryResult {
	if r == nil || len(r.Frames) == 0 {
		return api.QueryResult{Frames: []api.DataFrame{}}
	}
	apiFrames := make([]api.DataFrame, 0, len(r.Frames))
	for _, f := range r.Frames {
		if f == nil {
			continue
		}
		apiFields := make([]api.Field, len(f.Fields))
		for j, field := range f.Fields {
			ft := field.Type
			apiFields[j] = api.Field{
				Name:   field.Name,
				Kind:   api.FieldKind(field.Kind),
				Type:   &ft,
				Values: field.Values,
			}
			if len(field.Labels) > 0 {
				labels := map[string]string(field.Labels)
				apiFields[j].Labels = &labels
			}
		}
		name := f.Name
		apiFrames = append(apiFrames, api.DataFrame{
			Name:      &name,
			FrameType: api.FrameType(f.FrameType),
			Fields:    apiFields,
		})
	}
	return api.QueryResult{Frames: apiFrames}
}
