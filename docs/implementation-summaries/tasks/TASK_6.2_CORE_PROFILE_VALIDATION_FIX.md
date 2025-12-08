# Task 6.2: Core Profile Installation Validation Fix

## Issue Description

During Phase 6 Internal Testing (test-release spec), the Core profile installation was failing at the "Starting services" step with an "Installation Failed" error.

### Root Cause

The `validateServices()` method in `services/wizard/backend/src/utils/docker-manager.js` was incorrectly expecting `kaspa-nginx` to be running for the `core` profile.

However, in `docker-compose.yml`, the nginx service is assigned to the `kaspa-user-applications` profile:

```yaml
nginx:
  image: nginx:alpine
  container_name: kaspa-nginx
  # ...
  profiles:
    - kaspa-user-applications
```

This mismatch caused the validation to fail because:
1. Core profile starts only `kaspa-node` (which has no profile assigned)
2. nginx does NOT start (it requires `kaspa-user-applications` profile)
3. Validation checks for `kaspa-nginx` and finds it missing
4. Installation fails with "Some services failed to start"

## Solution

Updated the `serviceMap` in `validateServices()` to correctly reflect which services belong to each profile:

**Before:**
```javascript
const serviceMap = {
  core: ['kaspa-node', 'kaspa-nginx'],  // ❌ Wrong!
  'kaspa-user-applications': ['kasia-app', 'k-social'],
  // ...
};
```

**After:**
```javascript
const serviceMap = {
  core: ['kaspa-node'],  // ✅ Correct - only kaspa-node for core
  'kaspa-user-applications': ['kasia-app', 'k-social', 'kaspa-nginx'],  // ✅ nginx moved here
  // ...
};
```

## Files Modified

- `services/wizard/backend/src/utils/docker-manager.js`
  - Updated `validateServices()` method
  - Removed `'kaspa-nginx'` from core profile validation
  - Added `'kaspa-nginx'` to kaspa-user-applications profile validation

## Testing

To verify the fix:

1. Extract fresh test archive:
   ```bash
   cd ~/test-kaspa-release
   tar -xzf kaspa-aio-v0.9.0-test.tar.gz
   cd kaspa-aio-v0.9.0-test
   ```

2. Start wizard and select Core profile:
   ```bash
   ./services/wizard/backend/start-local.sh
   ```

3. Complete installation through web interface

4. Verify only kaspa-node is running:
   ```bash
   docker ps
   # Should show only kaspa-node, NOT nginx
   ```

5. Verify validation passes:
   ```bash
   docker logs kaspa-node
   # Should show node running successfully
   ```

## Related Issues

This issue was introduced when nginx was moved from core infrastructure to the kaspa-user-applications profile (as it's only needed when user-facing applications are running). The validation logic was not updated to reflect this change.

## Impact

- ✅ Core profile installations now complete successfully
- ✅ Validation correctly checks only for services that should be running
- ✅ nginx only starts when kaspa-user-applications profile is selected
- ✅ No unnecessary service restarts or errors

## Date

December 5, 2025
