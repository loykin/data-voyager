package cmd

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

var (
	cfgFile string
	verbose bool
)

// rootCmd represents the base command when called without any subcommands
var rootCmd = &cobra.Command{
	Use:   "data-voyager",
	Short: "Multi-datasource exploration and analytics platform",
	Long: `Data Voyager is a powerful data analytics platform that allows you to connect
to multiple data sources (ClickHouse, PostgreSQL, SQLite, OpenSearch) and
perform data exploration, analysis, and visualization through a web interface.`,
}

// Execute adds all child commands to the root command and sets flags appropriately.
func Execute() {
	err := rootCmd.Execute()
	if err != nil {
		os.Exit(1)
	}
}

func init() {
	cobra.OnInitialize(initConfig)

	// Global flags
	rootCmd.PersistentFlags().StringVar(&cfgFile, "config", "", "config file (default is ./config.toml)")
	rootCmd.PersistentFlags().BoolVarP(&verbose, "verbose", "v", false, "verbose output")

	// Bind flags to viper
	_ = viper.BindPFlag("verbose", rootCmd.PersistentFlags().Lookup("verbose"))
}

// initConfig reads in config file and ENV variables.
func initConfig() {
	if cfgFile != "" {
		// Use config file from the flag.
		viper.SetConfigFile(cfgFile)
	} else {
		// Search config in current directory and common paths
		viper.AddConfigPath(".")
		viper.AddConfigPath("$HOME/.config/data-voyager")
		viper.AddConfigPath("/etc/data-voyager")
		viper.SetConfigType("toml")
		viper.SetConfigName("config")
	}

	// Environment variables
	viper.SetEnvPrefix("DATA_VOYAGER")
	viper.AutomaticEnv()

	// If a config file is found, read it in.
	if err := viper.ReadInConfig(); err == nil && verbose {
		_, _ = fmt.Fprintln(os.Stderr, "Using config file:", viper.ConfigFileUsed())
	}
}
