-- Simply Kaspa Database Initialization
-- Dedicated database for simply-kaspa-indexer service

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- ============================================================================
-- SIMPLY KASPA CONFIGURATION TABLES
-- ============================================================================

-- Configuration table for simply-kaspa-indexer
CREATE TABLE IF NOT EXISTS vars (
    key VARCHAR PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default configuration values for simply-kaspa-indexer
INSERT INTO vars (key, value) VALUES 
    ('network', 'mainnet'),
    ('version', '1.0.0'),
    ('last_processed_block', '0')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

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

-- Transaction acceptances table (required by simply-kaspa-indexer)
CREATE TABLE IF NOT EXISTS transactions_acceptances (
    id BIGSERIAL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    transaction_id VARCHAR NOT NULL,
    block_hash VARCHAR NOT NULL,
    PRIMARY KEY (created_at, id)
);

-- Convert to hypertable with 15-minute chunks
SELECT create_hypertable('transactions_acceptances', 'created_at',
    chunk_time_interval => INTERVAL '15 minutes',
    if_not_exists => TRUE);

-- Grant permissions to simply-kaspa user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO simply_kaspa_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO simply_kaspa_user;

-- Success message
\echo 'Simply Kaspa database initialization completed successfully!'
\echo 'Dedicated database for simply-kaspa-indexer service with TimescaleDB optimization'