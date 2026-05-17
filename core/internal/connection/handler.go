package connection

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	openapi_types "github.com/oapi-codegen/runtime/types"

	"data-voyager/core/internal/api"
	"data-voyager/core/internal/datasource"
	qb "data-voyager/core/internal/query_builder"
	"data-voyager/sdk"
)

// Handler implements api.ServerInterface for the connection domain.
type Handler struct {
	repo        Repository
	registry    *datasource.Registry
	historyRepo HistoryRepository
}

// NewHandler creates a new Handler.
func NewHandler(repo Repository, registry *datasource.Registry) *Handler {
	return &Handler{repo: repo, registry: registry, historyRepo: NoopHistoryRepository{}}
}

// WithHistoryRepo attaches a HistoryRepository for audit logging.
func (h *Handler) WithHistoryRepo(r HistoryRepository) *Handler {
	h.historyRepo = r
	return h
}

// parseAndValidateConfig marshals config map → JSON, parses and validates via plugin.
// Returns the serialized JSON on success, or writes an error response and returns nil.
func (h *Handler) parseAndValidateConfig(c *gin.Context, dsType sdk.DataSourceType, rawConfig map[string]interface{}) (json.RawMessage, bool) {
	plugin, exists := h.registry.Get(dsType)
	if !exists {
		c.JSON(http.StatusBadRequest, api.ErrorResponse{Error: "unsupported datasource type"})
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

func (h *Handler) ListDatasources(c *gin.Context, params api.ListDatasourcesParams) {
	filter := Filter{}
	if params.Type != nil {
		filter.Type = sdk.DataSourceType(*params.Type)
	}
	if params.Enabled != nil {
		filter.IsActive = params.Enabled
	}
	if params.CreatedBy != nil {
		filter.CreatedBy = *params.CreatedBy
	}

	conns, err := h.repo.List(c.Request.Context(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, api.ErrorResponse{Error: err.Error()})
		return
	}

	apiConns := make([]api.Datasource, len(conns))
	for i, conn := range conns {
		apiConns[i] = toAPIDatasource(conn)
	}
	c.JSON(http.StatusOK, api.DatasourceListResponse{Data: apiConns})
}

func (h *Handler) CreateDatasource(c *gin.Context) {
	var body api.CreateDatasourceRequest
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, api.ErrorResponse{Error: err.Error()})
		return
	}

	configJSON, ok := h.parseAndValidateConfig(c, sdk.DataSourceType(body.Type), body.Options)
	if !ok {
		return
	}

	conn := &Connection{
		Name:        body.Name,
		Type:        sdk.DataSourceType(body.Type),
		Config:      configJSON,
		Description: metaString(body.Meta, "description"),
		Tags:        metaStringSlice(body.Meta, "tags"),
		CreatedBy:   metaString(body.Meta, "createdBy"),
		IsActive:    true,
	}
	if err := h.repo.Create(c.Request.Context(), conn); err != nil {
		c.JSON(http.StatusInternalServerError, api.ErrorResponse{Error: err.Error()})
		return
	}
	h.recordHistory(c.Request.Context(), conn.ID, conn.Name, string(conn.Type), "created")
	c.JSON(http.StatusCreated, api.DatasourceResponse{Data: toAPIDatasource(conn)})
}

func (h *Handler) GetDatasource(c *gin.Context, id openapi_types.UUID) {
	conn, err := h.repo.GetByID(c.Request.Context(), id.String())
	if err != nil {
		c.JSON(http.StatusNotFound, api.ErrorResponse{Error: "datasource not found"})
		return
	}
	c.JSON(http.StatusOK, api.DatasourceResponse{Data: toAPIDatasource(conn)})
}

func (h *Handler) UpdateDatasource(c *gin.Context, id openapi_types.UUID) {
	conn, err := h.repo.GetByID(c.Request.Context(), id.String())
	if err != nil {
		c.JSON(http.StatusNotFound, api.ErrorResponse{Error: "datasource not found"})
		return
	}

	var body api.UpdateDatasourceRequest
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, api.ErrorResponse{Error: err.Error()})
		return
	}

	if body.Name != nil {
		conn.Name = *body.Name
	}
	if body.Meta != nil {
		conn.Description = metaString(body.Meta, "description")
		conn.Tags = metaStringSlice(body.Meta, "tags")
		if createdBy := metaString(body.Meta, "createdBy"); createdBy != "" {
			conn.CreatedBy = createdBy
		}
	}
	if body.Enabled != nil {
		conn.IsActive = *body.Enabled
	}
	if body.Options != nil {
		configJSON, ok := h.parseAndValidateConfig(c, conn.Type, *body.Options)
		if !ok {
			return
		}
		conn.Config = configJSON
	}

	if err := h.repo.Update(c.Request.Context(), conn); err != nil {
		c.JSON(http.StatusInternalServerError, api.ErrorResponse{Error: err.Error()})
		return
	}
	h.recordHistory(c.Request.Context(), conn.ID, conn.Name, string(conn.Type), "updated")
	c.JSON(http.StatusOK, api.DatasourceResponse{Data: toAPIDatasource(conn)})
}

func (h *Handler) DeleteDatasource(c *gin.Context, id openapi_types.UUID) {
	existing, _ := h.repo.GetByID(c.Request.Context(), id.String())
	if err := h.repo.Delete(c.Request.Context(), id.String()); err != nil {
		c.JSON(http.StatusInternalServerError, api.ErrorResponse{Error: err.Error()})
		return
	}
	if existing != nil {
		h.recordHistory(c.Request.Context(), existing.ID, existing.Name, string(existing.Type), "deleted")
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) recordHistory(ctx context.Context, connID, name, connType, action string) {
	id, err := uuid.NewV7()
	if err != nil {
		return
	}
	_ = h.historyRepo.Record(ctx, &ConnectionHistory{
		ID:             id.String(),
		ConnectionID:   connID,
		ConnectionName: name,
		ConnectionType: connType,
		Action:         action,
		ChangedAt:      time.Now().UTC(),
	})
}

func (h *Handler) TestDatasource(c *gin.Context, id openapi_types.UUID) {
	conn, err := h.repo.GetByID(c.Request.Context(), id.String())
	if err != nil {
		c.JSON(http.StatusNotFound, api.ErrorResponse{Error: "datasource not found"})
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
	c.JSON(http.StatusOK, api.DatasourceTestResponse{
		Data: api.DatasourceTestResult{
			Ok:        result.IsConnected,
			Message:   result.Message,
			LatencyMs: &result.Latency,
		},
	})
}

func (h *Handler) TestDatasourceConfig(c *gin.Context) {
	var body api.TestDatasourceRequest
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, api.ErrorResponse{Error: err.Error()})
		return
	}
	dsType := sdk.DataSourceType(body.Type)
	configJSON, ok := h.parseAndValidateConfig(c, dsType, body.Options)
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
	c.JSON(http.StatusOK, api.DatasourceTestResponse{
		Data: api.DatasourceTestResult{
			Ok:        result.IsConnected,
			Message:   result.Message,
			LatencyMs: &result.Latency,
		},
	})
}

func (h *Handler) GetDatasourceSchema(c *gin.Context, id openapi_types.UUID) {
	conn, err := h.repo.GetByID(c.Request.Context(), id.String())
	if err != nil {
		c.JSON(http.StatusNotFound, api.ErrorResponse{Error: "datasource not found"})
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
		c.JSON(http.StatusBadGateway, api.ErrorResponse{Error: fmt.Sprintf("datasource failed: %s", err)})
		return
	}
	defer func() { _ = dbConn.Close() }()

	schema, err := dbConn.GetSchema(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, api.ErrorResponse{Error: fmt.Sprintf("failed to get schema: %s", err)})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": schema})
}

func (h *Handler) QueryDatasource(c *gin.Context, id openapi_types.UUID) {
	var body api.QueryRequest
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, api.ErrorResponse{Error: err.Error()})
		return
	}

	// 1. Load the stored datasource.
	conn, err := h.repo.GetByID(c.Request.Context(), id.String())
	if err != nil {
		c.JSON(http.StatusNotFound, api.ErrorResponse{Error: "datasource not found"})
		return
	}

	// 2. Resolve plugin and open a live datasource session.
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
		c.JSON(http.StatusBadGateway, api.ErrorResponse{Error: fmt.Sprintf("datasource failed: %s", err)})
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

func (h *Handler) BatchQueryDatasource(c *gin.Context, id openapi_types.UUID) {
	var body api.BatchQueryRequest
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, api.ErrorResponse{Error: err.Error()})
		return
	}
	if len(body.Queries) == 0 {
		c.JSON(http.StatusBadRequest, api.ErrorResponse{Error: "queries must not be empty"})
		return
	}

	// Resolve datasource + plugin once for all queries.
	conn, err := h.repo.GetByID(c.Request.Context(), id.String())
	if err != nil {
		c.JSON(http.StatusNotFound, api.ErrorResponse{Error: "datasource not found"})
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
		c.JSON(http.StatusBadGateway, api.ErrorResponse{Error: fmt.Sprintf("datasource failed: %s", err)})
		return
	}
	defer func() { _ = dbConn.Close() }()

	results := make([]api.BatchQueryResultItem, len(body.Queries))
	for idx, item := range body.Queries {
		refID := item.Id
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
			results[idx] = api.BatchQueryResultItem{Id: refID, Error: &errMsg}
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
			results[idx] = api.BatchQueryResultItem{Id: refID, Error: &errMsg}
			continue
		}

		start := time.Now()
		result, err := dbConn.Query(c.Request.Context(), renderedSQL)
		elapsed := time.Since(start)
		if err != nil {
			errMsg := fmt.Sprintf("query failed: %s", err)
			results[idx] = api.BatchQueryResultItem{Id: refID, Error: &errMsg}
			continue
		}

		bytesRead := result.Stats.BytesRead
		ctxAsMap := map[string]interface{}{}
		for k, v := range tmplCtx {
			ctxAsMap[k] = v
		}
		apiResult := sdkResultToAPI(result)
		results[idx] = api.BatchQueryResultItem{
			Id:   refID,
			Data: &apiResult,
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

func (h *Handler) ListDatasourceTypes(c *gin.Context) {
	types := h.registry.GetSupportedTypes()
	strs := make([]string, len(types))
	for i, t := range types {
		strs[i] = string(t)
	}
	c.JSON(http.StatusOK, api.DatasourceTypesResponse{Data: strs})
}

func (h *Handler) GetDatasourceStats(c *gin.Context) {
	stats, err := h.repo.Stats(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, api.ErrorResponse{Error: err.Error()})
		return
	}
	countByType := make(map[string]int64, len(stats.CountByType))
	for k, v := range stats.CountByType {
		countByType[string(k)] = v
	}
	c.JSON(http.StatusOK, api.DatasourceStatsResponse{
		Data: api.DatasourceStats{
			TotalCount:  stats.TotalCount,
			ActiveCount: stats.ActiveCount,
			CountByType: countByType,
		},
	})
}

// -- helpers --

func toAPIDatasource(c *Connection) api.Datasource {
	meta := map[string]interface{}{}
	if c.Description != "" {
		meta["description"] = c.Description
	}
	if c.CreatedBy != "" {
		meta["createdBy"] = c.CreatedBy
	}
	if len(c.Tags) > 0 {
		meta["tags"] = c.Tags
	}
	conn := api.Datasource{
		Uid:       uuid.MustParse(c.ID),
		Name:      c.Name,
		Type:      string(c.Type),
		Options:   c.Config,
		Enabled:   c.IsActive,
		CreatedAt: c.CreatedAt,
		UpdatedAt: c.UpdatedAt,
	}
	if len(meta) > 0 {
		conn.Meta = &meta
	}
	return conn
}

func metaString(meta *map[string]interface{}, key string) string {
	if meta == nil {
		return ""
	}
	value, ok := (*meta)[key].(string)
	if !ok {
		return ""
	}
	return value
}

func metaStringSlice(meta *map[string]interface{}, key string) []string {
	if meta == nil {
		return nil
	}
	switch value := (*meta)[key].(type) {
	case []string:
		return value
	case []interface{}:
		result := make([]string, 0, len(value))
		for _, item := range value {
			if s, ok := item.(string); ok {
				result = append(result, s)
			}
		}
		return result
	default:
		return nil
	}
}

// ListDatasourceHistory handles GET /datasources/history
func (h *Handler) ListDatasourceHistory(c *gin.Context, params api.ListDatasourceHistoryParams) {
	limit, offset := historyPage(params.Limit, params.Offset)
	records, err := h.historyRepo.List(c.Request.Context(), limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, api.ErrorResponse{Error: "failed to list datasource history"})
		return
	}
	resp := make([]api.DatasourceHistory, len(records))
	for i, r := range records {
		resp[i] = toAPIDatasourceHistory(r)
	}
	c.JSON(http.StatusOK, api.DatasourceHistoryListResponse{Data: resp})
}

// ListDatasourceHistoryByDatasource handles GET /datasources/:uid/history
func (h *Handler) ListDatasourceHistoryByDatasource(c *gin.Context, id openapi_types.UUID, params api.ListDatasourceHistoryByDatasourceParams) {
	limit, offset := historyPage(params.Limit, params.Offset)
	records, err := h.historyRepo.ListByConnection(c.Request.Context(), id.String(), limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, api.ErrorResponse{Error: "failed to list datasource history"})
		return
	}
	resp := make([]api.DatasourceHistory, len(records))
	for i, r := range records {
		resp[i] = toAPIDatasourceHistory(r)
	}
	c.JSON(http.StatusOK, api.DatasourceHistoryListResponse{Data: resp})
}

func toAPIDatasourceHistory(h *ConnectionHistory) api.DatasourceHistory {
	return api.DatasourceHistory{
		Id:             h.ID,
		DatasourceUid:  h.ConnectionID,
		DatasourceName: h.ConnectionName,
		DatasourceType: h.ConnectionType,
		Action:         api.DatasourceHistoryAction(h.Action),
		ChangedAt:      h.ChangedAt,
	}
}

func historyPage(limit, offset *int) (int, int) {
	l, o := 50, 0
	if limit != nil && *limit > 0 && *limit <= 500 {
		l = *limit
	}
	if offset != nil && *offset >= 0 {
		o = *offset
	}
	return l, o
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
