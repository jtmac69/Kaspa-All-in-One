-- K-Social Database Initialization
-- Dedicated database for k-indexer service

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- ============================================================================
-- K PROTOCOL CONFIGURATION AND METADATA TABLES
-- ============================================================================

-- K Variables table (configuration and metadata storage)
-- Create both k_vars and vars tables to handle different k-indexer versions
CREATE TABLE IF NOT EXISTS k_vars (
    key VARCHAR PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vars (
    key VARCHAR PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default configuration values into both tables
INSERT INTO k_vars (key, value) VALUES 
    ('network', 'mainnet'),
    ('version', '1.0.0'),
    ('indexer_mode', 'full'),
    ('last_processed_block', '0'),
    ('sync_status', 'starting')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

INSERT INTO vars (key, value) VALUES 
    ('network', 'mainnet'),
    ('version', '1.0.0'),
    ('indexer_mode', 'full'),
    ('last_processed_block', '0'),
    ('sync_status', 'starting')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- ============================================================================
-- K PROTOCOL SOCIAL MEDIA TABLES WITH TIMESCALEDB OPTIMIZATION
-- ============================================================================

-- K Posts table (optimized for social activity patterns)
CREATE TABLE IF NOT EXISTS k_posts (
    id BIGSERIAL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    transaction_id BYTEA NOT NULL,
    author_address VARCHAR NOT NULL,
    content TEXT,
    reply_to BIGINT,
    block_time BIGINT,
    block_hash VARCHAR,
    -- Additional social media fields
    likes_count INTEGER DEFAULT 0,
    replies_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    is_deleted BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (created_at, id)
);

-- Convert to hypertable with 6-hour chunks (optimal for social activity)
SELECT create_hypertable('k_posts', 'created_at',
    chunk_time_interval => INTERVAL '6 hours',
    if_not_exists => TRUE);

-- K Votes table (likes, dislikes, reactions)
CREATE TABLE IF NOT EXISTS k_votes (
    id BIGSERIAL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    transaction_id BYTEA NOT NULL,
    voter_address VARCHAR NOT NULL,
    post_id BIGINT NOT NULL,
    vote_type SMALLINT, -- 1 for upvote, -1 for downvote, 0 for neutral
    block_time BIGINT,
    block_hash VARCHAR,
    PRIMARY KEY (created_at, id)
);

-- Convert to hypertable with 6-hour chunks
SELECT create_hypertable('k_votes', 'created_at',
    chunk_time_interval => INTERVAL '6 hours',
    if_not_exists => TRUE);

-- Grant permissions to k-social user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO k_social_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO k_social_user;

-- Success message
\echo 'K-Social database initialization completed successfully!'
\echo 'Dedicated database for k-indexer service with TimescaleDB optimization'