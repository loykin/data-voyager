-- +goose Up
CREATE TABLE IF NOT EXISTS ai_configs (
    id          VARCHAR(36)  NOT NULL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    provider    VARCHAR(50)  NOT NULL,
    api_key     TEXT         NOT NULL DEFAULT '',
    model       VARCHAR(255) NOT NULL DEFAULT '',
    base_url    VARCHAR(500) NOT NULL DEFAULT '',
    is_active   TINYINT(1)   NOT NULL DEFAULT 0,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_ai_configs_name UNIQUE (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- +goose Down
DROP TABLE IF EXISTS ai_configs;
