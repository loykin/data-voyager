package core

import (
	"embed"
	"io/fs"
	"net/http"

	"github.com/gin-gonic/gin"
)

//go:embed frontend/out/*
var frontendFS embed.FS

// ServeFrontend serves the embedded frontend files
func ServeFrontend(r *gin.Engine) {
	// Get the subdirectory from the embedded filesystem
	frontendFiles, err := fs.Sub(frontendFS, "frontend/out")
	if err != nil {
		panic("Failed to create sub filesystem: " + err.Error())
	}

	// Serve static files
	r.NoRoute(gin.WrapH(http.FileServer(http.FS(frontendFiles))))
}