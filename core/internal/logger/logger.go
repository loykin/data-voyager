package logger

import (
	"fmt"
	"io"
	"log/slog"
	"os"

	"data-voyager/core/internal/config"
)

// Setup initialises the default slog logger from LoggingConfig.
// Call this once at server startup before any other code runs.
func Setup(cfg config.LoggingConfig) error {
	level, err := parseLevel(cfg.Level)
	if err != nil {
		return err
	}

	out, err := openOutput(cfg.Output)
	if err != nil {
		return err
	}

	opts := &slog.HandlerOptions{Level: level}

	var handler slog.Handler
	switch cfg.Format {
	case "json":
		handler = slog.NewJSONHandler(out, opts)
	default: // "text"
		handler = slog.NewTextHandler(out, opts)
	}

	slog.SetDefault(slog.New(handler))
	return nil
}

func parseLevel(s string) (slog.Level, error) {
	switch s {
	case "debug":
		return slog.LevelDebug, nil
	case "info":
		return slog.LevelInfo, nil
	case "warn":
		return slog.LevelWarn, nil
	case "error":
		return slog.LevelError, nil
	default:
		return 0, fmt.Errorf("unknown log level: %s", s)
	}
}

func openOutput(output string) (io.Writer, error) {
	switch output {
	case "", "stdout":
		return os.Stdout, nil
	case "stderr":
		return os.Stderr, nil
	default:
		f, err := os.OpenFile(output, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
		if err != nil {
			return nil, fmt.Errorf("failed to open log file %q: %w", output, err)
		}
		return f, nil
	}
}
