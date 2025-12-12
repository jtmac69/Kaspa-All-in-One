# Simply Kaspa Indexer Connection Fix

## Issue
The simply-kaspa-indexer service was failing with a `PoolTimedOut` error when trying to connect to the database, despite the database being healthy and accessible.

## Root Cause Analysis

### Investigation Steps
1. Checked database connectivity - PostgreSQL was accepting connections
2. Verified database user and permissions - all correct
3. Tested manual connection with psql - successful
4. Examined simply-kaspa-indexer logs - showed `Database connection FAILED: PoolTimedOut`
5. Checked the indexer's command-line help output

### Discovery
The simply-kaspa-indexer application requires database connection parameters to be passed as **command-line flags**, not environment variables:
- ❌ Does NOT use: `DATABASE_URL` environment variable
- ✅ Requires: `--database-url` command-line flag
- ✅ Requires: `--listen` command-line flag for network binding

## Solution

### 1. Fixed Database Connection
Updated `services/simply-kaspa-indexer/Dockerfile` to pass the DATABASE_URL as a command-line argument:

```dockerfile
# Before
CMD ["sh", "-c", "/app/wait-for-db.sh && /usr/local/bin/simply-kaspa-indexer"]

# After
CMD ["sh", "-c", "/app/wait-for-db.sh && /usr/local/bin/simply-kaspa-indexer --database-url \"$DATABASE_URL\" --listen 0.0.0.0:3000"]
```

**Key changes:**
- Added `--database-url "$DATABASE_URL"` flag to pass the connection string
- Added `--listen 0.0.0.0:3000` to bind to all interfaces (required for Docker health checks)

### 2. Fixed Health Check
Updated `docker-compose.yml` to use the correct health check endpoint:

```yaml
# Before
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/health"]

# After  
healthcheck:
  test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://127.0.0.1:3000/api/metrics"]
```

**Key changes:**
- Changed from `curl` to `wget` (curl not available in the container)
- Changed endpoint from `/health` to `/api/metrics` (correct API path)
- Used `127.0.0.1` instead of `localhost` for IPv4 consistency

## Verification

### Connection Test
```bash
# Manual test with command-line flag
docker exec simply-kaspa-indexer /usr/local/bin/simply-kaspa-indexer \
  --database-url "postgresql://kaspa:PASSWORD@indexer-db:5432/simply_kaspa"

# Output:
[INFO] Connected to PostgreSQL postgresql://kaspa:***@indexer-db:5432/simply_kaspa
[INFO] Schema v10 is up to date
[INFO] Connected to Kaspad wss://...
[INFO] Starting web server listener on 0.0.0.0:3000, api path: /api
```

### Health Check Test
```bash
# Test metrics endpoint
docker exec simply-kaspa-indexer wget -q -O - http://127.0.0.1:3000/api/metrics

# Returns JSON with indexer status and metrics
```

### Service Status
```bash
docker ps | grep indexer

# All services healthy:
# ✅ indexer-db: healthy
# ✅ kasia-indexer: healthy
# ✅ k-indexer: healthy
# ✅ simply-kaspa-indexer: healthy
```

## Related Fixes

This fix is part of a series of indexer service fixes:

1. **Password Generation Fix** - Changed to alphanumeric-only passwords to prevent URL parsing issues
2. **K-Indexer Connection Fix** - Fixed port parsing issues caused by special characters
3. **Kasia-Indexer Health Check Fix** - Changed from `nc -z` to `wget /metrics` endpoint
4. **Simply-Kaspa-Indexer Fix** (this document) - Fixed command-line argument passing and health check

## Files Modified

1. `services/simply-kaspa-indexer/Dockerfile`
   - Updated CMD to pass `--database-url` and `--listen` flags

2. `docker-compose.yml`
   - Updated simply-kaspa-indexer health check to use wget and /api/metrics endpoint

## Testing

### Scenario 3: Indexer Services Profile
All indexer services now start successfully and report healthy status:

```bash
# Start the indexer services profile
docker compose --profile indexer-services up -d

# Check status
docker ps

# All services should show (healthy) status within 60 seconds
```

## Lessons Learned

1. **Check Application Documentation**: Different applications have different configuration methods
   - Some use environment variables
   - Some use command-line flags
   - Some use configuration files

2. **Test Command-Line Help**: Running `--help` revealed the correct usage pattern

3. **Consistency Across Services**: Following the pattern from kasia-indexer (using wget and /metrics) led to the solution

4. **Health Check Endpoints**: Always verify the actual API structure:
   - Simply-kaspa-indexer uses `/api/*` prefix for all endpoints
   - `/api/metrics` is more reliable than `/api/health` during sync

## Impact

- ✅ Simply-kaspa-indexer now connects to database successfully
- ✅ All four indexer services are healthy
- ✅ Indexer Services profile (Scenario 3) is fully functional
- ✅ Fix is permanent - applied to Dockerfile and docker-compose.yml

## Date
December 12, 2025
