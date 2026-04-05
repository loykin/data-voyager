-- +goose Up
CREATE TABLE IF NOT EXISTS ai_config_history (
    id          TEXT        NOT NULL PRIMARY KEY,
    config_id   TEXT        NOT NULL,
    config_name TEXT        NOT NULL,
    provider    TEXT        NOT NULL,
    action      TEXT        NOT NULL,
    changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_config_history_config_id ON ai_config_history (config_id);
CREATE INDEX IF NOT EXISTS idx_ai_config_history_changed_at ON ai_config_history (changed_at DESC);

-- +goose Down
DROP TABLE IF EXISTS ai_config_history;
