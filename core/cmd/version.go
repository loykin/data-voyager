package cmd

import (
	"fmt"

	"github.com/spf13/cobra"
)

var (
	version   = "0.1.0"
	buildTime = "unknown"
	gitCommit = "unknown"
)

// versionCmd represents the version command
var versionCmd = &cobra.Command{
	Use:   "version",
	Short: "Print version information",
	Long:  `Print version information for Explorer.`,
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Printf("Explorer %s\n", version)
		fmt.Printf("Build time: %s\n", buildTime)
		fmt.Printf("Git commit: %s\n", gitCommit)
	},
}

func init() {
	rootCmd.AddCommand(versionCmd)
}