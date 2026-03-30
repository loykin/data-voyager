package sdk

// Router allows extensions to register HTTP routes.
type Router interface {
	GET(path string, handler HandlerFunc)
	POST(path string, handler HandlerFunc)
	PUT(path string, handler HandlerFunc)
	DELETE(path string, handler HandlerFunc)
	Group(prefix string) Router
}

// HandlerFunc is the HTTP handler signature used by extensions.
type HandlerFunc func(ctx RequestContext)

// RequestContext abstracts the HTTP request/response cycle.
type RequestContext interface {
	Param(key string) string
	Query(key string) string
	BindJSON(v any) error
	JSON(code int, v any)
	GetHeader(key string) string
}

// Database provides basic data persistence for extensions.
type Database interface {
	Find(dest any, conditions ...any) error
	First(dest any, conditions ...any) error
	Create(value any) error
	Save(value any) error
	Delete(value any, conditions ...any) error
}

// Config provides read-only access to application configuration.
type Config interface {
	GetString(key string) string
	GetInt(key string) int
	GetBool(key string) bool
}

// Logger provides structured logging.
type Logger interface {
	Info(msg string, fields ...any)
	Warn(msg string, fields ...any)
	Error(msg string, fields ...any)
}
