# Shared Go Modules

Common Go utilities and libraries shared across Data Voyager backend services.

## Overview

This module provides shared functionality for:
- **Utils**: Common utility functions (JSON handling, string operations, etc.)
- **Config**: Shared configuration structures
- **Logger**: Shared logging utilities

## Module Structure

```
shared/
├── utils/       # Common utility functions
├── config/      # Shared configuration
├── logger/      # Shared logging utilities
└── go.mod       # Module definition
```

## Usage

### Adding to Your Module

In your `go.mod`:

```go
require (
    data-voyager/shared v0.1.0
)
```

### Go Workspace

This module is part of the Data Voyager Go workspace. In the root `go.work`:

```go
use ./core
use ./shared
```

### Importing

```go
import (
    "data-voyager/shared/utils"
)

func example() {
    // Use shared utilities
    jsonStr, err := utils.ToJSON(myData)
    if err != nil {
        utils.Must(err)
    }
}
```

## Available Utilities

### utils/utils.go

- `ToJSON(v interface{}) (string, error)` - Convert to JSON string
- `FromJSON(data string, v interface{}) error` - Parse JSON string
- `PrettyJSON(v interface{}) (string, error)` - Pretty-print JSON
- `Contains(slice []string, item string) bool` - Check if slice contains string
- `Must(err error)` - Panic if error is not nil
- `MustValue[T any](val T, err error) T` - Return value or panic

## Development

### Adding New Utilities

1. Create new files in appropriate directories
2. Export public functions/types
3. Update this README
4. Run `go mod tidy` in this directory

### Testing

```bash
cd shared
go test ./...
```

## License

MIT
