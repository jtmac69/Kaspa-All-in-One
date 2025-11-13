# Kaspa Node Memory Issue - Insufficient RAM

## Problem

The Kaspa node keeps restarting every few minutes due to **memory pressure** on your system.

## Diagnostic Evidence

```bash
$ docker stats kaspa-node
CONTAINER    CPU %     MEM USAGE / LIMIT     MEM %
kaspa-node   102.70%   3.327GiB / 3.828GiB   86.93%
```

- **System RAM**: ~4GB total
- **Node Usage**: 3.3GB (87% of available)
- **Result**: System runs out of memory, kills container, restart policy brings it back

## Why This Happens

During initial blockchain sync, the Kaspa node:
- Validates millions of blocks
- Builds UTXO index
- Maintains peer connections
- Caches data structures

**Memory requirements during sync**: 4-8GB
**Your available memory**: ~4GB

The node hits memory limits, gets killed by the OS/Docker, restarts, and repeats.

## Solutions

### Option 1: Increase Docker Desktop Memory ⭐ (Best if you have RAM)

**If your Mac has 8GB+ total RAM:**

1. Open Docker Desktop
2. Settings → Resources → Memory
3. Increase to 6-8GB
4. Click "Apply & Restart"
5. Restart node: `docker compose restart kaspa-node`

**Check your Mac's total RAM:**
```bash
system_profiler SPHardwareDataType | grep Memory
```

### Option 2: Use Remote Public Node ⭐ (Easiest)

**Don't run your own node - use a public one:**

```bash
# Stop local node
docker compose stop kaspa-node

# Edit .env file or export variable
export REMOTE_KASPA_NODE_URL=https://api.kaspa.org

# Start only dashboard
docker compose up -d dashboard
```

**Benefits:**
- No memory issues
- No sync wait time
- Instant access to blockchain data
- Dashboard works immediately

**Public Kaspa Nodes:**
- `https://api.kaspa.org`
- `https://kaspa.aspectron.org`

### Option 3: Wait for Sync to Complete (Not Recommended)

Once fully synced, memory usage drops to ~2-3GB. But getting there with 4GB RAM will be painful:
- Constant restarts
- Very slow progress
- May never complete
- Takes days instead of hours

### Option 4: Upgrade Hardware

If you want to run your own node:
- **Minimum**: 8GB RAM
- **Recommended**: 16GB RAM
- **Ideal**: 32GB RAM

## Recommended Action

**Use a remote node** - it's the most practical solution for your hardware:

```bash
# 1. Stop local node
docker compose stop kaspa-node

# 2. Create/edit .env file
echo "REMOTE_KASPA_NODE_URL=https://api.kaspa.org" >> .env

# 3. Start dashboard
docker compose up -d dashboard

# 4. Test dashboard
./test-dashboard.sh --skip-sync-tests
```

## Why Remote Node is Better for You

| Aspect | Local Node (Your Setup) | Remote Node |
|--------|------------------------|-------------|
| Memory | 4GB+ required | ~100MB |
| Sync Time | 2-6 hours (if it works) | Instant |
| Restarts | Constant | None |
| Maintenance | You manage it | Someone else does |
| Reliability | Depends on your hardware | Professional infrastructure |

## Verification

After switching to remote node:

```bash
# Check dashboard is using remote node
docker logs kaspa-dashboard | grep -i kaspa

# Test dashboard
./test-dashboard.sh --skip-sync-tests

# Should work immediately!
```

## Technical Details

### Why 4GB Isn't Enough

During sync, Kaspa node needs memory for:
- **Block validation**: 1-2GB
- **UTXO index**: 1-2GB  
- **DAG structure**: 500MB-1GB
- **Peer connections**: 200-500MB
- **Caching**: 500MB-1GB
- **OS overhead**: 500MB

**Total**: 4-7GB during sync

### After Sync

Once synced, memory usage drops:
- **Steady state**: 2-3GB
- **With UTXO index**: 3-4GB

But you need to GET there first, which requires more RAM.

## Summary

Your Kaspa node restarts are caused by **insufficient RAM** (4GB available, 4-8GB needed for sync).

**Best solution**: Use a remote public node instead of running your own.

**Commands:**
```bash
docker compose stop kaspa-node
export REMOTE_KASPA_NODE_URL=https://api.kaspa.org
docker compose up -d dashboard
./test-dashboard.sh --skip-sync-tests
```

This will give you a working dashboard immediately without memory issues! 🎉
