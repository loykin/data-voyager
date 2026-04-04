package settings_test

import (
	"context"
	"errors"
	"testing"

	"data-voyager/core/internal/config"
	"data-voyager/core/internal/settings"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ─── mock repo ───────────────────────────────────────────────────────────────

type mockRepo struct {
	data map[string]*settings.Setting
}

func newMockRepo() *mockRepo {
	return &mockRepo{data: make(map[string]*settings.Setting)}
}

func (m *mockRepo) Get(_ context.Context, key string) (*settings.Setting, error) {
	s, ok := m.data[key]
	if !ok {
		return nil, errors.New("not found")
	}
	return s, nil
}

func (m *mockRepo) Set(_ context.Context, key, value string, isSecret bool) error {
	m.data[key] = &settings.Setting{Key: key, Value: value, IsSecret: isSecret}
	return nil
}

func (m *mockRepo) GetAll(_ context.Context) ([]*settings.Setting, error) {
	out := make([]*settings.Setting, 0, len(m.data))
	for _, v := range m.data {
		cp := *v
		out = append(out, &cp)
	}
	return out, nil
}

func (m *mockRepo) Delete(_ context.Context, key string) error {
	delete(m.data, key)
	return nil
}

// ─── helpers ─────────────────────────────────────────────────────────────────

func newKey() []byte {
	k := make([]byte, 32)
	for i := range k {
		k[i] = byte(i + 1)
	}
	return k
}

func newSvc(t *testing.T) (*settings.Service, *mockRepo) {
	t.Helper()
	repo := newMockRepo()
	svc, err := settings.NewService(repo, newKey())
	require.NoError(t, err)
	return svc, repo
}

// ─── tests ───────────────────────────────────────────────────────────────────

func TestNewService_InvalidKeyLength(t *testing.T) {
	_, err := settings.NewService(newMockRepo(), []byte("short"))
	require.Error(t, err)
}

func TestNewService_NilKey(t *testing.T) {
	_, err := settings.NewService(newMockRepo(), nil)
	require.NoError(t, err)
}

func TestSaveAIConfig_SecretKeyRequiresEncryptKey(t *testing.T) {
	repo := newMockRepo()
	svc, err := settings.NewService(repo, nil)
	require.NoError(t, err)

	err = svc.SaveAIConfig(context.Background(), settings.SaveAIConfigRequest{
		Provider: "claude",
		Claude:   settings.ClaudeInput{APIKey: "sk-real-key"},
	})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "encryption key not configured")
}

func TestSaveAndLoadAIConfig_GlobalSettings(t *testing.T) {
	svc, _ := newSvc(t)
	ctx := context.Background()
	toml := &config.AIConfig{Provider: "ollama"}

	req := settings.SaveAIConfigRequest{
		Enabled:  true,
		Provider: "claude",
		Claude: settings.ClaudeInput{
			APIKey: "sk-ant-test",
			Model:  "claude-opus-4-5",
		},
	}
	require.NoError(t, svc.SaveAIConfig(ctx, req))

	cfg, err := svc.LoadAIConfig(ctx, toml)
	require.NoError(t, err)
	assert.True(t, cfg.Enabled)
	assert.Equal(t, "claude", cfg.Provider)
	assert.Equal(t, "sk-ant-test", cfg.Claude.APIKey)
	assert.Equal(t, "claude-opus-4-5", cfg.Claude.Model)
}

func TestLoadAIConfig_FallsBackToToml(t *testing.T) {
	svc, _ := newSvc(t)
	ctx := context.Background()
	toml := &config.AIConfig{
		Provider: "ollama",
		Ollama:   config.OllamaConfig{Model: "qwen2.5"},
	}

	cfg, err := svc.LoadAIConfig(ctx, toml)
	require.NoError(t, err)
	assert.Equal(t, "ollama", cfg.Provider)
	assert.Equal(t, "qwen2.5", cfg.Ollama.Model)
}

func TestLoadAIConfig_UsesCache(t *testing.T) {
	svc, repo := newSvc(t)
	ctx := context.Background()
	toml := &config.AIConfig{}

	require.NoError(t, svc.SaveAIConfig(ctx, settings.SaveAIConfigRequest{
		Provider: "openai",
	}))

	cfg1, err := svc.LoadAIConfig(ctx, toml)
	require.NoError(t, err)
	assert.Equal(t, "openai", cfg1.Provider)

	// Mutate repo directly — cache must shield this
	repo.data["ai.provider"] = &settings.Setting{Key: "ai.provider", Value: "ollama"}

	cfg2, err := svc.LoadAIConfig(ctx, toml)
	require.NoError(t, err)
	assert.Equal(t, "openai", cfg2.Provider, "cache should not see direct repo mutation")
}

func TestSaveAIConfig_EmptyAPIKeyKeepsExisting(t *testing.T) {
	svc, repo := newSvc(t)
	ctx := context.Background()

	require.NoError(t, svc.SaveAIConfig(ctx, settings.SaveAIConfigRequest{
		Claude: settings.ClaudeInput{APIKey: "sk-original"},
	}))
	origEncrypted := repo.data["ai.claude.api_key"].Value

	require.NoError(t, svc.SaveAIConfig(ctx, settings.SaveAIConfigRequest{
		Claude: settings.ClaudeInput{APIKey: ""},
	}))
	assert.Equal(t, origEncrypted, repo.data["ai.claude.api_key"].Value, "empty key must not overwrite existing")
}

func TestBuildAIConfigResponse_NoSecretValues(t *testing.T) {
	svc, _ := newSvc(t)
	ctx := context.Background()

	require.NoError(t, svc.SaveAIConfig(ctx, settings.SaveAIConfigRequest{
		Enabled:  true,
		Provider: "claude",
		Claude:   settings.ClaudeInput{APIKey: "sk-secret", Model: "claude-3"},
	}))

	toml := &config.AIConfig{}
	resp, err := svc.BuildAIConfigResponse(ctx, toml)
	require.NoError(t, err)
	assert.True(t, resp.Enabled)
	assert.Equal(t, "claude", resp.Provider)
	assert.True(t, resp.Claude.APIKeySet)
	assert.Equal(t, "claude-3", resp.Claude.Model)
}

func TestParseEncryptionKey(t *testing.T) {
	t.Run("empty returns nil", func(t *testing.T) {
		k, err := settings.ParseEncryptionKey("")
		require.NoError(t, err)
		assert.Nil(t, k)
	})

	t.Run("valid base64 32 bytes", func(t *testing.T) {
		// 32 zero bytes in standard base64
		encoded := "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
		k, err := settings.ParseEncryptionKey(encoded)
		require.NoError(t, err)
		assert.Len(t, k, 32)
	})

	t.Run("wrong length errors", func(t *testing.T) {
		short := "dGVzdA==" // "test" = 4 bytes
		_, err := settings.ParseEncryptionKey(short)
		require.Error(t, err)
	})
}
