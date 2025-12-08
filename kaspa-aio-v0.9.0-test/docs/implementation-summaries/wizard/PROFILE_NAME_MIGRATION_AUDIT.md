# Profile Name Migration Audit and Fix

**Date:** November 28, 2025  
**Issue:** Profile name changes from November 24 didn't fully propagate through wizard code  
**Status:** 🔧 IN PROGRESS

## Profile Name Changes (November 24, 2025)

### Renamed Profiles
- `prod` → `kaspa-user-applications`
- `explorer` → `indexer-services`  
- `development` / `dev` → Removed (converted to Developer Mode toggle)

### Retained Profiles
- `core` → Core Profile
- `archive-node` → Archive Node Profile
- `mining` → Mining Profile

## Files Requiring Updates

### ✅ FIXED - Frontend
1. **services/wizard/frontend/public/scripts/modules/review.js**
   - ✅ Updated PROFILE_DEFINITIONS with new names
   - Status: Fixed in current session

2. **services/wizard/frontend/public/scripts/modules/configure.js**
   - ✅ Line 89: Updated `needsDatabase` check from `explorer`/`prod` to `indexer-services`/`kaspa-user-applications`
   - ✅ Line 270: Updated same check in `validateAllFields()`
   - Status: Fixed in current session

### ✅ FIXED - Backend
3. **services/wizard/backend/src/utils/config-generator.js**
   - ✅ Line 22: Made `POSTGRES_PASSWORD` optional instead of required
   - ✅ Line 105: Updated database settings check from `explorer`/`prod` to `indexer-services`/`kaspa-user-applications`
   - ✅ Line 117: Updated archive check from `archive` to `archive-node`
   - ✅ Line 160: Updated indexer settings check from `explorer` to `indexer-services`
   - ✅ Line 257: Updated default config generation from `explorer`/`prod` to `indexer-services`/`kaspa-user-applications`
   - ✅ Line 265: Updated archive default config from `archive` to `archive-node`
   - ✅ Line 273: Updated indexer mode check from `explorer` to `indexer-services`
   - ✅ Line 355: Updated pgAdmin check from `explorer`/`prod`/`archive` to new names
   - ✅ Line 384-389: Updated developer mode service overrides
   - ✅ Line 407: Updated volume definitions check
   - Status: Fixed in current session

### 🔧 NEEDS FIX - Test Files
4. **services/wizard/backend/test-config-endpoint.js**
   - ❌ Line 55: Uses `['core', 'explorer']` - should be `['core', 'indexer-services']`
   - ❌ Line 85: Uses `['core', 'explorer']` - should be `['core', 'indexer-services']`
   - Status: Test file, low priority

5. **services/wizard/backend/test-review-module.js**
   - ❌ Lines 68-72: Uses old profile names (`prod`, `explorer`, `archive`, `dev`)
   - Status: Test file, low priority

### ✅ OK - Build Configuration
6. **services/wizard/frontend/public/scripts/modules/build-config.js**
   - ✅ Line 44: Uses `development` for BUILD_MODE (not profile name)
   - Status: Correct usage, not related to profile names

7. **services/wizard/backend/src/middleware/security.js**
   - ✅ Line 13: Uses `development` for NODE_ENV (not profile name)
   - Status: Correct usage, not related to profile names

## Root Cause Analysis

The profile name changes were implemented in the backend `profile-manager.js` on November 24, but:

1. **Frontend review.js** - Had hardcoded old profile definitions
2. **Frontend configure.js** - Had hardcoded checks for old profile names
3. **Backend config-generator.js** - Had `POSTGRES_PASSWORD` as always required
4. **Test files** - Still using old profile names (acceptable for test files)

## Impact Assessment

### Critical Issues (Blocking User Flow)
1. ✅ **FIXED** - Review step showing wrong profile names
2. ✅ **FIXED** - Configuration validation failing for Core profile
3. ✅ **FIXED** - Database password required for all profiles

### Non-Critical Issues (Test Files Only)
1. ⚠️ Test files using old profile names - doesn't affect production

## Verification Checklist

### User Flow Test
- [ ] Select "Core" profile on Step 4
- [ ] Verify profile persists through Step 5
- [ ] Verify Step 6 shows "Core Profile" (not "Core, Explorer")
- [ ] Verify no validation errors on Step 5
- [ ] Verify correct resource requirements displayed

### Profile-Specific Tests
- [ ] Core profile - no database password required
- [ ] Kaspa User Applications - database password required
- [ ] Indexer Services - database password required
- [ ] Archive Node - works correctly
- [ ] Mining - works correctly

## Recommendations

### Immediate Actions
1. ✅ Update frontend review.js with new profile names
2. ✅ Update frontend configure.js validation logic
3. ✅ Make backend POSTGRES_PASSWORD optional
4. ✅ Test complete user flow

### Follow-up Actions
1. Update test files to use new profile names (low priority)
2. Add automated tests to catch profile name mismatches
3. Create profile name constants file to prevent hardcoding
4. Document profile name changes in migration guide

## Lessons Learned

1. **Centralize Profile Definitions** - Profile names should be defined in ONE place and imported everywhere
2. **Automated Testing** - Need integration tests that catch profile name mismatches
3. **Migration Checklist** - When changing core identifiers, need comprehensive grep audit
4. **Documentation** - Profile changes should include explicit migration checklist

## Next Steps

1. Complete user flow testing
2. Update test files if time permits
3. Create profile constants file to prevent future issues
4. Add to testing checklist for future profile changes

