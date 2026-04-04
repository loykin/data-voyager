-- +goose Up
CREATE TABLE IF NOT EXISTS ai_settings (
    id          TEXT         PRIMARY KEY,
    key         VARCHAR(255) NOT NULL,
    value       TEXT         NOT NULL DEFAULT '',
    is_secret   BOOLEAN      NOT NULL DEFAULT FALSE,
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_ai_settings_key UNIQUE (key)
);

-- +goose Down
DROP TABLE IF EXISTS ai_settings;
