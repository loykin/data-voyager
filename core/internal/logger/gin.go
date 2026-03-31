package logger

import (
	"log/slog"
	"time"

	"github.com/gin-gonic/gin"
)

// GinMiddleware returns a gin.HandlerFunc that logs each request via slog.
// Use with gin.New() instead of gin.Default() to route all logs through slog.
func GinMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		if c.Request.URL.RawQuery != "" {
			path += "?" + c.Request.URL.RawQuery
		}

		c.Next()

		latency := time.Since(start)
		status := c.Writer.Status()

		attrs := []any{
			"method", c.Request.Method,
			"path", path,
			"status", status,
			"latency", latency,
			"ip", c.ClientIP(),
			"bytes", c.Writer.Size(),
		}
		if errs := c.Errors.ByType(gin.ErrorTypePrivate).String(); errs != "" {
			attrs = append(attrs, "errors", errs)
		}

		switch {
		case status >= 500:
			slog.Error("request", attrs...)
		case status >= 400:
			slog.Warn("request", attrs...)
		default:
			slog.Info("request", attrs...)
		}
	}
}
