-- +goose Up
CREATE TABLE IF NOT EXISTS ai_configs (
    id          TEXT         PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    provider    VARCHAR(50)  NOT NULL,
    api_key     TEXT         NOT NULL DEFAULT '',
    model       VARCHAR(255) NOT NULL DEFAULT '',
    base_url    VARCHAR(500) NOT NULL DEFAULT '',
    is_active   BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_ai_configs_name UNIQUE (name)
);

-- +goose Down
DROP TABLE IF EXISTS ai_configs;
