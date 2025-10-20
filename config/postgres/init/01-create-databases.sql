-- Create databases for indexers with TimescaleDB
-- This script runs when the TimescaleDB container starts for the first time

-- Create Kasia database
CREATE DATABASE kasia;
GRANT ALL PRIVILEGES ON DATABASE kasia TO indexer;

-- Create K Social database  
CREATE DATABASE ksocial;
GRANT ALL PRIVILEGES ON DATABASE ksocial TO indexer;

-- Create Simply Kaspa database
CREATE DATABASE simply_kaspa;
GRANT ALL PRIVILEGES ON DATABASE simply_kaspa TO indexer;

-- Configure Kasia database with TimescaleDB
\c kasia;
CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Configure K Social database with TimescaleDB
\c ksocial;
CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Configure Simply Kaspa database with TimescaleDB
\c simply_kaspa;
CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create time-series optimized tables for blockchain data
-- Example hypertables for common blockchain patterns

-- Blocks hypertable (time-series by block timestamp)
CREATE TABLE IF NOT EXISTS blocks (
    time TIMESTAMPTZ NOT NULL,
    block_hash TEXT NOT NULL,
    block_height BIGINT NOT NULL,
    parent_hash TEXT,
    difficulty NUMERIC,
    nonce BIGINT,
    size_bytes INTEGER,
    tx_count INTEGER,
    PRIMARY KEY (time, block_hash)
);

-- Convert to hypertable (partitioned by time)
SELECT create_hypertable('blocks', 'time', if_not_exists => TRUE);

-- Transactions hypertable (time-series by transaction timestamp)
CREATE TABLE IF NOT EXISTS transactions (
    time TIMESTAMPTZ NOT NULL,
    tx_hash TEXT NOT NULL,
    block_hash TEXT NOT NULL,
    block_height BIGINT NOT NULL,
    input_count INTEGER,
    output_count INTEGER,
    fee BIGINT,
    size_bytes INTEGER,
    PRIMARY KEY (time, tx_hash)
);

-- Convert to hypertable
SELECT create_hypertable('transactions', 'time', if_not_exists => TRUE);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_blocks_height ON blocks (block_height);
CREATE INDEX IF NOT EXISTS idx_blocks_hash ON blocks (block_hash);
CREATE INDEX IF NOT EXISTS idx_transactions_block ON transactions (block_hash);
CREATE INDEX IF NOT EXISTS idx_transactions_height ON transactions (block_height);