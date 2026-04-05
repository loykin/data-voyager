-- +goose Up
CREATE TABLE IF NOT EXISTS connection_history (
    id               TEXT     NOT NULL PRIMARY KEY,
    connection_id    TEXT     NOT NULL,
    connection_name  TEXT     NOT NULL,
    connection_type  TEXT     NOT NULL,
    action           TEXT     NOT NULL,
    changed_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- +goose Down
DROP TABLE IF EXISTS connection_history;
