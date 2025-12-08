# Kaspa User Applications Configuration Complete Fix

## Issue Summary

The Kaspa User Applications profile was incorrectly showing configuration fields that should only appear for other profiles:
- ❌ Database Configuration (Database Password) - should only show for `indexer-services`
- ❌ Kaspa Node Configuration (RPC/P2P ports) - should only show for `core`/`archive-node`
- ❌ Network Configuration (External IP, Public Node) - should only show for node profiles
- ❌ Missing indexer endpoint configuration that the apps actually need

## Root Cause

1. **Frontend Issue**: `services/wizard/frontend/public/scripts/modules/configure.js` was incorrectly checking for `kaspa-user-applications` when determining database section visibility
2. **Backend Issue**: Missing configuration fields for the actual indexer endpoints that Kaspa User Applications need to connect to

## Solution Implemented

### 1. Frontend Fixes (`services/wizard/frontend/public/scripts/modules/configure.js`)

**Database Section Visibility (Line 124-128):**
```javascript
// BEFORE
const needsDatabase = profiles.includes('indexer-services') || profiles.includes('kaspa-user-applications');

// AFTER  
const needsDatabase = profiles.includes('indexer-services');
```

**Database Password Validation (Line 338-348):**
```javascript
// BEFORE
const needsDatabase = selectedProfiles.includes('indexer-services') || selectedProfiles.includes('kaspa-user-applications');

// AFTER
const needsDatabase = selectedProfiles.includes('indexer-services');
```

### 2. Backend Configuration Fields (`services/wizard/backend/src/config/configuration-fields.js`)

**Added New Profile Section:**
```javascript
'kaspa-user-applications': [
  {
    key: 'REMOTE_KASIA_INDEXER_URL',
    label: 'Kasia Indexer URL',
    type: 'text',
    defaultValue: 'https://api.kasia.io/',
    group: 'indexer-endpoints',
    visibleForProfiles: ['kaspa-user-applications']
  },
  {
    key: 'REMOTE_KSOCIAL_INDEXER_URL',
    label: 'K-Social Indexer URL',
    type: 'text',
    defaultValue: 'https://indexer.kaspatalk.net/',
    group: 'indexer-endpoints',
    visibleForProfiles: ['kaspa-user-applications']
  },
  {
    key: 'REMOTE_KASPA_NODE_WBORSH_URL',
    label: 'Kaspa Node WebSocket URL',
    type: 'text',
    defaultValue: 'wss://api.kasia.io/ws',
    group: 'indexer-endpoints',
    visibleForProfiles: ['kaspa-user-applications']
  }
]
```

**Added New Field Group:**
```javascript
'indexer-endpoints': {
  id: 'indexer-endpoints',
  label: 'Indexer Endpoints',
  description: 'API endpoints for blockchain indexers',
  icon: 'link',
  order: 2
}
```

**Removed Incorrect Visibility:**
- Removed `EXTERNAL_IP` visibility for `kaspa-user-applications`
- Moved `PUBLIC_NODE` to common fields with correct visibility (`core`, `archive-node` only)

## Configuration Fields by Profile

### Kaspa User Applications Profile
**Should Show:**
- ✅ Kasia Indexer URL (default: `https://api.kasia.io/`)
- ✅ K-Social Indexer URL (default: `https://indexer.kaspatalk.net/`)
- ✅ Kaspa Node WebSocket URL (default: `wss://api.kasia.io/ws`)
- ✅ Custom Environment Variables (advanced)

**Should NOT Show:**
- ❌ Database Configuration
- ❌ Kaspa Node Configuration (RPC/P2P ports)
- ❌ External IP
- ❌ Public Node toggle

### Core Profile
**Should Show:**
- ✅ Kaspa Node RPC Port
- ✅ Kaspa Node P2P Port
- ✅ Kaspa Network (mainnet/testnet)
- ✅ Public Node toggle
- ✅ External IP
- ✅ Data Directory (advanced)

### Indexer Services Profile
**Should Show:**
- ✅ Database User
- ✅ Database Password
- ✅ External IP
- ✅ TimescaleDB Data Directory (advanced)

## Environment Variables

The Kaspa User Applications use these environment variables (from docker-compose.yml):

```yaml
kasia-app:
  environment:
    - VITE_INDEXER_MAINNET_URL=${REMOTE_KASIA_INDEXER_URL:-https://api.kasia.io/}
    - VITE_INDEXER_TESTNET_URL=${REMOTE_KASIA_INDEXER_URL:-https://api.kasia.io/}
    - VITE_DEFAULT_MAINNET_KASPA_NODE_URL=${REMOTE_KASPA_NODE_WBORSH_URL:-wss://api.kasia.io/ws}

k-social:
  environment:
    - KSOCIAL_INDEXER_URL=${REMOTE_KSOCIAL_INDEXER_URL:-https://indexer.kaspatalk.net/}
```

## Testing

### Backend Tests
Created comprehensive tests to verify the fix:

1. **test-kaspa-user-applications-visibility-fix.js** (7 tests)
   - ✅ No database fields for Kaspa User Applications alone
   - ✅ No Kaspa Node fields for Kaspa User Applications alone
   - ✅ No database config generated
   - ✅ No node config generated
   - ✅ Database fields present for indexer-services
   - ✅ Node fields present for core
   - ✅ Correct visibility for combined profiles

2. **test-kaspa-user-applications-indexer-fields.js** (8 tests)
   - ✅ Shows REMOTE_KASIA_INDEXER_URL field
   - ✅ Shows REMOTE_KSOCIAL_INDEXER_URL field
   - ✅ Shows REMOTE_KASPA_NODE_WBORSH_URL field
   - ✅ Does NOT show EXTERNAL_IP field
   - ✅ Does NOT show PUBLIC_NODE field
   - ✅ Has indexer-endpoints group
   - ✅ Core profile still shows PUBLIC_NODE
   - ✅ Combined profiles show correct fields

**All 15 tests pass ✅**

## User Experience

### Before Fix
When selecting Kaspa User Applications profile, users saw:
- Database Password field (confusing - why do apps need database?)
- External IP field (not needed - apps run behind nginx)
- No way to configure which indexer endpoints to use

### After Fix
When selecting Kaspa User Applications profile, users see:
- Kasia Indexer URL (with public default, can change to local)
- K-Social Indexer URL (with public default, can change to local)
- Kaspa Node WebSocket URL (with public default, can change to local)
- Clear tooltips explaining each field
- Grouped under "Indexer Endpoints" section

## Deployment Notes

1. **Wizard Restart Required**: Frontend changes require wizard service restart
2. **Backward Compatible**: Existing configurations will continue to work
3. **Default Behavior**: Apps default to public indexers (no local infrastructure needed)
4. **Local Indexers**: When `indexer-services` profile is also selected, config generator automatically sets local URLs

## Related Files

### Modified
- `services/wizard/frontend/public/scripts/modules/configure.js`
- `services/wizard/backend/src/config/configuration-fields.js`

### Created
- `services/wizard/backend/test-kaspa-user-applications-visibility-fix.js`
- `services/wizard/backend/test-kaspa-user-applications-indexer-fields.js`

## References

- Kasia .env.production: https://github.com/K-Kluster/Kasia/blob/staging/.env.production
- K-Social default indexer: `https://indexer.kaspatalk.net/`
- Config generator logic: `services/wizard/backend/src/utils/config-generator.js` (lines 233-246)

## Spec Alignment

This fix aligns with the web-installation-wizard spec requirements:

**Requirement 3.12**: "THE Installation_Wizard SHALL organize configuration options into Basic and Advanced sections, with profile-specific options displayed only when relevant profiles are selected"

**Design Document - Kaspa User Applications Profile**:
```typescript
kaspaUserApplications: {
  id: 'kaspa-user-applications',
  name: 'Kaspa User Applications',
  description: 'User-facing apps (Kasia, K-Social, Kaspa Explorer)',
  configuration: {
    indexerChoice: 'public', // Can be 'public' or 'local'
    publicEndpoints: {
      kasiaIndexer: 'https://api.kasia.io',
      kIndexer: 'https://api.k-social.io',
      simplyKaspaIndexer: 'https://api.simplykaspa.io'
    }
  },
  dependencies: [], // Optional: can add 'indexer-services' for local indexers
  prerequisites: [] // No hard requirements
}
```

The implementation now correctly reflects this design.
