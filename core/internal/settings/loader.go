package settings

import (
	"fmt"
	"log/slog"
	"os"
)

// BuildService constructs a Service by reading VOYAGER_ENCRYPTION_KEY from the
// environment. Callers that need to pass the service to other packages (e.g.
// ai.Handler) should call this before NewLoader.
func BuildService(repo Repository) (*Service, error) {
	rawKey := os.Getenv("VOYAGER_ENCRYPTION_KEY")
	key, err := ParseEncryptionKey(rawKey)
	if err != nil {
		slog.Warn("settings: invalid VOYAGER_ENCRYPTION_KEY, encryption disabled", "error", err)
		key = nil
	}
	if key == nil {
		slog.Warn("settings: VOYAGER_ENCRYPTION_KEY not set — API keys will be stored in plaintext")
	}

	svc, err := NewService(repo, key)
	if err != nil {
		return nil, fmt.Errorf("settings: NewService: %w", err)
	}
	return svc, nil
}
