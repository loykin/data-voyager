package aiconfig

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"time"

	"github.com/google/uuid"
)

// Service manages AI config CRUD with encryption for API keys.
type Service struct {
	repo        Repository
	encryptKey  []byte            // 32 bytes; nil means store plaintext
	historyRepo HistoryRepository // noop when statistics_store is not configured
}

// NewService creates a Service. encryptKey must be 32 bytes or nil.
func NewService(repo Repository, encryptKey []byte, historyRepo HistoryRepository) (*Service, error) {
	if encryptKey != nil && len(encryptKey) != 32 {
		return nil, fmt.Errorf("encryption key must be 32 bytes, got %d", len(encryptKey))
	}
	if historyRepo == nil {
		historyRepo = NoopHistoryRepository{}
	}
	return &Service{repo: repo, encryptKey: encryptKey, historyRepo: historyRepo}, nil
}

// List returns all configs without exposing API keys.
func (s *Service) List(ctx context.Context) ([]*AIConfig, error) {
	cfgs, err := s.repo.List(ctx)
	if err != nil {
		return nil, err
	}
	// Never expose raw API keys in list
	for _, c := range cfgs {
		c.APIKey = ""
	}
	return cfgs, nil
}

// GetByID returns one config. API key is masked.
func (s *Service) GetByID(ctx context.Context, id string) (*AIConfig, error) {
	cfg, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	cfg.APIKey = "" // never expose
	return cfg, nil
}

// Create stores a new config. APIKey is encrypted if encryptKey is set.
func (s *Service) Create(ctx context.Context, cfg *AIConfig) error {
	if cfg.APIKey != "" {
		enc, err := s.encrypt(cfg.APIKey)
		if err != nil {
			return fmt.Errorf("encrypt api_key: %w", err)
		}
		cfg.APIKey = enc
	}
	if err := s.repo.Create(ctx, cfg); err != nil {
		return err
	}
	s.recordHistory(ctx, cfg.ID, cfg.Name, cfg.Provider, "created")
	return nil
}

// Update modifies an existing config.
// If APIKey is empty string, the existing key is preserved.
// If APIKey is non-empty, it replaces the stored key.
func (s *Service) Update(ctx context.Context, id string, input *AIConfig) error {
	existing, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("get existing config: %w", err)
	}

	existing.Name = input.Name
	existing.Provider = input.Provider
	existing.Model = input.Model
	existing.BaseURL = input.BaseURL
	existing.IsActive = input.IsActive

	if input.APIKey != "" {
		enc, err := s.encrypt(input.APIKey)
		if err != nil {
			return fmt.Errorf("encrypt api_key: %w", err)
		}
		existing.APIKey = enc
	}
	// input.APIKey == "" → keep existing.APIKey unchanged

	if err := s.repo.Update(ctx, existing); err != nil {
		return err
	}
	s.recordHistory(ctx, existing.ID, existing.Name, existing.Provider, "updated")
	return nil
}

// Delete removes a config by ID.
func (s *Service) Delete(ctx context.Context, id string) error {
	// Snapshot name/provider before deletion for history record.
	existing, _ := s.repo.GetByID(ctx, id)
	if err := s.repo.Delete(ctx, id); err != nil {
		return err
	}
	if existing != nil {
		s.recordHistory(ctx, existing.ID, existing.Name, existing.Provider, "deleted")
	}
	return nil
}

// SetActive marks one config as active, clears all others.
func (s *Service) SetActive(ctx context.Context, id string) error {
	existing, _ := s.repo.GetByID(ctx, id)
	if err := s.repo.SetActive(ctx, id); err != nil {
		return err
	}
	if existing != nil {
		s.recordHistory(ctx, existing.ID, existing.Name, existing.Provider, "activated")
	}
	return nil
}

func (s *Service) recordHistory(ctx context.Context, configID, name, provider, action string) {
	id, err := uuid.NewV7()
	if err != nil {
		return
	}
	_ = s.historyRepo.Record(ctx, &AIConfigHistory{
		ID:         id.String(),
		ConfigID:   configID,
		ConfigName: name,
		Provider:   provider,
		Action:     action,
		ChangedAt:  time.Now().UTC(),
	})
}

// GetActive returns the active config with the API key decrypted.
// Returns nil, nil if no config is active.
func (s *Service) GetActive(ctx context.Context) (*AIConfig, error) {
	cfg, err := s.repo.GetActive(ctx)
	if err != nil {
		return nil, err
	}
	if cfg == nil {
		return nil, nil
	}
	if cfg.APIKey != "" {
		dec, err := s.decrypt(cfg.APIKey)
		if err != nil {
			return nil, fmt.Errorf("decrypt api_key: %w", err)
		}
		cfg.APIKey = dec
	}
	return cfg, nil
}

// HasAPIKey reports whether the stored config has a non-empty API key.
func (s *Service) HasAPIKey(ctx context.Context, id string) (bool, error) {
	cfg, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return false, err
	}
	return cfg.APIKey != "", nil
}

func (s *Service) encrypt(plaintext string) (string, error) {
	if s.encryptKey == nil {
		return plaintext, nil // store plaintext when no key configured
	}
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

func (s *Service) decrypt(ciphertext string) (string, error) {
	if s.encryptKey == nil {
		return ciphertext, nil
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
	pt, err := gcm.Open(nil, data[:ns], data[ns:], nil)
	if err != nil {
		return "", fmt.Errorf("decrypt: %w", err)
	}
	return string(pt), nil
}
