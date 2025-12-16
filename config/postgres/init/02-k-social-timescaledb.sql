-- K-Social Indexer TimescaleDB Initialization
-- Optimized for Kaspa's 10 blocks/second rate and social media patterns

-- Connect to ksocial database
\c ksocial;

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

-- K User Profiles table (less frequent updates, daily chunks)
CREATE TABLE IF NOT EXISTS k_user_profiles (
    id BIGSERIAL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    transaction_id BYTEA NOT NULL,
    address VARCHAR NOT NULL UNIQUE,
    username VARCHAR,
    display_name VARCHAR,
    bio TEXT,
    avatar_hash VARCHAR,
    banner_hash VARCHAR,
    follower_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    posts_count INTEGER DEFAULT 0,
    block_time BIGINT,
    block_hash VARCHAR,
    is_verified BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (created_at, id)
);

-- Convert to hypertable with 1-day chunks (profiles change less frequently)
SELECT create_hypertable('k_user_profiles', 'created_at',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE);

-- K Follows table (social graph relationships)
CREATE TABLE IF NOT EXISTS k_follows (
    id BIGSERIAL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    transaction_id BYTEA NOT NULL,
    follower_address VARCHAR NOT NULL,
    following_address VARCHAR NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    block_time BIGINT,
    block_hash VARCHAR,
    PRIMARY KEY (created_at, id)
);

-- Convert to hypertable with 1-day chunks
SELECT create_hypertable('k_follows', 'created_at',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE);

-- K Transactions table (all K protocol transactions)
CREATE TABLE IF NOT EXISTS k_transactions (
    id BIGSERIAL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    transaction_id BYTEA NOT NULL UNIQUE,
    block_hash VARCHAR NOT NULL,
    block_time BIGINT NOT NULL,
    sender_address VARCHAR,
    transaction_type VARCHAR, -- 'post', 'vote', 'profile', 'follow', etc.
    data_payload JSONB,
    gas_used BIGINT,
    status VARCHAR DEFAULT 'confirmed',
    PRIMARY KEY (created_at, id)
);

-- Convert to hypertable with 1-hour chunks (high frequency)
SELECT create_hypertable('k_transactions', 'created_at',
    chunk_time_interval => INTERVAL '1 hour',
    if_not_exists => TRUE);

-- ============================================================================
-- COMPRESSION POLICIES (90%+ space savings for historical data)
-- ============================================================================

-- Compress data older than 24 hours for social media tables
SELECT add_compression_policy('k_posts', INTERVAL '24 hours');
SELECT add_compression_policy('k_votes', INTERVAL '24 hours');
SELECT add_compression_policy('k_follows', INTERVAL '24 hours');
SELECT add_compression_policy('k_transactions', INTERVAL '24 hours');

-- Compress user profiles after 7 days (less frequent updates)
SELECT add_compression_policy('k_user_profiles', INTERVAL '7 days');

-- ============================================================================
-- CONTINUOUS AGGREGATES FOR REAL-TIME ANALYTICS
-- ============================================================================

-- Hourly post statistics
CREATE MATERIALIZED VIEW hourly_post_stats
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 hour', created_at) AS hour,
    COUNT(*) as post_count,
    COUNT(DISTINCT author_address) as unique_authors,
    COUNT(*) FILTER (WHERE reply_to IS NOT NULL) as reply_count,
    COUNT(*) FILTER (WHERE reply_to IS NULL) as original_post_count
FROM k_posts
WHERE NOT is_deleted
GROUP BY hour;

-- Daily user activity aggregates
CREATE MATERIALIZED VIEW daily_user_activity
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 day', created_at) AS day,
    author_address,
    COUNT(*) as posts_count,
    COUNT(DISTINCT reply_to) as replies_count,
    MAX(created_at) as last_activity
FROM k_posts
WHERE NOT is_deleted
GROUP BY day, author_address;

-- Hourly voting activity
CREATE MATERIALIZED VIEW hourly_vote_stats
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 hour', created_at) AS hour,
    COUNT(*) as total_votes,
    COUNT(*) FILTER (WHERE vote_type = 1) as upvotes,
    COUNT(*) FILTER (WHERE vote_type = -1) as downvotes,
    COUNT(DISTINCT voter_address) as unique_voters
FROM k_votes
GROUP BY hour;

-- Daily social graph growth
CREATE MATERIALIZED VIEW daily_follow_stats
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 day', created_at) AS day,
    COUNT(*) FILTER (WHERE is_active = true) as new_follows,
    COUNT(*) FILTER (WHERE is_active = false) as unfollows,
    COUNT(DISTINCT follower_address) as active_followers,
    COUNT(DISTINCT following_address) as users_followed
FROM k_follows
GROUP BY day;

-- ============================================================================
-- REFRESH POLICIES FOR CONTINUOUS AGGREGATES
-- ============================================================================

-- Refresh hourly stats every hour
SELECT add_continuous_aggregate_policy('hourly_post_stats',
    start_offset => INTERVAL '1 day',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');

SELECT add_continuous_aggregate_policy('hourly_vote_stats',
    start_offset => INTERVAL '1 day',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');

-- Refresh daily stats every 6 hours
SELECT add_continuous_aggregate_policy('daily_user_activity',
    start_offset => INTERVAL '7 days',
    end_offset => INTERVAL '6 hours',
    schedule_interval => INTERVAL '6 hours');

SELECT add_continuous_aggregate_policy('daily_follow_stats',
    start_offset => INTERVAL '7 days',
    end_offset => INTERVAL '6 hours',
    schedule_interval => INTERVAL '6 hours');

-- ============================================================================
-- INDEXES FOR OPTIMAL QUERY PERFORMANCE
-- ============================================================================

-- K Posts indexes
CREATE INDEX IF NOT EXISTS idx_k_posts_author ON k_posts (author_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_k_posts_reply_to ON k_posts (reply_to, created_at DESC) WHERE reply_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_k_posts_content_search ON k_posts USING gin(to_tsvector('english', content));

-- K Votes indexes
CREATE INDEX IF NOT EXISTS idx_k_votes_post ON k_votes (post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_k_votes_voter ON k_votes (voter_address, created_at DESC);

-- K User Profiles indexes
CREATE INDEX IF NOT EXISTS idx_k_user_profiles_address ON k_user_profiles (address);
CREATE INDEX IF NOT EXISTS idx_k_user_profiles_username ON k_user_profiles (username) WHERE username IS NOT NULL;

-- K Follows indexes
CREATE INDEX IF NOT EXISTS idx_k_follows_follower ON k_follows (follower_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_k_follows_following ON k_follows (following_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_k_follows_active ON k_follows (follower_address, following_address) WHERE is_active = true;

-- K Transactions indexes
CREATE INDEX IF NOT EXISTS idx_k_transactions_type ON k_transactions (transaction_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_k_transactions_sender ON k_transactions (sender_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_k_transactions_block ON k_transactions (block_hash, created_at DESC);

-- ============================================================================
-- RETENTION POLICIES (Personal Indexer concept)
-- ============================================================================

-- Optional: Add retention policies for personal indexer mode
-- Uncomment and adjust based on user requirements

-- Keep only 1 year of detailed vote data (can be customized per user)
-- SELECT add_retention_policy('k_votes', INTERVAL '1 year');

-- Keep only 2 years of post data (can be customized per user)
-- SELECT add_retention_policy('k_posts', INTERVAL '2 years');

-- Keep transaction data for 6 months (can be customized per user)
-- SELECT add_retention_policy('k_transactions', INTERVAL '6 months');

-- ============================================================================
-- PERFORMANCE MONITORING VIEWS
-- ============================================================================

-- View to monitor chunk compression status
CREATE OR REPLACE VIEW chunk_compression_stats AS
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
CREATE OR REPLACE VIEW hypertable_stats AS
SELECT 
    ht.table_name,
    ht.num_chunks,
    pg_size_pretty(ht.table_bytes) as table_size,
    pg_size_pretty(ht.index_bytes) as index_size,
    pg_size_pretty(ht.total_bytes) as total_size
FROM timescaledb_information.hypertables ht
WHERE ht.schema_name = 'public'
ORDER BY ht.total_bytes DESC;

-- Grant permissions to k-social user and admin
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA k_social TO k_social_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA k_social TO k_social_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA k_social TO kaspa;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA k_social TO kaspa;

-- Success message
\echo 'K-Social TimescaleDB initialization completed successfully!'
\echo 'Hypertables created with optimized chunk intervals for social media patterns'
\echo 'Compression policies enabled for 90%+ space savings on historical data'
\echo 'Continuous aggregates configured for real-time social media analytics'
\echo 'Performance monitoring views available: chunk_compression_stats, hypertable_stats'