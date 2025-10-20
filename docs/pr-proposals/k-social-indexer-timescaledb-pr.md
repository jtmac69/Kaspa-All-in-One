# PR: TimescaleDB Integration for K Social Indexer

## 🎯 Objective
Optimize K Social Indexer for TimescaleDB to handle Kaspa's 10 blocks/second rate with improved performance and storage efficiency.

## 📊 Current State Analysis
- Uses PostgreSQL 17 with pg_stat_statements
- Processes K protocol transactions from simply-kaspa-indexer
- Multi-component architecture with separate processor and webserver

## 🔄 Proposed Changes

### 1. Database Schema Optimization

#### **Current Schema Issues:**
- No time-based partitioning for high-frequency data
- Missing compression for historical data
- No continuous aggregates for analytics

#### **TimescaleDB Schema Enhancements:**

```sql
-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Convert transactions table to hypertable
-- Add timestamp column for time-based partitioning
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Create hypertable with 1-hour chunks (optimal for 10bps)
SELECT create_hypertable('transactions', 'created_at', 
    chunk_time_interval => INTERVAL '1 hour',
    if_not_exists => TRUE);

-- K Protocol specific tables as hypertables
CREATE TABLE k_posts (
    id BIGSERIAL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    transaction_id BYTEA NOT NULL,
    author_address VARCHAR NOT NULL,
    content TEXT,
    reply_to BIGINT,
    block_time BIGINT,
    PRIMARY KEY (created_at, id)
);

SELECT create_hypertable('k_posts', 'created_at',
    chunk_time_interval => INTERVAL '6 hours',
    if_not_exists => TRUE);

CREATE TABLE k_votes (
    id BIGSERIAL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    transaction_id BYTEA NOT NULL,
    voter_address VARCHAR NOT NULL,
    post_id BIGINT NOT NULL,
    vote_type SMALLINT, -- 1 for upvote, -1 for downvote
    block_time BIGINT,
    PRIMARY KEY (created_at, id)
);

SELECT create_hypertable('k_votes', 'created_at',
    chunk_time_interval => INTERVAL '6 hours',
    if_not_exists => TRUE);

CREATE TABLE k_user_profiles (
    id BIGSERIAL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    transaction_id BYTEA NOT NULL,
    address VARCHAR NOT NULL,
    username VARCHAR,
    bio TEXT,
    avatar_hash VARCHAR,
    block_time BIGINT,
    PRIMARY KEY (created_at, id)
);

SELECT create_hypertable('k_user_profiles', 'created_at',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE);
```

### 2. Performance Optimizations

#### **Compression Policies:**
```sql
-- Compress data older than 24 hours (90%+ space savings)
SELECT add_compression_policy('transactions', INTERVAL '24 hours');
SELECT add_compression_policy('k_posts', INTERVAL '24 hours');
SELECT add_compression_policy('k_votes', INTERVAL '24 hours');
SELECT add_compression_policy('k_user_profiles', INTERVAL '7 days');
```

#### **Continuous Aggregates for Analytics:**
```sql
-- Hourly post statistics
CREATE MATERIALIZED VIEW hourly_post_stats
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 hour', created_at) AS hour,
    COUNT(*) as post_count,
    COUNT(DISTINCT author_address) as unique_authors,
    COUNT(*) FILTER (WHERE reply_to IS NOT NULL) as reply_count
FROM k_posts
GROUP BY hour;

-- Daily user activity
CREATE MATERIALIZED VIEW daily_user_activity
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 day', created_at) AS day,
    author_address,
    COUNT(*) as posts_count,
    COUNT(DISTINCT reply_to) as replies_count
FROM k_posts
GROUP BY day, author_address;

-- Refresh policies
SELECT add_continuous_aggregate_policy('hourly_post_stats',
    start_offset => INTERVAL '1 day',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');
```

### 3. Code Changes

#### **K-transaction-processor Updates:**

```rust
// Add TimescaleDB-specific optimizations
use tokio_postgres::{Client, NoTls};
use chrono::{DateTime, Utc};

// Batch insert optimization for high-frequency data
async fn batch_insert_k_posts(client: &Client, posts: Vec<KPost>) -> Result<(), Error> {
    let stmt = client.prepare("
        INSERT INTO k_posts (created_at, transaction_id, author_address, content, reply_to, block_time)
        VALUES ($1, $2, $3, $4, $5, $6)
    ").await?;
    
    // Use COPY for bulk inserts (10x faster than individual INSERTs)
    let sink = client.copy_in("
        COPY k_posts (created_at, transaction_id, author_address, content, reply_to, block_time)
        FROM STDIN WITH (FORMAT BINARY)
    ").await?;
    
    // Process in batches of 1000 for optimal performance
    for chunk in posts.chunks(1000) {
        // Batch processing logic
    }
    
    Ok(())
}

// Add time-based queries optimization
async fn get_recent_posts(client: &Client, hours: i32) -> Result<Vec<KPost>, Error> {
    let stmt = client.prepare("
        SELECT * FROM k_posts 
        WHERE created_at >= NOW() - INTERVAL '$1 hours'
        ORDER BY created_at DESC
        LIMIT 100
    ").await?;
    
    // This query will be extremely fast with TimescaleDB partitioning
    let rows = client.query(&stmt, &[&hours]).await?;
    // Process results...
}
```

#### **Docker Compose Updates:**

```yaml
services:
  k-indexer-db:
    image: timescale/timescaledb:latest-pg16  # Changed from postgres:17-alpine
    container_name: k-indexer-db
    restart: unless-stopped
    shm_size: 4G
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
      PGPORT: ${DB_PORT}
      TIMESCALEDB_TELEMETRY: off  # Privacy
    command: >
      -c shared_preload_libraries=timescaledb,pg_stat_statements
      -c pg_stat_statements.max=10000
      -c pg_stat_statements.track=all
      -c timescaledb.max_background_workers=8
      -c max_worker_processes=16
      -c work_mem=256MB
      -c shared_buffers=2GB
    volumes:
      - /var/${DB_NAME}/:/var/lib/postgresql/data/
      - ./migrations/timescaledb:/docker-entrypoint-initdb.d/
```

### 4. Migration Strategy

#### **Step 1: Schema Migration Script**
```sql
-- migrations/timescaledb/001_convert_to_hypertables.sql
BEGIN;

-- Add timestamp columns where missing
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
UPDATE transactions SET created_at = to_timestamp(block_time) WHERE created_at IS NULL;
ALTER TABLE transactions ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE transactions ALTER COLUMN created_at SET DEFAULT NOW();

-- Convert to hypertables
SELECT create_hypertable('transactions', 'created_at', 
    chunk_time_interval => INTERVAL '1 hour',
    migrate_data => true,
    if_not_exists => TRUE);

COMMIT;
```

### 5. Performance Benefits

#### **Expected Improvements:**
- **10-100x faster** time-range queries (last hour, last day)
- **50-90% storage reduction** with compression
- **Automatic partitioning** eliminates manual maintenance
- **Real-time analytics** with continuous aggregates
- **Better concurrency** for high-frequency writes

#### **Kaspa 10bps Optimization:**
- **1-hour chunks**: Optimal for 36,000 blocks per chunk
- **Batch processing**: Handle bursts of transactions efficiently
- **Compression**: Reduce storage growth from continuous data
- **Parallel queries**: Leverage multiple CPU cores

### 6. Monitoring & Alerting

```sql
-- Monitor chunk sizes and compression
SELECT 
    chunk_name,
    pg_size_pretty(before_compression_bytes) as before_compression,
    pg_size_pretty(after_compression_bytes) as after_compression,
    compression_ratio
FROM timescaledb_information.chunk_compression_stats
WHERE hypertable_name = 'k_posts';

-- Monitor query performance
SELECT 
    schemaname,
    tablename,
    calls,
    total_time,
    mean_time
FROM pg_stat_statements 
WHERE query LIKE '%k_posts%'
ORDER BY total_time DESC;
```

## 🎯 Implementation Plan

### Phase 1: Database Migration (Week 1)
1. Update Docker Compose to use TimescaleDB
2. Create migration scripts for existing data
3. Test schema conversion on development environment

### Phase 2: Code Optimization (Week 2)
1. Update K-transaction-processor for batch operations
2. Implement TimescaleDB-specific queries
3. Add compression and continuous aggregate policies

### Phase 3: Performance Testing (Week 3)
1. Load test with simulated 10bps traffic
2. Benchmark query performance improvements
3. Validate storage compression ratios

### Phase 4: Production Deployment (Week 4)
1. Rolling deployment strategy
2. Monitor performance metrics
3. Fine-tune chunk intervals and compression policies

## 📊 Success Metrics

- **Query Performance**: 10-100x improvement for time-range queries
- **Storage Efficiency**: 50-90% reduction in storage usage
- **Throughput**: Handle 10bps sustained load without degradation
- **Availability**: Zero downtime during normal operations
- **Scalability**: Linear performance scaling with data growth

This TimescaleDB integration will transform the K Social Indexer into a high-performance, scalable platform optimized for Kaspa's blockchain characteristics.