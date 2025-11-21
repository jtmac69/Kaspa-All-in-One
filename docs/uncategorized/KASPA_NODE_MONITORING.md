# Kaspa Node Monitoring Guide

## Node Started Successfully! 🚀

Your Kaspa node is now running and syncing with the network.

## Quick Status Check

```bash
# Check if container is running
docker ps | grep kaspa-node

# View recent logs
docker logs kaspa-node --tail 50

# Follow logs in real-time
docker logs kaspa-node --follow

# Check RPC availability
curl -X POST -H "Content-Type: application/json" \
  -d '{"method":"ping","params":{}}' \
  http://localhost:16111
```

## What to Expect

### Phase 1: Initial Startup (1-3 minutes)
- Container starts
- P2P connections established
- RPC server initializes
- IBD (Initial Block Download) begins

**You are here!** ✓

### Phase 2: Header Sync (10-30 minutes)
- Downloads block headers
- Validates proof-of-work
- Builds DAG structure
- Logs show: "Processed X headers..."

### Phase 3: Block Sync (1-5 hours)
- Downloads full blocks
- Validates transactions
- Builds UTXO set
- Logs show: "Processed X blocks and Y headers..."

### Phase 4: Fully Synced
- Node is caught up with network
- Ready for full operation
- Logs show: "Virtual selected parent blue score: [current height]"

## Monitoring Progress

### Check Sync Status
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"method":"getInfo","params":{}}' \
  http://localhost:16111 | jq '.'
```

Look for:
- `isSynced: true` - Node is fully synced
- `isSynced: false` - Still syncing
- `virtualSelectedParentBlueScore` - Current block height

### Watch Logs for Progress
```bash
docker logs kaspa-node --follow | grep "Processed"
```

You'll see updates like:
```
Processed 1000 blocks and 5000 headers in the last 10.01s
```

### Check Resource Usage
```bash
docker stats kaspa-node
```

Typical usage:
- CPU: 50-200% during sync, 5-20% when synced
- Memory: 500MB-2GB
- Disk: Growing (blockchain data)

## When to Run Dashboard Test

### Option 1: Test Immediately (Recommended)
Even though the node is syncing, you can test the dashboard now:

```bash
./test-dashboard.sh --skip-sync-tests
```

This will:
- ✅ Test dashboard functionality
- ✅ Test API endpoints
- ✅ Skip sync-dependent features
- ⏭️ Skip full blockchain data tests

### Option 2: Wait for Full Sync
Wait 2-6 hours for complete sync, then run:

```bash
./test-dashboard.sh
```

This will test everything including full blockchain data access.

## Current Node Status

Based on the logs, your node is:
- ✅ Running and healthy
- ✅ Connected to 9 peers
- ✅ IBD (sync) in progress
- ⏳ Downloading headers and blocks

## Estimated Time to Sync

Factors affecting sync time:
- **Network speed**: Faster = quicker sync
- **CPU power**: More cores = faster validation
- **Disk speed**: SSD much faster than HDD
- **Network congestion**: Varies

**Typical range**: 2-6 hours for full sync

## Troubleshooting

### Node Not Responding
```bash
# Check if running
docker ps | grep kaspa-node

# Restart if needed
docker compose restart kaspa-node

# Check logs for errors
docker logs kaspa-node --tail 100 | grep -i error
```

### Slow Sync
- Normal for first-time sync
- Check disk space: `df -h`
- Check system resources: `docker stats`
- Ensure good internet connection

### RPC Not Available Yet
- Wait 2-3 minutes after container start
- RPC server starts after P2P initialization
- Check logs: `docker logs kaspa-node | grep RPC`

## Next Steps

1. **Let it run**: Node will sync in the background
2. **Monitor occasionally**: Check logs every 30 minutes
3. **Test when ready**: Run dashboard test when convenient

### Test Now (Recommended)
```bash
./test-dashboard.sh --skip-sync-tests
```

### Test Later (After Sync)
```bash
# Check if synced
curl -X POST -H "Content-Type: application/json" \
  -d '{"method":"getInfo","params":{}}' \
  http://localhost:16111 | jq '.isSynced'

# If true, run full test
./test-dashboard.sh
```

## Useful Commands

```bash
# Stop node
docker compose stop kaspa-node

# Start node
docker compose start kaspa-node

# Restart node
docker compose restart kaspa-node

# View all logs
docker logs kaspa-node

# Check container health
docker inspect kaspa-node --format='{{.State.Health.Status}}'

# Check disk usage
docker system df -v | grep kaspa
```

## Summary

Your Kaspa node is now running and syncing! You can:
- ✅ Test the dashboard immediately with `--skip-sync-tests`
- ⏳ Wait for full sync for complete testing
- 📊 Monitor progress with the commands above

The node will continue syncing in the background. Come back in a few hours for full sync, or test now with limited features!
