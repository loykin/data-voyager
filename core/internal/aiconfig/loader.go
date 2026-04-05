package aiconfig

// BuildService constructs a Service from a pre-resolved encryption key.
// encryptKey must be 32 bytes (AES-256) or nil to store plaintext.
// historyRepo is optional — pass nil to use NoopHistoryRepository.
// The caller (e.g. cmd/serve.go) is responsible for resolving the key — both
// settings and aiconfig packages share the same key so resolution is done once
// at startup via settings.ResolveEncryptionKey.
func BuildService(repo Repository, encryptKey []byte, historyRepo HistoryRepository) (*Service, error) {
	return NewService(repo, encryptKey, historyRepo)
}
