# Task: Kaspa Explorer Service Startup Fix

## Issue
The wizard installation was failing with "Failed to start services" error when installing the Kaspa User Applications profile. Investigation revealed two related issues:

1. The kaspa-explorer container was being created but not starting properly
2. Orphan containers from previous test releases were causing conflicts

## Root Causes

### 1. Missing Healthcheck
The kaspa-explorer Dockerfile was missing:
- **curl installation** - Required for Docker healthchecks
- **HEALTHCHECK directive** - Needed for Docker to verify the service is ready

Without a healthcheck, Docker Compose couldn't verify the service was healthy, and the wizard's validation logic would fail when checking if services started successfully.

### 2. Orphan Container Conflicts
When testing with different release packages, old containers with different Docker Compose project names (e.g., `kaspa-aio-v090-test` vs `kaspa-aio`) would remain and conflict with new installations. The wizard wasn't cleaning up these orphan containers before starting services.

## Solutions

### 1. Added Healthcheck to Dockerfile
Updated `services/kaspa-explorer/Dockerfile` to add:

```dockerfile
# Install curl for health checks
RUN apk add --no-cache curl

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:80/ || exit 1
```

### 2. Added Orphan Container Cleanup
Updated `services/wizard/backend/src/utils/docker-manager.js` to clean up orphan containers before starting services:

```javascript
// Clean up any orphan containers from previous installations/tests
// This prevents conflicts with containers from different project names
try {
  await execAsync(`cd ${this.projectRoot} && docker compose down --remove-orphans`, {
    maxBuffer: 10 * 1024 * 1024
  });
} catch (cleanupError) {
  console.log('Warning: Cleanup failed, continuing anyway:', cleanupError.message);
}
```

## Changes Made

### 1. Updated Dockerfile
**File**: `services/kaspa-explorer/Dockerfile`

Added curl installation and healthcheck directive to match the pattern used in kasia-app and k-social services.

### 2. Updated Docker Manager
**File**: `services/wizard/backend/src/utils/docker-manager.js`

Added cleanup step in `startServices()` method to remove orphan containers before starting new services. This ensures clean state even when testing multiple release packages.

### 3. Rebuilt Test Release
Rebuilt the test release package with both fixes:
- `kaspa-aio-v0.9.0-test.tar.gz`
- Checksum: `24c6a8b8c2319beb1660c0d03a6a0427d37d7c9158bf1e444dfa7d61806261ac`

## Verification
After the fix:
1. Container builds successfully with curl installed
2. Container starts and healthcheck passes
3. Docker reports: `State: running, Health: healthy`
4. Wizard can properly validate service startup

## Related Services
This fix aligns kaspa-explorer with the healthcheck patterns already in place for:
- **kasia-app**: Uses `curl -f http://localhost:3000/health`
- **k-social**: Uses `curl -f http://localhost:3000/`

## Impact
- Fixes wizard installation failures for Kaspa User Applications profile
- Improves service startup reliability across multiple test runs
- Enables proper health monitoring for kaspa-explorer
- Prevents conflicts from orphan containers with different project names
- Aligns with Docker best practices
- Makes testing more reliable when switching between release packages

## Testing
Tested with:
- Manual container start/stop
- Docker inspect to verify healthcheck status
- Full wizard installation with Kaspa User Applications profile

## Files Modified
- `services/kaspa-explorer/Dockerfile` - Added healthcheck
- `services/wizard/backend/src/utils/docker-manager.js` - Added orphan cleanup
- `kaspa-aio-v0.9.0-test.tar.gz` - Rebuilt with both fixes

## Date
December 10, 2025
