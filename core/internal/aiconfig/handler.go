package aiconfig

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Handler serves CRUD endpoints for AI configs.
type Handler struct {
	svc *Service
}

// NewHandler creates an aiconfig HTTP handler.
func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// ─── wire types ───────────────────────────────────────────────────────────────

type aiConfigResponse struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Provider  string    `json:"provider"`
	APIKeySet bool      `json:"api_key_set"`
	Model     string    `json:"model"`
	BaseURL   string    `json:"base_url"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type createAIConfigRequest struct {
	Name     string `json:"name"     binding:"required"`
	Provider string `json:"provider" binding:"required"`
	APIKey   string `json:"api_key"`
	Model    string `json:"model"`
	BaseURL  string `json:"base_url"`
}

type updateAIConfigRequest struct {
	Name     string `json:"name"`
	Provider string `json:"provider"`
	APIKey   string `json:"api_key"` // empty = keep existing
	Model    string `json:"model"`
	BaseURL  string `json:"base_url"`
}

// ─── helpers ──────────────────────────────────────────────────────────────────

func toResponse(cfg *AIConfig) aiConfigResponse {
	return aiConfigResponse{
		ID:        cfg.ID,
		Name:      cfg.Name,
		Provider:  cfg.Provider,
		APIKeySet: cfg.APIKey != "",
		Model:     cfg.Model,
		BaseURL:   cfg.BaseURL,
		IsActive:  cfg.IsActive,
		CreatedAt: cfg.CreatedAt,
		UpdatedAt: cfg.UpdatedAt,
	}
}

// ─── handlers ─────────────────────────────────────────────────────────────────

// List handles GET /ai-configs
func (h *Handler) List(c *gin.Context) {
	cfgs, err := h.svc.List(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list AI configs"})
		return
	}
	resp := make([]aiConfigResponse, len(cfgs))
	for i, cfg := range cfgs {
		resp[i] = toResponse(cfg)
	}
	c.JSON(http.StatusOK, gin.H{"data": resp})
}

// GetByID handles GET /ai-configs/:id
func (h *Handler) GetByID(c *gin.Context) {
	id := c.Param("id")
	cfg, err := h.svc.GetByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "AI config not found"})
		return
	}
	// check if api_key is set by reading raw from repo indirectly via HasAPIKey
	hasKey, _ := h.svc.HasAPIKey(c.Request.Context(), id)
	resp := toResponse(cfg)
	resp.APIKeySet = hasKey
	c.JSON(http.StatusOK, gin.H{"data": resp})
}

// Create handles POST /ai-configs
func (h *Handler) Create(c *gin.Context) {
	var body createAIConfigRequest
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	if !validProvider(body.Provider) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "provider must be one of: claude, openai, copilot, ollama"})
		return
	}

	newID, err := uuid.NewV7()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate id"})
		return
	}

	now := time.Now().UTC()
	cfg := &AIConfig{
		ID:        newID.String(),
		Name:      body.Name,
		Provider:  body.Provider,
		APIKey:    body.APIKey,
		Model:     body.Model,
		BaseURL:   body.BaseURL,
		CreatedAt: now,
		UpdatedAt: now,
	}

	if err := h.svc.Create(c.Request.Context(), cfg); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create AI config"})
		return
	}

	resp := toResponse(cfg)
	resp.APIKeySet = body.APIKey != ""
	c.JSON(http.StatusCreated, gin.H{"data": resp})
}

// Update handles PUT /ai-configs/:id
func (h *Handler) Update(c *gin.Context) {
	id := c.Param("id")
	var body updateAIConfigRequest
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	if body.Provider != "" && !validProvider(body.Provider) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "provider must be one of: claude, openai, copilot, ollama"})
		return
	}

	input := &AIConfig{
		Name:     body.Name,
		Provider: body.Provider,
		APIKey:   body.APIKey,
		Model:    body.Model,
		BaseURL:  body.BaseURL,
	}

	if err := h.svc.Update(c.Request.Context(), id, input); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update AI config"})
		return
	}

	cfg, err := h.svc.GetByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to reload AI config"})
		return
	}
	hasKey, _ := h.svc.HasAPIKey(c.Request.Context(), id)
	resp := toResponse(cfg)
	resp.APIKeySet = hasKey
	c.JSON(http.StatusOK, gin.H{"data": resp})
}

// Delete handles DELETE /ai-configs/:id
func (h *Handler) Delete(c *gin.Context) {
	id := c.Param("id")
	if err := h.svc.Delete(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete AI config"})
		return
	}
	c.Status(http.StatusNoContent)
}

// Activate handles POST /ai-configs/:id/activate
func (h *Handler) Activate(c *gin.Context) {
	id := c.Param("id")
	if err := h.svc.SetActive(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to activate AI config"})
		return
	}
	c.Status(http.StatusNoContent)
}

func validProvider(p string) bool {
	switch p {
	case "claude", "openai", "copilot", "ollama":
		return true
	}
	return false
}

// ─── history response type ─────────────────────────────────────────────────────

type aiConfigHistoryResponse struct {
	ID         string    `json:"id"`
	ConfigID   string    `json:"config_id"`
	ConfigName string    `json:"config_name"`
	Provider   string    `json:"provider"`
	Action     string    `json:"action"`
	ChangedAt  time.Time `json:"changed_at"`
}

func toHistoryResponse(h *AIConfigHistory) aiConfigHistoryResponse {
	return aiConfigHistoryResponse{
		ID:         h.ID,
		ConfigID:   h.ConfigID,
		ConfigName: h.ConfigName,
		Provider:   h.Provider,
		Action:     h.Action,
		ChangedAt:  h.ChangedAt,
	}
}

// ListHistory handles GET /ai-configs/history
func (h *Handler) ListHistory(c *gin.Context) {
	limit, offset := parsePagination(c)
	records, err := h.svc.historyRepo.List(c.Request.Context(), limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list AI config history"})
		return
	}
	resp := make([]aiConfigHistoryResponse, len(records))
	for i, r := range records {
		resp[i] = toHistoryResponse(r)
	}
	c.JSON(http.StatusOK, gin.H{"data": resp})
}

// ListHistoryByConfig handles GET /ai-configs/:id/history
func (h *Handler) ListHistoryByConfig(c *gin.Context) {
	id := c.Param("id")
	limit, offset := parsePagination(c)
	records, err := h.svc.historyRepo.ListByConfig(c.Request.Context(), id, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list AI config history"})
		return
	}
	resp := make([]aiConfigHistoryResponse, len(records))
	for i, r := range records {
		resp[i] = toHistoryResponse(r)
	}
	c.JSON(http.StatusOK, gin.H{"data": resp})
}

func parsePagination(c *gin.Context) (limit, offset int) {
	limit = 50
	offset = 0
	if v := c.Query("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 500 {
			limit = n
		}
	}
	if v := c.Query("offset"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n >= 0 {
			offset = n
		}
	}
	return
}
