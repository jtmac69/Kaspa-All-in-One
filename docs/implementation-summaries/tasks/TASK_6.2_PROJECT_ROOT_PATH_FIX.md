# Task 6.2 - Project Root Path Fix

## Issue
The kaspa-explorer service was failing to build during installation with the error:
```
Command failed: cd /home/jtmac/test-kaspa-release/kaspa-aio-v0.9.0-test/services && docker compose build kaspa-explorer
no such service: kaspa-explorer
```

## Root Cause
The `DockerManager` class in `services/wizard/backend/src/utils/docker-manager.js` was calculating the project root path incorrectly.

**Path Calculation:**
- File location: `services/wizard/backend/src/utils/docker-manager.js`
- `__dirname` resolves to: `services/wizard/backend/src/utils`
- Old calculation: `path.resolve(__dirname, '../../../..')` (4 levels up)
  - Result: `services/wizard/backend/src/utils` → `src` → `backend` → `wizard` → `services` ❌
- New calculation: `path.resolve(__dirname, '../../../../..')` (5 levels up)
  - Result: `services/wizard/backend/src/utils` → `src` → `backend` → `wizard` → `services` → `project-root` ✓

## The Bug
When `projectRoot` was set to the `services` directory instead of the actual project root:
1. Docker Compose commands ran from the wrong directory
2. The `docker compose build kaspa-explorer` command couldn't find the service definition
3. The docker-compose.yml file was in the project root, but the command was running from `services/`

## The Fix
Changed the path resolution in `docker-manager.js` constructor from 4 levels up to 5 levels up:

```javascript
// OLD (WRONG):
this.projectRoot = process.env.PROJECT_ROOT || path.resolve(__dirname, '../../../..');

// NEW (CORRECT):
this.projectRoot = process.env.PROJECT_ROOT || path.resolve(__dirname, '../../../../..');
```

## Impact
This fix ensures that:
1. All Docker Compose commands run from the correct project root directory
2. The kaspa-explorer service (and all other services) can be built successfully
3. The wizard can properly manage Docker containers during installation

## Files Modified
- `services/wizard/backend/src/utils/docker-manager.js` - Fixed projectRoot calculation in constructor
- `services/wizard/backend/src/server.js` - Fixed projectRoot in `/api/wizard/current-config` and `/api/wizard/mode` endpoints
- `services/wizard/backend/src/api/update.js` - Fixed projectRoot in `/available`, `/apply`, and rollback endpoints

## Other Files Already Correct
These files were already using the correct 5-level path:
- `services/wizard/backend/src/utils/state-manager.js`
- `services/wizard/backend/src/utils/rollback-manager.js`
- `services/wizard/backend/src/utils/backup-manager.js`

## Testing
Verified that:
1. Path calculation correctly resolves to project root
2. Docker Compose build commands run from the correct directory
3. kaspa-explorer service builds successfully

## Related Issues
This was the final blocker preventing the Kaspa User Applications profile from installing successfully. With this fix, all three user applications (Kasia, K-Social, and Kaspa Explorer) should build and start correctly.
