# Integration Gaps Analysis - Fixes Not Yet Propagated

**Date**: November 23, 2025  
**Context**: After fixing bugs in wizard and service configurations during Docker testing

## Summary

**Answer to your question**: **NO** - The fixes we made have NOT fully propagated to all needed places. There are integration gaps that need to be addressed.

## Critical Integration Issues Found

### 1. ❌ K-Indexer Port Mismatch

**Problem**: K-indexer listens on `127.0.0.1:8080` but configuration expects `0.0.0.0:3000`

**Evidence from logs**:
```
2025-11-23T23:12:50.353483Z  INFO K_webserver::web_server: Web server starting on 127.0.0.1:8080
```

**Affected Components**:

#### A. Docker Compose Configuration
**File**: `docker-compose.yml` (line 286)
```yaml
ports:
  - "${KSOCIAL_INDEXER_PORT:-3004}:3000"  # ❌ Maps to port 3000, but service uses 8080
```

**Should be**:
```yaml
ports:
  - "${KSOCIAL_INDEXER_PORT:-3004}:8080"  # ✅ Map to actual port
```

#### B. Health Check
**File**: `docker-compose.yml` (line 298)
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/health"]  # ❌ Wrong port
```

**Should be**:
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8080/health"]  # ✅ Correct port
```

#### C. Dashboard Monitoring
**File**: `services/dashboard/server.js` (line 212)
```javascript
{ name: 'k-indexer', displayName: 'K Indexer', url: 'http://k-indexer:3000', type: 'http', profile: 'explorer' },
```

**Should be**:
```javascript
{ name: 'k-indexer', displayName: 'K Indexer', url: 'http://k-indexer:8080', type: 'http', profile: 'explorer' },
```

#### D. Nginx Proxy (if used)
**File**: `config/nginx.conf` (line ~160)
```nginx
location /social-api/ {
    set $k_indexer k-indexer:3000;  # ❌ Wrong port
```

**Should be**:
```nginx
location /social-api/ {
    set $k_indexer k-indexer:8080;  # ✅ Correct port
```

**OR** - Better solution: Configure k-indexer to listen on `0.0.0.0:3000` instead of `127.0.0.1:8080`

---

### 2. ⚠️ Simply-Kaspa-Indexer - Using Official Image

**Change Made**: Switched from building from source to using official Docker Hub image

**Potential Impact Areas to Verify**:

#### A. Documentation
**Files to check**:
- `README.md` - Does it mention building from source?
- `services/simply-kaspa-indexer/README.md` - Build instructions
- Any installation guides

#### B. Configuration Files
**Files we copied but may not be used**:
- `services/simply-kaspa-indexer/timescaledb-config.toml`
- `services/simply-kaspa-indexer/batch-processor-config.toml`
- `services/simply-kaspa-indexer/personal-indexer-config.toml`

**Question**: Does the official image support these config files, or does it only use environment variables?

#### C. Dashboard Monitoring
**File**: `services/dashboard/server.js` (line 213)
```javascript
{ name: 'simply-kaspa-indexer', displayName: 'Simply Kaspa Indexer', url: 'http://simply-kaspa-indexer:3000', type: 'http', profile: 'explorer' },
```

**Status**: ✅ Correct - Official image does expose port 3000

---

### 3. ✅ Wizard Fixes - Properly Isolated

**Good News**: The wizard fixes are self-contained and don't need propagation:

- **Docker Compose plugin**: Only affects wizard container
- **PROJECT_ROOT**: Only used within wizard container
- **DNS configuration**: Only affects wizard container

**No action needed** for these fixes.

---

### 4. ✅ Nginx Configuration - Properly Applied

**Good News**: Nginx config changes are in the shared `config/nginx.conf` file used by all profiles.

**Verified**:
- Variables instead of upstreams: ✅ Applied globally
- HTTPS disabled: ✅ Applied globally
- Missing include removed: ✅ Applied globally

**No action needed** for these fixes.

---

## Required Actions

### High Priority

1. **Fix k-indexer port configuration** (choose one approach):
   
   **Option A**: Update all references to use port 8080
   - Update `docker-compose.yml` port mapping
   - Update `docker-compose.yml` health check
   - Update `services/dashboard/server.js` monitoring URL
   - Update `config/nginx.conf` proxy configuration
   
   **Option B**: Configure k-indexer to listen on 0.0.0.0:3000 (preferred)
   - Check k-indexer documentation for configuration options
   - Add environment variables or config file to change listen address
   - This maintains consistency with other services

2. **Verify simply-kaspa-indexer configuration**
   - Test if official image respects the config files we're copying
   - If not, remove unused config files or document they're not used
   - Update any documentation that mentions building from source

### Medium Priority

3. **Update installation documentation**
   - Document that simply-kaspa-indexer uses official Docker Hub image
   - Document k-indexer port configuration
   - Update any build-from-source instructions

4. **Test dashboard monitoring**
   - Verify dashboard can actually reach k-indexer on correct port
   - Verify dashboard can monitor simply-kaspa-indexer
   - Test health checks work correctly

### Low Priority

5. **Update PR proposals**
   - Check if `docs/pr-proposals/k-social-indexer-timescaledb-pr.md` needs updates
   - Check if `docs/pr-proposals/simply-kaspa-indexer-timescaledb-pr.md` needs updates

---

## Testing Checklist

After making the above changes, verify:

- [ ] K-indexer health check passes
- [ ] Dashboard shows k-indexer as healthy
- [ ] Nginx can proxy to k-indexer successfully
- [ ] Simply-kaspa-indexer starts and runs correctly
- [ ] Dashboard shows simply-kaspa-indexer as healthy
- [ ] All Explorer profile services are monitored correctly
- [ ] Core profile test still passes (10/10)
- [ ] Explorer profile test passes with fixes

---

## Impact Assessment

### Services Affected
- ❌ **k-indexer**: Port mismatch affects health checks, monitoring, and proxying
- ⚠️ **simply-kaspa-indexer**: Config file usage unclear
- ✅ **All other services**: No issues

### Components Affected
- ❌ **Dashboard monitoring**: Can't reach k-indexer on wrong port
- ❌ **Health checks**: Failing for k-indexer
- ⚠️ **Nginx proxy**: May not route to k-indexer correctly
- ✅ **Wizard**: Fixes are self-contained
- ✅ **Core profile**: No indexers, not affected

### User Impact
- **Current state**: Explorer profile services start but show as unhealthy
- **After fixes**: All services should show as healthy and be properly monitored

---

## Recommendations

1. **Immediate**: Fix k-indexer port configuration (Option B preferred - configure service to use 0.0.0.0:3000)
2. **Short-term**: Verify and document simply-kaspa-indexer configuration approach
3. **Medium-term**: Run full test suite on all profiles after fixes
4. **Long-term**: Add integration tests that verify dashboard can monitor all services

---

## Related Documents

- Session Summary: `docs/implementation-summaries/testing/DOCKER_TEST_SESSION_SUMMARY.md`
- Profile Test Fixes: `docs/implementation-summaries/testing/PROFILE_TESTS_FIXES_APPLIED.md`
- Docker Readiness: `docs/implementation-summaries/testing/DOCKER_TEST_READINESS.md`
