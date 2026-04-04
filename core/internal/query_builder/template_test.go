package query_builder

import (
	"math"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ─── ParseTimeRange ───────────────────────────────────────────────────────────

func TestParseTimeRange_ISO8601(t *testing.T) {
	tr, err := ParseTimeRange("2024-04-01T00:00:00Z", "2024-04-01T01:00:00Z")
	require.NoError(t, err)
	assert.Equal(t, int64(1711929600), tr.From.Unix())
	assert.Equal(t, int64(1711933200), tr.To.Unix())
}

func TestParseTimeRange_UnixMs(t *testing.T) {
	tr, err := ParseTimeRange("1711929600000", "1711933200000")
	require.NoError(t, err)
	assert.Equal(t, int64(1711929600), tr.From.Unix())
	assert.Equal(t, int64(1711933200), tr.To.Unix())
}

func TestParseTimeRange_UnixSeconds(t *testing.T) {
	tr, err := ParseTimeRange("1711929600", "1711933200")
	require.NoError(t, err)
	assert.Equal(t, int64(1711929600), tr.From.Unix())
	assert.Equal(t, int64(1711933200), tr.To.Unix())
}

func TestParseTimeRange_Relative(t *testing.T) {
	tr, err := ParseTimeRange("1 Hours ago", "Now")
	require.NoError(t, err)

	// From should be ~1 hour before now.
	delta := math.Abs(float64(time.Now().Unix() - tr.From.Unix() - 3600))
	assert.LessOrEqual(t, delta, float64(5), "from should be ~1 hour ago")

	// To should be ~now.
	nowDelta := math.Abs(float64(time.Now().Unix() - tr.To.Unix()))
	assert.LessOrEqual(t, nowDelta, float64(5))
}

func TestParseTimeRange_EmptyFields(t *testing.T) {
	tr, err := ParseTimeRange("", "")
	require.NoError(t, err)
	assert.True(t, tr.From.IsZero())
	assert.True(t, tr.To.IsZero())
}

func TestParseTimeRange_InvalidFrom(t *testing.T) {
	_, err := ParseTimeRange("not a time", "Now")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "time_range.from")
}

func TestParseTimeRange_InvalidTo(t *testing.T) {
	_, err := ParseTimeRange("Now", "not a time")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "time_range.to")
}

func TestParseTimeRange_RelativeUnits(t *testing.T) {
	cases := []struct {
		expr   string
		wantFn func() int64
	}{
		{"30 Seconds ago", func() int64 { return time.Now().Add(-30 * time.Second).Unix() }},
		{"5 Minutes ago", func() int64 { return time.Now().Add(-5 * time.Minute).Unix() }},
		{"2 Hours ago", func() int64 { return time.Now().Add(-2 * time.Hour).Unix() }},
		{"3 Days ago", func() int64 { return time.Now().AddDate(0, 0, -3).Unix() }},
		{"1 Weeks ago", func() int64 { return time.Now().AddDate(0, 0, -7).Unix() }},
		{"2 Months ago", func() int64 { return time.Now().AddDate(0, -2, 0).Unix() }},
		{"1 Years ago", func() int64 { return time.Now().AddDate(-1, 0, 0).Unix() }},
		{"1 Hours from now", func() int64 { return time.Now().Add(1 * time.Hour).Unix() }},
	}
	for _, tc := range cases {
		t.Run(tc.expr, func(t *testing.T) {
			tr, err := ParseTimeRange(tc.expr, "")
			require.NoError(t, err)
			delta := math.Abs(float64(tc.wantFn() - tr.From.Unix()))
			assert.LessOrEqual(t, delta, float64(5), "delta too large for %q", tc.expr)
		})
	}
}

// ─── BuildContext ─────────────────────────────────────────────────────────────

func TestBuildContext_TimeBuiltins(t *testing.T) {
	from := time.Date(2024, 4, 1, 0, 0, 0, 0, time.UTC)
	to := time.Date(2024, 4, 1, 1, 0, 0, 0, time.UTC)
	tr := TimeRange{From: from, To: to}
	ctx := BuildContext(tr, nil, 1000)

	assert.Equal(t, from.Unix(), ctx["__start_time"])
	assert.Equal(t, from.UnixMilli(), ctx["__start_time_ms"])
	assert.Equal(t, "2024-04-01T00:00:00Z", ctx["__start_time_iso"])
	assert.Equal(t, "2024-04-01", ctx["__start_date"])

	assert.Equal(t, to.Unix(), ctx["__end_time"])
	assert.Equal(t, to.UnixMilli(), ctx["__end_time_ms"])
	assert.Equal(t, "2024-04-01T01:00:00Z", ctx["__end_time_iso"])
	assert.Equal(t, "2024-04-01", ctx["__end_date"])

	// 1h range → 1m interval
	assert.Equal(t, int64(60), ctx["__interval"])
	assert.Equal(t, int64(60000), ctx["__interval_ms"])
	assert.Equal(t, "1m", ctx["__interval_string"])
	assert.Equal(t, 1000, ctx["__limit"])
}

func TestBuildContext_UserVarsArePassedThrough(t *testing.T) {
	ctx := BuildContext(TimeRange{}, map[string]any{"host": "prod-01", "level": "error"}, 100)
	assert.Equal(t, "prod-01", ctx["host"])
	assert.Equal(t, "error", ctx["level"])
}

func TestBuildContext_UserCannotOverrideBuiltins(t *testing.T) {
	// A user who tries to inject __start_time should be silently ignored.
	ctx := BuildContext(
		TimeRange{From: time.Unix(1000, 0), To: time.Unix(2000, 0)},
		map[string]any{"__start_time": int64(0), "__end_time": int64(0)},
		100,
	)
	assert.Equal(t, int64(1000), ctx["__start_time"], "user must not override __start_time")
	assert.Equal(t, int64(2000), ctx["__end_time"], "user must not override __end_time")
}

func TestBuildContext_ZeroTimeRange(t *testing.T) {
	ctx := BuildContext(TimeRange{}, nil, 500)
	_, hasStart := ctx["__start_time"]
	_, hasEnd := ctx["__end_time"]
	_, hasInterval := ctx["__interval"]
	assert.False(t, hasStart, "__start_time should not be set for zero TimeRange")
	assert.False(t, hasEnd, "__end_time should not be set for zero TimeRange")
	assert.False(t, hasInterval, "__interval should not be set for zero TimeRange")
	assert.Equal(t, 500, ctx["__limit"])
}

// ─── calcInterval ─────────────────────────────────────────────────────────────

func TestCalcInterval(t *testing.T) {
	cases := []struct {
		duration time.Duration
		wantSec  int64
		wantStr  string
	}{
		{15 * time.Minute, 10, "10s"},
		{30 * time.Minute, 10, "10s"},
		{31 * time.Minute, 60, "1m"},
		{time.Hour, 60, "1m"},
		{2 * time.Hour, 300, "5m"},
		{6 * time.Hour, 300, "5m"},
		{7 * time.Hour, 1800, "30m"},
		{24 * time.Hour, 1800, "30m"},
		{25 * time.Hour, 3600, "1h"},
		{7 * 24 * time.Hour, 3600, "1h"},
		{8 * 24 * time.Hour, 86400, "1d"},
	}
	for _, tc := range cases {
		t.Run(tc.duration.String(), func(t *testing.T) {
			iv := calcInterval(tc.duration)
			assert.Equal(t, tc.wantSec, iv.seconds)
			assert.Equal(t, tc.wantStr, iv.label)
		})
	}
}

// ─── RenderQuery ─────────────────────────────────────────────────────────────

func TestRenderQuery_SimpleSubstitution(t *testing.T) {
	ctx := Context{"host": "prod-01"}
	out, err := RenderQuery("SELECT * FROM logs WHERE host = '{{ host }}'", ctx)
	require.NoError(t, err)
	assert.Equal(t, "SELECT * FROM logs WHERE host = 'prod-01'", out)
}

func TestRenderQuery_NumericBuiltin(t *testing.T) {
	ctx := Context{"__start_time": int64(1711929600), "__end_time": int64(1711933200)}
	out, err := RenderQuery("WHERE ts BETWEEN {{ __start_time }} AND {{ __end_time }}", ctx)
	require.NoError(t, err)
	assert.Equal(t, "WHERE ts BETWEEN 1711929600 AND 1711933200", out)
}

// Regression: float64 must not render as scientific notation (e.g. 1.712e+09).
func TestRenderQuery_Float64NeverScientificNotation(t *testing.T) {
	// BuildContext always stores Unix timestamps as int64, so this should be safe.
	// pongo2 renders float64 as float, which can produce "1.71192960e+09".
	ctx := Context{"__start_time": int64(1711929600)}
	out, err := RenderQuery("{{ __start_time }}", ctx)
	require.NoError(t, err)
	assert.Equal(t, "1711929600", out)
	assert.False(t, strings.Contains(out, "e+"), "must not contain scientific notation")
}

func TestRenderQuery_ConditionalIf(t *testing.T) {
	tpl := "SELECT * FROM logs WHERE ts > {{ __start_time }}" +
		"{% if host %} AND host = '{{ host }}'{% endif %}"
	t.Run("with host", func(t *testing.T) {
		ctx := Context{"__start_time": int64(1000), "host": "prod"}
		out, err := RenderQuery(tpl, ctx)
		require.NoError(t, err)
		assert.Contains(t, out, "AND host = 'prod'")
	})
	t.Run("without host", func(t *testing.T) {
		ctx := Context{"__start_time": int64(1000)}
		out, err := RenderQuery(tpl, ctx)
		require.NoError(t, err)
		assert.NotContains(t, out, "AND host")
	})
}

func TestRenderQuery_MultipleVars(t *testing.T) {
	ctx := Context{
		"__start_time": int64(1000),
		"__end_time":   int64(2000),
		"__interval":   int64(60),
		"table":        "metrics",
	}
	tpl := "SELECT time_bucket({{ __interval }}, ts), avg(v) FROM {{ table }} " +
		"WHERE ts BETWEEN {{ __start_time }} AND {{ __end_time }}"
	out, err := RenderQuery(tpl, ctx)
	require.NoError(t, err)
	assert.Equal(t,
		"SELECT time_bucket(60, ts), avg(v) FROM metrics WHERE ts BETWEEN 1000 AND 2000",
		out,
	)
}

func TestRenderQuery_InvalidTemplate(t *testing.T) {
	_, err := RenderQuery("SELECT {{ unclosed", Context{})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "template parse error")
}

func TestRenderQuery_UndefinedVarRendersEmpty(t *testing.T) {
	// pongo2 renders undefined variables as empty string (not an error).
	out, err := RenderQuery("{{ undefined_var }}", Context{})
	require.NoError(t, err)
	assert.Equal(t, "", out)
}

func TestRenderQuery_NoSubstitution(t *testing.T) {
	// Plain SQL with no templates should pass through unchanged.
	plain := "SELECT 1"
	out, err := RenderQuery(plain, Context{})
	require.NoError(t, err)
	assert.Equal(t, plain, out)
}

// ─── Full pipeline: ParseTimeRange → BuildContext → RenderQuery ───────────────

func TestFullPipeline(t *testing.T) {
	from := time.Date(2024, 4, 1, 0, 0, 0, 0, time.UTC)
	to := time.Date(2024, 4, 1, 1, 0, 0, 0, time.UTC)
	tr := TimeRange{From: from, To: to}
	ctx := BuildContext(tr, map[string]any{"table": "metrics"}, 5000)
	tpl := "SELECT * FROM {{ table }} WHERE ts > {{ __start_time }} LIMIT {{ __limit }}"
	out, err := RenderQuery(tpl, ctx)
	require.NoError(t, err)
	assert.Equal(t,
		"SELECT * FROM metrics WHERE ts > 1711929600 LIMIT 5000",
		out,
	)
}
