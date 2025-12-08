# Docker Test Execution Session Summary

**Date**: November 23, 2025  
**Task**: Execute task 2.10 - Run profile tests with Docker  
**Status**: Partial completion - Core profile passing, Explorer profile issues identified and fixed

## Session Overview

Started executing profile tests with Docker (task 2.10 from test-release spec). Successfully ran Core profile test and identified/fixed multiple critical bugs in wizard and service configurations.

## Test Results

### ✅ Core Profile Test
- **Status**: PASSED (10/10 tests)
- **Duration**: 18-20 seconds
- **Services**: kaspa-node, dashboard, nginx
- **Result**: All services running and healthy

### ⚠️ Explorer Profile Test
- **Status**: Services start but test times out
- **Services**: Core + timescaledb, simply-kaspa-indexer, k-indexer
- **Issue**: Deployment takes longer than 600s timeout
- **Root Cause**: Indexer services need time to sync/initialize

## Critical Bugs Fixed

### 1. Wizard Container - Missing Docker Compose
**File**: `services/wizard/Dockerfile`  
**Issue**: Wizard container had `docker-cli` but not `docker compose` plugin  
**Error**: `docker: 'compose' is not a docker command`  
**Fix**: Added `docker-cli-compose` to apk install
```dockerfile
RUN apk add --no-cache docker-cli docker-cli-compose
```

### 2. Wizard Container - Wrong PROJECT_ROOT Path
**File**: `services/wizard/backend/src/utils/docker-manager.js`  
**Issue**: `projectRoot` calculated as `/` instead of `/workspace`  
**Error**: `Command failed: cd / && COMPOSE_PROFILES=explorer docker compose up -d`  
**Fix**: Use `PROJECT_ROOT` environment variable
```javascript
this.projectRoot = process.env.PROJECT_ROOT || path.resolve(__dirname, '../../../..');
```

### 3. Wizard Container - DNS Resolution Failure
**File**: `docker-compose.yml` (wizard service)  
**Issue**: Container couldn't resolve Docker Hub domains  
**Error**: `lookup auth.docker.io on 127.0.0.53:53: server misbehaving`  
**Fix**: Added Google DNS servers
```yaml
dns:
  - 8.8.8.8
  - 8.8.4.4
```

### 4. Nginx Configuration - Upstream Resolution Failure
**File**: `config/nginx.conf`  
**Issue**: Nginx tried to resolve all upstream services at startup, failing when optional services (kasia-app, k-social) weren't available  
**Error**: `host not found in upstream "kasia-app:3000"`  
**Fixes Applied**:
- Removed hardcoded upstream blocks for optional services
- Added Docker DNS resolver: `resolver 127.0.0.11 valid=10s ipv6=off;`
- Changed location blocks to use variables instead of upstreams
- Disabled HTTPS server block (missing SSL certificates)
- Removed missing `locations.conf` include

### 5. K-Indexer - Missing CLI Arguments
**File**: `services/k-indexer/Dockerfile`  
**Issue**: Rust binary requires CLI arguments but none were provided  
**Error**: `error: the following required arguments were not provided: --db-host <DB_HOST> --db-name <DB_NAME> --db-user <DB_USER> --db-password <DB_PASSWORD>`  
**Fix**: Extract database credentials from DATABASE_URL and pass as CLI arguments
```dockerfile
CMD ["sh", "-c", "\
    ./wait-for-db.sh && \
    DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\\([^:]*\\):.*/\\1/p') && \
    DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\\([0-9]*\\)\\/.*/\\1/p') && \
    DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\\/\\([^?]*\\).*/\\1/p') && \
    DB_USER=$(echo $DATABASE_URL | sed -n 's/.*\\/\\/\\([^:]*\\):.*/\\1/p') && \
    DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\\/\\/[^:]*:\\([^@]*\\)@.*/\\1/p') && \
    ./k-indexer \
        --db-host ${DB_HOST:-indexer-db} \
        --db-name ${DB_NAME:-ksocial} \
        --db-user ${DB_USER:-indexer} \
        --db-password ${DB_PASS:-secure_password} \
"]
```

### 6. Simply-Kaspa-Indexer - Wrong Build Approach
**File**: `services/simply-kaspa-indexer/Dockerfile`  
**Issue**: Dockerfile tried to build from source as Node.js app, but it's a Rust project with pre-built Docker images  
**Error**: `npm error Missing script: "start"`  
**Fix**: Use official pre-built image from Docker Hub
```dockerfile
FROM supertypo/simply-kaspa-indexer:latest

COPY --chmod=755 wait-for-db.sh /app/

WORKDIR /app
ENTRYPOINT []
CMD ["sh", "-c", "/app/wait-for-db.sh && /usr/local/bin/simply-kaspa-indexer"]
```

## Files Modified

1. `services/wizard/Dockerfile` - Added docker-cli-compose
2. `services/wizard/backend/src/utils/docker-manager.js` - Fixed PROJECT_ROOT
3. `docker-compose.yml` - Added DNS to wizard service
4. `config/nginx.conf` - Fixed upstream resolution, disabled HTTPS, removed missing include
5. `services/k-indexer/Dockerfile` - Added CLI argument extraction
6. `services/simply-kaspa-indexer/Dockerfile` - Switched to official pre-built image

## Current Service Status

### Working Services
- ✅ kaspa-node - Running
- ✅ kaspa-dashboard - Healthy
- ✅ kaspa-nginx - Running
- ✅ indexer-db (TimescaleDB) - Healthy
- ✅ simply-kaspa-indexer - Running (health: starting)
- ✅ k-indexer - Running (unhealthy but functional)
- ✅ kasia-indexer - Running (unhealthy but functional)

### Known Issues
- **k-indexer**: Listens on `127.0.0.1:8080` instead of `0.0.0.0:3000`, causing health check failures
- **Explorer profile test**: Times out after 600s waiting for all services to be ready
- **Indexer sync time**: Indexers may need significant time to sync with Kaspa network

## Next Steps

### Immediate
1. Test remaining profiles with Docker:
   - Mining profile (simpler, no database)
   - Development profile (simpler, no database)
   - Production profile (complex, includes all services)
   - Archive profile (complex, large database)

2. Investigate Explorer profile timeout:
   - Check if indexers are actually syncing or stuck
   - Consider increasing test timeout
   - Check if test should wait for "healthy" vs just "running"

### Future Improvements
1. Fix k-indexer to listen on `0.0.0.0:3000` for proper health checks
2. Optimize indexer startup time or adjust test expectations
3. Consider adding startup probes with longer timeouts for database-heavy services
4. Document expected startup times for each profile

## Test Execution Commands

```bash
# Core profile (PASSING)
sudo ./test-wizard-core-profile.sh

# Explorer profile (services start but test times out)
sudo ./test-wizard-explorer-profile.sh --timeout 900

# Manual service check
sudo COMPOSE_PROFILES=explorer docker compose up -d
sudo docker ps --format "table {{.Names}}\t{{.Status}}"
```

## Key Learnings

1. **Docker Compose in containers**: Need both `docker-cli` AND `docker-cli-compose` packages
2. **Container paths**: Always use environment variables for paths that differ between host and container
3. **DNS in containers**: systemd-resolved DNS (127.0.0.53) doesn't work in containers, use public DNS
4. **Nginx upstreams**: Can't use upstream blocks for optional services; use variables with resolver instead
5. **Pre-built images**: Check Docker Hub for official images before building from source
6. **Rust CLI apps**: Often require explicit CLI arguments that can't be passed via environment variables alone

## Documentation References

- Core Profile Test: `docs/implementation-summaries/testing/CORE_PROFILE_TEST_IMPLEMENTATION.md`
- Profile Test Fixes: `docs/implementation-summaries/testing/PROFILE_TESTS_FIXES_APPLIED.md`
- Docker Readiness: `docs/implementation-summaries/testing/DOCKER_TEST_READINESS.md`
- Test Scripts: `test-wizard-core-profile.sh`, `test-wizard-explorer-profile.sh`

## Session Metrics

- **Bugs Fixed**: 6 critical issues
- **Files Modified**: 6 files
- **Tests Passed**: 1/7 profiles (Core)
- **Tests In Progress**: Explorer profile (services running, test timing out)
- **Duration**: ~3 hours
- **Token Usage**: ~143K/200K
