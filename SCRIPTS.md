# Development Scripts Reference

Quick reference for all available development scripts and commands.

## Development Server Management

### npm scripts
```bash
npm run dev              # Start both servers [background]
npm run dev:front        # Start frontend only [port 3000]
npm run dev:back         # Start backend only [port 8080]
npm run dev:full         # Start both servers [background]
npm run dev:stop         # Stop all servers
npm run dev:status       # Show server status
```

### Direct shell scripts
```bash
./scripts/start-dev.sh start front    # Frontend only [port 3000]
./scripts/start-dev.sh start back     # Backend only [port 8080] 
./scripts/start-dev.sh start full     # Both servers [background]
./scripts/start-dev.sh stop front     # Stop frontend
./scripts/start-dev.sh stop back      # Stop backend
./scripts/start-dev.sh stop full      # Stop both
./scripts/start-dev.sh status         # Server status
```

## Testing Commands

### Unit Tests (Vitest)
```bash
npm test                 # Run tests [watch mode]
npm run test:watch       # Run tests [watch mode]
npm run test:run         # Run tests [single run]
npm run test:coverage    # Run tests [with coverage]
```

### UI Tests (Playwright)
```bash
npm run test:ui                    # All UI tests [Docker browsers]
npm run test:ui:interactive        # Interactive mode [Docker browsers]
npm run test:playwright            # Direct Playwright runner
./scripts/test-playwright.sh       # All projects
./scripts/test-playwright.sh --project "Desktop Chrome"  # Specific browser
./scripts/test-playwright.sh --debug  # Debug mode
```

#### Docker Headless Browser Setup
Playwright tests use containerized browsers to avoid polluting the host system:

**Architecture:**
- Docker container runs Playwright server on `ws://127.0.0.1:9222/`
- Tests connect via WebSocket endpoint (`PW_TEST_CONNECT_WS_ENDPOINT`)
- Browsers (Chrome, Firefox, Safari) run inside isolated containers
- Host network mode allows access to dev server on `localhost:3000`

**Container Management:**
```bash
# Auto-managed by test-playwright.sh
docker compose -f docker/playwright/docker-compose.yml up -d    # Start browser server
docker logs bomberman-playwright-server                        # View server logs
docker ps | grep bomberman-playwright-server                   # Check status
```

**Benefits:**
- No local browser installation required
- Consistent test environment across machines
- System isolation prevents browser conflicts
- Pre-configured with all necessary browser versions

### Integration Tests
```bash
npm run test:integration           # All integration tests
npm run test:integration:gamer     # Player use cases [UC-G001-G010]
npm run test:integration:admin     # Admin use cases [UC-A001-A005]
npm run test:integration:system    # System integration [WebSocket/Redis]

./scripts/test-integration.sh all     # All tests
./scripts/test-integration.sh gamer   # Player scenarios
./scripts/test-integration.sh admin   # Admin scenarios
./scripts/test-integration.sh system  # System tests
./scripts/test-integration.sh gamer --headed  # Visual debugging
```

## Build & Quality Assurance

### Building
```bash
npm run build            # Build both [production]
npm run build:server     # Build server only [TypeScript]
npm run build:client     # Build client only [Vite]
```

### Code Quality
```bash
npm run typecheck        # TypeScript validation
npm run lint             # ESLint check
npm run lint:fix         # ESLint auto-fix
```

### Debugging
```bash
npm run inspect:frontend # Frontend UI inspector [screenshots]
node scripts/inspect-frontend.js  # Direct inspection
```

## Docker Operations

### Development
```bash
npm run docker:up        # Start services [PostgreSQL, Redis]
npm run docker:down      # Stop services
npm run docker:logs      # View service logs
```

### Production
```bash
npm run docker:build     # Build app image
npm run docker:prod      # Start production stack
```

## Database Operations

```bash
npm run db:migrate       # Run database migrations
npm run db:seed          # Seed database [test data]
```

## Script Parameters Quick Reference

### start-dev.sh
- **Actions**: `start`, `stop`, `status`, `help`
- **Modes**: `front` [port 3000], `back` [port 8080], `full` [both]

### test-playwright.sh
- **Projects**: `"Desktop Chrome"`, `"Desktop Firefox"`, `"Mobile Chrome"`, `"Mobile Safari"`, `all`
- **Options**: `--headed`, `--debug`, `--max-failures N`, `--reporter html|json`

### test-integration.sh
- **Categories**: `gamer`, `admin`, `system`, `all`
- **Options**: `--headed`, `--debug`, `--project NAME`, `--reporter TYPE`

### test-ui.sh
- **Modes**: default [headless], `--interactive` [keep running]

## Log Files & Debugging

```bash
# Server logs (when using start-dev.sh)
tail -f front.log        # Frontend logs
tail -f back.log         # Backend logs

# Test results
./test-results/          # Playwright test artifacts
./playwright-report/     # HTML test reports
```

## Quick Start Workflows

### Full development
```bash
npm run docker:up        # Start databases
npm run dev              # Start both servers
npm run test:watch       # Start test watcher
```

### Frontend only
```bash
npm run dev:front        # Frontend development
npm run test:ui          # UI testing
```

### Backend only  
```bash
npm run docker:up        # Start databases
npm run dev:back         # Backend development
npm run test:run         # Unit tests
```

### Full testing
```bash
npm run dev:full         # Start servers
npm run test:integration # Integration tests
npm run test:coverage    # Coverage report
```

## Status Monitoring

```bash
npm run dev:status       # Quick server status
./scripts/start-dev.sh status  # Detailed status with Docker services
docker ps                # Docker containers
```