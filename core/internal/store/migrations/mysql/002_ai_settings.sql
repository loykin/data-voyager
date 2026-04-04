-- +goose Up
CREATE TABLE IF NOT EXISTS ai_settings (
    id          VARCHAR(36)  NOT NULL PRIMARY KEY,
    `key`       VARCHAR(255) NOT NULL,
    value       TEXT         NOT NULL,
    is_secret   TINYINT(1)   NOT NULL DEFAULT 0,
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_ai_settings_key UNIQUE (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- +goose Down
DROP TABLE IF EXISTS ai_settings;
