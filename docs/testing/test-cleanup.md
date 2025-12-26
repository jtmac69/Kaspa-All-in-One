# Test Cleanup Documentation

## Overview

The Kaspa All-in-One project includes comprehensive cleanup functionality to manage test containers, volumes, and networks created during testing. This prevents resource accumulation and port conflicts.

## Cleanup Features

### 🧹 Automatic Cleanup
- **Exit Traps**: All test scripts automatically clean up on exit
- **Failure Handling**: Cleanup runs even if tests fail
- **Signal Handling**: Cleanup on SIGINT (Ctrl+C) and SIGTERM

### 🎛️ Manual Cleanup Options
- **Cleanup-only Mode**: Run cleanup without tests
- **Selective Cleanup**: Choose what to clean (containers, volumes, images)
- **Dry Run Mode**: Preview what would be cleaned
- **Force Mode**: Skip confirmation prompts

### 🔧 Granular Control
- **Basic Cleanup**: Containers only (default)
- **Full Cleanup**: Containers + volumes + networks + images
- **Custom Cleanup**: Mix and match cleanup options

## Available Scripts

### Individual Test Cleanup

#### Kasia App Test
```bash
# Run tests with automatic cleanup
./test-kasia-app.sh

# Cleanup only (no tests)
./test-kasia-app.sh --cleanup-only

# Full cleanup including volumes
./test-kasia-app.sh --cleanup-full

# Disable automatic cleanup
./test-kasia-app.sh --no-cleanup
```

#### Kasia Indexer Test
```bash
# Run tests with automatic cleanup
./test-kasia-indexer.sh

# Cleanup only (no tests)
./test-kasia-indexer.sh --cleanup-only

# Full cleanup including volumes
./test-kasia-indexer.sh --cleanup-full

# Disable automatic cleanup
./test-kasia-indexer.sh --no-cleanup
```

#### Service Dependencies Test
```bash
# Run tests with automatic cleanup
./test-service-dependencies.sh

# Cleanup only (no tests)
./test-service-dependencies.sh --cleanup-only

# Full cleanup including volumes
./test-service-dependencies.sh --cleanup-full
```

#### Dashboard Test
```bash
# Run tests with automatic cleanup (skip sync-dependent tests)
./test-dashboard.sh --skip-sync-tests

# Cleanup only (no tests)
./test-dashboard.sh --cleanup-only

# Full cleanup including volumes
./test-dashboard.sh --cleanup-full

# Disable automatic cleanup
./test-dashboard.sh --no-cleanup
```

### Comprehensive Cleanup Script

The `cleanup-tests.sh` script provides centralized cleanup for all test artifacts:

```bash
# Basic cleanup (containers only)
./cleanup-tests.sh

# Full cleanup (everything)
./cleanup-tests.sh --all

# Dry run (preview only)
./cleanup-tests.sh --dry-run

# Cleanup with volumes (destroys data)
./cleanup-tests.sh --volumes

# Cleanup with unused images
./cleanup-tests.sh --images

# Force cleanup without prompts
./cleanup-tests.sh --force --all
```

## Cleanup Options Reference

### Common Options (All Scripts)

| Option | Description |
|--------|-------------|
| `--cleanup-only` | Run cleanup without tests |
| `--cleanup-full` | Full cleanup (containers + volumes + networks) |
| `--cleanup-volumes` | Include data volumes in cleanup ⚠️ |
| `--cleanup-images` | Remove unused Docker images |
| `--no-cleanup` | Disable automatic cleanup on exit |

### Comprehensive Script Options

| Option | Description |
|--------|-------------|
| `-h, --help` | Show help message |
| `-v, --volumes` | Remove data volumes ⚠️ |
| `-i, --images` | Remove unused images |
| `-n, --no-networks` | Skip network cleanup |
| `-d, --dry-run` | Preview cleanup without executing |
| `-f, --force` | Skip confirmation prompts |
| `-a, --all` | Clean everything (volumes + images + networks) |

## What Gets Cleaned Up

### 🐳 Containers
- **Test Containers**: Temporary containers created during testing
  - `kasia-app-test`
  - `kasia-indexer-test`
  - `kaspa-node-test`
  - `indexer-db-test`
  - `k-social-test`
  - And more...

- **Compose Services**: Services started by docker-compose
  - All services defined in `docker-compose.yml`
  - Graceful shutdown with `docker-compose down`

### 💾 Volumes (Optional)
⚠️ **WARNING**: Volume cleanup destroys all data permanently!

- `all-in-one_kaspa-data` - Kaspa node blockchain data
- `all-in-one_kasia-indexer-data` - Kasia indexer database
- `all-in-one_indexer-db-data` - TimescaleDB data
- `all-in-one_archive-db-data` - Archive database data
- `all-in-one_portainer-data` - Portainer configuration
- `all-in-one_pgadmin-data` - pgAdmin configuration

### 🌐 Networks
- `all-in-one_kaspa-network` - Main project network
- `kaspa-aio_kaspa-network` - Alternative network name

### 🖼️ Images (Optional)
- Unused Docker images (via `docker image prune`)
- Build cache (via `docker builder prune`)

## Safety Features

### 🛡️ Data Protection
- **Volume Preservation**: Volumes are NOT cleaned by default
- **Confirmation Prompts**: Destructive actions require confirmation
- **Dry Run Mode**: Preview changes before executing
- **Force Flag**: Override prompts only when explicitly requested

### 🔍 Status Reporting
- **Before/After Status**: Shows system state before and after cleanup
- **Progress Logging**: Clear indication of what's being cleaned
- **Error Handling**: Graceful handling of missing resources

## Usage Examples

### Development Workflow
```bash
# Run tests (automatic cleanup)
./test-kasia-app.sh

# If tests fail and leave containers running
./test-kasia-app.sh --cleanup-only

# Clean slate for fresh testing
./cleanup-tests.sh --all --force
```

### CI/CD Pipeline
```bash
# Ensure clean environment before tests
./cleanup-tests.sh --force

# Run tests with guaranteed cleanup
./test-service-dependencies.sh

# Final cleanup (including volumes in CI)
./cleanup-tests.sh --all --force
```

### Troubleshooting
```bash
# Check what would be cleaned
./cleanup-tests.sh --dry-run --all

# Clean up stuck containers
./cleanup-tests.sh --force

# Nuclear option (clean everything)
./cleanup-tests.sh --all --volumes --images --force
```

## Best Practices

### 🎯 Regular Testing
- Let automatic cleanup handle normal test runs
- Use `--no-cleanup` only for debugging
- Run `./cleanup-tests.sh --dry-run` periodically to check system state

### 🔒 Data Safety
- Never use `--cleanup-volumes` in production environments
- Always backup important data before full cleanup
- Use dry run mode to preview destructive operations

### 🚀 Performance
- Use `--cleanup-images` periodically to free disk space
- Monitor Docker system usage with `docker system df`
- Clean up test artifacts regularly to prevent resource exhaustion

### 🐛 Debugging
- Use `--no-cleanup` to inspect failed test containers
- Check container logs before cleanup: `docker logs <container>`
- Use `docker ps -a` to see all containers before cleanup

## Troubleshooting

### Common Issues

#### Port Conflicts
```bash
# Clean up containers using conflicting ports
./cleanup-tests.sh

# Check for remaining processes
lsof -i :3001 -i :3002 -i :16111
```

#### Disk Space
```bash
# Free up space with image cleanup
./cleanup-tests.sh --images

# Check Docker disk usage
docker system df
```

#### Permission Issues
```bash
# Ensure Docker daemon is accessible
docker info

# Check script permissions
chmod +x cleanup-tests.sh
```

#### Stuck Containers
```bash
# Force remove stuck containers
docker ps -a | grep test | awk '{print $1}' | xargs docker rm -f

# Or use the comprehensive cleanup
./cleanup-tests.sh --force
```

## Integration with Test Scripts

All test scripts now include:

1. **Automatic Cleanup**: Enabled by default with exit traps
2. **Cleanup Options**: Command-line flags for manual control
3. **Error Handling**: Cleanup runs even on test failures
4. **Status Reporting**: Clear indication of cleanup actions

This ensures a clean testing environment and prevents resource accumulation during development and CI/CD processes.

## Summary

The cleanup system provides:
- ✅ **Automatic cleanup** on test completion or failure
- ✅ **Manual cleanup** options for specific scenarios
- ✅ **Safety features** to protect important data
- ✅ **Comprehensive coverage** of all test artifacts
- ✅ **Flexible configuration** for different use cases
- ✅ **Clear documentation** and help messages

This makes testing more reliable and prevents the common issue of accumulated test containers and resources.