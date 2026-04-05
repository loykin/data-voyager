-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS ai_config_history
(
    id          String,
    config_id   String,
    config_name String,
    provider    String,
    action      String,
    changed_at  DateTime DEFAULT now()
) ENGINE = MergeTree()
ORDER BY (changed_at, id);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS ai_config_history;
-- +goose StatementEnd
