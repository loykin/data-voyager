-- +goose Up
CREATE TABLE IF NOT EXISTS ai_configs (
    id          TEXT     PRIMARY KEY,
    name        TEXT     NOT NULL UNIQUE,
    provider    TEXT     NOT NULL,
    api_key     TEXT     NOT NULL DEFAULT '',
    model       TEXT     NOT NULL DEFAULT '',
    base_url    TEXT     NOT NULL DEFAULT '',
    is_active   INTEGER  NOT NULL DEFAULT 0,
    created_at  DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at  DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- +goose Down
DROP TABLE IF EXISTS ai_configs;
