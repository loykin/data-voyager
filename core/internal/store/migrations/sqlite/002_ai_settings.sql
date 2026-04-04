-- +goose Up
CREATE TABLE IF NOT EXISTS ai_settings (
    id          TEXT     PRIMARY KEY,
    key         TEXT     NOT NULL UNIQUE,
    value       TEXT     NOT NULL DEFAULT '',
    is_secret   INTEGER  NOT NULL DEFAULT 0,
    updated_at  DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- +goose Down
DROP TABLE IF EXISTS ai_settings;
