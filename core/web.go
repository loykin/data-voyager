package core

import (
	"embed"
	"io"
	"io/fs"
	"log"
	"mime"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
)

//go:embed frontend/out/*
var frontendFS embed.FS

// StaticFileSystemConfig holds configuration for serving static files
type StaticFileSystemConfig struct {
	FS                     fs.FS
	BasePath               string   // e.g., "/ui"
	IndexFallback          bool     // Enable SPA index.html fallback
	SkipPaths              []string // Paths to skip (e.g., ["/api", "/health"])
	CacheControl           string   // Cache-Control header value
	EnableDirectoryListing bool
}

// DefaultStaticConfig returns default configuration for serving frontend
func DefaultStaticConfig() *StaticFileSystemConfig {
	frontendFiles, err := fs.Sub(frontendFS, "frontend/out")
	if err != nil {
		log.Printf("Warning: Failed to create sub filesystem: %v", err)
		frontendFiles = frontendFS
	}

	return &StaticFileSystemConfig{
		FS:                     frontendFiles,
		BasePath:               "/ui",
		IndexFallback:          true,
		SkipPaths:              []string{"/api"},
		CacheControl:           "public, max-age=31536000, immutable",
		EnableDirectoryListing: false,
	}
}

// StaticFileServer returns a middleware that serves static files with SPA support
func StaticFileServer(config *StaticFileSystemConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip if path matches skip patterns
		for _, skipPath := range config.SkipPaths {
			if strings.HasPrefix(c.Request.URL.Path, skipPath) {
				c.Next()
				return
			}
		}

		// Only handle paths under BasePath
		if !strings.HasPrefix(c.Request.URL.Path, config.BasePath) {
			c.Next()
			return
		}

		// Remove BasePath prefix
		urlPath := strings.TrimPrefix(c.Request.URL.Path, config.BasePath)
		if urlPath == "" {
			urlPath = "/"
		}

		// Try to serve the file
		if serveFile(c, config, urlPath) {
			return
		}

		// SPA fallback: serve index.html
		if config.IndexFallback {
			serveIndexHTML(c, config)
			return
		}

		c.Next()
	}
}

// serveFile attempts to serve a file from the filesystem
func serveFile(c *gin.Context, config *StaticFileSystemConfig, urlPath string) bool {
	// Clean path
	cleanPath := path.Clean(strings.TrimPrefix(urlPath, "/"))
	if cleanPath == "." {
		cleanPath = ""
	}

	// Try exact file match
	file, err := config.FS.Open(cleanPath)
	if err == nil {
		defer func() { _ = file.Close() }()
		stat, err := file.Stat()
		if err == nil && !stat.IsDir() {
			// File exists and is not a directory
			serveContent(c, config, file, cleanPath, stat)
			return true
		}
	}

	// Try directory index
	if cleanPath == "" || strings.HasSuffix(cleanPath, "/") {
		indexPath := filepath.Join(cleanPath, "index.html")
		file, err := config.FS.Open(indexPath)
		if err == nil {
			defer func() { _ = file.Close() }()
			stat, err := file.Stat()
			if err == nil {
				serveContent(c, config, file, indexPath, stat)
				return true
			}
		}
	} else {
		// Try adding index.html
		indexPath := filepath.Join(cleanPath, "index.html")
		file, err := config.FS.Open(indexPath)
		if err == nil {
			defer func() { _ = file.Close() }()
			stat, err := file.Stat()
			if err == nil {
				serveContent(c, config, file, indexPath, stat)
				return true
			}
		}
	}

	return false
}

// serveIndexHTML serves the index.html file for SPA fallback
func serveIndexHTML(c *gin.Context, config *StaticFileSystemConfig) {
	file, err := config.FS.Open("index.html")
	if err != nil {
		log.Printf("Failed to open index.html: %v", err)
		c.Status(http.StatusNotFound)
		return
	}
	defer func() { _ = file.Close() }()

	// No cache for index.html
	c.Header("Content-Type", "text/html; charset=utf-8")
	c.Header("Cache-Control", "no-cache, no-store, must-revalidate")
	c.Status(http.StatusOK)
	_, _ = io.Copy(c.Writer, file)
}

// serveContent serves file content with appropriate headers
func serveContent(c *gin.Context, config *StaticFileSystemConfig, file fs.File, filePath string, stat fs.FileInfo) {
	// Determine content type
	contentType := getContentType(filePath)
	c.Header("Content-Type", contentType)

	// Set cache headers (skip for HTML files)
	if !strings.HasSuffix(filePath, ".html") && config.CacheControl != "" {
		c.Header("Cache-Control", config.CacheControl)
	} else {
		c.Header("Cache-Control", "no-cache")
	}

	// Set content length
	c.Header("Content-Length", string(rune(stat.Size())))

	c.Status(http.StatusOK)
	_, _ = io.Copy(c.Writer, file)
}

// getContentType returns the MIME type based on file extension
func getContentType(filePath string) string {
	ext := filepath.Ext(filePath)

	// Try mime.TypeByExtension first
	if mimeType := mime.TypeByExtension(ext); mimeType != "" {
		return mimeType
	}

	// Fallback to custom mappings
	switch ext {
	case ".html":
		return "text/html; charset=utf-8"
	case ".css":
		return "text/css; charset=utf-8"
	case ".js", ".mjs":
		return "application/javascript; charset=utf-8"
	case ".json":
		return "application/json; charset=utf-8"
	case ".xml":
		return "application/xml; charset=utf-8"
	case ".png":
		return "image/png"
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".gif":
		return "image/gif"
	case ".svg":
		return "image/svg+xml"
	case ".webp":
		return "image/webp"
	case ".ico":
		return "image/x-icon"
	case ".woff":
		return "font/woff"
	case ".woff2":
		return "font/woff2"
	case ".ttf":
		return "font/ttf"
	case ".eot":
		return "application/vnd.ms-fontobject"
	case ".otf":
		return "font/otf"
	case ".mp4":
		return "video/mp4"
	case ".webm":
		return "video/webm"
	case ".mp3":
		return "audio/mpeg"
	case ".wav":
		return "audio/wav"
	case ".pdf":
		return "application/pdf"
	case ".zip":
		return "application/zip"
	case ".gz":
		return "application/gzip"
	case ".txt":
		return "text/plain; charset=utf-8"
	case ".md":
		return "text/markdown; charset=utf-8"
	default:
		return "application/octet-stream"
	}
}

// ServeFrontend sets up frontend serving with default configuration
func ServeFrontend(r *gin.Engine) {
	// Check if we're in development mode (GO_ENV=development)
	if os.Getenv("GO_ENV") == "development" {
		log.Println("Development mode: proxying /ui to Next.js dev server at http://localhost:3000")
		setupDevProxy(r)
		return
	}

	// Production mode: serve embedded static files
	config := DefaultStaticConfig()
	r.Use(StaticFileServer(config))

	// Redirect root to /ui
	r.GET("/", func(c *gin.Context) {
		c.Redirect(http.StatusMovedPermanently, "/ui")
	})
}

// setupDevProxy sets up reverse proxy to Next.js dev server for development
func setupDevProxy(r *gin.Engine) {
	nextJSURL, err := url.Parse("http://localhost:3000")
	if err != nil {
		log.Fatalf("Failed to parse Next.js URL: %v", err)
	}

	proxy := httputil.NewSingleHostReverseProxy(nextJSURL)

	// Customize the director to properly handle /ui prefix
	originalDirector := proxy.Director
	proxy.Director = func(req *http.Request) {
		originalDirector(req)
		req.Host = nextJSURL.Host
		req.URL.Scheme = nextJSURL.Scheme
		req.URL.Host = nextJSURL.Host

		// Next.js dev server expects /ui prefix in the path
		// because of basePath: "/ui" in next.config.ts
		log.Printf("Proxying %s to Next.js: %s", req.URL.Path, req.URL.String())
	}

	// Handle all /ui routes
	r.NoRoute(func(c *gin.Context) {
		// Skip API routes
		if strings.HasPrefix(c.Request.URL.Path, "/api/") {
			c.Next()
			return
		}

		// Proxy to Next.js dev server
		proxy.ServeHTTP(c.Writer, c.Request)
	})

	// Redirect root to /ui
	r.GET("/", func(c *gin.Context) {
		c.Redirect(http.StatusMovedPermanently, "/ui")
	})
}
