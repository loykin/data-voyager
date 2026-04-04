package settings

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"strings"
	"sync"
	"time"

	"data-voyager/core/internal/config"
)

// SaveAIConfigRequest is the payload for SaveAIConfig.
// Empty string fields for API keys are treated as "keep existing value".
type SaveAIConfigRequest struct {
	Enabled  bool
	Provider string
	Claude   ClaudeInput
	OpenAI   ProviderInput
	Copilot  ProviderInput
	Ollama   OllamaInput
}

// ClaudeInput holds mutable Claude fields.
type ClaudeInput struct {
	APIKey  string
	Model   string
	BaseURL string
}

// ProviderInput holds mutable OpenAI-compatible fields.
type ProviderInput struct {
	APIKey  string
	Model   string
	BaseURL string
}

// OllamaInput holds mutable Ollama fields.
type OllamaInput struct {
	BaseURL string
	Model   string
}

// AIConfigResponse is the GET response payload (no secret values).
type AIConfigResponse struct {
	Enabled  bool                   `json:"enabled"`
	Provider string                 `json:"provider"`
	Claude   ProviderStatusResponse `json:"claude"`
	OpenAI   ProviderStatusResponse `json:"openai"`
	Copilot  ProviderStatusResponse `json:"copilot"`
	Ollama   OllamaStatusResponse   `json:"ollama"`
}

// ProviderStatusResponse exposes whether an API key is configured, not its value.
type ProviderStatusResponse struct {
	APIKeySet bool   `json:"api_key_set"`
	Model     string `json:"model"`
	BaseURL   string `json:"base_url"`
}

// OllamaStatusResponse holds Ollama response fields (no API key).
type OllamaStatusResponse struct {
	BaseURL string `json:"base_url"`
	Model   string `json:"model"`
}

type cachedConfig struct {
	cfg       *config.AIConfig
	expiresAt time.Time
}

// Service manages AI settings persistence with encryption and caching.
type Service struct {
	repo       Repository
	encryptKey []byte // 32 bytes; nil if VOYAGER_ENCRYPTION_KEY is not set
	mu         sync.Mutex
	cache      cachedConfig
	cacheTTL   time.Duration
}

// NewService creates a new settings Service.
// encryptKey must be exactly 32 bytes if provided; pass nil to disable encryption.
func NewService(repo Repository, encryptKey []byte) (*Service, error) {
	if encryptKey != nil && len(encryptKey) != 32 {
		return nil, fmt.Errorf("encryption key must be 32 bytes, got %d", len(encryptKey))
	}
	return &Service{
		repo:       repo,
		encryptKey: encryptKey,
		cacheTTL:   30 * time.Second,
	}, nil
}

// LoadAIConfig returns an AIConfig assembled from DB settings.
// Falls back to tomlCfg when no settings are found in the DB.
func (s *Service) LoadAIConfig(ctx context.Context, tomlCfg *config.AIConfig) (*config.AIConfig, error) {
	s.mu.Lock()
	if s.cache.cfg != nil && time.Now().Before(s.cache.expiresAt) {
		cfg := *s.cache.cfg
		s.mu.Unlock()
		return &cfg, nil
	}
	s.mu.Unlock()

	rows, err := s.repo.GetAll(ctx)
	if err != nil {
		return tomlCfg, nil
	}
	if len(rows) == 0 {
		return tomlCfg, nil
	}

	m := make(map[string]string, len(rows))
	for _, r := range rows {
		val := r.Value
		if r.IsSecret && val != "" {
			dec, decErr := s.decrypt(val)
			if decErr != nil {
				// decryption failure → treat as missing
				val = ""
			} else {
				val = dec
			}
		}
		m[r.Key] = val
	}

	cfg := *tomlCfg // start from toml defaults

	if v, ok := m["ai.enabled"]; ok {
		cfg.Enabled = v == "true"
	}
	if v, ok := m["ai.provider"]; ok {
		cfg.Provider = v
	}

	if v, ok := m["ai.claude.api_key"]; ok {
		cfg.Claude.APIKey = v
	}
	if v, ok := m["ai.claude.model"]; ok {
		cfg.Claude.Model = v
	}
	if v, ok := m["ai.claude.base_url"]; ok {
		cfg.Claude.BaseURL = v
	}

	if v, ok := m["ai.openai.api_key"]; ok {
		cfg.OpenAI.APIKey = v
	}
	if v, ok := m["ai.openai.model"]; ok {
		cfg.OpenAI.Model = v
	}
	if v, ok := m["ai.openai.base_url"]; ok {
		cfg.OpenAI.BaseURL = v
	}

	if v, ok := m["ai.copilot.api_key"]; ok {
		cfg.Copilot.APIKey = v
	}
	if v, ok := m["ai.copilot.model"]; ok {
		cfg.Copilot.Model = v
	}
	if v, ok := m["ai.copilot.base_url"]; ok {
		cfg.Copilot.BaseURL = v
	}

	if v, ok := m["ai.ollama.base_url"]; ok {
		cfg.Ollama.BaseURL = v
	}
	if v, ok := m["ai.ollama.model"]; ok {
		cfg.Ollama.Model = v
	}

	s.mu.Lock()
	s.cache = cachedConfig{cfg: &cfg, expiresAt: time.Now().Add(s.cacheTTL)}
	s.mu.Unlock()

	result := cfg
	return &result, nil
}

// SaveAIConfig persists AI configuration to the DB.
// Empty API key strings are skipped (existing value retained).
func (s *Service) SaveAIConfig(ctx context.Context, req SaveAIConfigRequest) error {
	enabled := "false"
	if req.Enabled {
		enabled = "true"
	}

	type kv struct {
		key    string
		value  string
		secret bool
	}

	entries := []kv{
		{"ai.enabled", enabled, false},
		{"ai.provider", req.Provider, false},
		{"ai.claude.model", req.Claude.Model, false},
		{"ai.claude.base_url", req.Claude.BaseURL, false},
		{"ai.openai.model", req.OpenAI.Model, false},
		{"ai.openai.base_url", req.OpenAI.BaseURL, false},
		{"ai.copilot.model", req.Copilot.Model, false},
		{"ai.copilot.base_url", req.Copilot.BaseURL, false},
		{"ai.ollama.base_url", req.Ollama.BaseURL, false},
		{"ai.ollama.model", req.Ollama.Model, false},
	}

	secretEntries := []kv{
		{"ai.claude.api_key", req.Claude.APIKey, true},
		{"ai.openai.api_key", req.OpenAI.APIKey, true},
		{"ai.copilot.api_key", req.Copilot.APIKey, true},
	}

	for _, e := range secretEntries {
		if e.value != "" {
			entries = append(entries, e)
		}
	}

	for _, e := range entries {
		val := e.value
		if e.secret {
			if s.encryptKey == nil {
				return errors.New("encryption key not configured: set VOYAGER_ENCRYPTION_KEY")
			}
			enc, err := s.encrypt(val)
			if err != nil {
				return fmt.Errorf("encrypt %s: %w", e.key, err)
			}
			val = enc
		}
		if err := s.repo.Set(ctx, e.key, val, e.secret); err != nil {
			return fmt.Errorf("save setting %s: %w", e.key, err)
		}
	}

	// Invalidate cache after save.
	s.mu.Lock()
	s.cache = cachedConfig{}
	s.mu.Unlock()

	return nil
}

// BuildAIConfigResponse builds a GET response (no secret values exposed).
func (s *Service) BuildAIConfigResponse(ctx context.Context, tomlCfg *config.AIConfig) (*AIConfigResponse, error) {
	rows, err := s.repo.GetAll(ctx)
	if err != nil {
		return nil, fmt.Errorf("fetch settings: %w", err)
	}

	m := make(map[string]string, len(rows))
	secretSet := make(map[string]bool, len(rows))
	for _, r := range rows {
		m[r.Key] = r.Value
		if r.IsSecret {
			secretSet[r.Key] = r.Value != ""
		}
	}

	get := func(key, fallback string) string {
		if v, ok := m[key]; ok {
			return v
		}
		return fallback
	}

	resp := &AIConfigResponse{
		Enabled:  get("ai.enabled", boolStr(tomlCfg.Enabled)) == "true",
		Provider: get("ai.provider", tomlCfg.Provider),
		Claude: ProviderStatusResponse{
			APIKeySet: secretSet["ai.claude.api_key"] || tomlCfg.Claude.APIKey != "",
			Model:     get("ai.claude.model", tomlCfg.Claude.Model),
			BaseURL:   get("ai.claude.base_url", tomlCfg.Claude.BaseURL),
		},
		OpenAI: ProviderStatusResponse{
			APIKeySet: secretSet["ai.openai.api_key"] || tomlCfg.OpenAI.APIKey != "",
			Model:     get("ai.openai.model", tomlCfg.OpenAI.Model),
			BaseURL:   get("ai.openai.base_url", tomlCfg.OpenAI.BaseURL),
		},
		Copilot: ProviderStatusResponse{
			APIKeySet: secretSet["ai.copilot.api_key"] || tomlCfg.Copilot.APIKey != "",
			Model:     get("ai.copilot.model", tomlCfg.Copilot.Model),
			BaseURL:   get("ai.copilot.base_url", tomlCfg.Copilot.BaseURL),
		},
		Ollama: OllamaStatusResponse{
			BaseURL: get("ai.ollama.base_url", tomlCfg.Ollama.BaseURL),
			Model:   get("ai.ollama.model", tomlCfg.Ollama.Model),
		},
	}
	return resp, nil
}

// encrypt encrypts plaintext with AES-256-GCM and returns a base64-encoded
// nonce+ciphertext string.
func (s *Service) encrypt(plaintext string) (string, error) {
	block, err := aes.NewCipher(s.encryptKey)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}
	sealed := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(sealed), nil
}

// decrypt reverses encrypt.
func (s *Service) decrypt(ciphertext string) (string, error) {
	if s.encryptKey == nil {
		return "", errors.New("encryption key not configured")
	}
	data, err := base64.StdEncoding.DecodeString(ciphertext)
	if err != nil {
		return "", fmt.Errorf("base64 decode: %w", err)
	}
	block, err := aes.NewCipher(s.encryptKey)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	ns := gcm.NonceSize()
	if len(data) < ns {
		return "", errors.New("ciphertext too short")
	}
	plaintext, err := gcm.Open(nil, data[:ns], data[ns:], nil)
	if err != nil {
		return "", fmt.Errorf("decrypt: %w", err)
	}
	return string(plaintext), nil
}

func boolStr(b bool) string {
	if b {
		return "true"
	}
	return "false"
}

// ParseEncryptionKey decodes a base64 or hex-encoded 32-byte key from the
// environment variable value. Returns nil, nil when the value is empty.
func ParseEncryptionKey(raw string) ([]byte, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, nil
	}
	key, err := base64.StdEncoding.DecodeString(raw)
	if err != nil {
		// try raw bytes (hex is not attempted — base64 only)
		return nil, fmt.Errorf("VOYAGER_ENCRYPTION_KEY must be base64-encoded: %w", err)
	}
	if len(key) != 32 {
		return nil, fmt.Errorf("VOYAGER_ENCRYPTION_KEY must decode to 32 bytes, got %d", len(key))
	}
	return key, nil
}
