package query_builder

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// TimeRange holds the parsed start and end of a query window.
type TimeRange struct {
	From time.Time
	To   time.Time
}

// IsZero reports whether both From and To are unset.
func (tr TimeRange) IsZero() bool {
	return tr.From.IsZero() && tr.To.IsZero()
}

// ParseTimeRange parses from/to strings into a TimeRange.
// Either field may be empty — a zero time.Time will be returned for that field.
func ParseTimeRange(from, to string) (TimeRange, error) {
	var tr TimeRange
	var err error
	if from != "" {
		tr.From, err = parseTimeExpr(from)
		if err != nil {
			return TimeRange{}, fmt.Errorf("time_range.from: %w", err)
		}
	}
	if to != "" {
		tr.To, err = parseTimeExpr(to)
		if err != nil {
			return TimeRange{}, fmt.Errorf("time_range.to: %w", err)
		}
	}
	return tr, nil
}

// parseTimeExpr converts a single time expression to time.Time.
// Supported formats:
//   - "now" or "" → current time
//   - numeric string → Unix ms if > 10^10, otherwise Unix seconds
//   - ISO 8601 variants
//   - relative: "N Unit ago" or "N Unit from now"
func parseTimeExpr(expr string) (time.Time, error) {
	expr = strings.TrimSpace(expr)
	if expr == "" || strings.EqualFold(expr, "now") {
		return time.Now(), nil
	}
	// Numeric: Unix seconds or milliseconds.
	if n, err := strconv.ParseInt(expr, 10, 64); err == nil {
		if n > 1e10 { // > 10^10 → treat as milliseconds
			return time.UnixMilli(n), nil
		}
		return time.Unix(n, 0), nil
	}
	// ISO 8601 variants.
	isoFormats := []string{
		time.RFC3339Nano,
		time.RFC3339,
		"2006-01-02T15:04:05",
		"2006-01-02 15:04:05",
		"2006-01-02",
	}
	for _, f := range isoFormats {
		if t, err := time.Parse(f, expr); err == nil {
			return t, nil
		}
	}
	// Relative expression.
	return parseRelative(expr)
}

// relativeRe matches "N Unit ago" or "N Unit from now" (case-insensitive).
var relativeRe = regexp.MustCompile(`(?i)^(\d+)\s+(\w+)\s+(ago|from\s+now)$`)

// parseRelative parses expressions like "5 minutes ago" or "1 hour from now".
func parseRelative(expr string) (time.Time, error) {
	m := relativeRe.FindStringSubmatch(strings.TrimSpace(expr))
	if m == nil {
		return time.Time{}, fmt.Errorf("unrecognized time expression: %q", expr)
	}
	n, _ := strconv.ParseInt(m[1], 10, 64)
	unit := strings.ToLower(m[2])
	past := strings.EqualFold(strings.TrimSpace(m[3]), "ago")
	if !past {
		// "from now" → negate so the sign flip below results in addition.
		n = -n
	}
	now := time.Now()
	switch {
	case strings.HasPrefix(unit, "second") || unit == "s":
		return now.Add(time.Duration(-n) * time.Second), nil
	case strings.HasPrefix(unit, "minute") || strings.HasPrefix(unit, "min"):
		return now.Add(time.Duration(-n) * time.Minute), nil
	case strings.HasPrefix(unit, "hour") || unit == "h":
		return now.Add(time.Duration(-n) * time.Hour), nil
	case strings.HasPrefix(unit, "day") || unit == "d":
		return now.AddDate(0, 0, int(-n)), nil
	case strings.HasPrefix(unit, "week") || unit == "w":
		return now.AddDate(0, 0, int(-n*7)), nil
	case strings.HasPrefix(unit, "month") || unit == "mo":
		return now.AddDate(0, int(-n), 0), nil
	case strings.HasPrefix(unit, "year") || unit == "y":
		return now.AddDate(int(-n), 0, 0), nil
	}
	return time.Time{}, fmt.Errorf("unsupported time unit: %q", unit)
}
