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

	"data-voyager/core"
	"data-voyager/core/internal/config"
	"data-voyager/core/internal/connection"
	"data-voyager/core/internal/datasource"
	_ "data-voyager/core/internal/generated" // load extension init() registrations
	"data-voyager/core/internal/store"

	"github.com/gin-gonic/gin"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

var serveCmd = &cobra.Command{
	Use:   "serve",
	Short: "Start the Data Voyager server",
	Long: `Start the Data Voyager web server with API endpoints and web interface.
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

	serveCmd.Flags().StringVarP(&host, "host", "H", "", "server host (default: from config)")
	serveCmd.Flags().IntVarP(&port, "port", "p", 0, "server port (default: from config)")

	_ = viper.BindPFlag("server.host", serveCmd.Flags().Lookup("host"))
	_ = viper.BindPFlag("server.port", serveCmd.Flags().Lookup("port"))
}

func runServe(_ *cobra.Command, _ []string) error {
	cfg, err := config.InitViper("config", "")
	if err != nil {
		return fmt.Errorf("failed to load config: %w", err)
	}

	if host != "" {
		cfg.Server.Host = host
	}
	if port != 0 {
		cfg.Server.Port = port
	}

	if verbose {
		log.Printf("Configuration loaded:")
		log.Printf("  Server: %s:%d", cfg.Server.Host, cfg.Server.Port)
		log.Printf("  Metadata Store: %s (%s)", cfg.MetadataStore.Driver, cfg.MetadataStore.DSN)
		log.Printf("  Log Level: %s", cfg.Logging.Level)
	}

	db, err := store.Open(cfg.MetadataStore)
	if err != nil {
		return fmt.Errorf("failed to open metadata store: %w", err)
	}
	defer func() { _ = db.Close() }()

	repos, err := store.NewRepos(db, cfg.MetadataStore.Driver)
	if err != nil {
		return fmt.Errorf("failed to initialize repositories: %w", err)
	}

	registry := datasource.NewRegistry()

	svc := connection.NewService(repos.Connection, registry)
	svc.InitializePlugins()

	if cfg.Logging.Level != "debug" {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.Default()

	r.GET("/health", func(c *gin.Context) {
		ctx := context.Background()
		if err := svc.HealthCheck(ctx); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"status":  "unhealthy",
				"message": "metadata store is unhealthy",
				"error":   err.Error(),
			})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"status":         "healthy",
			"version":        "0.1.0",
			"metadata_store": "connected",
			"plugins_loaded": len(registry.GetSupportedTypes()),
		})
	})

	apiV1 := r.Group("/api/v1")
	{
		apiV1.GET("/ping", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"message":   "pong",
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
		})

		connection.NewHandler(repos.Connection, registry).RegisterRoutes(apiV1)
	}

	core.ServeFrontend(r)

	addr := fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port)
	srv := &http.Server{
		Addr:         addr,
		Handler:      r,
		ReadTimeout:  time.Duration(cfg.Server.ReadTimeout) * time.Second,
		WriteTimeout: time.Duration(cfg.Server.WriteTimeout) * time.Second,
	}

	go func() {
		log.Printf("Starting Data Voyager server on %s", addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("Server forced to shutdown: %v", err)
		return err
	}

	log.Println("Server exited")
	return nil
}
