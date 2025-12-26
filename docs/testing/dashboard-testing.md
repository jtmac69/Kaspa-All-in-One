# Dashboard Testing Guide

## Overview

The dashboard testing suite (`test-dashboard.sh`) provides comprehensive testing for the Kaspa All-in-One management dashboard, including API endpoints, UI functionality, service management, and performance validation.

## Quick Start

### Basic Testing (Recommended for New Installations)

If your Kaspa node is still syncing (which can take several hours), use:

```bash
./test-dashboard.sh --skip-sync-tests
```

This will test all dashboard functionality except features that require a fully synced node.

### Full Testing (For Synced Nodes)

Once your node is fully synced:

```bash
./test-dashboard.sh
```

### Wait for Sync (Limited)

To wait briefly for sync before testing:

```bash
./test-dashboard.sh --wait-for-sync --sync-wait-minutes 10
```

Note: Initial sync can take hours, so this is mainly useful for nodes that are almost synced.

## Test Categories

### 1. Core API Endpoints
- **Health Endpoint** (`/health`): Verifies dashboard is running
- **Service Status** (`/api/status`): Tests service monitoring
- **Kaspa Info** (`/api/kaspa/info`): Node information retrieval
- **Kaspa Stats** (`/api/kaspa/stats`): Network statistics

### 2. UI and Assets
- **Dashboard UI**: HTML page accessibility
- **JavaScript Assets**: Client-side code loading
- **CSS Assets**: Stylesheet availability
- **UI Elements**: Presence of key interface components

### 3. Functionality Tests
- **Error Handling**: 404 responses for invalid endpoints
- **CORS Headers**: Cross-origin resource sharing configuration
- **Response Times**: Performance benchmarking
- **Profile Awareness**: Service visibility based on active profiles
- **Concurrent Requests**: Load handling capability

### 4. Infrastructure Tests
- **Dashboard Logs**: Log accessibility and error detection
- **Resource Usage**: CPU and memory consumption
- **Container Health**: Container status and stability
- **Network Connectivity**: Inter-service communication

## Command Line Options

### Test Options
- `--skip-sync-tests`: Skip tests requiring a fully synced node
- `--wait-for-sync`: Wait for node to sync (with timeout)
- `--sync-wait-minutes N`: Maximum minutes to wait for sync (default: 5)

### Cleanup Options
- `--cleanup-only`: Run cleanup without tests
- `--cleanup-full`: Full cleanup including volumes and networks
- `--cleanup-volumes`: Remove data volumes during cleanup
- `--cleanup-images`: Remove unused Docker images
- `--no-cleanup`: Skip automatic cleanup on exit

### Help
- `-h, --help`: Show help message with all options

## Understanding Test Results

### Test Status Types

- **PASS** (Green ✓): Test completed successfully
- **FAIL** (Red ✗): Critical failure requiring attention
- **WARN** (Yellow ⚠): Non-critical issue or expected limitation
- **SKIP** (Blue): Test skipped (usually due to sync status)

### Common Scenarios

#### Node Still Syncing

```
[WARN] Node Sync Status: Node is syncing (use --wait-for-sync or --skip-sync-tests)
[SKIP] Kaspa Info Endpoint: Skipped (requires synced node)
[SKIP] Kaspa Stats Endpoint: Skipped (requires synced node)
```

**Solution**: Use `--skip-sync-tests` flag or wait for sync to complete.

#### Dashboard Not Responding

```
[FAIL] Health Endpoint: Health endpoint not accessible
[FAIL] Dashboard UI: Dashboard UI not accessible
```

**Solution**: Check if dashboard container is running:
```bash
docker ps | grep kaspa-dashboard
docker logs kaspa-dashboard
```

#### High Resource Usage

```
[WARN] CPU Usage: High CPU usage (45.2%)
```

**Solution**: This may be normal during initial sync. Monitor over time.

## Sync Status Information

### Initial Sync Timeline

- **New Node**: 2-6 hours (depends on network speed and hardware)
- **Partially Synced**: Minutes to hours
- **Fully Synced**: Immediate

### Checking Sync Status

Monitor sync progress:
```bash
docker logs kaspa-node --follow
```

Check current status:
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"method":"getInfo","params":{}}' \
  http://localhost:16111 | jq '.isSynced'
```

### Dashboard During Sync

The dashboard will function during sync but:
- Block height will be lower than network height
- Statistics may be incomplete
- Some features may show "syncing" status
- Real-time updates will work once synced

## Test Output Example

```
╔══════════════════════════════════════════════════════════════╗
║                      TEST RESULTS                            ║
╠══════════════════════════════════════════════════════════════╣
║ Total Tests:    25
║ Passed:         20
║ Failed:         0
║ Warnings:       3
║ Skipped:        2
╚══════════════════════════════════════════════════════════════╝

✅ All critical tests passed! ✓
⚠️  Note: 2 tests were skipped (likely due to node sync status)
⚠️  Run without --skip-sync-tests once node is fully synced for complete testing
```

## Troubleshooting

### Dashboard Won't Start

1. Check Docker is running:
   ```bash
   docker info
   ```

2. Check for port conflicts:
   ```bash
   lsof -i :8080
   ```

3. Check dashboard logs:
   ```bash
   docker logs kaspa-dashboard
   ```

### API Endpoints Return Errors

1. Verify Kaspa node is accessible:
   ```bash
   curl -X POST -H "Content-Type: application/json" \
     -d '{"method":"ping","params":{}}' \
     http://localhost:16111
   ```

2. Check network connectivity:
   ```bash
   docker network inspect kaspa-aio_kaspa-network
   ```

3. Restart dashboard:
   ```bash
   docker compose restart dashboard
   ```

### Tests Timeout

1. Increase timeout value in script (edit `TIMEOUT` variable)
2. Check system resources:
   ```bash
   docker stats
   ```
3. Verify no other heavy processes are running

## Performance Benchmarks

### Expected Response Times

- Health endpoint: < 100ms
- Service status: < 500ms
- Kaspa info: < 1000ms (depends on node)
- Kaspa stats: < 2000ms (depends on node)

### Resource Usage (Typical)

- CPU: 1-5% (idle), 10-20% (active)
- Memory: 50-150 MB
- Disk I/O: Minimal

## Integration with CI/CD

### GitHub Actions Example

```yaml
- name: Test Dashboard
  run: |
    ./test-dashboard.sh --skip-sync-tests --no-cleanup
```

### Pre-deployment Validation

```bash
# Quick validation before deployment
./test-dashboard.sh --skip-sync-tests

# Full validation (requires synced node)
./test-dashboard.sh
```

## Advanced Usage

### Custom Port Configuration

```bash
export DASHBOARD_PORT=9090
./test-dashboard.sh
```

### Testing Specific Profiles

```bash
# Start with specific profile
docker compose --profile prod up -d

# Run tests
./test-dashboard.sh --skip-sync-tests
```

### Continuous Monitoring

```bash
# Run tests every 5 minutes
watch -n 300 './test-dashboard.sh --skip-sync-tests --no-cleanup'
```

## Related Documentation

- [Component Matrix](component-matrix.md) - Service relationships
- [Deployment Profiles](deployment-profiles.md) - Profile configurations
- [Troubleshooting Guide](troubleshooting.md) - Common issues
- [Test Cleanup](test-cleanup.md) - Cleanup procedures

## Contributing

When adding new dashboard features:

1. Add corresponding tests to `test-dashboard.sh`
2. Update this documentation
3. Consider sync status requirements
4. Add appropriate test result tracking
5. Update help text with new options

## Support

For issues or questions:
- Check [Troubleshooting Guide](troubleshooting.md)
- Review [FAQ](faq.md)
- Check dashboard logs: `docker logs kaspa-dashboard`
- Open an issue on GitHub
