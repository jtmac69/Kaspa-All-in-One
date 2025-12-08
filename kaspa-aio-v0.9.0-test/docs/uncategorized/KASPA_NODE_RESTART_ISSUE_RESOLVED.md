# Kaspa Node Self-Restarting Issue - RESOLVED

## Problem

The Kaspa node was restarting itself repeatedly (39 times!), losing sync progress each time, even when no test scripts were running.

## Root Cause

The docker-compose.yml healthcheck was configured to use `curl`, but **`curl` is not installed in the official Kaspa node Docker image**.

### What Was Happening:

1. Docker runs healthcheck every 30 seconds
2. Healthcheck tries to execute: `curl -f http://localhost:16111 ...`
3. Command fails: `exec: "curl": executable file not found in $PATH`
4. After 3 consecutive failures, container marked as "unhealthy"
5. Docker's restart policy (`restart: unless-stopped`) triggers restart
6. Node restarts, loses all sync progress
7. Repeat cycle...

### Evidence:

```bash
$ docker inspect kaspa-node --format='{{json .State.Health}}'
{
  "Status": "unhealthy",
  "FailingStreak": 3,
  "Log": [
    {
      "ExitCode": -1,
      "Output": "exec: \"curl\": executable file not found in $PATH"
    }
  ]
}

$ docker inspect kaspa-node --format='{{.RestartCount}}'
39  # 39 restarts!
```

## The Fix

Disabled the healthcheck in `docker-compose.yml` since `curl` is not available in the container.

### Before:
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:16111", "-X", "POST", "-H", "Content-Type: application/json", "-d", '{"method":"ping","params":{}}']
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 60s
```

### After:
```yaml
# Healthcheck disabled - curl not available in kaspa node image
# Container stability is monitored via external health checks
# healthcheck:
#   test: ["CMD", "curl", "-f", "http://localhost:16111", "-X", "POST", "-H", "Content-Type: application/json", "-d", '{"method":"ping","params":{}}']
#   interval: 30s
#   timeout: 10s
#   retries: 3
#   start_period: 60s
```

## Why This Happened

The healthcheck was likely copied from another service or added with good intentions, but:
- The official `kaspanet/rusty-kaspad` image is minimal
- It doesn't include `curl`, `wget`, or similar tools
- The healthcheck was never tested against the actual container

## Verification

After the fix:

```bash
$ docker ps | grep kaspa-node
kaspa-node ... Up 2 minutes ...  # Stays up!

$ docker inspect kaspa-node --format='RestartCount: {{.RestartCount}}'
RestartCount: 0  # No more restarts!

$ docker inspect kaspa-node --format='Health: {{.State.Health}}'
Health: <nil>  # No healthcheck = no failures
```

## Alternative Solutions Considered

### Option 1: Use a Different Healthcheck Command ❌
- Could use `nc` (netcat) if available
- But kaspa image is minimal, may not have it either
- Would need to verify what's actually in the image

### Option 2: Install curl in Container ❌
- Would require custom Dockerfile
- Adds complexity and maintenance burden
- Not worth it for a healthcheck

### Option 3: Disable Healthcheck ✅ (Chosen)
- Simplest solution
- Node stability can be monitored externally
- Dashboard and test scripts already check node health
- No impact on functionality

## Impact

### Before Fix:
- ❌ Node restarted every few minutes
- ❌ Lost sync progress constantly
- ❌ Never reached fully synced state
- ❌ Wasted hours of sync time
- ❌ Dashboard showed constant "Syncing" status

### After Fix:
- ✅ Node runs continuously
- ✅ Sync progress preserved
- ✅ Will reach fully synced state
- ✅ Stable operation
- ✅ Dashboard will show "Synced" when ready

## Monitoring Node Health

Even without Docker healthcheck, you can monitor node health:

### 1. Check if Container is Running
```bash
docker ps | grep kaspa-node
```

### 2. Check RPC Responsiveness
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"method":"ping","params":{}}' \
  http://localhost:16111
```

### 3. Check Sync Status
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"method":"getInfo","params":{}}' \
  http://localhost:16111 | jq '.isSynced'
```

### 4. Monitor Logs
```bash
docker logs kaspa-node --follow
```

### 5. Check Restart Count
```bash
docker inspect kaspa-node --format='{{.RestartCount}}'
# Should stay at 0
```

## Dashboard Integration

The dashboard already monitors node health via:
- `/api/kaspa/info` - Gets node status including sync state
- `/api/kaspa/stats` - Gets network statistics
- Updates every 30 seconds automatically

So the Docker healthcheck was redundant anyway!

## Lessons Learned

1. **Test healthchecks against actual containers** - Don't assume tools are available
2. **Minimal images are minimal** - Official images often don't include debugging tools
3. **Monitor restart counts** - High restart counts indicate a problem
4. **External monitoring is often better** - Application-level health checks are more reliable
5. **Healthchecks can cause problems** - A failing healthcheck is worse than no healthcheck

## Next Steps

1. ✅ Node is now running stably
2. ⏳ Let it sync (will take 2-6 hours)
3. ✅ Monitor with `docker logs kaspa-node --follow`
4. ✅ Check sync status periodically
5. ✅ Once synced, run dashboard test: `./test-dashboard.sh --skip-sync-tests`

## Files Modified

- `docker-compose.yml` - Disabled kaspa-node healthcheck

## Summary

The mysterious self-restarting was caused by a failing Docker healthcheck trying to use `curl` which doesn't exist in the Kaspa node image. After disabling the healthcheck, the node now runs stably and will be able to complete its sync without interruption.

Your node should now stay running and reach fully synced status! 🎉
