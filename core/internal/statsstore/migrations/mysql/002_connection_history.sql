-- +goose Up
CREATE TABLE IF NOT EXISTS connection_history (
    id               VARCHAR(36)  NOT NULL PRIMARY KEY,
    connection_id    VARCHAR(36)  NOT NULL,
    connection_name  VARCHAR(255) NOT NULL,
    connection_type  VARCHAR(50)  NOT NULL,
    action           VARCHAR(20)  NOT NULL,
    changed_at       DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
);

CREATE INDEX idx_connection_history_connection_id ON connection_history (connection_id);
CREATE INDEX idx_connection_history_changed_at ON connection_history (changed_at);

-- +goose Down
DROP TABLE IF EXISTS connection_history;
