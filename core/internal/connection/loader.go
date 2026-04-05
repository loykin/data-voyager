package connection

import (
	"context"

	"data-voyager/core/internal/ai"
	"data-voyager/core/internal/aiconfig"
	"data-voyager/core/internal/api"
	apploader "data-voyager/core/internal/app"
	"data-voyager/core/internal/config"
	"data-voyager/core/internal/datasource"
	"data-voyager/core/internal/settings"

	"github.com/gin-gonic/gin"
)

// aiRepoAdapter wraps Repository to satisfy ai.ConnRepo.
// This avoids an import cycle: ai never imports connection.
type aiRepoAdapter struct{ inner Repository }

func (a *aiRepoAdapter) GetConnByID(ctx context.Context, id string) (*ai.ConnInfo, error) {
	conn, err := a.inner.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return &ai.ConnInfo{
		ID:     conn.ID,
		Type:   string(conn.Type),
		Config: conn.Config,
	}, nil
}

// aiConfigAdapter adapts aiconfig.Service to ai.AIConfigLoader.
// Prevents the ai package from importing aiconfig (would create a cycle).
type aiConfigAdapter struct{ svc *aiconfig.Service }

func (a *aiConfigAdapter) LoadActiveAIConfig(ctx context.Context) (*ai.ActiveConfig, error) {
	cfg, err := a.svc.GetActive(ctx)
	if err != nil || cfg == nil {
		return nil, err
	}
	return &ai.ActiveConfig{
		Provider: cfg.Provider,
		APIKey:   cfg.APIKey,
		Model:    cfg.Model,
		BaseURL:  cfg.BaseURL,
	}, nil
}

// combinedHandler satisfies api.ServerInterface by embedding the connection
// handler (for all connection methods) and delegating settings/aiconfig methods.
type combinedHandler struct {
	*Handler
	settingsHandler *settings.Handler
	aiconfigHandler *aiconfig.Handler
}

func (h *combinedHandler) GetAISettings(c *gin.Context)    { h.settingsHandler.GetAISettings(c) }
func (h *combinedHandler) UpdateAISettings(c *gin.Context) { h.settingsHandler.UpdateAISettings(c) }

func (h *combinedHandler) ListAIConfigs(c *gin.Context)              { h.aiconfigHandler.List(c) }
func (h *combinedHandler) CreateAIConfig(c *gin.Context)             { h.aiconfigHandler.Create(c) }
func (h *combinedHandler) GetAIConfig(c *gin.Context, _ string)      { h.aiconfigHandler.GetByID(c) }
func (h *combinedHandler) UpdateAIConfig(c *gin.Context, _ string)   { h.aiconfigHandler.Update(c) }
func (h *combinedHandler) DeleteAIConfig(c *gin.Context, _ string)   { h.aiconfigHandler.Delete(c) }
func (h *combinedHandler) ActivateAIConfig(c *gin.Context, _ string) { h.aiconfigHandler.Activate(c) }

// loader wires Service and Handler together and satisfies app.Loader.
type loader struct {
	svc             *Service
	handler         *combinedHandler
	aiHandler       *ai.Handler
	aiconfigHandler *aiconfig.Handler
}

// NewLoader returns a loader for the connection domain.
// settingsSvc and aiConfigSvc may be nil if not yet configured.
func NewLoader(repo Repository, registry *datasource.Registry, cfg *config.ViperConfig, settingsSvc *settings.Service, aiConfigSvc *aiconfig.Service) apploader.Loader {
	svc := NewService(repo, registry)
	connHandler := NewHandler(repo, registry)
	settingsHandler := settings.NewHandler(settingsSvc, &cfg.AI)
	aiHandler := ai.NewHandler(&aiRepoAdapter{inner: repo}, registry, &cfg.AI)

	// Prefer new aiconfig system; fall back to legacy settings for backward compat.
	if aiConfigSvc != nil {
		aiHandler.WithAIConfigLoader(&aiConfigAdapter{svc: aiConfigSvc})
	} else if settingsSvc != nil {
		aiHandler.WithSettingsLoader(settingsSvc)
	}

	var aicfgHandler *aiconfig.Handler
	if aiConfigSvc != nil {
		aicfgHandler = aiconfig.NewHandler(aiConfigSvc)
	}

	return &loader{
		svc: svc,
		handler: &combinedHandler{
			Handler:         connHandler,
			settingsHandler: settingsHandler,
			aiconfigHandler: aicfgHandler,
		},
		aiHandler:       aiHandler,
		aiconfigHandler: aicfgHandler,
	}
}

// Load initialises the connection domain: registers all datasource plugins.
func (l *loader) Load() error {
	l.svc.InitializePlugins()
	return nil
}

// RegisterRoutes wires all routes: connection+settings+aiconfig via generated
// router, plus AI chat routes directly on the group.
func (l *loader) RegisterRoutes(r *gin.RouterGroup) {
	api.RegisterHandlers(r, l.handler)
	ai.RegisterRoutes(r, l.aiHandler)
}
