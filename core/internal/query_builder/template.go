package query_builder

import (
	"fmt"
	"time"

	"github.com/flosch/pongo2/v6"
)

func init() {
	// Disable HTML auto-escaping — queries are SQL, not HTML.
	pongo2.SetAutoescape(false)
}

// Context is the template rendering context (variable name → value).
type Context map[string]any

// BuildContext constructs the full template context.
// User-supplied variables are added first. Built-in __ variables are then
// injected and cannot be overridden by the caller.
func BuildContext(tr TimeRange, userVars map[string]any, limit int) Context {
	ctx := make(Context, len(userVars)+16)

	// 1. User variables (lower priority — __ names are silently dropped).
	for k, v := range userVars {
		if !isBuiltin(k) {
			ctx[k] = v
		}
	}

	// 2. Time built-ins.
	if !tr.From.IsZero() {
		ctx["__start_time"] = tr.From.Unix()
		ctx["__start_time_ms"] = tr.From.UnixMilli()
		ctx["__start_time_iso"] = tr.From.UTC().Format(time.RFC3339)
		ctx["__start_date"] = tr.From.UTC().Format("2006-01-02")
	}
	if !tr.To.IsZero() {
		ctx["__end_time"] = tr.To.Unix()
		ctx["__end_time_ms"] = tr.To.UnixMilli()
		ctx["__end_time_iso"] = tr.To.UTC().Format(time.RFC3339)
		ctx["__end_date"] = tr.To.UTC().Format("2006-01-02")
	}
	if !tr.From.IsZero() && !tr.To.IsZero() {
		iv := calcInterval(tr.To.Sub(tr.From))
		ctx["__interval"] = iv.seconds
		ctx["__interval_ms"] = iv.seconds * 1000
		ctx["__interval_string"] = iv.label
	}

	// 3. Misc built-ins.
	ctx["__limit"] = limit

	return ctx
}

// isBuiltin reports whether a variable name is a protected built-in (__ prefix).
func isBuiltin(name string) bool {
	return len(name) >= 2 && name[0] == '_' && name[1] == '_'
}

// RenderQuery applies pongo2 template substitution to query using ctx.
// Returns the rendered SQL string and any parse/execution errors.
func RenderQuery(query string, ctx Context) (string, error) {
	tpl, err := pongo2.FromString(query)
	if err != nil {
		return "", fmt.Errorf("query template parse error: %w", err)
	}
	out, err := tpl.Execute(pongo2.Context(ctx))
	if err != nil {
		return "", fmt.Errorf("query template render error: %w", err)
	}
	return out, nil
}

// intervalCalc holds a computed auto-interval.
type intervalCalc struct {
	seconds int64
	label   string
}

// calcInterval returns the recommended sampling interval for a given time range.
// Thresholds mirror Grafana's default auto-interval logic.
func calcInterval(d time.Duration) intervalCalc {
	switch {
	case d <= 30*time.Minute:
		return intervalCalc{10, "10s"}
	case d <= time.Hour:
		return intervalCalc{60, "1m"}
	case d <= 6*time.Hour:
		return intervalCalc{300, "5m"}
	case d <= 24*time.Hour:
		return intervalCalc{1800, "30m"}
	case d <= 7*24*time.Hour:
		return intervalCalc{3600, "1h"}
	default:
		return intervalCalc{86400, "1d"}
	}
}
