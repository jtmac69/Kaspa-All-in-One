-- Create archive database with TimescaleDB
-- This script runs when the Archive TimescaleDB container starts for the first time

-- Create extensions for archive database
CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create comprehensive archive tables for long-term blockchain data storage

-- Historical blocks with extended retention
CREATE TABLE IF NOT EXISTS archive_blocks (
    time TIMESTAMPTZ NOT NULL,
    block_hash TEXT NOT NULL,
    block_height BIGINT NOT NULL,
    parent_hash TEXT,
    difficulty NUMERIC,
    nonce BIGINT,
    size_bytes INTEGER,
    tx_count INTEGER,
    miner_address TEXT,
    reward BIGINT,
    PRIMARY KEY (time, block_hash)
);

-- Convert to hypertable with longer chunk intervals for archive data
SELECT create_hypertable('archive_blocks', 'time', 
    chunk_time_interval => INTERVAL '1 month',
    if_not_exists => TRUE);

-- Historical transactions with full details
CREATE TABLE IF NOT EXISTS archive_transactions (
    time TIMESTAMPTZ NOT NULL,
    tx_hash TEXT NOT NULL,
    block_hash TEXT NOT NULL,
    block_height BIGINT NOT NULL,
    input_count INTEGER,
    output_count INTEGER,
    fee BIGINT,
    size_bytes INTEGER,
    raw_data JSONB,
    PRIMARY KEY (time, tx_hash)
);

-- Convert to hypertable
SELECT create_hypertable('archive_transactions', 'time',
    chunk_time_interval => INTERVAL '1 month',
    if_not_exists => TRUE);

-- Network statistics aggregated by time
CREATE TABLE IF NOT EXISTS network_stats (
    time TIMESTAMPTZ NOT NULL,
    hash_rate NUMERIC,
    difficulty NUMERIC,
    block_count INTEGER,
    tx_count INTEGER,
    total_supply BIGINT,
    active_addresses INTEGER
);

-- Convert to hypertable with daily aggregation
SELECT create_hypertable('network_stats', 'time',
    chunk_time_interval => INTERVAL '1 week',
    if_not_exists => TRUE);

-- Create compression policy for old data (compress data older than 7 days)
SELECT add_compression_policy('archive_blocks', INTERVAL '7 days');
SELECT add_compression_policy('archive_transactions', INTERVAL '7 days');
SELECT add_compression_policy('network_stats', INTERVAL '7 days');

-- Create retention policy for very old data (optional, disabled by default)
-- Uncomment to enable automatic data deletion after specified period
-- SELECT add_retention_policy('archive_blocks', INTERVAL '5 years');
-- SELECT add_retention_policy('archive_transactions', INTERVAL '5 years');

-- Create continuous aggregates for common queries
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_block_stats
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 day', time) AS day,
    COUNT(*) as block_count,
    AVG(difficulty) as avg_difficulty,
    SUM(tx_count) as total_transactions,
    AVG(size_bytes) as avg_block_size
FROM archive_blocks
GROUP BY day;

-- Refresh policy for continuous aggregates
SELECT add_continuous_aggregate_policy('daily_block_stats',
    start_offset => INTERVAL '1 month',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_archive_blocks_height ON archive_blocks (block_height);
CREATE INDEX IF NOT EXISTS idx_archive_blocks_hash ON archive_blocks (block_hash);
CREATE INDEX IF NOT EXISTS idx_archive_blocks_miner ON archive_blocks (miner_address);
CREATE INDEX IF NOT EXISTS idx_archive_transactions_block ON archive_transactions (block_hash);
CREATE INDEX IF NOT EXISTS idx_archive_transactions_height ON archive_transactions (block_height);

-- GIN index for JSONB data
CREATE INDEX IF NOT EXISTS idx_archive_transactions_data ON archive_transactions USING GIN (raw_data);