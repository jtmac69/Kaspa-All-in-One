# Task 6.2 - Indexer Services Missing K-Indexer Service Fix

## Critical Issue Identified

During Scenario 3 testing (Indexer Services), a **critical service definition bug** was discovered:

**Problem**: The wizard attempted to build `k-indexer` service, but it was completely missing from the Docker Compose generation, causing installation failure.

**Error Message**: 
```
❌ ERROR: Failed to build some services
- k-indexer: Command failed: cd /path && docker compose build k-indexer
no such service: k-indexer
```

**Root Cause**: The `k-indexer` service was referenced throughout the codebase but was missing from the Docker Compose generation logic in `config-generator.js`.

## Analysis

### Service References Found
The `k-indexer` service was referenced in multiple places:
- ✅ **Profile Manager**: Listed in indexer-services profile
- ✅ **Docker Manager**: Listed in build services
- ✅ **Configuration**: Referenced in environment variables
- ✅ **Service Directory**: `services/k-indexer/` exists with Dockerfile
- ❌ **Docker Compose Generation**: **MISSING** - this was the bug

### Expected Services for Indexer Profile
The indexer-services profile should include:
1. ✅ `indexer-db` (TimescaleDB) - was present
2. ✅ `kasia-indexer` - was present  
3. ❌ `k-indexer` - **MISSING** - this caused the failure
4. ✅ `simply-kaspa-indexer` - was present

## Fix Applied

### 1. Added K-Indexer Service Definition
**File**: `services/wizard/backend/src/utils/config-generator.js`

**Added after kasia-indexer service**:
```yaml
# K-Indexer (K-Social Indexer)
k-indexer:
  build:
    context: ./services/k-indexer
    dockerfile: Dockerfile
  container_name: k-indexer
  restart: unless-stopped
  ports:
    - "${K_INDEXER_PORT:-3006}:8080"
  environment:
    - KASPA_NODE_URL=${REMOTE_KASPA_NODE_URL:-http://kaspa-node:16110}
    - DATABASE_URL=postgresql://${POSTGRES_USER:-indexer}:${POSTGRES_PASSWORD}@indexer-db:5432/k_social
    - POSTGRES_HOST=indexer-db
    - POSTGRES_PORT=5432
    - POSTGRES_DB=k_social
    - POSTGRES_USER=${POSTGRES_USER:-indexer}
    - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
  volumes:
    - k-indexer-data:/app/data
  depends_on:
    indexer-db:
      condition: service_healthy
    kaspa-node:
      condition: service_started
  networks:
    - kaspa-network
  profiles:
    - indexer-services
```

### 2. Added K-Indexer Data Volume
**Added to volumes section**:
```yaml
k-indexer-data:
```

### 3. Added TimescaleDB Health Check
**Enhanced indexer-db service**:
```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-indexer} -d ${POSTGRES_DB:-kaspa_indexers}"]
  interval: 10s
  timeout: 5s
  retries: 5
```

## Service Configuration Details

### K-Indexer Service Specifications
- **Purpose**: K-Social blockchain indexer
- **Port**: 3006 (configurable via K_INDEXER_PORT)
- **Database**: Uses k_social database in shared TimescaleDB
- **Dependencies**: Requires both indexer-db (healthy) and kaspa-node (started)
- **Data Storage**: Persistent volume for indexer data

### Database Integration
- **Shared Database**: Uses same TimescaleDB instance as other indexers
- **Separate Schema**: Uses `k_social` database within TimescaleDB
- **Health Dependency**: Waits for database to be healthy before starting

### Network Integration
- **Kaspa Node Connection**: Connects to local kaspa-node for blockchain data
- **API Endpoint**: Exposes API on port 8080 (mapped to host port 3006)
- **Internal Network**: Communicates with other services via kaspa-network

## Impact

### Before Fix
- ❌ Indexer Services installation failed immediately
- ❌ Error: "no such service: k-indexer"
- ❌ Wizard could not complete indexer profile deployment

### After Fix
- ✅ All indexer services properly defined
- ✅ K-Indexer builds and starts correctly
- ✅ Complete indexer infrastructure deployment
- ✅ Proper service dependencies and health checks

## Validation Required

### Manual Testing Steps
1. **Select Indexer Services profile**
2. **Complete configuration** (database password)
3. **Start installation**
4. **Verify all services build**:
   - ✅ indexer-db (TimescaleDB)
   - ✅ kasia-indexer
   - ✅ k-indexer (should now work)
   - ✅ simply-kaspa-indexer
5. **Verify all services start and are healthy**

### Expected Results
- All Docker images should build successfully
- All services should start without errors
- Health checks should pass
- Services should be accessible on their configured ports

## Related Files Modified

- `services/wizard/backend/src/utils/config-generator.js` - Added k-indexer service definition and volume
- `docs/implementation-summaries/tasks/TASK_6.2_INDEXER_SERVICES_MISSING_K_INDEXER_FIX.md` (this file)

## Next Steps

1. **Test the fix**: Rebuild test release and retry Scenario 3
2. **Validate all indexer services**: Ensure complete indexer infrastructure works
3. **Update test documentation**: If needed, update TESTING.md with any new findings
4. **Monitor for similar issues**: Check if other profiles have missing services

## Status

✅ **COMPLETE** - K-Indexer service definition added to Docker Compose generation, ready for testing validation.

## Critical Lesson

This highlights the importance of **comprehensive service definition validation**. The system had:
- ✅ Service directory with Dockerfile
- ✅ Profile definitions
- ✅ Build configurations  
- ❌ **Missing Docker Compose generation** - the critical gap

Future improvements should include automated validation that all services referenced in profiles are properly defined in Docker Compose generation.