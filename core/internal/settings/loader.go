package settings

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
)

// BuildService constructs a Service from a pre-resolved encryption key.
// Use ResolveEncryptionKey to obtain encryptKey at startup; passing the same
// key to both settings.BuildService and aiconfig.BuildService ensures both
// packages share a single encryption key.
func BuildService(repo Repository, encryptKey []byte) (*Service, error) {
	svc, err := NewService(repo, encryptKey)
	if err != nil {
		return nil, fmt.Errorf("settings: NewService: %w", err)
	}
	return svc, nil
}

// ResolveEncryptionKey returns a 32-byte key using the following priority:
//  1. VOYAGER_ENCRYPTION_KEY env var
//  2. <dataDir>/.encryption.key file (auto-generated if absent)
//
// It is exported so other packages (e.g. aiconfig) can share the same key
// without each package doing its own file I/O.
func ResolveEncryptionKey(dataDir string) ([]byte, error) {
	// 1. Environment variable takes precedence.
	if raw := os.Getenv("VOYAGER_ENCRYPTION_KEY"); raw != "" {
		key, err := ParseEncryptionKey(raw)
		if err != nil {
			return nil, fmt.Errorf("invalid VOYAGER_ENCRYPTION_KEY: %w", err)
		}
		slog.Info("settings: encryption key loaded from VOYAGER_ENCRYPTION_KEY")
		return key, nil
	}

	// 2. File-based key (auto-generate on first run).
	if dataDir == "" {
		slog.Warn("settings: VOYAGER_ENCRYPTION_KEY not set and no dataDir provided — API keys stored in plaintext")
		return nil, nil
	}

	keyFile := filepath.Join(dataDir, ".encryption.key")

	// Try to read existing key file.
	if raw, err := os.ReadFile(keyFile); err == nil {
		key, err := ParseEncryptionKey(string(raw))
		if err != nil {
			return nil, fmt.Errorf("invalid key in %s: %w", keyFile, err)
		}
		slog.Info("settings: encryption key loaded from file", "path", keyFile)
		return key, nil
	}

	// Generate a new key and persist it.
	newKey := make([]byte, 32)
	if _, err := rand.Read(newKey); err != nil {
		return nil, fmt.Errorf("generate encryption key: %w", err)
	}

	if err := os.MkdirAll(dataDir, 0o700); err != nil {
		return nil, fmt.Errorf("create data dir %s: %w", dataDir, err)
	}
	encoded := base64.StdEncoding.EncodeToString(newKey)
	if err := os.WriteFile(keyFile, []byte(encoded), 0o600); err != nil {
		return nil, fmt.Errorf("write encryption key file %s: %w", keyFile, err)
	}

	slog.Info("settings: generated new encryption key", "path", keyFile)
	return newKey, nil
}
