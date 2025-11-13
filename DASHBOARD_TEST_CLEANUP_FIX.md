# Dashboard Test Cleanup Fix - Don't Stop Already-Running Services

## Problem Discovered

The test script was stopping the Kaspa node even when it was already running before the test started. This caused:
- Loss of sync progress (node had to resync from scratch)
- Unnecessary downtime
- Frustrating user experience

## Root Cause

The cleanup function was indiscriminately stopping ALL services:

```bash
# OLD CODE - WRONG!
docker compose down dashboard kaspa-node
```

This would stop both services regardless of whether they were:
- Already running before the test
- Started by the test
- Needed by other processes

## The Fix

Implemented service tracking to only stop services that the test actually started:

### 1. Track What We Start
```bash
# Global variables to track what we started
STARTED_NODE=false
STARTED_DASHBOARD=false
```

### 2. Set Flags When Starting Services
```bash
# In start_services():
if docker ps | grep kaspa-node; then
    STARTED_NODE=false  # Already running, we didn't start it
else
    docker compose up -d kaspa-node
    STARTED_NODE=true   # We started it
fi
```

### 3. Only Stop What We Started
```bash
# In cleanup_containers():
if [ "$STARTED_DASHBOARD" = true ]; then
    log "Stopping dashboard (started by test)..."
    docker compose stop dashboard
fi

if [ "$STARTED_NODE" = true ]; then
    log "Stopping kaspa-node (started by test)..."
    docker compose stop kaspa-node
fi
```

## Behavior Now

### Scenario 1: Node Already Running
```
Before test: Node running, synced
Test runs:   Uses existing node
After test:  Node still running, still synced ✅
```

### Scenario 2: Node Not Running
```
Before test: Node not running
Test runs:   Starts node
After test:  Stops node (cleanup) ✅
```

### Scenario 3: Mixed State
```
Before test: Node running, dashboard not running
Test runs:   Uses existing node, starts dashboard
After test:  Node still running, dashboard stopped ✅
```

## Benefits

1. **Preserves Sync State**: Won't restart a synced node
2. **Respects User Setup**: Doesn't interfere with running services
3. **Clean Testing**: Still cleans up what it creates
4. **Better UX**: No unexpected service interruptions

## Testing the Fix

### With Already-Running Node (Your Case)
```bash
# Node is running and synced
docker ps | grep kaspa-node  # Shows running

# Run test
./test-dashboard.sh --skip-sync-tests

# After test
docker ps | grep kaspa-node  # Still running! ✅
```

### With No Services Running
```bash
# Nothing running
docker ps | grep kaspa  # Empty

# Run test
./test-dashboard.sh --skip-sync-tests

# After test
docker ps | grep kaspa  # Empty (cleaned up) ✅
```

## Additional Safety

The fix also:
- Uses `docker compose stop` instead of `down` (preserves containers)
- Only affects services explicitly listed
- Logs what it's doing for transparency
- Handles edge cases gracefully

## What to Do Now

Your node was restarted and lost its sync. You have two options:

### Option 1: Let It Resync
```bash
# Monitor sync progress
docker logs kaspa-node --follow

# Wait 2-6 hours for full sync
# Then run test
./test-dashboard.sh --skip-sync-tests
```

### Option 2: Test Now While Syncing
```bash
# Test immediately with current state
./test-dashboard.sh --skip-sync-tests

# Node will continue syncing in background
# Test will work but show "Syncing" status
```

## Verification

After the fix, you can verify the behavior:

```bash
# Start node manually
docker compose up -d kaspa-node

# Wait for it to be responsive
sleep 30

# Check it's running
docker ps | grep kaspa-node

# Run test
./test-dashboard.sh --skip-sync-tests

# Verify node is STILL running after test
docker ps | grep kaspa-node  # Should still be there!
```

## Related Files Modified

- `test-dashboard.sh` - Added service tracking and smart cleanup

## Apology

Sorry about your node losing sync! This was a significant oversight in the cleanup logic. The fix ensures this won't happen again - the test will now respect your running services.
