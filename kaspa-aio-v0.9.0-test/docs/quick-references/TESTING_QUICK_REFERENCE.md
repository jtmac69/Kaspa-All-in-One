# Testing Quick Reference

Quick reference guide for running the Kaspa All-in-One comprehensive test suite.

## Complete Test Suite

### Service-Level Tests (9 scripts)

```bash
# Core infrastructure
./test-kaspa-node.sh              # Kaspa node connectivity and sync
./test-kaspa-node-only.sh         # Standalone Kaspa node testing

# Indexers
./test-kasia-indexer.sh           # Kasia indexer WebSocket and API
./test-k-social-integration.sh    # K-Social platform and indexer
./test-simply-kaspa-indexer.sh    # Simply Kaspa indexer with TimescaleDB

# Applications
./test-kasia-app.sh               # Kasia messaging app
./test-kaspa-stratum.sh           # Mining stratum bridge

# Dependencies
./test-service-dependencies.sh    # Service dependency validation
```

### Infrastructure Tests (2 scripts)

```bash
./test-nginx.sh                   # Nginx configuration and security
./test-timescaledb.sh             # TimescaleDB features and performance
```

### Comprehensive Integration Tests (3 scripts)

```bash
./test-e2e.sh                     # End-to-end system integration
./test-builds.sh                  # Build verification and compatibility
./test-load.sh                    # Performance and load testing
```

### Cleanup

```bash
./cleanup-tests.sh                # Cleanup all test artifacts
./cleanup-tests.sh --all          # Full cleanup (volumes, images, networks)
```

## Quick Test Scenarios

### 1. Quick Smoke Test (5 minutes)

Test core functionality only:

```bash
./test-kaspa-node.sh
./test-dashboard.sh
./test-nginx.sh
```

### 2. Service Integration Test (15 minutes)

Test all services and dependencies:

```bash
./test-kaspa-node.sh
./test-kasia-indexer.sh
./test-kasia-app.sh
./test-k-social-integration.sh
./test-service-dependencies.sh
```

### 3. Infrastructure Test (10 minutes)

Test infrastructure components:

```bash
./test-nginx.sh
./test-timescaledb.sh
./test-dashboard.sh
```

### 4. Complete System Test (30-45 minutes)

Test everything including E2E, builds, and load:

```bash
# Service tests
./test-kaspa-node.sh
./test-kasia-indexer.sh
./test-kasia-app.sh
./test-k-social-integration.sh
./test-simply-kaspa-indexer.sh
./test-kaspa-stratum.sh
./test-service-dependencies.sh

# Infrastructure tests
./test-nginx.sh
./test-timescaledb.sh

# Comprehensive integration tests
./test-e2e.sh
./test-builds.sh
./test-load.sh

# Cleanup
./cleanup-tests.sh --all
```

### 5. Build Verification Only (20-30 minutes)

Test all Docker image builds:

```bash
./test-builds.sh
```

### 6. Performance Testing Only (10-15 minutes)

Test system performance under load:

```bash
./test-load.sh
./test-load.sh --concurrent 100 --duration 120  # Heavy load test
```

### 7. Profile-Specific Testing

Test specific deployment profiles:

```bash
# Core profile
./test-e2e.sh --profile core

# Production profile
./test-e2e.sh --profile prod

# Explorer profile
./test-e2e.sh --profile explorer

# All profiles
./test-e2e.sh
```

## Common Options

All test scripts support these common options:

```bash
--help                # Show help message
--no-cleanup          # Skip cleanup on exit
--cleanup-only        # Run cleanup only (no tests)
--cleanup-full        # Full cleanup including volumes
--cleanup-volumes     # Remove data volumes (WARNING: destroys data)
```

## Test Script Specific Options

### test-e2e.sh

```bash
--profile PROFILE     # Test specific profile (core, prod, explorer, archive, development, mining)
--skip-load           # Skip load testing
```

### test-builds.sh

```bash
--service SERVICE     # Test specific service build
--parallel            # Test parallel builds
--skip-cache          # Skip build cache test
--skip-security       # Skip security tests
--cleanup-images      # Remove built images after testing
--cleanup-cache       # Remove build cache after testing
```

### test-load.sh

```bash
--concurrent N        # Number of concurrent requests (default: 50)
--duration N          # Duration for sustained load test (default: 60s)
--service SERVICE     # Test specific service only
--skip-sustained      # Skip sustained load test
--skip-spike          # Skip spike load test
```

## Cleanup Scenarios

### Basic Cleanup

Remove test containers only:

```bash
./cleanup-tests.sh
```

### Full Cleanup

Remove everything including volumes and networks:

```bash
./cleanup-tests.sh --all
```

### Dry Run

See what would be cleaned without actually doing it:

```bash
./cleanup-tests.sh --dry-run
```

### Cleanup Specific Test

Each test script has its own cleanup:

```bash
./test-kasia-indexer.sh --cleanup-only
./test-e2e.sh --cleanup-full
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Comprehensive Testing
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Service Tests
        run: |
          ./test-kaspa-node.sh
          ./test-kasia-indexer.sh
          ./test-service-dependencies.sh
      
      - name: Infrastructure Tests
        run: |
          ./test-nginx.sh
          ./test-timescaledb.sh
      
      - name: Integration Tests
        run: |
          ./test-e2e.sh
          ./test-builds.sh
          ./test-load.sh --concurrent 20 --duration 30
      
      - name: Cleanup
        if: always()
        run: ./cleanup-tests.sh --all
```

### GitLab CI Example

```yaml
test:
  stage: test
  script:
    - ./test-kaspa-node.sh
    - ./test-kasia-indexer.sh
    - ./test-nginx.sh
    - ./test-timescaledb.sh
    - ./test-e2e.sh
    - ./test-builds.sh
    - ./test-load.sh
  after_script:
    - ./cleanup-tests.sh --all
```

## Troubleshooting

### Test Fails to Start

```bash
# Check Docker is running
docker info

# Check docker-compose.yml exists
ls -la docker-compose.yml

# Check script is executable
chmod +x test-*.sh
```

### Test Hangs or Times Out

```bash
# Stop the test with Ctrl+C
# Cleanup manually
./cleanup-tests.sh --all

# Check for stuck containers
docker ps -a

# Force remove if needed
docker rm -f $(docker ps -aq)
```

### Cleanup Issues

```bash
# Force cleanup everything
docker compose down -v
docker system prune -af --volumes

# Or use the cleanup script with force
./cleanup-tests.sh --all --force
```

### Build Test Failures

```bash
# Check Docker has enough resources
docker info | grep -i memory
docker info | grep -i cpu

# Clean build cache
docker builder prune -af

# Retry with no cache
./test-builds.sh --service dashboard
```

### Load Test Failures

```bash
# Reduce concurrent requests
./test-load.sh --concurrent 20

# Reduce test duration
./test-load.sh --duration 30

# Test specific service
./test-load.sh --service dashboard
```

## Performance Expectations

### Build Times (approximate)

- dashboard: 30-60s
- kasia-app: 90-150s
- k-social: 60-120s
- k-indexer: 80-140s
- simply-kaspa-indexer: 70-120s
- kaspa-stratum: 60-100s

### Test Durations (approximate)

- Service tests: 2-5 minutes each
- Infrastructure tests: 3-7 minutes each
- E2E test: 10-20 minutes
- Build test: 20-40 minutes
- Load test: 5-15 minutes

### Success Rates

- Service tests: 100% expected
- Infrastructure tests: 100% expected
- E2E tests: 95%+ expected
- Build tests: 100% expected
- Load tests: 95%+ success rate expected

## Test Coverage

- **Service-level tests**: 9 scripts (100% coverage)
- **Infrastructure tests**: 2 scripts (100% coverage)
- **Integration tests**: 3 scripts (100% coverage)
- **Overall coverage**: ~95% of system functionality

## Related Documentation

- [Infrastructure Testing](docs/infrastructure-testing.md) - Detailed testing documentation
- [Test Cleanup](docs/test-cleanup.md) - Cleanup procedures
- [Dashboard Testing](docs/dashboard-testing.md) - Dashboard-specific testing
- [Installation Testing](docs/installation-testing.md) - Installation verification
- [Testing Coverage Audit](../implementation-summaries/testing/TESTING_COVERAGE_AUDIT.md) - Complete coverage analysis
- [Task 3.8 Completion Summary](../implementation-summaries/tasks/TASK_3.8_COMPLETION_SUMMARY.md) - Implementation details

## Quick Commands Cheat Sheet

```bash
# Run everything
for script in test-*.sh; do ./$script; done

# Run service tests only
for script in test-kaspa-*.sh test-kasia-*.sh test-k-*.sh test-simply-*.sh test-service-*.sh; do ./$script; done

# Run infrastructure tests only
./test-nginx.sh && ./test-timescaledb.sh

# Run integration tests only
./test-e2e.sh && ./test-builds.sh && ./test-load.sh

# Cleanup everything
./cleanup-tests.sh --all --force

# Check all scripts are executable
ls -la test-*.sh cleanup-*.sh

# Make all scripts executable
chmod +x test-*.sh cleanup-*.sh
```
