# Task 6.2: Wizard Nginx Service Verification Fix

## Overview

Fixed the wizard's installation completion page to not show "Kaspa Nginx" as a service for the Kaspa User Applications profile.

## Problem

The wizard's completion page was showing "Kaspa Nginx" in the service verification list even though nginx is not deployed with the Kaspa User Applications profile.

### Screenshot Evidence
The completion page showed:
```
Service Verification
✓ Kasia App - Running
✓ K Social - Running
✓ Kaspa Nginx - Running  ❌ WRONG - nginx not deployed!
```

## Root Cause

The backend `docker-manager.js` had `'kaspa-nginx'` hardcoded in the service map for the `kaspa-user-applications` profile:

```javascript
const serviceMap = {
  'kaspa-user-applications': ['kasia-app', 'k-social', 'kaspa-nginx'],  // ❌
  ...
};
```

This service map is used by the `/install/validate` API endpoint to check which containers should be running for each profile.

## Solution

### File: `services/wizard/backend/src/utils/docker-manager.js`

Removed `'kaspa-nginx'` from the kaspa-user-applications service map:

```javascript
// Before
'kaspa-user-applications': ['kasia-app', 'k-social', 'kaspa-nginx'],

// After
'kaspa-user-applications': ['kasia-app', 'k-social'],  // nginx removed - not needed
```

## Impact

### Before (Incorrect)
**Completion Page Service Verification**:
- ✓ Kasia App - Running
- ✓ K Social - Running
- ✓ Kaspa Nginx - Running (but container doesn't exist!)

**Result**: Confusing for users, may show as "stopped" or "missing"

### After (Correct)
**Completion Page Service Verification**:
- ✓ Kasia App - Running
- ✓ K Social - Running

**Total**: 2 services running (accurate!)

## How Service Verification Works

1. **User completes installation** → Wizard shows completion page
2. **Frontend calls** `/install/validate` API with selected profiles
3. **Backend looks up** service map for those profiles
4. **Backend checks** Docker for those specific containers
5. **Backend returns** status of each service
6. **Frontend displays** service verification list

The service map in `docker-manager.js` is the source of truth for which containers should exist for each profile.

## Related Changes

This fix is part of the complete nginx removal from Kaspa User Applications profile:

1. ✓ **Config generator**: Removed nginx service from docker-compose generation
2. ✓ **Review page**: Removed nginx from services list
3. ✓ **TESTING.md**: Removed nginx references from Scenario 2
4. ✓ **Service verification**: Removed nginx from validation (this fix)

## Testing

### Verify Fix

1. **Start wizard**: `./start-test.sh`
2. **Select profile**: Kaspa User Applications
3. **Complete installation**: Follow wizard steps
4. **Check completion page**: Should show only 2 services
   - ✓ Kasia App
   - ✓ K Social
   - ✗ NO Kaspa Nginx

### API Testing

Test the validation endpoint directly:

```bash
curl -X POST http://localhost:3000/api/install/validate \
  -H "Content-Type: application/json" \
  -d '{"profiles": ["kaspa-user-applications"]}'
```

Expected response:
```json
{
  "services": {
    "kasia-app": { "status": "running", "name": "Kasia App" },
    "k-social": { "status": "running", "name": "K Social" }
  },
  "summary": {
    "total": 2,
    "running": 2,
    "stopped": 0
  }
}
```

Should NOT include `kaspa-nginx` in the response.

## Files Modified

1. `services/wizard/backend/src/utils/docker-manager.js` - Removed kaspa-nginx from service map

## Verification Checklist

- [x] Removed kaspa-nginx from kaspa-user-applications service map
- [x] Verified no other kaspa-nginx references in backend
- [x] Service verification will now show only 2 services
- [x] Completion page will be accurate

## Next Steps

1. **Rebuild test release** with this fix
2. **Test installation** of Kaspa User Applications profile
3. **Verify completion page** shows only 2 services
4. **Confirm** no "Kaspa Nginx" in service verification

## Related Documentation

- `TASK_6.2_NGINX_REMOVAL_FROM_USER_APPS.md` - Main nginx removal task
- `TASK_6.2_TESTING_MD_NGINX_REMOVAL_COMPLETE.md` - TESTING.md updates
- `TASK_6.2_REVIEW_PAGE_PROFILE_SPECIFIC_CONFIG.md` - Review page fixes
