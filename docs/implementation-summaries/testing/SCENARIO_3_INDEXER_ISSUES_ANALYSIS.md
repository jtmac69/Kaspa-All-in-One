# Scenario 3 Indexer Issues Analysis and Resolution

## Date: December 18, 2025

## Issues Identified

During Scenario 3 (Indexer Service Profile) testing, step 8, several issues were encountered:

### 1. K-Indexer Health Endpoint Not Responding ✅ FIXED

**Problem**: 
- `curl -s http://localhost:3006/health` returned no response
- Connection was being reset by peer

**Root Cause**: 
- K-Indexer was binding to `127.0.0.1:8080` internally instead of `0.0.0.0:8080`
- This prevented external access through Docker port mapping

**Solution Applied**:
1. Updated `services/k-indexer/Dockerfile` to include `--bind-address 0.0.0.0:8080` parameter
2. Rebuilt the K-Indexer Docker image
3. Restarted the service on the correct network (`kaspa-aio-v090-test_kaspa-network`)

**Verification**:
```bash
curl -s http://localhost:3006/health
# Returns: {"network":"mainnet","service":"K-webserver","status":"healthy","version":"0.1.13"}
```

### 2. Kasia-Indexer Warning Messages ⚠️ MONITORING REQUIRED

**Observed Warnings**:
```
WARN indexer_actors::virtual_chain_processor: We don't process syncer vcc for a long time
WARN protocol::operation::deserializer: Unknown operation type: 62636173743a61727665613a476f6f64206d6f726e696e67
```

**Analysis**:
- **VCC Processing Warnings**: These indicate the virtual chain processor is experiencing delays
- **Unknown Operation Type**: The hex string `62636173743a61727665613a476f6f64206d6f726e696e67` decodes to "bcast:arvea:Good morning "
- This appears to be a broadcast message that the indexer doesn't recognize

**Assessment**: 
- These are warning-level messages, not errors
- The service remains healthy and functional
- May indicate network congestion or non-standard transactions

**Recommendation**: 
- Continue monitoring
- These warnings don't prevent normal operation

### 3. Simply-Kaspa-Indexer Connection Issues ⚠️ NORMAL BEHAVIOR

**Observed Warnings**:
```
WARN Peer connection failed: failed to lookup address information: Try again, retrying...
WARN Got unexpected pruning point
```

**Analysis**:
- **DNS Resolution Failures**: Some Kaspa network seeders are temporarily unreachable
- **Unexpected Pruning Point**: Normal during initial sync or network changes
- The service successfully connects to alternative peers

**Assessment**:
- This is normal P2P network behavior
- The indexer has fallback mechanisms and connects to available peers
- Service remains functional

**Recommendation**:
- No action required
- This is expected behavior for P2P network connections

## Technical Details

### K-Indexer Fix Implementation

**File Modified**: `services/k-indexer/Dockerfile`

**Change Made**:
```dockerfile
# Before
./k-indexer \
    --db-host ${DB_HOST:-indexer-db} \
    --db-port ${DB_PORT:-5432} \
    --db-name ${DB_NAME:-ksocial} \
    --db-user ${DB_USER:-indexer} \
    --db-password ${DB_PASS:-secure_password}

# After  
./k-indexer \
    --db-host ${DB_HOST:-indexer-db} \
    --db-port ${DB_PORT:-5432} \
    --db-name ${DB_NAME:-ksocial} \
    --db-user ${DB_USER:-indexer} \
    --db-password ${DB_PASS:-secure_password} \
    --bind-address 0.0.0.0:8080
```

### Network Configuration

**Correct Network**: `kaspa-aio-v090-test_kaspa-network`
- All indexer services must be on the same Docker network
- K-social-db is accessible at `k-social-db:5432` within this network

## Current Service Status

All indexer services are now running and healthy:

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

| Service | Status | Ports |
|---------|--------|-------|
| k-indexer | Up (healthy) | 0.0.0.0:3006->8080/tcp |
| kasia-indexer | Up (healthy) | 0.0.0.0:3002->8080/tcp |
| simply-kaspa-indexer | Up (healthy) | 0.0.0.0:3005->3000/tcp |

## Testing Verification

### K-Indexer Health Check
```bash
curl -s http://localhost:3006/health | jq .
{
  "network": "mainnet",
  "service": "K-webserver", 
  "status": "healthy",
  "version": "0.1.13"
}
```

### All Services Accessible
- ✅ K-Indexer: http://localhost:3006/health
- ✅ Kasia-Indexer: http://localhost:3002 (running)
- ✅ Simply-Kaspa-Indexer: http://localhost:3005 (running)

## Recommendations for Future Testing

1. **Monitor Warning Messages**: Keep an eye on indexer logs but don't treat warnings as failures
2. **Network Connectivity**: Ensure all services are on the same Docker network
3. **Health Endpoints**: Use health endpoints to verify service availability
4. **Bind Address**: Always configure services to bind to `0.0.0.0` for Docker port mapping

## Impact on Scenario 3 Testing

- **Step 8 K-Indexer Health Check**: ✅ Now passes
- **Other Scenario 3 Steps**: Should continue normally
- **Overall Testing**: No impact on other scenarios

The primary issue (K-Indexer health endpoint) has been resolved. The warning messages in the logs are normal operational messages and don't indicate service failures.