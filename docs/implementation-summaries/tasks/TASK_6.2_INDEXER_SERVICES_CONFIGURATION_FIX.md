# Task 6.2 - Indexer Services Configuration Fix

## Issue Identified

During Scenario 3 testing (Indexer Services), a critical configuration bug was discovered:

**Problem**: The Indexer Services profile was incorrectly showing network configuration options (External IP and Public Node toggle) that should only appear for node profiles.

**Root Cause**: The wizard frontend logic incorrectly included `indexer-services` in the network configuration visibility check.

## Analysis

### What Indexer Services Actually Are
- **Purpose**: Process blockchain data and store it in queryable databases
- **Architecture**: Connect TO nodes (don't serve as nodes)
- **Network Role**: Internal services, not public-facing endpoints
- **Dependencies**: Use local node if available, fallback to public endpoints

### Correct Configuration Requirements
Indexer Services should ONLY configure:
1. **Database Configuration** ✅
   - Database User (default: "kaspa")
   - Database Password (required, min 12 chars)
2. **Advanced Options** ✅
   - TimescaleDB Data Directory (default: "/data/timescaledb")

### Incorrect Configuration (Bug)
Indexer Services should NOT configure:
- ❌ External IP Address (they don't accept external connections)
- ❌ Public Node toggle (they're not nodes)
- ❌ Kaspa Node RPC/P2P ports (they connect to nodes, don't run nodes)

## Files Fixed

### 1. Frontend Configuration Logic
**File**: `services/wizard/frontend/public/scripts/modules/configure.js`

**Before**:
```javascript
const needsNetwork = profiles.includes('core') || profiles.includes('archive-node') || 
                    profiles.includes('indexer-services') || profiles.includes('mining');
```

**After**:
```javascript
const needsNetwork = profiles.includes('core') || profiles.includes('archive-node') || 
                    profiles.includes('mining');
```

**Change**: Removed `indexer-services` from network configuration visibility check.

### 2. Review Module Logic
**File**: `services/wizard/frontend/public/scripts/modules/review.js`

**Before**:
```javascript
const hasNetworkConfig = selectedProfiles.some(profileId => 
    ['core', 'archive-node', 'indexer-services', 'mining'].includes(profileId)
);
```

**After**:
```javascript
const hasNetworkConfig = selectedProfiles.some(profileId => 
    ['core', 'archive-node', 'mining'].includes(profileId)
);
```

**Change**: Removed `indexer-services` from network configuration check in review page.

### 3. Backend Configuration Fields
**File**: `services/wizard/backend/src/config/configuration-fields.js`

**Before**:
```javascript
visibleForProfiles: ['core', 'archive-node', 'indexer-services', 'mining']
```

**After**:
```javascript
visibleForProfiles: ['core', 'archive-node', 'mining']
```

**Change**: Removed `indexer-services` from EXTERNAL_IP field visibility.

### 4. Testing Documentation Update
**File**: `TESTING.md`

**Updated**: Scenario 3 configuration section to:
- Clearly state what SHOULD be shown (database config only)
- Clearly state what should NOT be shown (network config)
- Include bug reporting instructions if network config appears
- Add validation steps for testers

## Impact

### User Experience
- **Before**: Confusing network configuration options for indexer services
- **After**: Clean, focused configuration showing only relevant database settings

### Testing
- **Before**: Testers would be confused by irrelevant network options
- **After**: Clear configuration flow with proper validation instructions

### Architecture Alignment
- **Before**: UI suggested indexers were public-facing services
- **After**: UI correctly reflects that indexers are internal data processing services

## Validation

### Manual Testing Required
1. Select ONLY "Indexer Services" profile
2. Navigate to configuration page
3. Verify ONLY these sections appear:
   - ✅ Database Configuration (user, password)
   - ✅ Advanced Options (data directory)
4. Verify these sections do NOT appear:
   - ❌ Network Configuration (External IP, Public Node)
   - ❌ Kaspa Node Settings (RPC/P2P ports)

### Test Cases
1. **Indexer Services Only**: Should show database config only
2. **Core + Indexer Services**: Should show both node config AND database config
3. **Kaspa User Applications Only**: Should show indexer endpoints only
4. **All Profiles**: Should show all relevant configurations

## Related Issues

This fix addresses the specific issue reported during Scenario 3 testing where the configuration page showed incorrect options for the Indexer Services profile.

## Next Steps

1. **Test the fix**: Run Scenario 3 with the updated code
2. **Validate other profiles**: Ensure the fix doesn't break other profile configurations
3. **Update test release**: Include this fix in the next test package
4. **Document in known issues**: Remove this from known issues once fixed

## Files Modified

- `services/wizard/frontend/public/scripts/modules/configure.js`
- `services/wizard/frontend/public/scripts/modules/review.js`
- `services/wizard/backend/src/config/configuration-fields.js`
- `TESTING.md`
- `docs/implementation-summaries/tasks/TASK_6.2_INDEXER_SERVICES_CONFIGURATION_FIX.md` (this file)

## Status

✅ **COMPLETE** - Configuration logic fixed, documentation updated, ready for testing validation.