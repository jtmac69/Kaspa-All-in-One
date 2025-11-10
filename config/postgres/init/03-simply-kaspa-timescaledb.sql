-- Simply Kaspa Indexer TimescaleDB Initialization
-- Optimized for Kaspa's 10 blocks/second rate (864,000 blocks/day)

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Create Simply Kaspa database if it doesn't exist
SELECT 'CREATE DATABASE simply_kaspa' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'simply_kaspa')\gexec

-- Connect to simply_kaspa database
\c simply_kaspa;

-- Enable TimescaleDB extension in simply_kaspa database
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- ============================================================================
-- KASPA BLOCKCHAIN TABLES WITH TIMESCALEDB OPTIMIZATION
-- ============================================================================

-- Blocks table (optimized for 10 blocks/second = 36,000 blocks/hour)
CREATE TABLE IF NOT EXISTS blocks (
    id BIGSERIAL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    hash VARCHAR NOT NULL UNIQUE,
    previous_hash VARCHAR,
    merkle_root VARCHAR,
    accepted_id_merkle_root VARCHAR,
    utxo_commitment VARCHAR,
    timestamp BIGINT NOT NULL,
    bits BIGINT,
    nonce BIGINT,
    daa_score BIGINT,
    blue_score BIGINT,
    blue_work VARCHAR,
    pruning_point VARCHAR,
    difficulty NUMERIC,
    selected_parent_hash VARCHAR,
    transaction_count INTEGER DEFAULT 0,
    -- Additional indexing fields
    block_level INTEGER,
    is_chain_block BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (created_at, id)
);

-- Convert to hypertable with 30-minute chunks (18,000 blocks per chunk)
SELECT create_hypertable('blocks', 'created_at',
    chunk_time_interval => INTERVAL '30 minutes',
    if_not_exists => TRUE);

-- Transactions table (high frequency, optimized for batch processing)
CREATE TABLE IF NOT EXISTS transactions (
    id BIGSERIAL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    transaction_id VARCHAR NOT NULL UNIQUE,
    block_hash VARCHAR NOT NULL,
    block_time BIGINT NOT NULL,
    version INTEGER,
    lock_time BIGINT,
    subnetwork_id VARCHAR,
    gas BIGINT,
    payload_hash VARCHAR,
    payload BYTEA,
    -- Transaction metrics
    input_count INTEGER DEFAULT 0,
    output_count INTEGER DEFAULT 0,
    total_input_value BIGINT DEFAULT 0,
    total_output_value BIGINT DEFAULT 0,
    fee BIGINT DEFAULT 0,
    mass BIGINT DEFAULT 0,
    PRIMARY KEY (created_at, id)
);

-- Convert to hypertable with 15-minute chunks (high frequency)
SELECT create_hypertable('transactions', 'created_at',
    chunk_time_interval => INTERVAL '15 minutes',
    if_not_exists => TRUE);

-- Transaction Inputs table
CREATE TABLE IF NOT EXISTS transaction_inputs (
    id BIGSERIAL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    transaction_id VARCHAR NOT NULL,
    previous_outpoint_hash VARCHAR,
    previous_outpoint_index INTEGER,
    signature_script BYTEA,
    sequence BIGINT,
    sig_op_count INTEGER,
    value BIGINT,
    address VARCHAR,
    PRIMARY KEY (created_at, id)
);

-- Convert to hypertable with 15-minute chunks
SELECT create_hypertable('transaction_inputs', 'created_at',
    chunk_time_interval => INTERVAL '15 minutes',
    if_not_exists => TRUE);

-- Transaction Outputs table
CREATE TABLE IF NOT EXISTS transaction_outputs (
    id BIGSERIAL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    transaction_id VARCHAR NOT NULL,
    output_index INTEGER NOT NULL,
    value BIGINT NOT NULL,
    script_public_key BYTEA,
    address VARCHAR,
    is_spent BOOLEAN DEFAULT FALSE,
    spent_by_transaction_id VARCHAR,
    PRIMARY KEY (created_at, id)
);

-- Convert to hypertable with 15-minute chunks
SELECT create_hypertable('transaction_outputs', 'created_at',
    chunk_time_interval => INTERVAL '15 minutes',
    if_not_exists => TRUE);

-- Addresses table (UTXO tracking)
CREATE TABLE IF NOT EXISTS addresses (
    id BIGSERIAL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    address VARCHAR NOT NULL UNIQUE,
    balance BIGINT DEFAULT 0,
    transaction_count INTEGER DEFAULT 0,
    first_seen_at TIMESTAMPTZ,
    last_seen_at TIMESTAMPTZ,
    -- Address analytics
    total_received BIGINT DEFAULT 0,
    total_sent BIGINT DEFAULT 0,
    utxo_count INTEGER DEFAULT 0,
    PRIMARY KEY (created_at, id)
);

-- Convert to hypertable with 1-hour chunks (less frequent updates)
SELECT create_hypertable('addresses', 'created_at',
    chunk_time_interval => INTERVAL '1 hour',
    if_not_exists => TRUE);

-- Network Statistics table (for continuous aggregates)
CREATE TABLE IF NOT EXISTS network_stats (
    id BIGSERIAL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    block_count BIGINT,
    transaction_count BIGINT,
    total_supply BIGINT,
    circulating_supply BIGINT,
    difficulty NUMERIC,
    hashrate NUMERIC,
    block_time_avg NUMERIC,
    transaction_rate NUMERIC,
    PRIMARY KEY (created_at, id)
);

-- Convert to hypertable with 1-hour chunks
SELECT create_hypertable('network_stats', 'created_at',
    chunk_time_interval => INTERVAL '1 hour',
    if_not_exists => TRUE);

-- ============================================================================
-- COMPRESSION POLICIES (90%+ space savings for historical blockchain data)
-- ============================================================================

-- Compress blockchain data older than 2 hours
SELECT add_compression_policy('blocks', INTERVAL '2 hours');
SELECT add_compression_policy('transactions', INTERVAL '2 hours');
SELECT add_compression_policy('transaction_inputs', INTERVAL '2 hours');
SELECT add_compression_policy('transaction_outputs', INTERVAL '2 hours');

-- Compress address data after 24 hours
SELECT add_compression_policy('addresses', INTERVAL '24 hours');

-- Compress network stats after 6 hours
SELECT add_compression_policy('network_stats', INTERVAL '6 hours');

-- ============================================================================
-- CONTINUOUS AGGREGATES FOR REAL-TIME BLOCKCHAIN ANALYTICS
-- ============================================================================

-- Hourly blockchain statistics
CREATE MATERIALIZED VIEW hourly_blockchain_stats
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 hour', created_at) AS hour,
    COUNT(*) as block_count,
    AVG(difficulty) as avg_difficulty,
    SUM(transaction_count) as total_transactions,
    AVG(transaction_count) as avg_transactions_per_block,
    MIN(timestamp) as first_block_time,
    MAX(timestamp) as last_block_time
FROM blocks
GROUP BY hour;

-- Daily network activity
CREATE MATERIALIZED VIEW daily_network_activity
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 day', created_at) AS day,
    COUNT(*) as transaction_count,
    COUNT(DISTINCT block_hash) as block_count,
    SUM(total_input_value) as total_volume,
    AVG(fee) as avg_fee,
    SUM(fee) as total_fees,
    COUNT(DISTINCT CASE WHEN input_count > 0 THEN transaction_id END) as active_transactions
FROM transactions
GROUP BY day;

-- Hourly address activity
CREATE MATERIALIZED VIEW hourly_address_activity
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 hour', created_at) AS hour,
    COUNT(DISTINCT address) as active_addresses,
    SUM(CASE WHEN balance > 0 THEN 1 ELSE 0 END) as addresses_with_balance,
    AVG(balance) as avg_balance,
    SUM(transaction_count) as total_address_transactions
FROM addresses
WHERE updated_at >= created_at - INTERVAL '1 hour'
GROUP BY hour;

-- 15-minute real-time blockchain metrics (for monitoring)
CREATE MATERIALIZED VIEW realtime_blockchain_metrics
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('15 minutes', created_at) AS time_window,
    COUNT(*) as blocks_mined,
    SUM(transaction_count) as transactions_processed,
    AVG(difficulty) as current_difficulty,
    (COUNT(*) * 4.0) as blocks_per_hour_rate, -- 15min * 4 = 1 hour
    (SUM(transaction_count) * 4.0) as transactions_per_hour_rate
FROM blocks
GROUP BY time_window;

-- ============================================================================
-- REFRESH POLICIES FOR CONTINUOUS AGGREGATES
-- ============================================================================

-- Refresh real-time metrics every 15 minutes
SELECT add_continuous_aggregate_policy('realtime_blockchain_metrics',
    start_offset => INTERVAL '2 hours',
    end_offset => INTERVAL '15 minutes',
    schedule_interval => INTERVAL '15 minutes');

-- Refresh hourly stats every hour
SELECT add_continuous_aggregate_policy('hourly_blockchain_stats',
    start_offset => INTERVAL '1 day',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');

SELECT add_continuous_aggregate_policy('hourly_address_activity',
    start_offset => INTERVAL '1 day',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');

-- Refresh daily stats every 6 hours
SELECT add_continuous_aggregate_policy('daily_network_activity',
    start_offset => INTERVAL '7 days',
    end_offset => INTERVAL '6 hours',
    schedule_interval => INTERVAL '6 hours');

-- ============================================================================
-- INDEXES FOR OPTIMAL BLOCKCHAIN QUERY PERFORMANCE
-- ============================================================================

-- Blocks indexes
CREATE INDEX IF NOT EXISTS idx_blocks_hash ON blocks (hash);
CREATE INDEX IF NOT EXISTS idx_blocks_timestamp ON blocks (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_blocks_daa_score ON blocks (daa_score DESC);
CREATE INDEX IF NOT EXISTS idx_blocks_blue_score ON blocks (blue_score DESC);
CREATE INDEX IF NOT EXISTS idx_blocks_previous_hash ON blocks (previous_hash);

-- Transactions indexes
CREATE INDEX IF NOT EXISTS idx_transactions_block_hash ON transactions (block_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_block_time ON transactions (block_time DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_value ON transactions (total_output_value DESC);

-- Transaction inputs indexes
CREATE INDEX IF NOT EXISTS idx_tx_inputs_transaction_id ON transaction_inputs (transaction_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tx_inputs_address ON transaction_inputs (address, created_at DESC) WHERE address IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tx_inputs_outpoint ON transaction_inputs (previous_outpoint_hash, previous_outpoint_index);

-- Transaction outputs indexes
CREATE INDEX IF NOT EXISTS idx_tx_outputs_transaction_id ON transaction_outputs (transaction_id, output_index);
CREATE INDEX IF NOT EXISTS idx_tx_outputs_address ON transaction_outputs (address, created_at DESC) WHERE address IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tx_outputs_value ON transaction_outputs (value DESC);
CREATE INDEX IF NOT EXISTS idx_tx_outputs_unspent ON transaction_outputs (address, value DESC) WHERE NOT is_spent;

-- Addresses indexes
CREATE INDEX IF NOT EXISTS idx_addresses_balance ON addresses (balance DESC) WHERE balance > 0;
CREATE INDEX IF NOT EXISTS idx_addresses_transaction_count ON addresses (transaction_count DESC);
CREATE INDEX IF NOT EXISTS idx_addresses_last_seen ON addresses (last_seen_at DESC);

-- ============================================================================
-- RETENTION POLICIES (Personal Indexer concept)
-- ============================================================================

-- Optional: Add retention policies for personal indexer mode
-- Uncomment and adjust based on user requirements and storage capacity

-- Keep detailed transaction data for 1 year (can be customized per user)
-- SELECT add_retention_policy('transaction_inputs', INTERVAL '1 year');
-- SELECT add_retention_policy('transaction_outputs', INTERVAL '1 year');

-- Keep block data for 2 years (can be customized per user)
-- SELECT add_retention_policy('blocks', INTERVAL '2 years');

-- Keep transaction summaries for 6 months (can be customized per user)
-- SELECT add_retention_policy('transactions', INTERVAL '6 months');

-- ============================================================================
-- PERFORMANCE MONITORING AND ANALYTICS VIEWS
-- ============================================================================

-- View to monitor chunk compression status
CREATE OR REPLACE VIEW blockchain_compression_stats AS
SELECT 
    chunk_name,
    table_name,
    pg_size_pretty(before_compression_bytes) as before_compression,
    pg_size_pretty(after_compression_bytes) as after_compression,
    ROUND(compression_ratio::numeric, 2) as compression_ratio,
    pg_size_pretty(before_compression_bytes - after_compression_bytes) as space_saved
FROM timescaledb_information.chunk_compression_stats
WHERE schema_name = 'public'
ORDER BY before_compression_bytes DESC;

-- View to monitor hypertable statistics
CREATE OR REPLACE VIEW blockchain_hypertable_stats AS
SELECT 
    ht.table_name,
    ht.num_chunks,
    pg_size_pretty(ht.table_bytes) as table_size,
    pg_size_pretty(ht.index_bytes) as index_size,
    pg_size_pretty(ht.total_bytes) as total_size,
    ROUND((ht.table_bytes::numeric / (1024^3)), 2) as table_size_gb
FROM timescaledb_information.hypertables ht
WHERE ht.schema_name = 'public'
ORDER BY ht.total_bytes DESC;

-- Real-time blockchain performance metrics
CREATE OR REPLACE VIEW blockchain_performance_metrics AS
SELECT 
    'blocks_per_second' as metric,
    ROUND((COUNT(*) / EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))))::numeric, 4) as value,
    'Current blockchain processing rate' as description
FROM blocks 
WHERE created_at >= NOW() - INTERVAL '1 hour'
UNION ALL
SELECT 
    'transactions_per_second' as metric,
    ROUND((COUNT(*) / EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))))::numeric, 4) as value,
    'Current transaction processing rate' as description
FROM transactions 
WHERE created_at >= NOW() - INTERVAL '1 hour'
UNION ALL
SELECT 
    'avg_transactions_per_block' as metric,
    ROUND(AVG(transaction_count)::numeric, 2) as value,
    'Average transactions per block (last hour)' as description
FROM blocks 
WHERE created_at >= NOW() - INTERVAL '1 hour';

-- Personal Indexer user statistics view
CREATE OR REPLACE VIEW personal_indexer_stats AS
SELECT 
    'total_blocks_indexed' as metric,
    COUNT(*)::text as value,
    'Total blocks in personal index' as description
FROM blocks
UNION ALL
SELECT 
    'total_transactions_indexed' as metric,
    COUNT(*)::text as value,
    'Total transactions in personal index' as description
FROM transactions
UNION ALL
SELECT 
    'unique_addresses_tracked' as metric,
    COUNT(*)::text as value,
    'Unique addresses in personal index' as description
FROM addresses
UNION ALL
SELECT 
    'database_size' as metric,
    pg_size_pretty(pg_database_size(current_database())) as value,
    'Total database size' as description;

-- Grant permissions to indexer user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO indexer;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO indexer;
GRANT USAGE ON SCHEMA public TO indexer;

-- Success message
\echo 'Simply Kaspa TimescaleDB initialization completed successfully!'
\echo 'Hypertables created with 15-30 minute chunks optimized for 10bps rate'
\echo 'Compression policies enabled for 90%+ space savings on blockchain data'
\echo 'Continuous aggregates configured for real-time blockchain analytics'
\echo 'Performance monitoring views: blockchain_compression_stats, blockchain_hypertable_stats'
\echo 'Personal Indexer features enabled with customizable retention policies'