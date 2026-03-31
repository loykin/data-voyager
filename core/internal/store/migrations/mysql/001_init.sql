-- +goose Up
CREATE TABLE IF NOT EXISTS data_sources (
    id          BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    type        VARCHAR(64)  NOT NULL,
    config      TEXT         NOT NULL,
    description TEXT         NOT NULL,
    tags        TEXT         NOT NULL,
    is_active   TINYINT(1)   NOT NULL DEFAULT 1,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by  VARCHAR(255) NOT NULL DEFAULT '',
    CONSTRAINT uq_data_sources_name UNIQUE (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_data_sources_type      ON data_sources (type);
CREATE INDEX idx_data_sources_is_active ON data_sources (is_active);

-- +goose Down
DROP TABLE IF EXISTS data_sources;
