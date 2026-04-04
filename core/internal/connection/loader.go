package connection

import (
	"context"

	"data-voyager/core/internal/ai"
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

// combinedHandler satisfies api.ServerInterface by embedding the connection
// handler (for all connection methods) and delegating settings methods to
// the settings handler.
type combinedHandler struct {
	*Handler
	settingsHandler *settings.Handler
}

func (h *combinedHandler) GetAISettings(c *gin.Context)    { h.settingsHandler.GetAISettings(c) }
func (h *combinedHandler) UpdateAISettings(c *gin.Context) { h.settingsHandler.UpdateAISettings(c) }

// loader wires Service and Handler together and satisfies app.Loader.
type loader struct {
	svc       *Service
	handler   *combinedHandler
	aiHandler *ai.Handler
}

// NewLoader returns a loader for the connection domain.
// settingsSvc and settingsCfg are used to create the settings handler inline;
// they may be nil / nil if settings are not yet configured.
func NewLoader(repo Repository, registry *datasource.Registry, cfg *config.ViperConfig, settingsSvc *settings.Service) apploader.Loader {
	svc := NewService(repo, registry)
	connHandler := NewHandler(repo, registry)
	settingsHandler := settings.NewHandler(settingsSvc, &cfg.AI)
	aiHandler := ai.NewHandler(&aiRepoAdapter{inner: repo}, registry, &cfg.AI)
	if settingsSvc != nil {
		aiHandler.WithSettingsLoader(settingsSvc)
	}
	return &loader{
		svc: svc,
		handler: &combinedHandler{
			Handler:         connHandler,
			settingsHandler: settingsHandler,
		},
		aiHandler: aiHandler,
	}
}

// Load initialises the connection domain: registers all datasource plugins.
func (l *loader) Load() error {
	l.svc.InitializePlugins()
	return nil
}

// RegisterRoutes wires connection + settings routes via the generated router.
func (l *loader) RegisterRoutes(r *gin.RouterGroup) {
	api.RegisterHandlers(r, l.handler)
	ai.RegisterRoutes(r, l.aiHandler)
}
