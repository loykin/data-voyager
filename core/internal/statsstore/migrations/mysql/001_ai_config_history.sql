-- +goose Up
CREATE TABLE IF NOT EXISTS ai_config_history (
    id          VARCHAR(36)  NOT NULL PRIMARY KEY,
    config_id   VARCHAR(36)  NOT NULL,
    config_name VARCHAR(255) NOT NULL,
    provider    VARCHAR(50)  NOT NULL,
    action      VARCHAR(20)  NOT NULL,
    changed_at  DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
);

CREATE INDEX idx_ai_config_history_config_id ON ai_config_history (config_id);
CREATE INDEX idx_ai_config_history_changed_at ON ai_config_history (changed_at);

-- +goose Down
DROP TABLE IF EXISTS ai_config_history;
