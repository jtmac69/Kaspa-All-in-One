#!/bin/bash

echo "🔍 Debugging k-indexer database connection issue..."

echo ""
echo "=== Container Environment ==="
docker exec k-indexer env | grep -E "(DATABASE|POSTGRES|DB_)" | sort

echo ""
echo "=== Database Connection Test ==="
echo "Testing direct connection to TimescaleDB..."
docker exec k-indexer pg_isready -h indexer-db -p 5432 -U kaspa

echo ""
echo "=== K-indexer Process ==="
docker exec k-indexer ps aux | grep k-indexer

echo ""
echo "=== K-indexer Arguments Parsing Test ==="
echo "Testing k-indexer with minimal arguments..."
docker exec k-indexer timeout 5s ./k-indexer --db-host indexer-db --db-port 5432 --db-name test --db-user test --db-password test || echo "Command timed out (expected)"

echo ""
echo "=== K-indexer Version ==="
docker exec k-indexer ./k-indexer --version

echo ""
echo "=== Recent K-indexer Logs ==="
docker logs k-indexer --tail 5

echo ""
echo "=== Database Container Status ==="
docker ps | grep indexer-db

echo ""
echo "=== Database Logs ==="
docker logs indexer-db --tail 5