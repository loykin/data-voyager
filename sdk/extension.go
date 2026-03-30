package sdk

import "context"

// App is the service container that core provides to extensions.
// Extensions must only depend on this interface, never on core packages directly.
type App interface {
	Router() Router
	Auth() AuthService
	Alert() AlertService
	DB() Database
	Config() Config
	Logger() Logger
}

// Extension is the base interface all extensions must implement.
type Extension interface {
	Meta() ExtensionMeta
	Register(app App) error
}

// ExtensionMeta holds static metadata about an extension.
type ExtensionMeta struct {
	ID      string
	Name    string
	Version string
}

// AlertChannelPlugin extends Extension for alert notification backends.
type AlertChannelPlugin interface {
	Extension
	Send(ctx context.Context, alert AlertEvent) error
}
