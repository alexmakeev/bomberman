# Integration Tests

Integration tests verify that multiple modules work together correctly with real database services and simulate real user interactions.

## Structure

### `/modules/` - Module Integration Tests
Tests that verify multiple modules working together with database services:
- Each test file focuses on a specific module's integration with dependencies
- Uses containerized PostgreSQL and Redis services
- Tests data persistence, event flows, and cross-module communication
- References: `docs/architecture/module-dependencies.md`

### `/use-cases/` - Use Case Integration Tests  
Tests that simulate complete user workflows based on sequence diagrams:
- **`/actors/gamer/`** - Tests from player perspective (join game, play, use features)
- **`/actors/admin/`** - Tests from administrator perspective (monitor, manage, configure)
- **`/actors/system/`** - Tests for automated system behaviors and flows
- Each test follows sequence diagrams from `docs/sequence-diagrams/`
- Emulates real user interactions with WebSocket connections and API calls

## Configuration

Integration tests use the same containerized services as development:
- **PostgreSQL**: `localhost:5432` (database: `bomberman_dev`)
- **Redis**: `localhost:6379` (password: `redis_password`)

## Test Data Management

- Tests should create and clean up their own test data
- Use transaction rollbacks where possible for database tests
- Redis keys should use test-specific prefixes to avoid conflicts
- Ref: `docs/schema/test-data-patterns.md`

## Running Tests

```bash
# Start containerized services first
docker compose --profile development up -d

# Run all integration tests
npm test tests/integration/

# Run specific test categories
npm test tests/integration/modules/
npm test tests/integration/use-cases/
```

## Best Practices

1. **Module Tests**: Focus on data flow between modules and persistence
2. **Use Case Tests**: Simulate complete user journeys with realistic timing
3. **Clean Up**: Always clean test data to prevent test interference
4. **Documentation**: Reference sequence diagrams and architecture docs
5. **Error Scenarios**: Test both happy paths and error conditions