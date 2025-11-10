# Kasia Indexer Storage Correction

## Issue Identified

The task list and database initialization scripts incorrectly referenced Kasia indexer with TimescaleDB/PostgreSQL, when Kasia indexer actually uses **file-based storage (RocksDB)**.

## Corrections Made

### 1. ✅ Task List Corrected (tasks.md)

**Before:**
```markdown
- **Repository Setup**: Kasia, K-Social, Simply Kaspa indexer with TimescaleDB optimizations
```

**After:**
```markdown
- **Repository Setup**: Kasia (file-based storage), K-Social + K-indexer (TimescaleDB), Simply Kaspa indexer (TimescaleDB)
```

### 2. ✅ Database Initialization Script Corrected (01-create-databases.sql)

**Removed:**
- Kasia database creation
- Kasia TimescaleDB extension configuration
- Kasia database grants

**Kept:**
- K Social database (ksocial) with TimescaleDB
- Simply Kaspa database (simply_kaspa) with TimescaleDB

**Added Note:**
```sql
-- NOTE: Kasia indexer uses file-based storage (RocksDB), not PostgreSQL
```

## Storage Backend Summary

### Kasia Indexer ✅ CORRECT
- **Storage Type**: File-based (RocksDB)
- **Location**: `/app/data` volume mount
- **Docker Volume**: `kasia-indexer-data`
- **Database**: None (no PostgreSQL/TimescaleDB)
- **Configuration**: Uses official Docker image `kkluster/kasia-indexer:main`

### K-Indexer (K-Social) ✅ CORRECT
- **Storage Type**: PostgreSQL with TimescaleDB
- **Database**: `ksocial`
- **Docker Service**: `indexer-db` (shared TimescaleDB instance)
- **Optimizations**: Hypertables, compression, continuous aggregates
- **Schema**: `config/postgres/init/02-k-social-timescaledb.sql`

### Simply Kaspa Indexer ✅ CORRECT
- **Storage Type**: PostgreSQL with TimescaleDB
- **Database**: `simply_kaspa`
- **Docker Service**: `indexer-db` (shared TimescaleDB instance)
- **Optimizations**: Hypertables, compression, continuous aggregates
- **Schema**: `config/postgres/init/03-simply-kaspa-timescaledb.sql`

## Docker Compose Verification

### ✅ Kasia Indexer Configuration (Correct)
```yaml
kasia-indexer:
  image: kkluster/kasia-indexer:main
  volumes:
    - kasia-indexer-data:/app/data  # File-based storage
  # NO database dependencies
```

### ✅ K-Indexer Configuration (Correct)
```yaml
k-indexer:
  environment:
    - DATABASE_URL=postgresql://indexer:password@indexer-db:5432/ksocial
  depends_on:
    indexer-db:
      condition: service_healthy
```

### ✅ Simply Kaspa Indexer Configuration (Correct)
```yaml
simply-kaspa-indexer:
  environment:
    - DATABASE_URL=postgresql://indexer:password@indexer-db:5432/simply_kaspa
  depends_on:
    indexer-db:
      condition: service_healthy
```

## Why Kasia Uses File-Based Storage

The Kasia indexer (from K-Kluster/Kasia-indexer) is designed to use **RocksDB** for several reasons:

1. **Embedded Database**: RocksDB is an embedded key-value store, no separate database server needed
2. **High Performance**: Optimized for fast reads/writes with LSM-tree structure
3. **Simplicity**: No database setup or configuration required
4. **Portability**: Data stored in files, easy to backup and move
5. **Official Implementation**: The official Docker image uses this approach

## Impact of Corrections

### ✅ No Breaking Changes
- Kasia indexer was already correctly configured in docker-compose.yml
- Only documentation and unused database scripts were corrected
- No changes needed to existing Kasia integration

### ✅ Improved Clarity
- Task list now clearly distinguishes storage backends
- Database initialization script only creates databases that are actually used
- Documentation accurately reflects each indexer's architecture

## Verification Checklist

- [x] Task list corrected to show Kasia uses file-based storage
- [x] Database initialization script no longer creates unused Kasia database
- [x] Docker Compose configuration verified (already correct)
- [x] Kasia indexer integration summary verified (already correct)
- [x] No breaking changes to existing functionality

## Summary

The Kasia indexer correctly uses **file-based storage (RocksDB)** and does not require PostgreSQL or TimescaleDB. The corrections made were purely documentation updates to accurately reflect this architecture. The actual implementation in docker-compose.yml was already correct.

**Storage Backend Mapping:**
- **Kasia Indexer**: File-based (RocksDB) ✅
- **K-Indexer**: TimescaleDB ✅
- **Simply Kaspa Indexer**: TimescaleDB ✅

All indexers are now correctly documented with their appropriate storage backends.