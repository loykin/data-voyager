package connection

import (
	"data-voyager/core/internal/app"
	"data-voyager/core/internal/config"
	"data-voyager/core/internal/datasource"

	"github.com/gin-gonic/gin"
)

// loader wires Service and Handler together and satisfies app.Loader.
// It is the single entry point serve.go uses for the connection domain.
type loader struct {
	svc     *Service
	handler *Handler
}

// NewLoader returns a loader for the connection domain.
// cfg is available for future per-domain configuration (e.g. pagination limits,
// default timeouts).  Unused fields are silently ignored.
func NewLoader(repo Repository, registry *datasource.Registry, cfg *config.ViperConfig) app.Loader {
	_ = cfg // reserved for future use
	svc := NewService(repo, registry)
	handler := NewHandler(repo, registry)
	return &loader{svc: svc, handler: handler}
}

// Load initialises the connection domain: registers all datasource plugins that
// were compiled in via sdk.RegisterDatasource (init-time side-effects).
func (l *loader) Load() error {
	l.svc.InitializePlugins()
	return nil
}

// RegisterRoutes wires connection routes onto r.
func (l *loader) RegisterRoutes(r *gin.RouterGroup) {
	l.handler.RegisterRoutes(r)
}
