.PHONY: help install dev build clean test serve start stop

# Default target
.DEFAULT_GOAL := help

# Variables
BINARY_NAME=data-voyager
GO_FILES=$(shell find core -name '*.go' -type f)
FRONTEND_DIR=core/frontend
BUILD_DIR=build
DATA_DIR=data

# Colors for output
CYAN=\033[0;36m
GREEN=\033[0;32m
YELLOW=\033[0;33m
RED=\033[0;31m
NC=\033[0m # No Color

help: ## Show this help message
	@echo '$(CYAN)Data Voyager - Available commands:$(NC)'
	@echo ''
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ''

install: ## Install all dependencies (Go + pnpm)
	@echo '$(CYAN)Installing dependencies...$(NC)'
	@cd core && go mod download
	@cd shared && go mod download
	@pnpm install
	@echo '$(GREEN)✓ Dependencies installed$(NC)'

dev: ## Start development servers (frontend + backend)
	@echo '$(CYAN)Starting development servers...$(NC)'
	@echo '$(YELLOW)Frontend: http://localhost:3000/ui$(NC)'
	@echo '$(YELLOW)Backend:  http://localhost:8080$(NC)'
	@echo '$(YELLOW)API:      http://localhost:8080/api/v1$(NC)'
	@pnpm dev:all

dev-frontend: ## Start frontend dev server only
	@echo '$(CYAN)Starting frontend dev server...$(NC)'
	@pnpm dev

dev-backend: ## Start backend dev server only
	@echo '$(CYAN)Starting backend dev server...$(NC)'
	@mkdir -p $(DATA_DIR)
	@GO_ENV=development go run core/cmd/server/main.go serve

build: build-frontend build-backend ## Build both frontend and backend

build-frontend: ## Build frontend (static export)
	@echo '$(CYAN)Building frontend...$(NC)'
	@pnpm build:export
	@echo '$(GREEN)✓ Frontend built to core/frontend/out/$(NC)'

build-backend: ## Build backend binary
	@echo '$(CYAN)Building backend...$(NC)'
	@mkdir -p $(DATA_DIR)
	@cd core && go build -ldflags="-s -w" -o ../$(BINARY_NAME) ./cmd/server
	@echo '$(GREEN)✓ Backend built to ./$(BINARY_NAME)$(NC)'

build-all: clean build ## Clean and build everything
	@echo '$(GREEN)✓ Build complete!$(NC)'
	@echo '$(YELLOW)Run "make start" to start the server$(NC)'

start: ## Start production server (requires build)
	@if [ ! -f $(BINARY_NAME) ]; then \
		echo '$(RED)Binary not found. Run "make build" first.$(NC)'; \
		exit 1; \
	fi
	@echo '$(CYAN)Starting Data Voyager server...$(NC)'
	@echo '$(YELLOW)Server: http://localhost:8080/ui$(NC)'
	@echo '$(YELLOW)API:    http://localhost:8080/api/v1$(NC)'
	@mkdir -p $(DATA_DIR)
	@./$(BINARY_NAME) serve

serve: start ## Alias for start

stop: ## Stop all running dev servers
	@echo '$(CYAN)Stopping all servers...$(NC)'
	@pkill -f "next dev" || true
	@pkill -f "go run.*serve" || true
	@pkill -f "$(BINARY_NAME)" || true
	@echo '$(GREEN)✓ Servers stopped$(NC)'

clean: ## Clean build artifacts
	@echo '$(CYAN)Cleaning build artifacts...$(NC)'
	@rm -f $(BINARY_NAME)
	@rm -f core/server
	@rm -rf $(FRONTEND_DIR)/out
	@rm -rf $(FRONTEND_DIR)/.next
	@rm -rf $(BUILD_DIR)
	@echo '$(GREEN)✓ Clean complete$(NC)'

clean-all: clean ## Clean everything including dependencies
	@echo '$(CYAN)Cleaning all (including dependencies)...$(NC)'
	@rm -rf node_modules
	@rm -rf $(FRONTEND_DIR)/node_modules
	@rm -rf core/vendor
	@rm -rf shared/vendor
	@rm -f go.work.sum
	@echo '$(GREEN)✓ Deep clean complete$(NC)'

test: test-backend test-frontend ## Run all tests

test-backend: ## Run Go tests
	@echo '$(CYAN)Running backend tests...$(NC)'
	@cd core && go test -v ./...
	@echo '$(GREEN)✓ Backend tests passed$(NC)'

test-frontend: ## Run frontend tests
	@echo '$(CYAN)Running frontend tests...$(NC)'
	@cd $(FRONTEND_DIR) && pnpm test
	@echo '$(GREEN)✓ Frontend tests passed$(NC)'

lint: ## Run linters
	@echo '$(CYAN)Running linters...$(NC)'
	@cd core && go fmt ./...
	@cd $(FRONTEND_DIR) && pnpm lint
	@echo '$(GREEN)✓ Linting complete$(NC)'

db-reset: ## Reset database (delete and recreate)
	@echo '$(CYAN)Resetting database...$(NC)'
	@rm -f $(DATA_DIR)/*.db
	@mkdir -p $(DATA_DIR)
	@echo '$(GREEN)✓ Database reset$(NC)'

docker-build: ## Build Docker image
	@echo '$(CYAN)Building Docker image...$(NC)'
	@docker build -t data-voyager:latest .
	@echo '$(GREEN)✓ Docker image built$(NC)'

docker-run: ## Run Docker container
	@echo '$(CYAN)Running Docker container...$(NC)'
	@docker run -p 8080:8080 -v $(PWD)/data:/app/data data-voyager:latest

version: ## Show version information
	@if [ -f $(BINARY_NAME) ]; then \
		./$(BINARY_NAME) version; \
	else \
		echo '$(YELLOW)Binary not found. Run "make build" first.$(NC)'; \
	fi

info: ## Show project information
	@echo '$(CYAN)Data Voyager - Project Information$(NC)'
	@echo ''
	@echo '  $(GREEN)Project:$(NC)     data-voyager'
	@echo '  $(GREEN)Language:$(NC)    Go + TypeScript'
	@echo '  $(GREEN)Frontend:$(NC)    Next.js 15 + Refine.dev'
	@echo '  $(GREEN)Backend:$(NC)     Go + Gin'
	@echo '  $(GREEN)Structure:$(NC)   Monorepo (pnpm + Go workspaces)'
	@echo ''
	@echo '  $(GREEN)Go version:$(NC)'
	@go version
	@echo '  $(GREEN)Node version:$(NC)'
	@node --version
	@echo '  $(GREEN)pnpm version:$(NC)'
	@pnpm --version
	@echo ''

# Quick start workflow
quickstart: install build start ## Install, build, and start everything

# CI/CD targets
ci: install lint test build ## Run CI pipeline

# Development workflow
watch: ## Watch and rebuild on changes (requires entr)
	@echo '$(CYAN)Watching for changes...$(NC)'
	@find core -name '*.go' | entr -r make build-backend
