# PR: TimescaleDB Integration for Simply Kaspa Indexer

## 🎯 Objective
Enhance Simply Kaspa Indexer with TimescaleDB optimizations to achieve superior performance for Kaspa's 10 blocks/second rate while maintaining the existing high-performance architecture.

## 📊 Current State Analysis
- High-performance Rust implementation designed for 10bps
- Optimized PostgreSQL schema with optional tables/fields
- Handles 2000+ TPS on high-end NVMe storage
- Comprehensive blockchain data indexing

## 🔄 Proposed Changes

### 1. Database Schema Enhancement

#### **Current Schema Strengths:**
- Well-designed for blockchain data patterns
- Optional tables for performance tuning
- Efficient indexing strategy

#### **TimescaleDB Enhancements:**

```sql
-- database/migrations/schema/timescaledb_migration.sql
-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Convert blocks table to hypertable using timestamp
-- First add timestamp column as TIMESTAMPTZ for better time-zone handling
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS block_timestamp TIMESTAMPTZ;

-- Populate timestamp from existing timestamp field (convert from BIGINT to TIMESTAMPTZ)
UPDATE blocks SET block_timestamp = to_timestamp("timestamp" / 1000.0) WHERE block_timestamp IS NULL;

-- Make timestamp NOT NULL and add default
ALTER TABLE blocks ALTER COLUMN block_timestamp SET NOT NULL;
ALTER TABLE blocks ALTER COLUMN block_timestamp SET DEFAULT NOW();

-- Create hypertable with 30-minute chunks (optimal for 10bps = 18,000 blocks per chunk)
SELECT create_hypertable('blocks', 'block_timestamp', 
    chunk_time_interval => INTERVAL '30 minutes',
    migrate_data => true,
    if_not_exists => TRUE);

-- Convert transactions table to hypertable
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS tx_timestamp TIMESTAMPTZ;
UPDATE transactions SET tx_timestamp = to_timestamp(block_time / 1000.0) WHERE tx_timestamp IS NULL;
ALTER TABLE transactions ALTER COLUMN tx_timestamp SET NOT NULL;
ALTER TABLE transactions ALTER COLUMN tx_timestamp SET DEFAULT NOW();

SELECT create_hypertable('transactions', 'tx_timestamp',
    chunk_time_interval => INTERVAL '15 minutes',  -- Higher frequency, smaller chunks
    migrate_data => true,
    if_not_exists => TRUE);

-- Convert address-related tables to hypertables for better query performance
ALTER TABLE addresses_transactions ADD COLUMN IF NOT EXISTS addr_timestamp TIMESTAMPTZ;
UPDATE addresses_transactions SET addr_timestamp = to_timestamp(block_time / 1000.0) WHERE addr_timestamp IS NULL;
ALTER TABLE addresses_transactions ALTER COLUMN addr_timestamp SET NOT NULL;

SELECT create_hypertable('addresses_transactions', 'addr_timestamp',
    chunk_time_interval => INTERVAL '1 hour',
    migrate_data => true,
    if_not_exists => TRUE);

-- Similar for scripts_transactions
ALTER TABLE scripts_transactions ADD COLUMN IF NOT EXISTS script_timestamp TIMESTAMPTZ;
UPDATE scripts_transactions SET script_timestamp = to_timestamp(block_time / 1000.0) WHERE script_timestamp IS NULL;
ALTER TABLE scripts_transactions ALTER COLUMN script_timestamp SET NOT NULL;

SELECT create_hypertable('scripts_transactions', 'script_timestamp',
    chunk_time_interval => INTERVAL '1 hour',
    migrate_data => true,
    if_not_exists => TRUE);
```

### 2. Advanced TimescaleDB Features

#### **Compression Policies:**
```sql
-- Compress blocks older than 2 hours (balance between query speed and storage)
SELECT add_compression_policy('blocks', INTERVAL '2 hours');

-- Compress transactions older than 1 hour
SELECT add_compression_policy('transactions', INTERVAL '1 hour');

-- Compress address data older than 6 hours
SELECT add_compression_policy('addresses_transactions', INTERVAL '6 hours');
SELECT add_compression_policy('scripts_transactions', INTERVAL '6 hours');
```

#### **Continuous Aggregates for Network Analytics:**
```sql
-- Real-time network statistics
CREATE MATERIALIZED VIEW network_stats_5min
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('5 minutes', block_timestamp) AS time_bucket,
    COUNT(*) as block_count,
    AVG(blue_score) as avg_blue_score,
    MAX(blue_score) as max_blue_score,
    SUM((SELECT COUNT(*) FROM transactions WHERE block_time BETWEEN 
        EXTRACT(epoch FROM time_bucket) * 1000 AND 
        EXTRACT(epoch FROM time_bucket + INTERVAL '5 minutes') * 1000)) as tx_count
FROM blocks
GROUP BY time_bucket;

-- Hourly address activity
CREATE MATERIALIZED VIEW hourly_address_activity
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 hour', addr_timestamp) AS hour,
    address,
    COUNT(*) as transaction_count,
    COUNT(DISTINCT transaction_id) as unique_transactions
FROM addresses_transactions
GROUP BY hour, address;

-- Daily network summary
CREATE MATERIALIZED VIEW daily_network_summary
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 day', block_timestamp) AS day,
    COUNT(*) as total_blocks,
    AVG(blue_score) as avg_blue_score,
    COUNT(DISTINCT (SELECT COUNT(*) FROM transactions t WHERE t.block_time BETWEEN 
        EXTRACT(epoch FROM day) * 1000 AND 
        EXTRACT(epoch FROM day + INTERVAL '1 day') * 1000)) as total_transactions
FROM blocks
GROUP BY day;

-- Refresh policies for real-time updates
SELECT add_continuous_aggregate_policy('network_stats_5min',
    start_offset => INTERVAL '1 hour',
    end_offset => INTERVAL '5 minutes',
    schedule_interval => INTERVAL '5 minutes');

SELECT add_continuous_aggregate_policy('hourly_address_activity',
    start_offset => INTERVAL '1 day',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');
```

### 3. Rust Code Optimizations

#### **Database Connection Pool Enhancement:**

```rust
// database/src/connection.rs
use sqlx::{PgPool, Row};
use chrono::{DateTime, Utc};

pub struct TimescaleDbPool {
    pool: PgPool,
}

impl TimescaleDbPool {
    pub async fn new(database_url: &str) -> Result<Self, sqlx::Error> {
        let pool = PgPool::connect_with(
            database_url.parse()?
                .max_connections(50)  // Increased for high throughput
                .min_connections(10)
                .acquire_timeout(Duration::from_secs(30))
                .idle_timeout(Duration::from_secs(600))
        ).await?;
        
        Ok(Self { pool })
    }
    
    // Optimized batch insert for blocks with TimescaleDB
    pub async fn insert_blocks_batch(&self, blocks: Vec<Block>) -> Result<(), sqlx::Error> {
        let mut tx = self.pool.begin().await?;
        
        // Use COPY for maximum performance with TimescaleDB
        let copy_stmt = "COPY blocks (hash, block_timestamp, blue_score, daa_score, timestamp, version) FROM STDIN WITH (FORMAT BINARY)";
        
        // Batch process in chunks of 1000 for optimal memory usage
        for chunk in blocks.chunks(1000) {
            let mut copy_in = tx.copy_in_raw(copy_stmt).await?;
            
            for block in chunk {
                // Convert timestamp to proper TIMESTAMPTZ
                let block_time = DateTime::from_timestamp(block.timestamp / 1000, 0)
                    .unwrap_or_else(|| Utc::now());
                
                copy_in.send(block.to_copy_row(block_time)).await?;
            }
            
            copy_in.finish().await?;
        }
        
        tx.commit().await?;
        Ok(())
    }
    
    // Time-range optimized queries
    pub async fn get_blocks_in_range(
        &self, 
        start: DateTime<Utc>, 
        end: DateTime<Utc>
    ) -> Result<Vec<Block>, sqlx::Error> {
        sqlx::query_as!(
            Block,
            "SELECT * FROM blocks 
             WHERE block_timestamp >= $1 AND block_timestamp < $2 
             ORDER BY block_timestamp DESC",
            start,
            end
        )
        .fetch_all(&self.pool)
        .await
    }
    
    // Leverage continuous aggregates for analytics
    pub async fn get_network_stats_5min(
        &self,
        hours_back: i32
    ) -> Result<Vec<NetworkStats>, sqlx::Error> {
        sqlx::query_as!(
            NetworkStats,
            "SELECT * FROM network_stats_5min 
             WHERE time_bucket >= NOW() - INTERVAL '$1 hours'
             ORDER BY time_bucket DESC",
            hours_back
        )
        .fetch_all(&self.pool)
        .await
    }
}
```

#### **Indexer Performance Enhancements:**

```rust
// indexer/src/processor.rs
use tokio::sync::Semaphore;
use std::sync::Arc;

pub struct TimescaleIndexer {
    db: Arc<TimescaleDbPool>,
    semaphore: Arc<Semaphore>, // Control concurrent operations
}

impl TimescaleIndexer {
    pub fn new(db: TimescaleDbPool) -> Self {
        Self {
            db: Arc::new(db),
            semaphore: Arc::new(Semaphore::new(10)), // Max 10 concurrent operations
        }
    }
    
    // Optimized for 10bps processing
    pub async fn process_block_batch(&self, blocks: Vec<Block>) -> Result<(), IndexerError> {
        let _permit = self.semaphore.acquire().await?;
        
        // Process in parallel batches for maximum throughput
        let futures: Vec<_> = blocks
            .chunks(100) // Process 100 blocks at a time
            .map(|chunk| {
                let db = Arc::clone(&self.db);
                let chunk = chunk.to_vec();
                
                tokio::spawn(async move {
                    db.insert_blocks_batch(chunk).await
                })
            })
            .collect();
        
        // Wait for all batches to complete
        for future in futures {
            future.await??;
        }
        
        Ok(())
    }
    
    // Leverage TimescaleDB's time-based partitioning for efficient queries
    pub async fn get_recent_transactions(
        &self,
        address: &str,
        limit: i32
    ) -> Result<Vec<Transaction>, IndexerError> {
        // This query will be extremely fast with TimescaleDB partitioning
        let transactions = sqlx::query_as!(
            Transaction,
            "SELECT t.* FROM transactions t
             JOIN addresses_transactions at ON t.transaction_id = at.transaction_id
             WHERE at.address = $1 
             AND at.addr_timestamp >= NOW() - INTERVAL '30 days'
             ORDER BY at.addr_timestamp DESC
             LIMIT $2",
            address,
            limit
        )
        .fetch_all(&self.db.pool)
        .await?;
        
        Ok(transactions)
    }
}
```

### 4. Configuration Enhancements

#### **Cargo.toml Dependencies:**
```toml
[dependencies]
# Add TimescaleDB-specific optimizations
sqlx = { version = "0.7", features = ["runtime-tokio-rustls", "postgres", "chrono", "uuid"] }
chrono = { version = "0.4", features = ["serde"] }
tokio = { version = "1.0", features = ["full"] }
serde = { version = "1.0", features = ["derive"] }

# Performance monitoring
metrics = "0.21"
metrics-exporter-prometheus = "0.12"
```

#### **CLI Arguments Enhancement:**
```rust
// cli/src/args.rs
#[derive(Parser)]
pub struct Args {
    // Existing arguments...
    
    /// Enable TimescaleDB optimizations
    #[arg(long, default_value = "true")]
    pub enable_timescaledb: bool,
    
    /// TimescaleDB chunk interval for blocks (in minutes)
    #[arg(long, default_value = "30")]
    pub blocks_chunk_interval: u32,
    
    /// TimescaleDB chunk interval for transactions (in minutes)
    #[arg(long, default_value = "15")]
    pub transactions_chunk_interval: u32,
    
    /// Enable compression for data older than specified hours
    #[arg(long, default_value = "2")]
    pub compression_age_hours: u32,
    
    /// Batch size for TimescaleDB operations
    #[arg(long, default_value = "1000")]
    pub timescaledb_batch_size: usize,
}
```

### 5. Docker Integration

#### **Enhanced Dockerfile:**
```dockerfile
# docker/Dockerfile
FROM rust:1.75-slim as builder

WORKDIR /app

# Install TimescaleDB client libraries
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY . .
RUN cargo build --release --features timescaledb

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    libpq5 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/simply-kaspa-indexer /usr/local/bin/

# Add TimescaleDB-specific environment variables
ENV TIMESCALEDB_ENABLED=true
ENV BLOCKS_CHUNK_INTERVAL=30
ENV TRANSACTIONS_CHUNK_INTERVAL=15
ENV COMPRESSION_AGE_HOURS=2

ENTRYPOINT ["simply-kaspa-indexer"]
```

#### **Docker Compose Example:**
```yaml
# docker-compose-timescaledb.yaml
version: '3.8'

services:
  timescaledb:
    image: timescale/timescaledb:latest-pg16
    container_name: kaspa-timescaledb
    restart: unless-stopped
    environment:
      POSTGRES_DB: kaspa
      POSTGRES_USER: kaspa
      POSTGRES_PASSWORD: secure_password
      TIMESCALEDB_TELEMETRY: off
    ports:
      - "5432:5432"
    volumes:
      - timescaledb_data:/var/lib/postgresql/data
    command: >
      -c shared_preload_libraries=timescaledb
      -c timescaledb.max_background_workers=16
      -c max_worker_processes=32
      -c work_mem=512MB
      -c shared_buffers=4GB
      -c effective_cache_size=12GB
      -c checkpoint_timeout=15min
      -c max_wal_size=8GB

  simply-kaspa-indexer:
    image: supertypo/simply-kaspa-indexer:timescaledb
    container_name: simply-kaspa-indexer
    restart: unless-stopped
    depends_on:
      - timescaledb
    environment:
      DATABASE_URL: postgresql://kaspa:secure_password@timescaledb:5432/kaspa
      TIMESCALEDB_ENABLED: "true"
      BLOCKS_CHUNK_INTERVAL: "30"
      TRANSACTIONS_CHUNK_INTERVAL: "15"
    command: >
      -s ws://kaspa-node:17110
      -d postgresql://kaspa:secure_password@timescaledb:5432/kaspa
      --enable-timescaledb
      --blocks-chunk-interval 30
      --transactions-chunk-interval 15
      --compression-age-hours 2
      --timescaledb-batch-size 1000

volumes:
  timescaledb_data:
```

### 6. Performance Monitoring

#### **Metrics Collection:**
```rust
// Add to main indexer loop
use metrics::{counter, histogram, gauge};

impl TimescaleIndexer {
    pub async fn process_with_metrics(&self, blocks: Vec<Block>) -> Result<(), IndexerError> {
        let start = std::time::Instant::now();
        
        // Track processing metrics
        counter!("blocks_processed_total", blocks.len() as u64);
        
        let result = self.process_block_batch(blocks).await;
        
        // Track processing time
        histogram!("block_processing_duration_seconds", start.elapsed().as_secs_f64());
        
        // Track database performance
        let db_stats = self.get_database_stats().await?;
        gauge!("database_connections_active", db_stats.active_connections as f64);
        gauge!("database_chunk_count", db_stats.chunk_count as f64);
        
        result
    }
}
```

### 7. Migration Strategy

#### **Backward Compatibility:**
```sql
-- migrations/schema/timescaledb_compat.sql
-- Ensure backward compatibility with existing queries

-- Create views that maintain existing API
CREATE VIEW blocks_legacy AS 
SELECT 
    hash,
    accepted_id_merkle_root,
    merge_set_blues_hashes,
    merge_set_reds_hashes,
    selected_parent_hash,
    bits,
    blue_score,
    blue_work,
    daa_score,
    hash_merkle_root,
    nonce,
    pruning_point,
    "timestamp",
    utxo_commitment,
    version
FROM blocks;

-- Function to convert between timestamp formats
CREATE OR REPLACE FUNCTION kaspa_timestamp_to_timestamptz(kaspa_ts BIGINT)
RETURNS TIMESTAMPTZ AS $$
BEGIN
    RETURN to_timestamp(kaspa_ts / 1000.0);
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

## 🎯 Performance Benefits

### **Expected Improvements:**
- **Query Performance**: 10-100x faster for time-range queries
- **Storage Efficiency**: 50-90% reduction with compression
- **Throughput**: Maintain 10bps performance with lower resource usage
- **Scalability**: Linear scaling with data growth
- **Analytics**: Real-time network statistics with continuous aggregates

### **Kaspa-Specific Optimizations:**
- **30-minute chunks**: Optimal for 18,000 blocks per chunk at 10bps
- **15-minute transaction chunks**: Handle high transaction volume efficiently
- **Compression**: Reduce storage growth from continuous blockchain data
- **Continuous aggregates**: Real-time network analytics without performance impact

## 📊 Implementation Timeline

### Phase 1: Core Migration (2 weeks)
1. Add TimescaleDB schema migrations
2. Update Rust code for hypertable support
3. Implement batch processing optimizations

### Phase 2: Advanced Features (2 weeks)
1. Add compression policies
2. Implement continuous aggregates
3. Add performance monitoring

### Phase 3: Testing & Optimization (2 weeks)
1. Load test with 10bps simulation
2. Benchmark performance improvements
3. Fine-tune chunk intervals and compression

### Phase 4: Production Ready (1 week)
1. Documentation updates
2. Docker image optimization
3. Migration guides for existing deployments

This TimescaleDB integration will enhance the already high-performance Simply Kaspa Indexer with time-series database capabilities, making it even more efficient for Kaspa's blockchain characteristics while maintaining its existing strengths.