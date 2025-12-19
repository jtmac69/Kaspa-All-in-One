# Indexer Sync Expected Behaviors

## Date: December 19, 2025

## Overview

This document explains expected behaviors and error messages during indexer synchronization that testers may encounter. These are normal operational messages and do not indicate problems.

## Simply-Kaspa-Indexer

### Expected Error: "Cannot Find Header"

**Error Message:**
```
Failed getting virtual chain from start_hash a1e8c828c392ac7c33d95485ae48da71f64470b185f740ca3805c35c8df1c14b: 
RPC Server (remote error) -> cannot find header a1e8c828c392ac7c33d95485ae48da71f64470b185f740ca3805c35c8df1c14b
```

**Why This Happens:**
- Kaspa uses a BlockDAG (Directed Acyclic Graph) structure with multiple parallel blocks
- During historical sync, the indexer may request a chain path that has been pruned or reorganized
- The indexer automatically retries with an alternative chain path
- This is the **retry mechanism working as designed**

**How to Verify It's Normal:**
1. Check that "Committed" messages appear between errors
2. Verify the "Last block" timestamp keeps advancing
3. Confirm service status shows "healthy"
4. Look for high throughput (2000-3500+ blocks/second)

**Example of Normal Operation:**
```
[INFO ] Committed 245 new blocks in 77ms (3181.8 bps)
[ERROR] Failed getting virtual chain from start_hash... cannot find header
[INFO ] Committed 201 new txs in 62ms (3241.9 tps)
[ERROR] Failed getting virtual chain from start_hash... cannot find header
[INFO ] Committed 219 new txs in 70ms (3128.6 tps)
```

**When to Be Concerned:**
❌ These would indicate real problems:
- Indexer stuck on same block for hours
- Service status "unhealthy" or "restarting"
- No "Committed" messages between errors
- Errors increasing without progress
- Service consuming excessive resources

### Expected Warning: "Got Unexpected Pruning Point"

**Warning Message:**
```
WARN ] Got unexpected pruning point
```

**Why This Happens:**
- The indexer connects to different P2P peers during sync
- Different peers may have different pruning points
- The indexer adapts to each peer's pruning point
- This is normal P2P network behavior

**How to Verify It's Normal:**
1. Check that P2P connections succeed after the warning
2. Verify sync continues normally
3. Confirm the indexer connects to alternative peers

### Expected Warning: "Peer Connection Failed"

**Warning Message:**
```
WARN ] Peer connection failed: failed to lookup address information: Try again, retrying...
```

**Why This Happens:**
- Some Kaspa network seeders may be temporarily unreachable
- DNS resolution can fail intermittently
- The indexer has multiple fallback seeders
- This is normal P2P network behavior

**How to Verify It's Normal:**
1. Check that the indexer connects to alternative peers
2. Verify "P2P Connected to outgoing peer" messages appear
3. Confirm sync continues normally

## Kasia-Indexer

### Expected Warning: "We Don't Process Syncer VCC for a Long Time"

**Warning Message:**
```
WARN indexer_actors::virtual_chain_processor: We don't process syncer vcc for a long time
```

**Why This Happens:**
- The virtual chain processor is experiencing delays
- This can occur during heavy sync loads or network congestion
- The indexer continues processing and catches up
- This is a performance monitoring message, not an error

**How to Verify It's Normal:**
1. Check that the service remains healthy
2. Verify sync progress continues
3. Confirm no service restarts occur

### Expected Warning: "Unknown Operation Type"

**Warning Message:**
```
WARN protocol::operation::deserializer: Unknown operation type: 62636173743a61727665613a476f6f64206d6f726e696e67
```

**Why This Happens:**
- The hex string decodes to "bcast:arvea:Good morning" (a broadcast message)
- The indexer encounters non-standard transaction types
- These are typically social/broadcast messages on the Kaspa network
- The indexer logs them but continues processing

**How to Verify It's Normal:**
1. Check that block processing continues
2. Verify the service remains healthy
3. Confirm these are infrequent warnings

## K-Indexer (K-Social)

### Expected Error: "Column 'schema_name' Does Not Exist"

**Error Message:**
```
ERROR: column "schema_name" does not exist at character 64
STATEMENT: SELECT COUNT(*) FROM timescaledb_information.hypertables WHERE schema_name='public';
```

**Why This Happens:**
- TimescaleDB updated their schema and changed column name from `schema_name` to `hypertable_schema`
- The K-Indexer source code uses the old column name in a health check
- This doesn't affect core indexing functionality
- The service continues working normally

**How to Verify It's Normal:**
1. Check K-Indexer health endpoint: `curl http://localhost:3006/health`
2. Verify database tables are created correctly
3. Confirm hypertables are functioning
4. Check service status shows "healthy"

**Database Verification:**
```bash
# Verify tables exist
docker exec k-social-db psql -U k_social_user -d ksocial -c "\dt"

# Verify hypertables work (using correct column name)
docker exec k-social-db psql -U k_social_user -d ksocial -c \
  "SELECT hypertable_schema, hypertable_name FROM timescaledb_information.hypertables;"
```

## Sync Time Estimates

### Initial Sync Duration

**Simply-Kaspa-Indexer:**
- Full historical sync: 6-12 hours (depending on hardware and network)
- Processing rate: 2,000-3,500 blocks/second
- Kaspa produces: ~10 blocks/second
- Once synced, stays current in real-time

**Kasia-Indexer:**
- Full historical sync: 4-8 hours
- Processing rate: Varies based on transaction density
- Once synced, stays current in real-time

**K-Indexer:**
- Full historical sync: 4-8 hours
- Processing rate: Batch processing of 1000 records
- Once synced, stays current in real-time

### Monitoring Sync Progress

**Check Current Block Being Processed:**
```bash
# Simply-Kaspa-Indexer
docker logs simply-kaspa-indexer 2>&1 | grep "Last block:" | tail -1

# Kasia-Indexer
docker logs kasia-indexer 2>&1 | grep "INFO" | tail -20

# K-Indexer
docker logs k-indexer 2>&1 | grep "INFO" | tail -20
```

**Check Service Health:**
```bash
docker ps --format "table {{.Names}}\t{{.Status}}" | grep indexer
```

**Monitor Resource Usage:**
```bash
docker stats --no-stream | grep indexer
```

## Troubleshooting Real Issues

### When to Investigate Further

**Service Issues:**
- Service status shows "unhealthy" for more than 5 minutes
- Service keeps restarting (check with `docker ps`)
- Service exits with error code (check with `docker logs`)

**Sync Issues:**
- No progress for more than 30 minutes
- Block timestamp not advancing
- Excessive memory or CPU usage (>90% sustained)

**Database Issues:**
- Connection refused errors
- Database not accepting connections
- Disk space full errors

### Investigation Commands

```bash
# Check service status
docker ps --format "table {{.Names}}\t{{.Status}}"

# Check detailed logs
docker logs <service-name> --tail 100

# Check resource usage
docker stats --no-stream

# Check database connectivity
docker exec <db-name> pg_isready

# Check disk space
df -h
```

## Summary for Testers

### ✅ Normal Behaviors (Don't Report These)
- "Cannot find header" errors during sync
- "Unexpected pruning point" warnings
- "Peer connection failed" warnings with successful retries
- "VCC processing delay" warnings
- "Unknown operation type" warnings
- "schema_name does not exist" errors (K-Indexer)

### ❌ Report These Issues
- Service stuck without progress for 30+ minutes
- Service status "unhealthy" for 5+ minutes
- Service repeatedly restarting
- Excessive resource usage (>90% sustained)
- Database connection failures
- Service exits with error codes

### 📊 Expected Performance
- **Sync Speed**: 2,000-3,500 blocks/second
- **Initial Sync**: 4-12 hours depending on service
- **CPU Usage**: 50-80% during sync, 10-30% when synced
- **Memory Usage**: 500MB-2GB depending on service
- **Disk I/O**: High during sync, moderate when synced

## Conclusion

The error messages and warnings described in this document are **expected and normal** during indexer operation. They represent the indexers' robust error handling and retry mechanisms working as designed. Testers should focus on overall service health, sync progress, and resource usage rather than individual error messages.
