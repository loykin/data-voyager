package connection

import (
	"data-voyager/core/internal/api"
	apploader "data-voyager/core/internal/app"
	"data-voyager/core/internal/config"
	"data-voyager/core/internal/datasource"

	"github.com/gin-gonic/gin"
)

// loader wires Service and Handler together and satisfies app.Loader.
type loader struct {
	svc     *Service
	handler *Handler
}

// NewLoader returns a loader for the connection domain.
func NewLoader(repo Repository, registry *datasource.Registry, cfg *config.ViperConfig) apploader.Loader {
	_ = cfg
	svc := NewService(repo, registry)
	handler := NewHandler(repo, registry)
	return &loader{svc: svc, handler: handler}
}

// Load initialises the connection domain: registers all datasource plugins.
func (l *loader) Load() error {
	l.svc.InitializePlugins()
	return nil
}

// RegisterRoutes wires connection routes via the generated router.
func (l *loader) RegisterRoutes(r *gin.RouterGroup) {
	api.RegisterHandlers(r, l.handler)
}
