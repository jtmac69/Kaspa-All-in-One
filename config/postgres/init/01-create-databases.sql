-- Create databases for indexers
-- This script runs when the PostgreSQL container starts for the first time

-- Create Kasia database
CREATE DATABASE kasia;
GRANT ALL PRIVILEGES ON DATABASE kasia TO indexer;

-- Create K Social database  
CREATE DATABASE ksocial;
GRANT ALL PRIVILEGES ON DATABASE ksocial TO indexer;

-- Create Simply Kaspa database
CREATE DATABASE simply_kaspa;
GRANT ALL PRIVILEGES ON DATABASE simply_kaspa TO indexer;

-- Create extensions that might be needed
\c kasia;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

\c ksocial;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

\c simply_kaspa;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";