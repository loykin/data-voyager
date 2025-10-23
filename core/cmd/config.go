package cmd

import (
	"fmt"
	"os"
	"path/filepath"

	"data-voyager/core/internal/config"
	"github.com/spf13/cobra"
)

// configCmd represents the config command
var configCmd = &cobra.Command{
	Use:   "config",
	Short: "Configuration management commands",
	Long:  `Commands for managing Explorer configuration files.`,
}

// initConfigCmd represents the config init command
var initConfigCmd = &cobra.Command{
	Use:   "init [path]",
	Short: "Initialize a new configuration file",
	Long: `Initialize a new configuration file with default values.
If no path is provided, creates config.toml in the current directory.`,
	Args: cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		configPath := "config.toml"
		if len(args) > 0 {
			configPath = args[0]
		}

		// Ensure directory exists
		dir := filepath.Dir(configPath)
		if err := os.MkdirAll(dir, 0755); err != nil {
			return fmt.Errorf("failed to create directory: %w", err)
		}

		// Check if file already exists
		if _, err := os.Stat(configPath); err == nil {
			return fmt.Errorf("config file already exists: %s", configPath)
		}

		// Write default config
		if err := config.WriteDefaultConfig(configPath); err != nil {
			return fmt.Errorf("failed to write config file: %w", err)
		}

		fmt.Printf("Configuration file created: %s\n", configPath)
		return nil
	},
}

// showConfigCmd represents the config show command
var showConfigCmd = &cobra.Command{
	Use:   "show",
	Short: "Show current configuration",
	Long:  `Display the current configuration values.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg, err := config.InitViper("config", "")
		if err != nil {
			return fmt.Errorf("failed to load config: %w", err)
		}

		fmt.Println("Current Configuration:")
		fmt.Printf("  Server:\n")
		fmt.Printf("    Host: %s\n", cfg.Server.Host)
		fmt.Printf("    Port: %d\n", cfg.Server.Port)
		fmt.Printf("    Read Timeout: %ds\n", cfg.Server.ReadTimeout)
		fmt.Printf("    Write Timeout: %ds\n", cfg.Server.WriteTimeout)
		fmt.Printf("    Max Body Size: %d bytes\n", cfg.Server.MaxBodySize)

		fmt.Printf("  Metadata Store:\n")
		fmt.Printf("    Type: %s\n", cfg.MetadataStore.Type)
		fmt.Printf("    Connection URL: %s\n", cfg.MetadataStore.ConnectionURL)
		fmt.Printf("    Migrate on Start: %t\n", cfg.MetadataStore.MigrateOnStart)

		fmt.Printf("  Logging:\n")
		fmt.Printf("    Level: %s\n", cfg.Logging.Level)
		fmt.Printf("    Format: %s\n", cfg.Logging.Format)
		fmt.Printf("    Output: %s\n", cfg.Logging.Output)

		fmt.Printf("  Security:\n")
		fmt.Printf("    Enable CORS: %t\n", cfg.Security.EnableCORS)
		fmt.Printf("    Allowed Origins: %v\n", cfg.Security.AllowedOrigins)
		fmt.Printf("    Rate Limit RPS: %d\n", cfg.Security.RateLimitRPS)
		fmt.Printf("    Enable Auth: %t\n", cfg.Security.EnableAuth)

		return nil
	},
}

func init() {
	rootCmd.AddCommand(configCmd)
	configCmd.AddCommand(initConfigCmd)
	configCmd.AddCommand(showConfigCmd)
}
