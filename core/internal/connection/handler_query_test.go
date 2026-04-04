package connection

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"data-voyager/core/internal/api"
	"data-voyager/core/internal/datasource"
	"data-voyager/sdk"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func init() {
	gin.SetMode(gin.TestMode)
}

// ─── Mocks ────────────────────────────────────────────────────────────────────

type mockRepo struct {
	conn *Connection
	err  error
}

func (m *mockRepo) GetByID(_ context.Context, _ int64) (*Connection, error)    { return m.conn, m.err }
func (m *mockRepo) Create(_ context.Context, _ *Connection) error              { return nil }
func (m *mockRepo) GetByName(_ context.Context, _ string) (*Connection, error) { return nil, nil }
func (m *mockRepo) List(_ context.Context, _ Filter) ([]*Connection, error)    { return nil, nil }
func (m *mockRepo) Update(_ context.Context, _ *Connection) error              { return nil }
func (m *mockRepo) Delete(_ context.Context, _ int64) error                    { return nil }
func (m *mockRepo) Stats(_ context.Context) (*Stats, error)                    { return nil, nil }
func (m *mockRepo) Health(_ context.Context) error                             { return nil }

type mockConfig struct{}

func (mockConfig) Validate() error             { return nil }
func (mockConfig) GetConnectionString() string { return "mock://localhost" }

type mockPlugin struct {
	connectErr error
	dbConn     sdk.Connection
}

func (m *mockPlugin) GetType() sdk.DataSourceType { return "mock" }
func (m *mockPlugin) GetName() string             { return "Mock" }
func (m *mockPlugin) ParseConfig(_ json.RawMessage) (sdk.ConnectionConfig, error) {
	return mockConfig{}, nil
}
func (m *mockPlugin) ValidateConfig(_ any) error { return nil }
func (m *mockPlugin) Connect(_ context.Context, _ sdk.ConnectionConfig) (sdk.Connection, error) {
	if m.connectErr != nil {
		return nil, m.connectErr
	}
	return m.dbConn, nil
}
func (m *mockPlugin) TestConnection(_ context.Context, _ sdk.ConnectionConfig) (*sdk.ConnectionTestResult, error) {
	return &sdk.ConnectionTestResult{IsConnected: true}, nil
}

type mockConn struct {
	result   *sdk.QueryResult
	queryErr error
	closed   bool
}

func (m *mockConn) Query(_ context.Context, _ string, _ ...any) (*sdk.QueryResult, error) {
	return m.result, m.queryErr
}
func (m *mockConn) GetSchema(_ context.Context) (*sdk.SchemaInfo, error) { return nil, nil }
func (m *mockConn) GetTables(_ context.Context, _ string) ([]sdk.TableInfo, error) {
	return nil, nil
}
func (m *mockConn) Close() error                      { m.closed = true; return nil }
func (m *mockConn) Ping(_ context.Context) error      { return nil }
func (m *mockConn) GetMetrics() sdk.ConnectionMetrics { return sdk.ConnectionMetrics{} }

// ─── Helpers ──────────────────────────────────────────────────────────────────

func storedConn() *Connection {
	cfg, _ := json.Marshal(map[string]string{"host": "localhost"})
	return &Connection{ID: 1, Name: "test", Type: "mock", Config: cfg}
}

func newHandler(repo Repository, plugin sdk.DatasourcePlugin) *Handler {
	reg := datasource.NewRegistry()
	reg.Register(plugin)
	return NewHandler(repo, reg)
}

func post(h *Handler, body any) *httptest.ResponseRecorder {
	raw, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/connections/1/query", bytes.NewReader(raw))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Params = gin.Params{{Key: "id", Value: "1"}}
	h.QueryConnection(c, 1)
	return w
}

func assertErrorContains(t *testing.T, w *httptest.ResponseRecorder, substr string) {
	t.Helper()
	var body api.ErrorResponse
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	assert.Contains(t, body.Error, substr)
}

// ─── Tests ────────────────────────────────────────────────────────────────────

func TestQueryConnection_Success(t *testing.T) {
	mc := &mockConn{
		result: &sdk.QueryResult{
			Frames: []*sdk.DataFrame{{
				FrameType: sdk.FrameTypeTable,
				Fields: []sdk.Field{
					{Name: "ts", Kind: sdk.FieldKindTime, Type: "bigint", Values: []any{int64(1711929600)}},
					{Name: "value", Kind: sdk.FieldKindNumber, Type: "float8", Values: []any{3.14}},
				},
			}},
			Stats: sdk.QueryStats{RowsReturned: 1, BytesRead: 512},
		},
	}
	h := newHandler(&mockRepo{conn: storedConn()}, &mockPlugin{dbConn: mc})
	from := "2024-04-01T00:00:00Z"
	to := "2024-04-01T01:00:00Z"
	w := post(h, api.QueryRequest{
		Query:     "SELECT ts, value FROM metrics WHERE ts > {{ __start_time }} LIMIT {{ __limit }}",
		TimeRange: &api.TimeRange{From: &from, To: &to},
	})

	assert.Equal(t, http.StatusOK, w.Code)
	var resp api.QueryResponse
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	require.Len(t, resp.Data.Frames, 1)
	assert.Len(t, resp.Data.Frames[0].Fields, 2)
	assert.Equal(t, "ts", resp.Data.Frames[0].Fields[0].Name)
	require.NotNil(t, resp.Stats)
	assert.Equal(t, int64(1), resp.Stats.RowsReturned)
	require.NotNil(t, resp.Inspect)
	assert.Contains(t, resp.Inspect.ExecutedQuery, "1711929600")
	assert.NotContains(t, resp.Inspect.ExecutedQuery, "{{")
	assert.True(t, mc.closed, "connection must be closed after query")
}

func TestQueryConnection_WithVariables(t *testing.T) {
	var capturedSQL string
	mc := &mockConn{result: &sdk.QueryResult{}}

	var cap2 struct{ mockConn }

	_ = cap2
	capturePlugin := &mockPlugin{
		dbConn: &capturingConn{mockConn: mc, captured: &capturedSQL},
	}
	vars := map[string]interface{}{"table": "events", "env": "prod"}
	h := newHandler(&mockRepo{conn: storedConn()}, capturePlugin)
	w := post(h, api.QueryRequest{
		Query:     "SELECT * FROM {{ table }} WHERE env = '{{ env }}'",
		Variables: &vars,
	})
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "SELECT * FROM events WHERE env = 'prod'", capturedSQL)
}

func TestQueryConnection_CustomLimit(t *testing.T) {
	var capturedSQL string
	mc := &mockConn{result: &sdk.QueryResult{}}
	h := newHandler(&mockRepo{conn: storedConn()}, &mockPlugin{
		dbConn: &capturingConn{mockConn: mc, captured: &capturedSQL},
	})
	limit := 42
	post(h, api.QueryRequest{Query: "SELECT 1 LIMIT {{ __limit }}", Limit: &limit})
	assert.Equal(t, "SELECT 1 LIMIT 42", capturedSQL)
}

func TestQueryConnection_DefaultLimit(t *testing.T) {
	var capturedSQL string
	mc := &mockConn{result: &sdk.QueryResult{}}
	h := newHandler(&mockRepo{conn: storedConn()}, &mockPlugin{
		dbConn: &capturingConn{mockConn: mc, captured: &capturedSQL},
	})
	post(h, api.QueryRequest{Query: "SELECT 1 LIMIT {{ __limit }}"})
	assert.Equal(t, "SELECT 1 LIMIT 1000", capturedSQL)
}

func TestQueryConnection_NotFound(t *testing.T) {
	h := newHandler(&mockRepo{err: errors.New("not found")}, &mockPlugin{})
	w := post(h, api.QueryRequest{Query: "SELECT 1"})
	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestQueryConnection_BadJSON(t *testing.T) {
	h := newHandler(&mockRepo{conn: storedConn()}, &mockPlugin{})
	req := httptest.NewRequest(http.MethodPost, "/connections/1/query", bytes.NewBufferString("{bad json"))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Params = gin.Params{{Key: "id", Value: "1"}}
	h.QueryConnection(c, 1)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestQueryConnection_InvalidTimeRange(t *testing.T) {
	h := newHandler(&mockRepo{conn: storedConn()}, &mockPlugin{dbConn: &mockConn{}})
	from := "not-a-time"
	w := post(h, api.QueryRequest{
		Query:     "SELECT 1",
		TimeRange: &api.TimeRange{From: &from},
	})
	assert.Equal(t, http.StatusBadRequest, w.Code)
	assertErrorContains(t, w, "time_range.from")
}

func TestQueryConnection_InvalidTemplate(t *testing.T) {
	h := newHandler(&mockRepo{conn: storedConn()}, &mockPlugin{dbConn: &mockConn{}})
	w := post(h, api.QueryRequest{Query: "SELECT {{ unclosed"})
	assert.Equal(t, http.StatusBadRequest, w.Code)
	assertErrorContains(t, w, "template parse error")
}

func TestQueryConnection_ConnectError(t *testing.T) {
	h := newHandler(
		&mockRepo{conn: storedConn()},
		&mockPlugin{connectErr: errors.New("dial tcp: connection refused")},
	)
	w := post(h, api.QueryRequest{Query: "SELECT 1"})
	assert.Equal(t, http.StatusBadGateway, w.Code)
	assertErrorContains(t, w, "connection failed")
}

func TestQueryConnection_QueryError(t *testing.T) {
	mc := &mockConn{queryErr: errors.New("relation \"nope\" does not exist")}
	h := newHandler(&mockRepo{conn: storedConn()}, &mockPlugin{dbConn: mc})
	w := post(h, api.QueryRequest{Query: "SELECT * FROM nope"})
	assert.Equal(t, http.StatusBadGateway, w.Code)
	assertErrorContains(t, w, "query failed")
	assert.True(t, mc.closed, "connection must be closed even on query error")
}

func TestQueryConnection_InspectPayload(t *testing.T) {
	mc := &mockConn{result: &sdk.QueryResult{}}
	h := newHandler(&mockRepo{conn: storedConn()}, &mockPlugin{dbConn: mc})
	from := "2024-04-01T00:00:00Z"
	to := "2024-04-01T01:00:00Z"
	w := post(h, api.QueryRequest{
		Query:     "SELECT {{ __start_time }}",
		TimeRange: &api.TimeRange{From: &from, To: &to},
	})
	require.Equal(t, http.StatusOK, w.Code)
	var resp api.QueryResponse
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	require.NotNil(t, resp.Inspect)
	assert.Equal(t, "SELECT {{ __start_time }}", resp.Inspect.RawQuery)
	assert.Equal(t, "SELECT 1711929600", resp.Inspect.ExecutedQuery)
	require.NotNil(t, resp.Inspect.Variables)
	assert.Contains(t, *resp.Inspect.Variables, "__start_time")
}

func TestQueryConnection_StatsElapsedTime(t *testing.T) {
	mc := &mockConn{result: &sdk.QueryResult{Stats: sdk.QueryStats{RowsReturned: 0}}}
	slow := &slowConn{mockConn: mc, delay: 10 * time.Millisecond}
	h := newHandler(&mockRepo{conn: storedConn()}, &mockPlugin{dbConn: slow})
	w := post(h, api.QueryRequest{Query: "SELECT 1"})
	require.Equal(t, http.StatusOK, w.Code)
	var resp api.QueryResponse
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	require.NotNil(t, resp.Stats)
	assert.GreaterOrEqual(t, resp.Stats.ExecutionTimeMs, int64(10))
}

// ─── Extra mock helpers ───────────────────────────────────────────────────────

type capturingConn struct {
	*mockConn
	captured *string
}

func (c *capturingConn) Query(_ context.Context, query string, _ ...any) (*sdk.QueryResult, error) {
	*c.captured = query
	if c.mockConn.result == nil {
		c.mockConn.result = &sdk.QueryResult{}
	}
	return c.mockConn.result, c.mockConn.queryErr
}

type slowConn struct {
	*mockConn
	delay time.Duration
}

func (s *slowConn) Query(_ context.Context, _ string, _ ...any) (*sdk.QueryResult, error) {
	time.Sleep(s.delay)
	return s.mockConn.result, s.mockConn.queryErr
}
