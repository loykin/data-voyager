# Data Voyager

A platform for connecting and exploring datasources with AI-powered analysis.

## Overview

Data Voyager integrates various datasources (PostgreSQL, ClickHouse, MySQL, etc.) and provides AI-powered query assistance and data exploration.

## Architecture

Monorepo using pnpm workspaces (frontend) and Go workspaces (backend).

### Backend (Go)
- **Framework**: Gin
- **Store**: SQLite (embedded, default) / PostgreSQL / MySQL
- **API**: REST (OpenAPI-generated)
- **Plugin System**: Datasource plugins via SDK (`sdk/`)
- **AI**: Claude, OpenAI, Ollama, GitHub Copilot via configurable AI configs
- **Modules**: `core`, `shared`, `sdk`, `extensions/datasources/*`

### Frontend (React + Vite)
- **Framework**: React 19 + Vite
- **Routing**: React Router v7
- **Data fetching**: TanStack Query v5
- **UI**: shadcn/ui + Tailwind CSS v4
- **Architecture**: Vertical Slice (`features/<domain>/{api,hooks,components}/`)
- **API client**: openapi-fetch (generated types)

### Shared
- **sdk/**: Plugin SDK for datasource extensions
- **shared/frontend**: Common UI components (`@data-voyager/shared-ui`)

## Project Structure

```
data-voyager/
├── core/
│   ├── frontend/              # React + Vite SPA
│   │   └── src/
│   │       ├── app/           # Router, global providers
│   │       ├── features/      # Vertical slice features
│   │       │   ├── datasource/
│   │       │   ├── discover/
│   │       │   ├── aiconfig/
│   │       │   └── explore/
│   │       ├── pages/         # Thin re-export shells
│   │       ├── widgets/       # App chrome (layout, sidebar, AI chat)
│   │       └── shared/        # Shared lib, hooks, components
│   ├── cmd/                   # CLI (cobra) — serve, version
│   └── internal/
│       ├── api/               # Generated API handlers
│       ├── ai/                # AI agent & provider integrations
│       ├── connection/        # Datasource connection CRUD
│       ├── settings/          # App settings
│       ├── query_builder/     # SQL template engine
│       └── store/             # DB + migrations (SQLite/PG/MySQL)
│
├── extensions/
│   └── datasources/
│       ├── postgresql/
│       └── clickhouse/
│
├── sdk/                       # Datasource plugin SDK
├── shared/                    # Shared Go utilities
├── config.toml                # Configuration
├── go.work                    # Go workspace
└── pnpm-workspace.yaml
```

## Getting Started

### Prerequisites
- Go 1.22+
- Node.js 20+
- pnpm 9+

### Development

```bash
# Install frontend dependencies
pnpm install

# Start backend (serves API + embedded frontend on :8080)
go run core/cmd/server/main.go serve

# Start frontend dev server (:5173)
cd core/frontend && pnpm dev
```

The backend serves the built frontend at `http://localhost:8080`. In dev mode the Vite dev server runs at `http://localhost:5173`.

### Production Build

```bash
# Build frontend
cd core/frontend && pnpm build

# Build backend binary
cd core && go build -o ../data-voyager ./cmd/server

# Run
./data-voyager serve
```

Or via Makefile:
```bash
make build   # build frontend + backend
make dev     # start dev servers
```

## Features

### Implemented
- [x] Datasource management (CRUD + connection test)
- [x] PostgreSQL, ClickHouse plugins
- [x] Query execution & result exploration (Discover)
- [x] AI config management (Claude, OpenAI, Ollama, GitHub Copilot)
- [x] AI chat panel (agent-based, per-connection context)
- [x] Embedded SQLite store with migrations

### Planned
- [ ] Schema browser
- [ ] Dashboard creation
- [ ] Data visualization
- [ ] User authentication

## Tech Stack

| Layer | Tech |
|---|---|
| Backend | Go 1.22+, Gin, Viper, Goose, sqlx |
| Frontend | React 19, Vite, TypeScript, TanStack Query |
| UI | shadcn/ui, Radix UI, Tailwind CSS v4 |
| API | OpenAPI 3, oapi-codegen, openapi-fetch |
| Testing | Go testify + testcontainers, Jest |

## Testing

```bash
# Backend
cd core && go test ./...

# Frontend
cd core/frontend && pnpm test
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT
