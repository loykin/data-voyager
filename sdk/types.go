package sdk

import "time"

// User represents an authenticated user, shared across core and extensions.
type User struct {
	ID    string
	Name  string
	Email string
	Roles []string
}

// QueryRequest is the input for a datasource query.
type QueryRequest struct {
	DatasourceID string
	RawQuery     string
	TimeRange    TimeRange
	MaxRows      int
}

// TimeRange defines a start/end window for queries.
type TimeRange struct {
	From time.Time
	To   time.Time
}

// AlertEvent is the payload fired when an alert triggers.
type AlertEvent struct {
	RuleID   string
	Severity string
	Message  string
	Labels   map[string]string
	FiredAt  time.Time
}
