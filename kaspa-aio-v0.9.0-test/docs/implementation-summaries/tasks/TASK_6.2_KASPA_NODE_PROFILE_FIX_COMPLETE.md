# Task 6.2: Kaspa Node Profile Fix - Complete

## Summary
Fixed kaspa-node and nginx incorrectly starting with kaspa-user-applications profile. The issue was that the old docker-compose.yml had kaspa-node without profile restrictions, and the config-generator was always adding kaspa-node even when no profile needed it.

## Changes Made

### 1. Config Generator Fix (`services/wizard/backend/src/utils/config-generator.js`)

**Made kaspa-node service conditional**:
- Only adds kaspa-node service if a profile needs it
- Profiles that need kaspa-node: `core`, `archive-node`, `mining`, `indexer-services`
- kaspa-user-applications does NOT need kaspa-node (uses remote endpoints)

**Removed depends_on from user applications**:
- Removed `depends_on: kaspa-node` from kasia-app
- Removed `depends_on: kaspa-node` from k-social
- These apps connect to remote endpoints, not local node

### 2. Test Release Rebuilt
- Package: `kaspa-aio-v0.9.0-test.tar.gz` (1.9M)
- Checksum: `792d8cb6423570625bf4da3ea352a0c1703e57c31d5adb77f5a0127f73789747`
- Includes all fixes from this session

## Kaspa User Applications Profile

The profile includes **THREE** web applications:

1. **Kasia** (port 3001) - Messaging app
   - GitHub: https://github.com/kaspagang/kasia
   
2. **K-Social** (port 3003) - Social media app
   - GitHub: https://github.com/thesheepcat/K/releases/tag/v0.0.14
   
3. **Kaspa Explorer** (port 3004) - Block explorer
   - GitHub: https://github.com/lAmeR1/kaspa-explorer

All three apps are already implemented in config-generator.js and connect to remote indexer endpoints.

## Expected Behavior After Fix

### When kaspa-user-applications profile is selected ALONE:
```
✅ kasia-app starts (port 3001)
✅ k-social starts (port 3003)  
✅ kaspa-explorer starts (port 3004)
❌ kaspa-node does NOT start
❌ nginx does NOT start
```

### When kaspa-user-applications + core profiles are selected:
```
✅ kaspa-node starts (needed by core profile)
✅ kasia-app starts (port 3001)
✅ k-social starts (port 3003)
✅ kaspa-explorer starts (port 3004)
❌ nginx does NOT start
```

## Testing Performed

Created and ran test script:
```bash
node test-kaspa-user-apps-no-node.js
```

Results:
```
✅ PASS: kaspa-node service NOT in kaspa-user-applications profile
✅ PASS: kasia-app has NO depends_on
✅ PASS: k-social has NO depends_on
```

## Next Steps for User

1. **Stop current containers**:
   ```bash
   docker-compose down -v
   ```

2. **Run wizard installation again** to generate new docker-compose.yml:
   ```bash
   ./start-test.sh
   ```

3. **Select kaspa-user-applications profile** and complete installation

4. **Verify only 3 containers start**:
   ```bash
   docker ps
   ```
   
   Should show:
   - kasia-app
   - k-social
   - kaspa-explorer
   
   Should NOT show:
   - kaspa-node
   - kaspa-nginx

## Files Modified

- `services/wizard/backend/src/utils/config-generator.js`
  - Made kaspa-node service conditional
  - Removed depends_on from kasia-app
  - Removed depends_on from k-social

## Files Created

- `docs/implementation-summaries/tasks/TASK_6.2_KASPA_NODE_NGINX_PROFILE_FIX.md`
- `test-kaspa-user-apps-no-node.js` (test script)
- `test-kaspa-user-apps-full-output.js` (test script)

## Related Issues Fixed

- TASK_6.2_NGINX_REMOVAL_FROM_USER_APPS.md - Nginx already removed
- TASK_6.2_WIZARD_NGINX_SERVICE_VERIFICATION_FIX.md - Service verification updated
- TASK_6.2_TESTING_MD_NGINX_REMOVAL_COMPLETE.md - Documentation updated

## Date
December 8, 2025
