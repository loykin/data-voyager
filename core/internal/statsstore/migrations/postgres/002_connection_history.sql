-- +goose Up
CREATE TABLE IF NOT EXISTS connection_history (
    id               TEXT        NOT NULL PRIMARY KEY,
    connection_id    TEXT        NOT NULL,
    connection_name  TEXT        NOT NULL,
    connection_type  TEXT        NOT NULL,
    action           TEXT        NOT NULL,
    changed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_connection_history_connection_id ON connection_history (connection_id);
CREATE INDEX IF NOT EXISTS idx_connection_history_changed_at ON connection_history (changed_at DESC);

-- +goose Down
DROP TABLE IF EXISTS connection_history;
