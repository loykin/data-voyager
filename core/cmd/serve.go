package cmd

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"data-voyager/core"
	"data-voyager/core/internal/aiconfig"
	"data-voyager/core/internal/app"
	"data-voyager/core/internal/config"
	"data-voyager/core/internal/connection"
	"data-voyager/core/internal/datasource"
	_ "data-voyager/core/internal/generated" // load extension init() registrations
	"data-voyager/core/internal/logger"
	"data-voyager/core/internal/settings"
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

	if err := logger.Setup(cfg.Logging); err != nil {
		return fmt.Errorf("failed to setup logger: %w", err)
	}

	if verbose {
		slog.Debug("configuration loaded",
			"server", fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port),
			"metadata_store_type", cfg.MetadataStore.Type,
			"log_level", cfg.Logging.Level,
		)
	}

	db, err := store.Open(cfg.MetadataStore)
	if err != nil {
		return fmt.Errorf("failed to open metadata store: %w", err)
	}
	defer func() { _ = db.Close() }()

	repos, err := store.NewRepos(db, cfg.MetadataStore)
	if err != nil {
		return fmt.Errorf("failed to initialize repositories: %w", err)
	}

	registry := datasource.NewRegistry()

	// Derive data directory from the SQLite path so the encryption key file
	// lives alongside the database. For non-SQLite stores the dataDir is empty
	// and BuildService falls back to the VOYAGER_ENCRYPTION_KEY env var.
	dataDir := ""
	if cfg.MetadataStore.Type == "sqlite" || cfg.MetadataStore.Type == "sqlite3" {
		dataDir = filepath.Dir(cfg.MetadataStore.SQLite.Path)
	}

	// Resolve encryption key once — shared by both settings and aiconfig packages.
	encryptKey, err := settings.ResolveEncryptionKey(dataDir)
	if err != nil {
		return fmt.Errorf("failed to resolve encryption key: %w", err)
	}

	// Register all service loaders. Add new domains here as the app grows.
	settingsSvc, err := settings.BuildService(repos.Settings, encryptKey)
	if err != nil {
		return fmt.Errorf("failed to initialize settings service: %w", err)
	}

	aiConfigSvc, err := aiconfig.BuildService(repos.AIConfigs, encryptKey)
	if err != nil {
		return fmt.Errorf("failed to initialize aiconfig service: %w", err)
	}

	loaders := []app.Loader{
		connection.NewLoader(repos.Connection, registry, cfg, settingsSvc, aiConfigSvc),
	}
	for _, l := range loaders {
		if err := l.Load(); err != nil {
			return fmt.Errorf("loader failed: %w", err)
		}
	}

	if cfg.Logging.Level != "debug" {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.New()
	r.Use(logger.GinMiddleware(), gin.Recovery())

	r.GET("/health", func(c *gin.Context) {
		ctx := context.Background()
		if err := repos.Connection.Health(ctx); err != nil {
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

		for _, l := range loaders {
			l.RegisterRoutes(apiV1)
		}
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
		slog.Info("starting server", "addr", addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server failed", "err", err)
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	slog.Info("shutting down server")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		slog.Error("server forced to shutdown", "err", err)
		return err
	}

	slog.Info("server exited")
	return nil
}
