-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS connection_history
(
    id               String,
    connection_id    String,
    connection_name  String,
    connection_type  String,
    action           String,
    changed_at       DateTime DEFAULT now()
) ENGINE = MergeTree()
ORDER BY (changed_at, id);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS connection_history;
-- +goose StatementEnd
