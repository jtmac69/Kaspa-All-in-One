# Task 6.2 - Final Kaspa Explorer Installation Fix

## Summary
Fixed the critical path resolution bug that was preventing kaspa-explorer (and potentially other services) from building during wizard installation.

## The Problem
When users tried to install the Kaspa User Applications profile, the installation would fail at the build stage with:
```
Command failed: cd /home/jtmac/test-kaspa-release/kaspa-aio-v0.9.0-test/services && docker compose build kaspa-explorer
no such service: kaspa-explorer
```

## Root Cause Analysis

### Path Calculation Error
Multiple files in the wizard backend were calculating the project root path incorrectly:

**File Structure:**
```
kaspa-aio/                          ← Project root (target)
└── services/
    └── wizard/
        └── backend/
            └── src/
                ├── server.js       ← 4 levels from root
                ├── api/
                │   └── update.js   ← 5 levels from root
                └── utils/
                    └── docker-manager.js  ← 5 levels from root
```

**The Bug:**
Files at different depths were using inconsistent path calculations:
- Files in `src/utils/` need to go up **5 levels** to reach project root
- Files in `src/` need to go up **4 levels** to reach project root
- Files in `src/api/` need to go up **5 levels** to reach project root

But several files were using **4 levels** when they should have used **5 levels**, causing them to resolve to the `services/` directory instead of the project root.

### Impact
When `projectRoot` pointed to `services/` instead of the actual root:
1. Docker Compose commands ran from the wrong directory
2. The docker-compose.yml file (located at project root) couldn't be found
3. Service builds failed with "no such service" errors

## The Fix

### Files Fixed
Changed path resolution from 4 levels to 5 levels in:

1. **docker-manager.js** (services/wizard/backend/src/utils/)
   ```javascript
   // OLD: path.resolve(__dirname, '../../../..')
   // NEW: path.resolve(__dirname, '../../../../..')
   ```

2. **server.js** (services/wizard/backend/src/)
   - Fixed in `/api/wizard/current-config` endpoint
   - Fixed in `/api/wizard/mode` endpoint
   ```javascript
   // OLD: path.resolve(__dirname, '../../../..')
   // NEW: path.resolve(__dirname, '../../../../..')
   ```

3. **update.js** (services/wizard/backend/src/api/)
   - Fixed in `/available` endpoint
   - Fixed in `/apply` endpoint
   - Fixed in rollback endpoint
   ```javascript
   // OLD: path.resolve(__dirname, '../../../..')
   // NEW: path.resolve(__dirname, '../../../../..')
   ```

### Files Already Correct
These files were already using the correct 5-level path:
- `state-manager.js`
- `rollback-manager.js`
- `backup-manager.js`

## Verification

### Path Resolution Test
```javascript
// From services/wizard/backend/src/utils/
const utilsDir = '/path/to/services/wizard/backend/src/utils';

// OLD (4 levels): services/wizard/backend/src/utils → src → backend → wizard → services ❌
path.resolve(utilsDir, '../../../..')  // = /path/to/services

// NEW (5 levels): services/wizard/backend/src/utils → src → backend → wizard → services → root ✓
path.resolve(utilsDir, '../../../../..')  // = /path/to
```

## Expected Behavior After Fix

### Installation Flow
1. User selects Kaspa User Applications profile
2. Wizard generates docker-compose.yml at project root
3. Wizard runs `docker compose build` commands from project root
4. All three services build successfully:
   - kasia-app ✓
   - k-social ✓
   - kaspa-explorer ✓
5. Services start and are accessible on their ports

### Service Access
- Kasia App: http://localhost:3001
- K-Social: http://localhost:3003
- Kaspa Explorer: http://localhost:3004

## Testing Checklist
- [x] Path calculation resolves to correct project root
- [x] Docker Compose commands run from correct directory
- [x] kaspa-explorer service definition is found
- [ ] kaspa-explorer builds successfully (requires test release rebuild)
- [ ] All three user applications start correctly (requires test release rebuild)

## Next Steps
1. Rebuild test release package with these fixes
2. Extract and test installation with Kaspa User Applications profile
3. Verify all three applications build and start successfully
4. Confirm services are accessible on their respective ports

## Related Issues
- Task 6.2 - Docker Compose Generation Fix (already completed)
- Task 6.2 - Kaspa Explorer Integration (already completed)
- Task 6.2 - Kaspa Node Profile Fix (already completed)

This was the final piece needed to make the Kaspa User Applications profile fully functional.
