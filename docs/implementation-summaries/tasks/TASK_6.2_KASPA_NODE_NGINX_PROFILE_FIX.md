# Task 6.2: Kaspa Node and Nginx Profile Fix

## Issue
When testing the Kaspa User Applications profile, nginx and kaspa-node containers were starting even though they shouldn't be included in this profile.

## Root Cause Analysis

1. **Old docker-compose.yml file**: The docker-compose.yml in the workspace was from December 5th and had:
   - kaspa-node service with no profile restriction (always starts)
   - nginx service with kaspa-user-applications profile

2. **Config generator issues**:
   - kaspa-node service was ALWAYS added to docker-compose.yml, even when no profile needed it
   - kaspa-user-applications services (kasia-app, k-social) had `depends_on: kaspa-node` which forced the node to start

## Solution Implemented

### 1. Conditional kaspa-node Service Addition
Modified `services/wizard/backend/src/utils/config-generator.js` to only add kaspa-node service when a profile needs it:

```javascript
// Add kaspa-node only if a profile needs it
// kaspa-user-applications does NOT need a local node - it uses remote endpoints
const nodeProfiles = ['core', 'archive-node', 'mining', 'indexer-services'].filter(p => profiles.includes(p));
if (nodeProfiles.length > 0) {
  // Add kaspa-node service definition
  // ...
  nodeProfiles.forEach(profile => {
    lines.push(`      - ${profile}`);
  });
}
```

**Result**: When only kaspa-user-applications is selected, kaspa-node service is NOT added to docker-compose.yml

### 2. Removed depends_on from User Applications
Removed `depends_on: kaspa-node` from both kasia-app and k-social services since they connect to remote endpoints, not local node.

**Before**:
```yaml
kasia-app:
  # ...
  depends_on:
    kaspa-node:
      condition: service_started
```

**After**:
```yaml
kasia-app:
  # ...
  networks:
    - kaspa-network
```

### 3. Nginx Already Removed
Nginx was already removed from kaspa-user-applications profile in previous fix (TASK_6.2_NGINX_REMOVAL_FROM_USER_APPS.md).

## Kaspa User Applications Profile

The profile includes THREE web applications:

1. **Kasia** (port 3001) - Messaging app
2. **K-Social** (port 3003) - Social media app (https://github.com/thesheepcat/K/releases/tag/v0.0.14)
3. **Kaspa Explorer** (port 3004) - Block explorer (https://github.com/lAmeR1/kaspa-explorer)

All three apps connect to remote indexer endpoints configured during wizard setup:
- `REMOTE_KASIA_INDEXER_URL` (default: https://api.kasia.io/)
- `REMOTE_KSOCIAL_INDEXER_URL` (default: https://api.k-social.io/)
- `REMOTE_KASPA_NODE_WBORSH_URL` (default: wss://api.kaspa.org/)

## Testing

Created test script to verify kaspa-node is not included:

```bash
node test-kaspa-user-apps-no-node.js
```

**Results**:
```
✅ PASS: kaspa-node service NOT in kaspa-user-applications profile
✅ PASS: kasia-app has NO depends_on
✅ PASS: k-social has NO depends_on
```

## Next Steps

1. User needs to run through wizard installation again to generate new docker-compose.yml
2. Old docker-compose.yml (from Dec 5) will be replaced with correct version
3. Rebuild test release package with updated config-generator

## Files Modified

- `services/wizard/backend/src/utils/config-generator.js`
  - Made kaspa-node service conditional based on profile needs
  - Removed depends_on from kasia-app
  - Removed depends_on from k-social

## Expected Behavior

**When kaspa-user-applications profile is selected alone**:
- ✅ kasia-app container starts (port 3001)
- ✅ k-social container starts (port 3003)
- ✅ kaspa-explorer container starts (port 3004)
- ❌ kaspa-node does NOT start
- ❌ nginx does NOT start

**When kaspa-user-applications + core profiles are selected**:
- ✅ kaspa-node starts (needed by core profile)
- ✅ All three user apps start
- ❌ nginx does NOT start

## Date
December 8, 2025
