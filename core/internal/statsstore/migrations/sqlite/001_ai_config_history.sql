-- +goose Up
CREATE TABLE IF NOT EXISTS ai_config_history (
    id          TEXT     NOT NULL PRIMARY KEY,
    config_id   TEXT     NOT NULL,
    config_name TEXT     NOT NULL,
    provider    TEXT     NOT NULL,
    action      TEXT     NOT NULL,
    changed_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- +goose Down
DROP TABLE IF EXISTS ai_config_history;
