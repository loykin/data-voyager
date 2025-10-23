# Data Voyager

A platform for connecting and exploring datasources with AI-powered analysis and dashboard creation using MCP (Model Context Protocol).

## 🎯 Overview

Data Voyager is a platform that integrates and manages various datasources (PostgreSQL, ClickHouse, OpenSearch, etc.) and provides AI-powered data analysis and visualization.

## 🏗️ Architecture

### Backend (Go)
- **Framework**: Go with Chi router
- **Database Support**: PostgreSQL, ClickHouse, SQLite, OpenSearch
- **API**: RESTful API
- **Plugin System**: Plugin architecture for each datasource

### Frontend (Next.js)
- **Framework**: Next.js 16 (App Router, Turbopack)
- **Data Management**: Refine.dev
- **UI Library**: shadcn/ui + Radix UI
- **Styling**: Tailwind CSS
- **Architecture**: DDD (Domain-Driven Design)

## 📁 Project Structure

```
explorer/
├── core/                           # Core modules
│   ├── frontend/                  # Next.js frontend
│   │   └── src/
│   │       ├── features/          # DDD Feature modules
│   │       │   └── datasource/   # Datasource feature
│   │       ├── app/              # Next.js App Router
│   │       └── components/       # Shared UI components
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
├── data/                          # Data directory
├── config.toml                    # Configuration file
└── go.work                        # Go workspace
```

## 🚀 Getting Started

### Prerequisites
- Go 1.21+
- Node.js 18+
- pnpm 8+
- PostgreSQL (optional)
- ClickHouse (optional)

### Backend Setup

```bash
# Install dependencies
cd core
go mod download

# Run development server
go run cmd/server/main.go serve

# Or build and run
go build -o bin/explorer cmd/server/main.go
./bin/explorer serve
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
