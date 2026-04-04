-- +goose Up
CREATE TABLE IF NOT EXISTS data_sources (
    id          TEXT         PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    type        VARCHAR(64)  NOT NULL,
    config      TEXT         NOT NULL DEFAULT '{}',
    description TEXT         NOT NULL DEFAULT '',
    tags        TEXT         NOT NULL DEFAULT '[]',
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by  VARCHAR(255) NOT NULL DEFAULT '',
    CONSTRAINT uq_data_sources_name UNIQUE (name)
);

CREATE INDEX IF NOT EXISTS idx_data_sources_type      ON data_sources (type);
CREATE INDEX IF NOT EXISTS idx_data_sources_is_active ON data_sources (is_active);

-- +goose Down
DROP TABLE IF EXISTS data_sources;
