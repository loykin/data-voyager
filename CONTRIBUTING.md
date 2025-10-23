# Contributing to Data Voyager

Thank you for your interest in contributing to Data Voyager! This document provides guidelines and instructions for contributing.

## Code of Conduct

Please be respectful and constructive in all interactions.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/data-voyager.git`
3. Add upstream remote: `git remote add upstream https://github.com/loykin/data-voyager.git`
4. Create a new branch: `git checkout -b feature/your-feature-name`

## Development Setup

### Prerequisites

- Go 1.21+
- Node.js 18+
- pnpm 8+
- pre-commit (recommended)

### Install Dependencies

#### Backend (Go)
```bash
cd core
go mod download
```

#### Frontend (Next.js)
```bash
cd core/frontend
pnpm install
```

#### Pre-commit Hooks
```bash
# Install pre-commit
brew install pre-commit  # macOS
# or
pip install pre-commit   # Python

# Install hooks
pre-commit install
```

## Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Build process or auxiliary tool changes
- `ci`: CI/CD changes
- `build`: Build system changes

### Examples

```bash
feat(datasource): add PostgreSQL connection pooling

Implement connection pooling for PostgreSQL datasources to improve
performance and resource management.

Closes #123
```

```bash
fix(frontend): resolve datasource list refresh issue

Fixed bug where datasource list wouldn't refresh after creating
a new datasource.
```

## Code Style

### Go

- Follow standard Go conventions
- Use `gofmt` for formatting
- Run `golangci-lint` before committing
- Write meaningful comments for exported functions

### TypeScript/JavaScript

- Use Prettier for formatting
- Follow ESLint rules
- Use meaningful variable and function names
- Write JSDoc comments for complex functions

## Testing

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

## Pull Request Process

1. **Update documentation** if you're changing functionality
2. **Add tests** for new features
3. **Ensure all tests pass** before submitting
4. **Run pre-commit hooks**: `pre-commit run --all-files`
5. **Create a Pull Request** with a clear title and description
6. **Link related issues** in the PR description
7. **Wait for review** - maintainers will review your PR

### PR Title Format

Follow the commit message format:

```
feat(scope): add amazing feature
fix(scope): resolve critical bug
```

## Project Structure

```
data-voyager/
├── core/
│   ├── frontend/          # Next.js frontend
│   │   └── src/
│   │       └── features/  # DDD feature modules
│   ├── cmd/              # CLI commands
│   ├── internal/         # Internal packages
│   └── pkg/             # Public packages
```

## Feature Development Guidelines

### Backend (Go)

1. Create plugin in `internal/datasource/plugins/`
2. Implement the `DataSourcePlugin` interface
3. Register plugin in the plugin registry
4. Add tests in `*_test.go`

### Frontend (Next.js)

1. Create feature module in `src/features/`
2. Follow DDD structure:
   - `api/` - API client
   - `types/` - Type definitions
   - `hooks/` - Custom hooks
   - `components/` - UI components
   - `providers/` - Data providers (if needed)
3. Export through `index.ts` barrel files
4. Add tests in `__tests__/`

## Questions?

Feel free to open an issue for questions or discussions.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
