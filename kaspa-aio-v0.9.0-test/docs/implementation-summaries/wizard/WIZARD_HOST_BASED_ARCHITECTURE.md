# Wizard Host-Based Architecture

## Critical Architectural Decision

**The Kaspa Installation Wizard ALWAYS runs on the host system, never in a Docker container.**

This document explains this architectural decision and the changes made to ensure consistent behavior.

## Rationale

### Why Host-Based?

1. **Chicken-and-Egg Problem**
   - Wizard needs to install Docker
   - Can't run in Docker if Docker isn't installed yet
   - Must run on host to bootstrap the system

2. **Direct System Access**
   - Needs to check system requirements (CPU, RAM, disk)
   - Must validate Docker installation
   - Requires access to host filesystem
   - Needs to modify docker-compose.yml and .env files

3. **Simplicity**
   - No container overhead
   - Simpler PROJECT_ROOT handling
   - Direct access to repository files
   - Easier debugging and development

4. **Consistency**
   - Same execution environment for all modes (install, reconfigure, update)
   - No differences between development and production
   - Predictable file paths

## PROJECT_ROOT Handling

### The Problem

Previously, the code had inconsistent PROJECT_ROOT handling:
- Docker container: `PROJECT_ROOT=/workspace` (hardcoded)
- Local development: No default, causing tests to fail
- Different behavior in different environments

### The Solution

All API files now use consistent PROJECT_ROOT detection:

```javascript
const projectRoot = process.env.PROJECT_ROOT || path.resolve(__dirname, '../../../..');
```

This auto-detects the repository root by going 4 levels up from the API file location:
```
services/wizard/backend/src/api/update.js
    ↓ __dirname = .../services/wizard/backend/src/api
    ↓ ../../../.. = repository root
```

### Startup Methods

**Recommended (All Environments)**:
```bash
./services/wizard/backend/start-local.sh
```

This script:
- Auto-detects repository root
- Sets PROJECT_ROOT environment variable
- Starts server with correct configuration

**Alternative (Manual)**:
```bash
export PROJECT_ROOT=/path/to/kaspa-aio
node services/wizard/backend/src/server.js
```

**Not Recommended**:
```bash
node services/wizard/backend/src/server.js  # PROJECT_ROOT not set
```

## Changes Made

### 1. Updated API Files

All API files now use auto-detection:
- `services/wizard/backend/src/api/update.js`
- `services/wizard/backend/src/api/reconfigure.js`
- `services/wizard/backend/src/server.js`

Changed from:
```javascript
const projectRoot = process.env.PROJECT_ROOT || '/workspace';
```

To:
```javascript
const projectRoot = process.env.PROJECT_ROOT || path.resolve(__dirname, '../../../..');
```

### 2. Updated Design Document

`.kiro/specs/web-installation-wizard/design.md`:
- Added "Host-Based Execution (All Modes)" section
- Clarified that wizard NEVER runs in container
- Explained rationale for host-based approach

### 3. Updated docker-compose.yml

Added deprecation notice to wizard service:
```yaml
# Installation Wizard (DEPRECATED - Runs on host, not in container)
# NOTE: The wizard should be started using ./services/wizard/backend/start-local.sh
# This container definition is kept for backwards compatibility but is not recommended
```

### 4. Updated scripts/wizard.sh

Changed from Docker-based to host-based execution:
- Starts wizard using `start-local.sh`
- Tracks PID in `.wizard.pid` file
- Logs to `logs/wizard.log`
- Uses `curl` for health checks instead of Docker inspect

### 5. Created Documentation

- `services/wizard/backend/README.md` - Development guide
- `services/wizard/backend/start-local.sh` - Startup script
- This document - Architecture explanation

## Testing

All tests now pass consistently:

```bash
# Start server
./services/wizard/backend/start-local.sh

# Run tests
node services/wizard/backend/test-update-mode.js

# Result: 100% pass rate (5/5 tests)
```

## Migration Guide

### For Developers

**Old Way (Don't Use)**:
```bash
docker compose --profile wizard up -d wizard
```

**New Way (Use This)**:
```bash
./services/wizard/backend/start-local.sh
# or
./scripts/wizard.sh start
```

### For Users

No changes needed - the wizard startup is handled automatically by the installation scripts.

### For CI/CD

Update any scripts that start the wizard:

```bash
# Old
docker compose --profile wizard up -d

# New
./services/wizard/backend/start-local.sh &
sleep 3  # Wait for startup
```

## Benefits

1. **Consistent Behavior**
   - Same code path for all environments
   - No Docker vs host differences
   - Predictable file paths

2. **Easier Development**
   - No container rebuilds needed
   - Direct file access
   - Simpler debugging

3. **Better Testing**
   - Tests work without Docker
   - Faster test execution
   - More reliable CI/CD

4. **Clearer Architecture**
   - Explicit about execution environment
   - No confusion about containerization
   - Simpler deployment

## Future Considerations

### When to Use Containers

Containers are still used for:
- Kaspa node
- Indexer services
- Application services
- Dashboard

The wizard is the ONLY component that runs on the host.

### Potential Issues

1. **Node.js Dependency**
   - Users must have Node.js installed
   - Could add Python fallback (future enhancement)
   - Could add static HTML fallback (future enhancement)

2. **Port Conflicts**
   - Wizard uses port 3000
   - Must ensure port is available
   - Could make port configurable

3. **Security**
   - Wizard has access to host filesystem
   - Must validate all file operations
   - Should run with minimal privileges

## Related Documentation

- [Update Mode Implementation](UPDATE_MODE_IMPLEMENTATION.md)
- [Wizard Mode Detection](WIZARD_MODE_DETECTION_IMPLEMENTATION.md)
- [Reconfiguration Mode](RECONFIGURATION_MODE_IMPLEMENTATION.md)
- [Backend README](../../../services/wizard/backend/README.md)

## Summary

The wizard's host-based architecture is a deliberate design choice that:
- Solves the Docker bootstrap problem
- Provides consistent behavior across environments
- Simplifies development and testing
- Makes the codebase more maintainable

All code has been updated to reflect this architecture, and all tests pass with 100% success rate.
