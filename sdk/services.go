package sdk

import "context"

// AuthService exposes core's auth engine to extensions.
type AuthService interface {
	HasPermission(ctx context.Context, action, resource string) bool
	CurrentUser(ctx context.Context) (*User, error)
}

// AlertService exposes core's alert engine to extensions.
type AlertService interface {
	Fire(ctx context.Context, event AlertEvent) error
	Subscribe(ruleID string, handler AlertHandler)
}

// AlertHandler is a callback invoked when a matching alert fires.
type AlertHandler func(ctx context.Context, event AlertEvent)
