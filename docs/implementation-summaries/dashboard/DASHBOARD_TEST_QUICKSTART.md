# Dashboard Test Quick Start

## TL;DR

Your Kaspa node needs to sync before full testing (can take hours). Use this for immediate testing:

```bash
./test-dashboard.sh --skip-sync-tests
```

## Quick Commands

### New Installation (Node Syncing)
```bash
# Test dashboard immediately
./test-dashboard.sh --skip-sync-tests
```

### Synced Node
```bash
# Full test suite
./test-dashboard.sh
```

### Check Sync Status
```bash
# Monitor sync progress
docker logs kaspa-node --follow

# Check if synced
curl -X POST -H "Content-Type: application/json" \
  -d '{"method":"getInfo","params":{}}' \
  http://localhost:16111 | jq '.isSynced'
```

### Cleanup Only
```bash
# Clean up test artifacts
./test-dashboard.sh --cleanup-only
```

## What Gets Tested

✅ Dashboard health and availability  
✅ API endpoints (status, info, stats)  
✅ UI and static assets  
✅ Error handling  
✅ Performance (response times)  
✅ Container health  
✅ Resource usage  
✅ Network connectivity  

## Expected Results

### Node Syncing (--skip-sync-tests)
```
Total Tests:    25
Passed:         20
Failed:         0
Warnings:       3
Skipped:        2
```

### Node Synced (full test)
```
Total Tests:    25
Passed:         23
Failed:         0
Warnings:       2
Skipped:        0
```

## Troubleshooting

### Dashboard not responding?
```bash
docker ps | grep kaspa-dashboard
docker logs kaspa-dashboard
docker compose restart dashboard
```

### Tests timing out?
```bash
# Check system resources
docker stats

# Increase timeout (edit TIMEOUT in script)
```

## More Info

- Full documentation: `docs/dashboard-testing.md`
- Implementation details: `DASHBOARD_TESTING_IMPLEMENTATION.md`
- Cleanup guide: `docs/test-cleanup.md`
