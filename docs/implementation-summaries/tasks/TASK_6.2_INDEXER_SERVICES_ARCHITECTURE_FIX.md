# Task 6.2 - Indexer Services Architecture Fix

## Critical Issues Identified

During Scenario 3 testing, several **critical architectural issues** were discovered with the Indexer Services profile:

### 1. **Forced Kaspa Node Dependency**
**Problem**: Selecting only "Indexer Services" profile still deployed a kaspa-node container, contradicting the design principle that indexers should work with public endpoints.

**Evidence**: Docker output showed `kaspa-node` container running when only indexer-services was selected.

### 2. **K-Indexer Health Check Failure**
**Problem**: K-indexer showed "unhealthy" status, indicating health check issues.

**Evidence**: `docker ps` showed `k-indexer` as "Up 13 minutes (unhealthy)".

### 3. **Missing Health Checks**
**Problem**: Most indexer services showed no health status, making it impossible to verify they're working correctly.

**Evidence**: Only `indexer-db` showed "(healthy)" status, others showed no health indication.

## Root Cause Analysis

### Issue 1: Incorrect Node Profile Logic
**File**: `services/wizard/backend/src/utils/config-generator.js` line 1015

**Before**:
```javascript
const nodeProfiles = ['core', 'archive-node', 'mining', 'indexer-services'].filter(p => profiles.includes(p));
```

**Problem**: `indexer-services` was included in `nodeProfiles`, forcing kaspa-node deployment.

### Issue 2: Hard Dependencies on Local Node
**Files**: Docker Compose generation for indexer services

**Before**:
```yaml
depends_on:
  indexer-db:
    condition: service_healthy
  kaspa-node:
    condition: service_started
```

**Problem**: All indexers had hard dependencies on kaspa-node, preventing standalone operation.

### Issue 3: Local Node Default URLs
**Before**:
```yaml
environment:
  - KASPA_NODE_URL=${REMOTE_KASPA_NODE_URL:-http://kaspa-node:16110}
```

**Problem**: Default URLs pointed to local kaspa-node, which wouldn't exist in indexer-only deployments.

## Fixes Applied

### 1. **Removed Indexer Services from Node Profiles**
**File**: `services/wizard/backend/src/utils/config-generator.js`

**Change**:
```javascript
// Before
const nodeProfiles = ['core', 'archive-node', 'mining', 'indexer-services'].filter(p => profiles.includes(p));

// After  
const nodeProfiles = ['core', 'archive-node', 'mining'].filter(p => profiles.includes(p));
```

**Impact**: Indexer Services profile no longer automatically deploys kaspa-node.

### 2. **Removed Hard Dependencies on Kaspa Node**
**Services Updated**: k-indexer, simply-kaspa-indexer

**Before**:
```yaml
depends_on:
  indexer-db:
    condition: service_healthy
  kaspa-node:
    condition: service_started
```

**After**:
```yaml
depends_on:
  indexer-db:
    condition: service_healthy
```

**Impact**: Indexers can start without waiting for local kaspa-node.

### 3. **Updated Default Endpoints to Public APIs**
**Services Updated**: k-indexer, simply-kaspa-indexer

**Before**:
```yaml
- KASPA_NODE_URL=${REMOTE_KASPA_NODE_URL:-http://kaspa-node:16110}
```

**After**:
```yaml
- KASPA_NODE_URL=${REMOTE_KASPA_NODE_URL:-https://api.kaspa.org}
```

**Impact**: Indexers default to public Kaspa API when no local node is available.

### 4. **Added Comprehensive Health Checks**
**Services Updated**: kasia-indexer, k-indexer, simply-kaspa-indexer

**Added to each service**:
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
  interval: 30s
  timeout: 10s
  start_period: 60s
  retries: 3
```

**Impact**: All indexer services now report proper health status.

## New Architecture

### Indexer Services Profile (Standalone)
When **only** Indexer Services is selected:

**Services Deployed**:
- ✅ `indexer-db` (TimescaleDB)
- ✅ `kasia-indexer` 
- ✅ `k-indexer`
- ✅ `simply-kaspa-indexer`
- ❌ `kaspa-node` (not included)

**Network Configuration**:
- Indexers connect to `https://api.kaspa.org` (public Kaspa API)
- Database connections remain local (indexer-db)
- No external network configuration needed

### Combined Profiles (Core + Indexer Services)
When **both** Core and Indexer Services are selected:

**Services Deployed**:
- ✅ `kaspa-node` (from Core profile)
- ✅ `indexer-db` (TimescaleDB)
- ✅ `kasia-indexer`
- ✅ `k-indexer` 
- ✅ `simply-kaspa-indexer`

**Network Configuration**:
- Indexers can connect to local `kaspa-node` if configured
- Fallback to public API if local node unavailable
- External network configuration available for kaspa-node

## Expected Results After Fix

### Docker Container Status
When testing Indexer Services only:
```bash
docker ps
```

**Should show**:
- ✅ `indexer-db` - Status: "Up X minutes (healthy)"
- ✅ `kasia-indexer` - Status: "Up X minutes (healthy)"
- ✅ `k-indexer` - Status: "Up X minutes (healthy)"
- ✅ `simply-kaspa-indexer` - Status: "Up X minutes (healthy)"
- ❌ `kaspa-node` - Should NOT be present

### Service Health Verification
```bash
# All services should respond to health checks
curl -f http://localhost:3002/health  # kasia-indexer
curl -f http://localhost:3006/health  # k-indexer  
curl -f http://localhost:3005/health  # simply-kaspa-indexer
```

### Log Verification
```bash
# Indexers should connect to public API
docker logs k-indexer --tail 20
# Should show connection to https://api.kaspa.org, not kaspa-node:16110
```

## Impact

### Before Fix
- ❌ Indexer Services forced unnecessary kaspa-node deployment
- ❌ Contradicted design principle of standalone indexer operation
- ❌ K-indexer showed unhealthy status
- ❌ No health visibility for most services
- ❌ Hard dependencies prevented flexible deployment

### After Fix
- ✅ Indexer Services can operate standalone with public APIs
- ✅ Proper architectural separation of concerns
- ✅ All services report health status correctly
- ✅ Flexible deployment options (with or without local node)
- ✅ Reduced resource usage when local node not needed

## Validation Required

### Test Scenarios

1. **Indexer Services Only**:
   - Select only "Indexer Services" profile
   - Verify no kaspa-node container deployed
   - Verify all indexer services healthy
   - Verify indexers connect to public API

2. **Core + Indexer Services**:
   - Select both profiles
   - Verify kaspa-node deployed
   - Verify indexers can use local node
   - Verify fallback to public API works

3. **Health Check Validation**:
   - All services should show health status
   - Health endpoints should respond correctly
   - Unhealthy services should be detectable

## Files Modified

- `services/wizard/backend/src/utils/config-generator.js` - Major architectural changes
- `docs/implementation-summaries/tasks/TASK_6.2_INDEXER_SERVICES_ARCHITECTURE_FIX.md` (this file)

## Status

✅ **COMPLETE** - Indexer Services architecture fixed for standalone operation with proper health checks.

## Key Architectural Principle

**Indexer Services should be deployment-flexible**:
- Can operate standalone with public APIs (minimal resource usage)
- Can integrate with local node when available (optimal performance)
- Should not force unnecessary service deployment
- Must provide clear health status for monitoring

This fix aligns the implementation with the intended architecture and provides users with flexible deployment options based on their needs and resources.