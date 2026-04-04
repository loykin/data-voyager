package settings

import (
	"net/http"

	"data-voyager/core/internal/config"

	"github.com/gin-gonic/gin"
)

// Handler serves GET/PUT /api/v1/settings/ai.
type Handler struct {
	svc     *Service
	tomlCfg *config.AIConfig
}

// NewHandler creates a settings HTTP handler.
func NewHandler(svc *Service, tomlCfg *config.AIConfig) *Handler {
	return &Handler{svc: svc, tomlCfg: tomlCfg}
}

// GetAISettings handles GET /api/v1/settings/ai.
func (h *Handler) GetAISettings(c *gin.Context) {
	resp, err := h.svc.BuildAIConfigResponse(c.Request.Context(), h.tomlCfg)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load settings"})
		return
	}
	c.JSON(http.StatusOK, resp)
}

// putAISettingsBody is the expected JSON body for PUT /api/v1/settings/ai.
type putAISettingsBody struct {
	Enabled  bool         `json:"enabled"`
	Provider string       `json:"provider"`
	Claude   providerBody `json:"claude"`
	OpenAI   providerBody `json:"openai"`
	Copilot  providerBody `json:"copilot"`
	Ollama   ollamaBody   `json:"ollama"`
}

type providerBody struct {
	APIKey  string `json:"api_key"`
	Model   string `json:"model"`
	BaseURL string `json:"base_url"`
}

type ollamaBody struct {
	BaseURL string `json:"base_url"`
	Model   string `json:"model"`
}

// UpdateAISettings handles PUT /api/v1/settings/ai.
func (h *Handler) UpdateAISettings(c *gin.Context) {
	var body putAISettingsBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	req := SaveAIConfigRequest{
		Enabled:  body.Enabled,
		Provider: body.Provider,
		Claude: ClaudeInput{
			APIKey:  body.Claude.APIKey,
			Model:   body.Claude.Model,
			BaseURL: body.Claude.BaseURL,
		},
		OpenAI: ProviderInput{
			APIKey:  body.OpenAI.APIKey,
			Model:   body.OpenAI.Model,
			BaseURL: body.OpenAI.BaseURL,
		},
		Copilot: ProviderInput{
			APIKey:  body.Copilot.APIKey,
			Model:   body.Copilot.Model,
			BaseURL: body.Copilot.BaseURL,
		},
		Ollama: OllamaInput{
			BaseURL: body.Ollama.BaseURL,
			Model:   body.Ollama.Model,
		},
	}

	if err := h.svc.SaveAIConfig(c.Request.Context(), req); err != nil {
		if err.Error() == "encryption key not configured: set VOYAGER_ENCRYPTION_KEY" {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save settings"})
		return
	}

	c.Status(http.StatusNoContent)
}
