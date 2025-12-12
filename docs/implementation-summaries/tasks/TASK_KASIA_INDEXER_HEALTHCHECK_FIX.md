# Kasia Indexer Health Check Fix

## Issue Description
The kasia-indexer service was showing as "unhealthy" in Docker despite the service running correctly and processing blocks.

## Root Cause Analysis

### Investigation Process
1. Checked kasia-indexer logs - service was running and processing blocks normally
2. Tested the original health check (`nc -z localhost 8080`) - failed inside container
3. Examined how the Kasia app connects to the indexer (from Kasia app documentation and test scripts)
4. Discovered the indexer exposes `/swagger-ui/` and `/metrics` endpoints
5. Found that `localhost` resolves to IPv6 `::1` but service only listens on IPv4

### Root Causes
1. **Wrong health check method**: Using `nc -z localhost 8080` which doesn't verify the HTTP service is actually responding
2. **IPv4/IPv6 mismatch**: `localhost` resolves to IPv6 `::1` but the service listens on `0.0.0.0` (IPv4)
3. **No actual endpoint test**: The health check wasn't testing if the API endpoints were accessible

## Solution Applied

### Health Check Endpoint Discovery
From the Kasia app test script (`test-kasia-app.sh`), discovered that the kasia-indexer provides:
- `/swagger-ui/` - Swagger API documentation (returns HTTP 200)
- `/metrics` - Prometheus metrics endpoint (returns HTTP 200)

### Updated Health Check
Changed from simple port check to actual HTTP endpoint verification:

```yaml
# OLD: Simple port check (doesn't verify HTTP service)
healthcheck:
  test: ["CMD", "nc", "-z", "localhost", "8080"]

# NEW: HTTP endpoint check with explicit IPv4
healthcheck:
  test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://127.0.0.1:8080/metrics"]
```

### Key Changes
1. **Use `wget`** instead of `nc` to test HTTP endpoints
2. **Test `/metrics` endpoint** to verify the API is responding
3. **Use `127.0.0.1`** instead of `localhost` to force IPv4 connection
4. **Use `--spider` flag** to avoid downloading content (just check if accessible)

## Files Modified

### 1. docker-compose.yml
Updated kasia-indexer health check to use HTTP endpoint test with explicit IPv4 address.

### 2. services/wizard/backend/src/utils/config-generator.js
Updated the kasia-indexer service generation to include the correct health check configuration.

## Validation

### Before Fix
```bash
$ docker ps
NAMES            STATUS
kasia-indexer    Up 5 minutes (unhealthy)
```

### After Fix
```bash
$ docker ps
NAMES            STATUS
kasia-indexer    Up 43 seconds (healthy)
```

### Health Check Test
```bash
$ docker exec kasia-indexer wget --no-verbose --tries=1 --spider http://127.0.0.1:8080/metrics
Connecting to 127.0.0.1:8080 (127.0.0.1:8080)
remote file exists
Health check command: SUCCESS
```

### Endpoint Verification
```bash
$ curl -s -w "%{http_code}" -o /dev/null http://localhost:3002/metrics
200

$ curl -s -w "%{http_code}" -o /dev/null http://localhost:3002/swagger-ui/
200
```

## Impact

### Positive Outcomes
- Kasia-indexer now correctly reports as healthy
- Health check actually verifies the HTTP API is responding
- Monitoring systems can now accurately track service health
- Prevents false alarms about service failures

### Service Status Summary
After all fixes in Scenario 3 testing:
- ✅ **indexer-db**: healthy
- ✅ **kasia-indexer**: healthy (this fix)
- ✅ **k-indexer**: healthy (password fix)
- ✅ **simply-kaspa-indexer**: healthy

## Technical Details

### Why `/metrics` Endpoint?
- Standard Prometheus metrics endpoint
- Lightweight response
- Indicates the service is running and responding
- Used by the Kasia app test script for health verification

### Why `127.0.0.1` Instead of `localhost`?
- `localhost` can resolve to either IPv4 (`127.0.0.1`) or IPv6 (`::1`)
- The kasia-indexer listens on `0.0.0.0:8080` (IPv4)
- Using `127.0.0.1` explicitly ensures IPv4 connection
- Avoids "Connection refused" errors from IPv6 attempts

### Why `wget` Instead of `nc`?
- `wget` tests the actual HTTP service, not just the port
- Verifies the API is responding with valid HTTP responses
- More accurate health indication
- Matches how the Kasia app actually connects

## Related Issues Fixed
This fix is part of the Scenario 3 (Indexer Services) testing improvements:
1. Configuration UI fixes
2. Missing k-indexer service addition
3. Documentation updates
4. Architectural design improvements
5. K-indexer database connection fix (password issue)
6. **Kasia-indexer health check fix** (this document)

## Future Recommendations
1. Consider adding health check endpoints to all custom services
2. Document expected health check endpoints in service README files
3. Use HTTP endpoint checks instead of simple port checks where possible
4. Always test health checks inside containers during development
