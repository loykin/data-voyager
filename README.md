# Data Voyager

A platform for connecting and exploring datasources with AI-powered analysis and dashboard creation using MCP (Model Context Protocol).

## 🎯 Overview

Data Voyager is a platform that integrates and manages various datasources (PostgreSQL, ClickHouse, OpenSearch, etc.) and provides AI-powered data analysis and visualization.

## 🏗️ Architecture

This is a **monorepo** using pnpm workspaces for frontend and Go workspaces for backend.

### Backend (Go)
- **Framework**: Go with Gin router
- **Database Support**: PostgreSQL, ClickHouse, SQLite, OpenSearch
- **API**: RESTful API
- **Plugin System**: Plugin architecture for each datasource
- **Workspace**: Go workspace with core and shared modules

### Frontend (Next.js)
- **Framework**: Next.js 15 (App Router, Turbopack)
- **Data Management**: Refine.dev
- **UI Library**: @data-voyager/shared-ui (shadcn/ui + Radix UI)
- **Styling**: Tailwind CSS
- **Architecture**: DDD (Domain-Driven Design)
- **Workspace**: pnpm workspace with core/frontend and shared/frontend

### Shared
- **shared/frontend**: Common UI components (shadcn/ui) used across frontends
- **shared**: Common Go utilities and libraries

## 📁 Project Structure

```
data-voyager/                      # Monorepo root
├── core/                          # Core application
│   ├── frontend/                  # Next.js frontend
│   │   └── src/
│   │       ├── features/          # DDD Feature modules
│   │       │   └── datasource/   # Datasource feature
│   │       ├── app/              # Next.js App Router
│   │       └── components/       # App-specific components
│   │
│   ├── cmd/                       # CLI commands
│   ├── internal/                  # Internal packages
│   │   ├── api/                  # API handlers
│   │   ├── datasource/           # Datasource plugins
│   │   │   ├── postgresql/
│   │   │   ├── clickhouse/
│   │   │   └── ...
│   │   ├── models/               # Data models
│   │   └── service/              # Business logic
│   │
│   └── pkg/                       # Public packages
│
├── shared/                        # Shared modules
│   ├── frontend/                  # Shared UI components (@data-voyager/shared-ui)
│   │   └── src/
│   │       ├── components/ui/    # shadcn/ui components
│   │       └── lib/              # Utilities (cn, etc.)
│   │
│   ├── utils/                     # Common Go utilities
│   ├── config/                    # Shared config
│   └── logger/                    # Shared logger
│
├── data/                          # Data directory
├── config.toml                    # Configuration file
├── go.work                        # Go workspace
└── pnpm-workspace.yaml            # pnpm workspace
```

## 🚀 Getting Started

### Prerequisites
- Go 1.21+
- Node.js 18+
- pnpm 8+
- Make (optional, but recommended)
- PostgreSQL (optional)
- ClickHouse (optional)

### Quick Start (Using Makefile)

```bash
# Show all available commands
make help

# Install dependencies
make install

# Start development servers (hot reload)
make dev

# Build for production
make build

# Start production server
make start

# Full workflow: install + build + start
make quickstart
```

### Development Mode

**Option 1: Using Makefile (Recommended)**
```bash
# Start both frontend and backend with hot reload
make dev

# Or start separately
make dev-frontend  # Frontend only
make dev-backend   # Backend only
```

**Option 2: Using pnpm**
```bash
# Start both frontend and backend
pnpm dev:all

# Access the app at http://localhost:8080/ui
# Backend API at http://localhost:8080/api/v1
# Frontend dev server runs on http://localhost:3000 (proxied)
```

**Option 3: Separate processes**
```bash
# Terminal 1 - Frontend dev server
pnpm dev

# Terminal 2 - Backend with proxy to frontend
GO_ENV=development go run core/cmd/server/main.go serve

# Access at http://localhost:8080/ui
```

### Production Build & Deploy

**Using Makefile:**
```bash
# Build everything
make build

# Or build separately
make build-frontend  # Build frontend static files
make build-backend   # Build Go binary

# Start production server
make start
# Server runs at http://localhost:8080/ui
```

**Using pnpm/go:**
```bash
# Build frontend
pnpm build:export

# Build backend
cd core && go build -o ../data-voyager ./cmd/server

# Run production server
./data-voyager serve
```

### Other Makefile Commands

```bash
make clean          # Clean build artifacts
make test           # Run all tests
make lint           # Run linters
make stop           # Stop all running servers
make db-reset       # Reset database
make info           # Show project info
```

### Manual Setup (Alternative)

**Backend:**

```bash
# Install dependencies
cd core
go mod download

# Run development server
go run cmd/server/main.go serve

# Or build and run
go build -o bin/data-voyager cmd/server/main.go
./bin/data-voyager serve
```

### Frontend Setup

```bash
cd core/frontend

# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build
pnpm build

# Run production
pnpm start
```

## 📚 Features

### ✅ Implemented
- [x] Datasource management (CRUD)
- [x] Datasource connection testing
- [x] PostgreSQL, ClickHouse plugins
- [x] RESTful API
- [x] DDD-based frontend architecture
- [x] shadcn/ui based UI components

### 🚧 Planned
- [ ] Schema exploration
- [ ] Query execution and result display
- [ ] LLM integration via MCP
- [ ] AI-powered data analysis
- [ ] Dashboard creation and management
- [ ] Data visualization
- [ ] User authentication and authorization

## 🔧 Tech Stack

### Backend
- Go 1.21+
- Chi (HTTP Router)
- Viper (Configuration)
- Database drivers (pgx, clickhouse-go, etc.)

### Frontend
- Next.js 16 (App Router)
- Turbopack
- TypeScript
- Refine.dev (Data Management)
- shadcn/ui (UI Components)
- Tailwind CSS
- React Hook Form + Zod
- Jest (Testing)

## 📖 Documentation

- [Frontend Architecture](./core/frontend/ARCHITECTURE.md)
- [Datasource Feature](./core/frontend/src/features/datasource/README.md)

## 🧪 Testing

### Backend Tests
```bash
cd core
go test ./...
```

### Frontend Tests
```bash
cd core/frontend
pnpm test
```

## 🤝 Contributing

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

MIT License

## �� Contact

Project Link: [https://github.com/loykin/data-voyager](https://github.com/loykin/data-voyager)
