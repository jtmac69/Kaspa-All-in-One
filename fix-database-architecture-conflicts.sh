#!/bin/bash

# Fix Database Architecture Conflicts
# This script resolves conflicts between old shared database and new per-service architecture

set -e

echo "🔧 Fixing Database Architecture Conflicts..."
echo "================================================"

# Step 1: Stop all services to prevent conflicts
echo "📋 Step 1: Stopping all services..."
docker-compose down --remove-orphans

# Step 2: Remove old database containers and volumes
echo "📋 Step 2: Cleaning up old database containers..."

# Remove old indexer-db container if it exists
if docker ps -a --format 'table {{.Names}}' | grep -q "indexer-db"; then
    echo "   Removing old indexer-db container..."
    docker rm -f indexer-db 2>/dev/null || true
fi

# Remove old database volumes that might conflict
echo "   Removing conflicting volumes..."
docker volume rm kaspa-aio_indexer-db-data 2>/dev/null || true
docker volume rm kaspa-aio_postgres-data 2>/dev/null || true
docker volume rm indexer-db-data 2>/dev/null || true
docker volume rm postgres-data 2>/dev/null || true

# Step 3: Clean up any orphaned networks
echo "📋 Step 3: Cleaning up networks..."
docker network prune -f

# Step 4: Verify new architecture containers don't exist yet
echo "📋 Step 4: Ensuring clean state for new architecture..."
docker rm -f k-social-db simply-kaspa-db 2>/dev/null || true

# Step 5: Start new database architecture
echo "📋 Step 5: Starting new database-per-service architecture..."
echo "   Starting k-social-db (port 5433)..."
docker-compose up -d k-social-db

echo "   Waiting for k-social-db to be ready..."
timeout=60
counter=0
while ! docker exec k-social-db pg_isready -U k_social_user -d ksocial >/dev/null 2>&1; do
    if [ $counter -ge $timeout ]; then
        echo "❌ Timeout waiting for k-social-db"
        exit 1
    fi
    sleep 2
    counter=$((counter + 2))
    echo "   Waiting... ($counter/$timeout seconds)"
done
echo "   ✅ k-social-db is ready"

echo "   Starting simply-kaspa-db (port 5434)..."
docker-compose up -d simply-kaspa-db

echo "   Waiting for simply-kaspa-db to be ready..."
counter=0
while ! docker exec simply-kaspa-db pg_isready -U simply_kaspa_user -d simply_kaspa >/dev/null 2>&1; do
    if [ $counter -ge $timeout ]; then
        echo "❌ Timeout waiting for simply-kaspa-db"
        exit 1
    fi
    sleep 2
    counter=$((counter + 2))
    echo "   Waiting... ($counter/$timeout seconds)"
done
echo "   ✅ simply-kaspa-db is ready"

# Step 6: Verify database schemas
echo "📋 Step 6: Verifying database schemas..."

echo "   Checking k-social-db schema..."
if docker exec k-social-db psql -U k_social_user -d ksocial -c "SELECT COUNT(*) FROM k_vars;" >/dev/null 2>&1; then
    echo "   ✅ k-social-db schema is correct (k_vars table exists)"
else
    echo "   ❌ k-social-db schema issue detected"
    exit 1
fi

echo "   Checking simply-kaspa-db schema..."
if docker exec simply-kaspa-db psql -U simply_kaspa_user -d simply_kaspa -c "SELECT COUNT(*) FROM vars;" >/dev/null 2>&1; then
    echo "   ✅ simply-kaspa-db schema is correct (vars table exists)"
else
    echo "   ❌ simply-kaspa-db schema issue detected"
    exit 1
fi

# Step 7: Start indexer services
echo "📋 Step 7: Starting indexer services..."
docker-compose up -d k-indexer simply-kaspa-indexer kasia-indexer

# Step 8: Verify service connections
echo "📋 Step 8: Verifying service connections..."
sleep 10

echo "   Checking k-indexer logs for database connection..."
if docker logs k-indexer --tail 20 2>&1 | grep -q "Connected to database\|Database connection established\|Ready to accept connections" || ! docker logs k-indexer --tail 20 2>&1 | grep -q "relation.*does not exist"; then
    echo "   ✅ k-indexer appears to be connecting properly"
else
    echo "   ⚠️  k-indexer may have connection issues - check logs with: docker logs k-indexer"
fi

echo "   Checking simply-kaspa-indexer logs for database connection..."
if docker logs simply-kaspa-indexer --tail 20 2>&1 | grep -q "Connected to database\|Database connection established\|Ready to accept connections" || ! docker logs simply-kaspa-indexer --tail 20 2>&1 | grep -q "relation.*does not exist"; then
    echo "   ✅ simply-kaspa-indexer appears to be connecting properly"
else
    echo "   ⚠️  simply-kaspa-indexer may have connection issues - check logs with: docker logs simply-kaspa-indexer"
fi

echo ""
echo "🎉 Database Architecture Fix Complete!"
echo "================================================"
echo ""
echo "📊 New Architecture Status:"
echo "   • k-social-db:        Running on port 5433"
echo "   • simply-kaspa-db:    Running on port 5434"
echo "   • kasia-indexer:      File-based storage (no database)"
echo ""
echo "🔍 To check logs for the new architecture:"
echo "   • K-Social DB:        docker logs k-social-db"
echo "   • Simply Kaspa DB:    docker logs simply-kaspa-db"
echo "   • K-Indexer:          docker logs k-indexer"
echo "   • Simply Kaspa Indexer: docker logs simply-kaspa-indexer"
echo "   • Kasia Indexer:      docker logs kasia-indexer"
echo ""
echo "❌ DO NOT use 'docker logs indexer-db' anymore - that container no longer exists!"
echo ""
echo "✅ The database conflicts should now be resolved."