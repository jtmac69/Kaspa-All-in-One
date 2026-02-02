# Phase 4, Step 1: Update config-modification.js Profile Field Definitions - COMPLETE

**Date:** 2025-01-31  
**Status:** ✅ Complete  
**Estimated Time:** 10-15 minutes  
**Actual Time:** ~12 minutes

## Objective
Update the `getProfileFieldDefinitions()` function to use the new 8-profile IDs and add comprehensive field definitions for each profile.

## Changes Made

### 1. Added Migration Helper Function
Created `migrateProfileIdLocal()` to handle legacy profile ID migration:
- `'core'` → `'kaspa-node'`
- `'kaspa-user-applications'` → `['kasia-app', 'k-social-app']`
- `'indexer-services'` → `['kasia-indexer', 'k-indexer-bundle']`
- `'archive-node'` → `'kaspa-archive-node'`
- `'mining'` → `'kaspa-stratum'`

### 2. Created New getProfileFieldDefinitions() Function
Implemented comprehensive field definitions for all 8 profiles:

#### kaspa-node (7 fields)
- KASPA_NODE_RPC_PORT (gRPC Port, default: 16110)
- KASPA_NODE_P2P_PORT (P2P Port, default: 16111)
- KASPA_NODE_WRPC_PORT (wRPC Port, default: 17110) ✓ Uses WRPC not WBORSH
- KASPA_NETWORK (Network, options: mainnet/testnet-10/testnet-11)
- PUBLIC_NODE (boolean, default: false)
- WALLET_ENABLED (boolean, default: false)
- UTXO_INDEX (boolean, default: true)

#### kasia-app (3 fields)
- KASIA_APP_PORT (default: 3001)
- KASIA_INDEXER_MODE (auto/local/public, default: auto)
- REMOTE_KASIA_INDEXER_URL (default: https://api.kasia.io)

#### k-social-app (3 fields)
- KSOCIAL_APP_PORT (default: 3003)
- KSOCIAL_INDEXER_MODE (auto/local/public, default: auto)
- REMOTE_KSOCIAL_INDEXER_URL (default: https://indexer0.kaspatalk.net/)

#### kaspa-explorer-bundle (6 fields)
- KASPA_EXPLORER_PORT (default: 3004)
- SIMPLY_KASPA_INDEXER_PORT (default: 3005)
- TIMESCALEDB_EXPLORER_PORT (default: 5434)
- POSTGRES_USER_EXPLORER (default: kaspa_explorer)
- POSTGRES_PASSWORD_EXPLORER (password type)
- SIMPLY_KASPA_NODE_MODE (local/remote, default: local)

#### kasia-indexer (3 fields)
- KASIA_INDEXER_PORT (default: 3002)
- KASIA_NODE_MODE (local/remote, default: local)
- KASIA_NODE_WRPC_URL (default: ws://kaspa-node:17110)

#### k-indexer-bundle (5 fields)
- K_INDEXER_PORT (default: 3006)
- TIMESCALEDB_KINDEXER_PORT (default: 5433)
- POSTGRES_USER_KINDEXER (default: k_indexer)
- POSTGRES_PASSWORD_KINDEXER (password type)
- K_INDEXER_NODE_MODE (local/remote, default: local)

#### kaspa-archive-node (6 fields)
- KASPA_NODE_RPC_PORT (default: 16110)
- KASPA_NODE_P2P_PORT (default: 16111)
- KASPA_NODE_WRPC_PORT (default: 17110)
- KASPA_NETWORK (mainnet/testnet-10/testnet-11)
- PUBLIC_NODE (boolean, default: true)
- EXTERNAL_IP (text)

#### kaspa-stratum (6 fields)
- STRATUM_PORT (default: 5555)
- MINING_ADDRESS (required)
- MIN_SHARE_DIFF (default: 4)
- VAR_DIFF (boolean, default: true)
- SHARES_PER_MIN (default: 20)
- POOL_MODE (boolean, default: false)

### 3. Updated getProfileConfigurationFields()
Marked as deprecated and delegated to `getProfileFieldDefinitions()` for consistency.

## Verification

### Syntax Check
```bash
node -c services/wizard/backend/src/api/config-modification.js
✓ No syntax errors
```

### Functional Tests
Created and ran `test-profile-field-definitions.js`:

**All 8 New Profile IDs:**
- ✓ kaspa-node: 7 fields
- ✓ kasia-app: 3 fields
- ✓ k-social-app: 3 fields
- ✓ kaspa-explorer-bundle: 6 fields
- ✓ kasia-indexer: 3 fields
- ✓ k-indexer-bundle: 5 fields
- ✓ kaspa-archive-node: 6 fields
- ✓ kaspa-stratum: 6 fields

**Legacy Profile ID Migration:**
- ✓ core → kaspa-node: 7 fields
- ✓ kaspa-user-applications → kasia-app: 3 fields
- ✓ indexer-services → kasia-indexer: 3 fields
- ✓ archive-node → kaspa-archive-node: 6 fields
- ✓ mining → kaspa-stratum: 6 fields

**WRPC Verification:**
- ✓ kaspa-node has WRPC field: true
- ✓ kaspa-node has no WBORSH fields: true

## Success Criteria
- [x] Function updated with all 8 profile definitions
- [x] Legacy migration helper added
- [x] No syntax errors
- [x] Config keys match specification (WRPC not WBORSH)
- [x] All profiles return correct field counts
- [x] Legacy IDs properly migrate to new IDs

## Files Modified
- `services/wizard/backend/src/api/config-modification.js`

## Files Created
- `services/wizard/backend/test-profile-field-definitions.js` (test file)

## Next Steps
Ready to proceed to Phase 4, Step 2: Update profile-state-manager.js Profile Definitions
