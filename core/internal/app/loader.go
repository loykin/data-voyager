package app

import "github.com/gin-gonic/gin"

// Loader is the lifecycle interface every service domain must implement.
//
// Dependencies (repos, config, registry, etc.) are injected via the domain's
// constructor — not through this interface — so each domain can declare exactly
// what it needs without coupling the interface to any particular config type.
//
// Load is called once at startup, before the HTTP server begins accepting
// requests. Route registration happens inside RegisterRoutes, which is called
// immediately after a successful Load.
type Loader interface {
	// Load initialises the service: loads plugins, seeds default data, warms
	// caches, runs any start-up checks, etc.  Return a non-nil error to abort
	// server startup.
	Load() error

	// RegisterRoutes wires the domain's HTTP handlers onto r.
	RegisterRoutes(r *gin.RouterGroup)
}
