# Kasia Indexer WebSocket Endpoint Fix

## Issue
The kasia-indexer service was failing to connect to the Kaspa network due to the default WebSocket endpoint `wss://wrpc.kasia.fyi` returning HTTP 502 (Bad Gateway) errors.

## Error Symptoms
```
2025-12-13 15:42:22  INFO indexer_actors::data_source: Connected to Some("wss://wrpc.kasia.fyi")
2025-12-13 15:42:23 ERROR indexer_actors::data_source: Error while connecting to node: vcc handler connect send failed
2025-12-13 15:42:23  WARN indexer_actors::data_source: Disconnecting and retrying connection in 3 seconds
```

## Root Cause Analysis

### Investigation Steps
1. **Checked kasia-indexer logs**: Showed repeated connection failures to `wss://wrpc.kasia.fyi`
2. **Tested endpoint availability**: `curl -I https://wrpc.kasia.fyi` returned HTTP 502 Bad Gateway
3. **Compared with working services**: simply-kaspa-indexer was successfully using alternative endpoints
4. **Identified working endpoints**: Found `wss://rose.kaspa.green/kaspa/mainnet/wrpc/borsh` and others in use

### Discovery
The default WebSocket endpoint `wss://wrpc.kasia.fyi` was experiencing server issues (HTTP 502), while alternative Kaspa WebSocket endpoints were available and working:
- ✅ `wss://rose.kaspa.green/kaspa/mainnet/wrpc/borsh`
- ✅ `wss://vivi.kaspa.blue/kaspa/mainnet/wrpc/borsh`
- ✅ `wss://luna.kaspa.blue/kaspa/mainnet/wrpc/borsh`

## Solution

### 1. Updated Environment Variable
Added working endpoint to `.env` file:
```bash
KASPA_NODE_WBORSH_URL=wss://rose.kaspa.green/kaspa/mainnet/wrpc/borsh
```

### 2. Updated Config Generator
Modified `services/wizard/backend/src/utils/config-generator.js` to use working endpoint as default:
```javascript
// Before
`KASPA_NODE_WBORSH_URL=\${KASPA_NODE_WBORSH_URL:-wss://wrpc.kasia.fyi}`

// After
`KASPA_NODE_WBORSH_URL=\${KASPA_NODE_WBORSH_URL:-wss://rose.kaspa.green/kaspa/mainnet/wrpc/borsh}`
```

### 3. Updated Docker Compose
Modified `docker-compose.yml` to use working endpoint as default:
```yaml
# Before
- KASPA_NODE_WBORSH_URL=${KASPA_NODE_WBORSH_URL:-wss://wrpc.kasia.fyi}

# After
- KASPA_NODE_WBORSH_URL=${KASPA_NODE_WBORSH_URL:-wss://rose.kaspa.green/kaspa/mainnet/wrpc/borsh}
```

### 4. Recreated Container
Recreated the kasia-indexer container to pick up the new environment variable:
```bash
docker stop kasia-indexer && docker rm kasia-indexer && docker compose up -d kasia-indexer
```

## Verification

### Connection Success
```bash
docker logs kasia-indexer --tail 30

# Output:
2025-12-13 16:41:50  INFO indexer_actors::data_source: Connected to Some("wss://rose.kaspa.green/kaspa/mainnet/wrpc/borsh")
2025-12-13 16:41:50  INFO indexer_actors::data_source: Successfully connected to RPC client
2025-12-13 16:41:50  INFO indexer_actors::virtual_chain_syncer: Starting VirtualChainSyncer
2025-12-13 16:41:50  INFO indexer_actors::block_gap_filler: Starting historical data synchronization
```

### Health Check Success
```bash
docker ps | grep kasia-indexer

# Output:
kasia-indexer ... Up 44 seconds (healthy) ... kasia-indexer
```

### Service Status
All indexer services now healthy:
- ✅ indexer-db: healthy
- ✅ kasia-indexer: healthy (FIXED!)
- ✅ k-indexer: healthy
- ✅ simply-kaspa-indexer: healthy

## Alternative Endpoints

If `wss://rose.kaspa.green/kaspa/mainnet/wrpc/borsh` becomes unavailable, these alternatives can be used:

### Working Kaspa WebSocket Endpoints
- `wss://vivi.kaspa.blue/kaspa/mainnet/wrpc/borsh`
- `wss://luna.kaspa.blue/kaspa/mainnet/wrpc/borsh`
- `wss://iris.kaspa.blue/kaspa/mainnet/wrpc/borsh`

### How to Change Endpoint
1. **Update .env file**:
   ```bash
   KASPA_NODE_WBORSH_URL=wss://vivi.kaspa.blue/kaspa/mainnet/wrpc/borsh
   ```

2. **Recreate container**:
   ```bash
   docker stop kasia-indexer && docker rm kasia-indexer && docker compose up -d kasia-indexer
   ```

## Impact on Fresh Installations

### Wizard Installations
- ✅ Config generator now uses working endpoint by default
- ✅ New installations will connect successfully from the start
- ✅ No manual intervention required

### Manual Installations
- ✅ Docker-compose.yml now has working default endpoint
- ✅ Fresh installations will work without .env customization
- ✅ Existing installations can be fixed by updating .env and recreating container

## Testing Instructions Update

Updated TESTING.md to include troubleshooting for kasia-indexer connection issues:

### Expected Behavior
- ✅ Should connect within 10-15 seconds of startup
- ✅ Should show "Successfully connected to RPC client" in logs
- ✅ Should start "VirtualChainSyncer" and begin gap filling
- ✅ Should report healthy status within 60 seconds

### Troubleshooting
If kasia-indexer shows connection errors:
1. Check logs: `docker logs kasia-indexer --tail 20`
2. Look for "Error while connecting to node" messages
3. Try alternative endpoint in .env file
4. Recreate container to pick up new endpoint

## Files Modified

1. **`.env`** - Added working KASPA_NODE_WBORSH_URL
2. **`services/wizard/backend/src/utils/config-generator.js`** - Updated default endpoint
3. **`docker-compose.yml`** - Updated default endpoint

## Related Issues

This fix resolves the kasia-indexer connectivity issue that was preventing the Indexer Services profile from being fully functional. Combined with previous fixes:

1. ✅ Password Generation Fix - Alphanumeric-only passwords
2. ✅ K-Indexer Configuration Fix - Proper environment variables
3. ✅ Simply-Kaspa-Indexer Fix - Command-line arguments and health check
4. ✅ Kasia-Indexer Endpoint Fix - Working WebSocket endpoint (this fix)

All four indexer services now start successfully and maintain healthy status.

## Lessons Learned

1. **Monitor External Dependencies**: Third-party WebSocket endpoints can become unavailable
2. **Have Backup Endpoints**: Multiple Kaspa network endpoints provide redundancy
3. **Test Endpoint Availability**: Always verify external endpoints are reachable
4. **Update Defaults Proactively**: Use working endpoints as defaults in configuration

## Date
December 13, 2025