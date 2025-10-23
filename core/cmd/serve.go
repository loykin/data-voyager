package cmd

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"explorer/core"
	"explorer/core/internal/api"
	"explorer/core/internal/config"
	"explorer/core/internal/datasource"
	"explorer/core/internal/service"
	"explorer/core/internal/store"
	"github.com/gin-gonic/gin"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

// serveCmd represents the serve command
var serveCmd = &cobra.Command{
	Use:   "serve",
	Short: "Start the Explorer server",
	Long: `Start the Explorer web server with API endpoints and web interface.
The server provides REST API endpoints for managing data sources and
serves the web interface for data exploration and visualization.`,
	RunE: runServe,
}

var (
	host string
	port int
)

func init() {
	rootCmd.AddCommand(serveCmd)

	// Server-specific flags
	serveCmd.Flags().StringVarP(&host, "host", "H", "", "server host (default: from config)")
	serveCmd.Flags().IntVarP(&port, "port", "p", 0, "server port (default: from config)")

	// Bind flags to viper
	viper.BindPFlag("server.host", serveCmd.Flags().Lookup("host"))
	viper.BindPFlag("server.port", serveCmd.Flags().Lookup("port"))
}

func runServe(cmd *cobra.Command, args []string) error {
	// Load configuration
	cfg, err := config.InitViper("config", "")
	if err != nil {
		return fmt.Errorf("failed to load config: %w", err)
	}

	// Override with command-line flags
	if host != "" {
		cfg.Server.Host = host
	}
	if port != 0 {
		cfg.Server.Port = port
	}

	if verbose {
		log.Printf("Configuration loaded:")
		log.Printf("  Server: %s:%d", cfg.Server.Host, cfg.Server.Port)
		log.Printf("  Metadata Store: %s (%s)", cfg.MetadataStore.Type, cfg.MetadataStore.ConnectionURL)
		log.Printf("  Log Level: %s", cfg.Logging.Level)
	}

	// Initialize metadata store
	metadataStore, err := store.NewMetadataStore(cfg.MetadataStore)
	if err != nil {
		return fmt.Errorf("failed to initialize metadata store: %w", err)
	}
	defer metadataStore.Close()

	// Initialize plugin registry
	registry := datasource.NewRegistry()

	// Initialize service
	dsService := service.NewDataSourceService(metadataStore, registry)
	dsService.InitializePlugins()

	// Setup Gin router
	if cfg.Logging.Level != "debug" {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.Default()

	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		ctx := context.Background()

		// Check metadata store health
		if err := dsService.HealthCheck(ctx); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"status":  "unhealthy",
				"message": "metadata store is unhealthy",
				"error":   err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status":         "healthy",
			"message":        "Explorer backend is running",
			"metadata_store": "connected",
			"plugins_loaded": len(registry.GetSupportedTypes()),
			"version":        "0.1.0",
		})
	})

	// API routes
	apiV1 := r.Group("/api/v1")
	{
		apiV1.GET("/ping", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"message":   "pong",
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
		})

		// Register data source API routes
		dsHandler := api.NewDataSourceHandler(metadataStore, registry)
		dsHandler.RegisterRoutes(apiV1)
	}

	// Serve embedded frontend
	core.ServeFrontend(r)

	// Create HTTP server
	addr := fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port)
	srv := &http.Server{
		Addr:         addr,
		Handler:      r,
		ReadTimeout:  time.Duration(cfg.Server.ReadTimeout) * time.Second,
		WriteTimeout: time.Duration(cfg.Server.WriteTimeout) * time.Second,
	}

	// Start server in a goroutine
	go func() {
		log.Printf("Starting Explorer server on %s", addr)
		log.Printf("API endpoints available at http://%s/api/v1", addr)
		log.Printf("Web interface available at http://%s", addr)

		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	// Graceful shutdown with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("Server forced to shutdown: %v", err)
		return err
	}

	log.Println("Server exited")
	return nil
}