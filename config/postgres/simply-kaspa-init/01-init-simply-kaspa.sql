-- Simply Kaspa Database Initialization
-- Dedicated database for simply-kaspa-indexer service

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- ============================================================================
-- SIMPLY KASPA DATABASE INITIALIZATION
-- ============================================================================
-- 
-- This script only sets up the database environment and extensions.
-- The simply-kaspa-indexer will create its own schema and tables.
-- We don't pre-create tables to avoid conflicts with the indexer's schema management.

-- Grant permissions to simply-kaspa user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO simply_kaspa_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO simply_kaspa_user;

-- Success message
\echo 'Simply Kaspa database initialization completed successfully!'
\echo 'Dedicated database for simply-kaspa-indexer service with TimescaleDB optimization'