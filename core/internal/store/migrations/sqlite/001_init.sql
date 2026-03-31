-- +goose Up
CREATE TABLE IF NOT EXISTS data_sources (
    id          INTEGER  PRIMARY KEY AUTOINCREMENT,
    name        TEXT     NOT NULL UNIQUE,
    type        TEXT     NOT NULL,
    config      TEXT     NOT NULL DEFAULT '{}',
    description TEXT     NOT NULL DEFAULT '',
    tags        TEXT     NOT NULL DEFAULT '[]',
    is_active   INTEGER  NOT NULL DEFAULT 1,
    created_at  DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at  DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    created_by  TEXT     NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_data_sources_type      ON data_sources (type);
CREATE INDEX IF NOT EXISTS idx_data_sources_is_active ON data_sources (is_active);

-- +goose Down
DROP TABLE IF EXISTS data_sources;
