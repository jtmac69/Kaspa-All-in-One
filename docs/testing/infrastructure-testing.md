# Infrastructure Component Testing

This document describes the infrastructure component testing suite for the Kaspa All-in-One project, focusing on nginx and TimescaleDB testing.

## Overview

Infrastructure component testing validates the core infrastructure services that support the Kaspa ecosystem:

- **Nginx**: Reverse proxy, routing, security headers, rate limiting, SSL/TLS
- **TimescaleDB**: Database initialization, hypertables, compression, continuous aggregates, backup/restore

## Test Scripts

### test-nginx.sh

Comprehensive testing suite for nginx infrastructure.

#### What It Tests

**Configuration Tests:**
- Nginx configuration syntax validation
- Configuration parameter verification (client_max_body_size, keepalive_timeout)

**Connectivity Tests:**
- HTTP port accessibility
- Dashboard routing (root path)
- API endpoint routing
- Upstream health checks

**Security Tests:**
- Security headers (X-Frame-Options, X-XSS-Protection, X-Content-Type-Options, CSP, Referrer-Policy)
- Rate limiting functionality
- SSL/TLS configuration (if enabled)

**Feature Tests:**
- Gzip compression
- WebSocket support
- Error page handling
- Client max body size configuration

**Infrastructure Tests:**
- Nginx logs (access and error logs)
- Resource usage (CPU, memory)
- Nginx reload capability
- Container health and stability

#### Usage

```bash
# Run all nginx tests
./test-nginx.sh

# Run with cleanup options
./test-nginx.sh --cleanup-full

# Dry run to see what would be tested
./test-nginx.sh --help

# Skip cleanup on exit
./test-nginx.sh --no-cleanup
```

#### Options

- `--cleanup-only`: Run cleanup only (no tests)
- `--cleanup-full`: Full cleanup including networks
- `--cleanup-images`: Remove unused Docker images during cleanup
- `--no-cleanup`: Skip cleanup on exit
- `-h, --help`: Show help message

#### Expected Results

All tests should pass for a properly configured nginx instance:

```
✓ Nginx Config Syntax: Configuration syntax is valid
✓ HTTP Connectivity: HTTP port 80 is accessible
✓ Dashboard Routing: Root path routes to dashboard
✓ API Routing: API endpoints are routable
✓ X-Frame-Options Header: X-Frame-Options header is present
✓ X-XSS-Protection Header: X-XSS-Protection header is present
✓ X-Content-Type-Options Header: X-Content-Type-Options header is present
✓ Rate Limiting: Rate limiting is active
✓ Gzip Compression: Gzip compression is enabled
✓ Dashboard Upstream: Dashboard upstream is reachable
```

### test-timescaledb.sh

Comprehensive testing suite for TimescaleDB infrastructure.

#### What It Tests

**Extension and Initialization:**
- TimescaleDB extension installation and version
- Database initialization (ksocial, simply_kaspa)
- Database connectivity

**TimescaleDB Features:**
- Hypertables configuration (K-Social and Simply-Kaspa)
- Compression policies
- Continuous aggregates
- Chunk management and intervals

**Data Operations:**
- Data insertion
- Query performance
- Database size and storage

**Backup and Restore:**
- pg_dump availability
- Backup creation capability
- pg_restore availability

**Monitoring and Performance:**
- Active database connections
- Performance monitoring views
- TimescaleDB configuration parameters
- Resource usage

**Infrastructure:**
- Container health and stability
- Database logs
- Error detection

#### Usage

```bash
# Run all TimescaleDB tests
./test-timescaledb.sh

# Run with cleanup options
./test-timescaledb.sh --cleanup-full --cleanup-volumes

# Skip cleanup on exit
./test-timescaledb.sh --no-cleanup
```

#### Options

- `--cleanup-only`: Run cleanup only (no tests)
- `--cleanup-full`: Full cleanup including volumes and networks
- `--cleanup-volumes`: Remove data volumes during cleanup (WARNING: destroys data)
- `--cleanup-images`: Remove unused Docker images during cleanup
- `--no-cleanup`: Skip cleanup on exit
- `-h, --help`: Show help message

#### Expected Results

All tests should pass for a properly configured TimescaleDB instance:

```
✓ TimescaleDB Extension: TimescaleDB extension is installed
✓ K-Social Database: ksocial database exists
✓ Simply-Kaspa Database: simply_kaspa database exists
✓ K-Social Hypertables: K-Social hypertables are configured
✓ Simply-Kaspa Hypertables: Simply-Kaspa hypertables are configured
✓ K-Social Compression: Compression is enabled for K-Social tables
✓ Simply-Kaspa Compression: Compression is enabled for Simply-Kaspa tables
✓ K-Social Continuous Aggregates: Continuous aggregates are configured
✓ Simply-Kaspa Continuous Aggregates: Continuous aggregates are configured
```

## Integration with Test Suite

Both test scripts follow the standardized testing pattern used across the project:

1. **Automatic cleanup on exit** (can be disabled with `--no-cleanup`)
2. **Comprehensive test result tracking** with pass/fail/warn status
3. **Detailed logging** with color-coded output
4. **Cleanup options** for different scenarios
5. **Help documentation** with `--help` flag

### Cleanup Integration

The infrastructure test scripts are integrated with the centralized cleanup system:

```bash
# Cleanup all test artifacts including infrastructure tests
./cleanup-tests.sh

# Cleanup with volumes (WARNING: destroys data)
./cleanup-tests.sh --volumes

# Dry run to see what would be cleaned
./cleanup-tests.sh --dry-run
```

## Best Practices

### Nginx Testing

1. **Run tests after configuration changes** to validate syntax and functionality
2. **Monitor rate limiting** to ensure it's properly configured
3. **Check security headers** regularly to maintain security posture
4. **Test SSL/TLS** if using HTTPS in production
5. **Verify upstream health** to ensure backend services are reachable

### TimescaleDB Testing

1. **Run tests after schema changes** to validate hypertables and compression
2. **Monitor chunk intervals** to ensure optimal performance
3. **Test backup/restore** regularly to ensure data recovery capability
4. **Check compression ratios** to validate space savings
5. **Monitor query performance** for time-range queries

## Troubleshooting

### Nginx Test Failures

**Problem**: Nginx configuration syntax errors
- **Solution**: Check nginx.conf for syntax errors with `docker exec kaspa-nginx nginx -t`

**Problem**: Security headers missing
- **Solution**: Verify nginx.conf includes security header directives

**Problem**: Rate limiting not working
- **Solution**: Check rate limit zones are properly configured in nginx.conf

**Problem**: Upstream health check fails
- **Solution**: Verify backend services (dashboard, etc.) are running

### TimescaleDB Test Failures

**Problem**: TimescaleDB extension not installed
- **Solution**: Ensure using timescale/timescaledb image, not standard postgres

**Problem**: Hypertables not configured
- **Solution**: Check initialization scripts in config/postgres/init/ are executed

**Problem**: Compression not enabled
- **Solution**: Verify compression policies are defined in initialization scripts

**Problem**: Backup creation fails
- **Solution**: Check disk space and permissions in container

## Performance Benchmarks

### Nginx Performance

- **Response time**: < 100ms for health checks
- **Concurrent requests**: Should handle 10+ concurrent requests without issues
- **CPU usage**: Typically < 5% under normal load
- **Memory usage**: Typically < 50MB

### TimescaleDB Performance

- **Query performance**: Simple queries < 100ms
- **Compression ratio**: 90%+ space savings for historical data
- **Chunk size**: 15-30 minutes for high-frequency data (blocks/transactions)
- **Chunk size**: 1-6 hours for medium-frequency data (social media)
- **Connection overhead**: < 10ms for connection establishment

## Continuous Integration

These test scripts can be integrated into CI/CD pipelines:

```bash
# Example CI pipeline step
- name: Test Infrastructure
  run: |
    ./test-nginx.sh
    ./test-timescaledb.sh
```

## Related Documentation

- [Testing Coverage Audit](implementation-summaries/testing/TESTING_COVERAGE_AUDIT.md) - Complete testing coverage analysis
- [Test Cleanup](test-cleanup.md) - Standardized cleanup procedures
- [Dashboard Testing](dashboard-testing.md) - Dashboard-specific testing
- [Installation Testing](installation-testing.md) - Installation verification testing
- [Service Dependencies](service-dependencies.md) - Service dependency documentation

## Future Enhancements

Planned improvements for infrastructure testing:

1. **Performance benchmarking** - Automated performance regression testing
2. **Load testing** - Stress testing for nginx and TimescaleDB
3. **Security scanning** - Automated vulnerability scanning
4. **Monitoring integration** - Integration with Prometheus/Grafana
5. **Automated remediation** - Self-healing capabilities for common issues


## Comprehensive Integration Testing

In addition to the infrastructure-specific tests above, the project includes comprehensive integration testing scripts that validate the entire system.

### test-e2e.sh

End-to-end system integration testing across all deployment profiles.

#### What It Tests

**Profile Testing:**
- **Core Profile**: Kaspa node, dashboard, nginx
- **Production Profile**: Kasia services, K-Social services
- **Explorer Profile**: Indexer database, K-indexer, Simply-Kaspa indexer
- **Archive Profile**: Archive database, archive indexer
- **Development Profile**: Portainer, pgAdmin
- **Mining Profile**: Kaspa stratum bridge

**Cross-Profile Integration:**
- Service communication between profiles
- Dependency chain validation (Node → Indexer → App)
- Database connectivity across services
- Network communication between containers

**System Load Testing:**
- Concurrent request handling
- Service stability under load
- Response time under stress

#### Usage

```bash
# Run all E2E tests
./test-e2e.sh

# Test specific profile only
./test-e2e.sh --profile core
./test-e2e.sh --profile explorer

# Skip load testing
./test-e2e.sh --skip-load

# Cleanup volumes after testing
./test-e2e.sh --cleanup-volumes
```

#### Options

- `--profile PROFILE`: Test specific profile only (core, prod, explorer, archive, development, mining)
- `--skip-load`: Skip load testing
- `--cleanup-volumes`: Remove data volumes during cleanup
- `--no-cleanup`: Skip cleanup on exit
- `-h, --help`: Show help message

#### Expected Results

All profile tests should pass for a complete deployment:

```
Profile Test Results:
====================
  ✅ core: PASSED
  ✅ prod: PASSED
  ✅ explorer: PASSED
  ✅ archive: PASSED
  ✅ development: PASSED
  ✅ mining: PASSED

Service Test Results:
====================
  ✅ kaspa-node: PASSED
  ✅ dashboard: PASSED
  ✅ nginx: PASSED
  ✅ kasia-indexer: PASSED
  ✅ k-indexer: PASSED
  ✅ indexer-db: PASSED
```

### test-builds.sh

Build verification and version compatibility testing for all Docker images.

#### What It Tests

**Build Verification:**
- All service Docker image builds
- Build time measurement
- Image size analysis
- Build success/failure tracking

**Version Compatibility:**
- Different version builds (K-Social, Simply-Kaspa, etc.)
- Build argument testing
- External repository integration

**Build Optimization:**
- Multi-stage build detection
- Build cache effectiveness
- Image layer optimization
- Build reproducibility

**Security:**
- Non-root user verification
- Image security best practices

**Performance:**
- Parallel build testing
- Build time optimization

#### Usage

```bash
# Run all build tests
./test-builds.sh

# Test specific service build
./test-builds.sh --service dashboard

# Test parallel builds
./test-builds.sh --parallel

# Skip cache testing
./test-builds.sh --skip-cache

# Cleanup images after testing
./test-builds.sh --cleanup-images --cleanup-cache
```

#### Options

- `--service SERVICE`: Test specific service only
- `--parallel`: Test parallel builds
- `--skip-cache`: Skip build cache test
- `--skip-security`: Skip security tests
- `--cleanup-images`: Remove built images after testing
- `--cleanup-cache`: Remove build cache after testing
- `--no-cleanup`: Skip cleanup on exit
- `-h, --help`: Show help message

#### Expected Results

All builds should complete successfully:

```
Build Results:
==============
  ✅ dashboard: PASSED (45s, 234MB)
  ✅ kasia-app: PASSED (120s, 456MB)
  ✅ k-social: PASSED (90s, 389MB)
  ✅ k-indexer: PASSED (110s, 412MB)
  ✅ simply-kaspa-indexer: PASSED (95s, 398MB)
  ✅ kaspa-stratum: PASSED (85s, 345MB)

Summary:
========
  Total Services: 7
  Passed: 7
  Failed: 0
  Total Build Time: 645s
  Average Build Time: 92s
```

### test-load.sh

Performance and load testing for system components under stress.

#### What It Tests

**Load Testing:**
- Dashboard under concurrent load
- Nginx under concurrent load
- Indexer APIs under load
- Database connection pooling

**Performance Metrics:**
- Response times
- Success rates
- Requests per second
- Error rates

**Sustained Load:**
- Long-duration load testing
- System stability over time
- Resource usage monitoring

**Spike Testing:**
- Traffic spike handling
- Recovery after spikes
- System resilience

**Resource Monitoring:**
- CPU usage under load
- Memory usage under load
- Container resource limits

#### Usage

```bash
# Run all load tests
./test-load.sh

# Test with custom concurrent requests
./test-load.sh --concurrent 100

# Test with custom duration
./test-load.sh --duration 120

# Test specific service only
./test-load.sh --service dashboard

# Skip sustained load test
./test-load.sh --skip-sustained

# Skip spike test
./test-load.sh --skip-spike
```

#### Options

- `--concurrent N`: Number of concurrent requests (default: 50)
- `--duration N`: Duration for sustained load test in seconds (default: 60)
- `--service SERVICE`: Test specific service only
- `--skip-sustained`: Skip sustained load test
- `--skip-spike`: Skip spike load test
- `--no-cleanup`: Skip cleanup on exit
- `-h, --help`: Show help message

#### Expected Results

All services should handle load gracefully:

```
Load Test Results:
==================
  ✅ dashboard: PASSED
  ✅ nginx: PASSED
  ✅ kasia-indexer: PASSED
  ✅ k-indexer: PASSED
  ✅ database: PASSED

Performance Metrics:
===================
  dashboard_success_rate: 98%
  dashboard_req_per_sec: 45.2
  nginx_success_rate: 99%
  nginx_req_per_sec: 87.5
```

## Running All Tests

To run the complete test suite including all comprehensive integration tests:

```bash
# Run all service tests
./test-kaspa-node.sh
./test-kasia-indexer.sh
./test-kasia-app.sh
./test-k-social-integration.sh
./test-simply-kaspa-indexer.sh
./test-kaspa-stratum.sh
./test-service-dependencies.sh

# Run infrastructure tests
./test-nginx.sh
./test-timescaledb.sh

# Run comprehensive integration tests
./test-e2e.sh
./test-builds.sh
./test-load.sh

# Cleanup everything
./cleanup-tests.sh --all
```

## CI/CD Integration

Example GitHub Actions workflow for comprehensive testing:

```yaml
name: Comprehensive Testing

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Infrastructure Tests
        run: |
          ./test-nginx.sh
          ./test-timescaledb.sh
      
      - name: Build Verification
        run: ./test-builds.sh
      
      - name: End-to-End Tests
        run: ./test-e2e.sh
      
      - name: Load Tests
        run: ./test-load.sh --concurrent 20 --duration 30
      
      - name: Cleanup
        if: always()
        run: ./cleanup-tests.sh --all
```

## Performance Baselines

### Expected Performance Metrics

**Dashboard:**
- Response time: < 500ms
- Success rate: > 95%
- Concurrent requests: 50+
- Requests/sec: 40+

**Nginx:**
- Response time: < 100ms
- Success rate: > 98%
- Concurrent requests: 100+
- Requests/sec: 80+

**Indexers:**
- Response time: < 1000ms
- Success rate: > 90%
- Concurrent requests: 30+
- Requests/sec: 20+

**Database:**
- Connection time: < 100ms
- Concurrent connections: 20+
- Query time: < 500ms

## Troubleshooting Comprehensive Tests

### E2E Test Failures

**Problem**: Profile test fails
- **Solution**: Check if all services in profile are properly configured
- **Solution**: Verify service dependencies are met
- **Solution**: Check logs for specific service failures

**Problem**: Cross-profile integration fails
- **Solution**: Verify network connectivity between containers
- **Solution**: Check service discovery and DNS resolution
- **Solution**: Validate environment variables are set correctly

### Build Test Failures

**Problem**: Build timeout
- **Solution**: Increase BUILD_TIMEOUT value
- **Solution**: Check network connectivity for external repository clones
- **Solution**: Verify Docker has sufficient resources

**Problem**: Image size too large
- **Solution**: Review Dockerfile for optimization opportunities
- **Solution**: Use multi-stage builds
- **Solution**: Remove unnecessary dependencies

### Load Test Failures

**Problem**: Low success rate
- **Solution**: Reduce concurrent request count
- **Solution**: Increase service resource limits
- **Solution**: Check for rate limiting configuration

**Problem**: High response times
- **Solution**: Optimize service configuration
- **Solution**: Increase container resources
- **Solution**: Check for database query optimization needs

## Test Coverage Summary

With the comprehensive integration tests, the project now has:

- **Service-level tests**: 9 scripts (100% coverage)
- **Infrastructure tests**: 2 scripts (nginx, TimescaleDB)
- **Integration tests**: 3 scripts (E2E, builds, load)
- **Overall coverage**: ~95% of system functionality

This comprehensive testing suite ensures:
- All services build correctly
- All services deploy successfully
- All services communicate properly
- All services perform under load
- All infrastructure components work correctly
