package ai

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"data-voyager/core/internal/config"
	"data-voyager/core/internal/datasource"

	"github.com/gin-gonic/gin"
)

// Handler is the HTTP handler for AI chat endpoints.
type Handler struct {
	repo        ConnRepo
	registry    *datasource.Registry
	staticCfg   *config.AIConfig // config.toml fallback
	settingsSvc SettingsLoader   // nil when settings package unavailable
}

// NewHandler creates an AI HTTP handler.
func NewHandler(repo ConnRepo, registry *datasource.Registry, cfg *config.AIConfig) *Handler {
	return &Handler{repo: repo, registry: registry, staticCfg: cfg}
}

// WithSettingsLoader attaches a SettingsLoader so Chat loads config from DB.
func (h *Handler) WithSettingsLoader(svc SettingsLoader) {
	h.settingsSvc = svc
}

// resolveConfig returns the effective AIConfig: DB settings override toml fallback.
func (h *Handler) resolveConfig(c *gin.Context) (*config.AIConfig, error) {
	if h.settingsSvc != nil {
		return h.settingsSvc.LoadAIConfig(c.Request.Context(), h.staticCfg)
	}
	return h.staticCfg, nil
}

// chatBody is the JSON body for POST /connections/{id}/ai/chat.
type chatBody struct {
	Messages []Message `json:"messages"`
}

// Chat handles POST /api/v1/connections/:id/ai/chat
// and streams the agent response as Server-Sent Events.
func (h *Handler) Chat(c *gin.Context) {
	connID := c.Param("id")
	if connID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid connection id"})
		return
	}

	var body chatBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if len(body.Messages) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "messages required"})
		return
	}

	// Build provider from DB/config
	effCfg, err := h.resolveConfig(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load AI config"})
		return
	}

	provider, err := NewProvider(effCfg)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": fmt.Sprintf("AI not configured: %s", err)})
		return
	}

	// Look up connection to get dialect for system prompt
	conn, err := h.repo.GetConnByID(c.Request.Context(), connID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "connection not found"})
		return
	}

	// Prepend system prompt
	systemMsg := Message{Role: RoleSystem, Content: BuildSystemPrompt(conn.Type)}
	msgs := append([]Message{systemMsg}, body.Messages...)

	executor := NewToolExecutor(h.repo, h.registry)
	agent := NewAgent(provider, executor)

	// Set SSE headers
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")

	out := make(chan Chunk, 32)
	ctx := c.Request.Context()

	go agent.Run(ctx, connID, msgs, out)

	c.Stream(func(w io.Writer) bool {
		chunk, ok := <-out
		if !ok {
			return false
		}
		data, _ := json.Marshal(chunk)
		_, _ = fmt.Fprintf(w, "data: %s\n\n", data)
		return chunk.Type != ChunkDone && ctx.Err() == nil
	})
}

// RegisterRoutes registers the AI chat route on the given router group.
func RegisterRoutes(r *gin.RouterGroup, h *Handler) {
	r.POST("/connections/:id/ai/chat", h.Chat)
}
