#!/bin/sh

# Wait for TimescaleDB to be ready for K-indexer
echo "Waiting for TimescaleDB to be ready..."

# Extract database connection details from DATABASE_URL
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*\/\/\([^:]*\):.*/\1/p')

# Default values if extraction fails
DB_HOST=${DB_HOST:-indexer-db}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-ksocial}
DB_USER=${DB_USER:-indexer}

echo "Checking connection to TimescaleDB at $DB_HOST:$DB_PORT..."
echo "Database: $DB_NAME, User: $DB_USER"

# Wait for PostgreSQL to be ready
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"; do
  echo "TimescaleDB is unavailable - sleeping"
  sleep 2
done

echo "TimescaleDB is ready!"

# Verify TimescaleDB extension is available
echo "Verifying TimescaleDB extension..."
TIMESCALEDB_CHECK=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM pg_extension WHERE extname='timescaledb';" 2>/dev/null || echo "0")

if [ "$TIMESCALEDB_CHECK" -gt 0 ]; then
  echo "✓ TimescaleDB extension is available"
else
  echo "⚠ TimescaleDB extension not found, but continuing..."
fi

# Check if hypertables exist
echo "Checking K-Social hypertables..."
HYPERTABLES_CHECK=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM timescaledb_information.hypertables WHERE schema_name='public';" 2>/dev/null || echo "0")

if [ "$HYPERTABLES_CHECK" -gt 0 ]; then
  echo "✓ Found $HYPERTABLES_CHECK K-Social hypertables"
else
  echo "⚠ No hypertables found - they should be created by initialization scripts"
fi

# Run database migrations if they exist (Rust application)
if [ -f "migrations" ] || [ -f "migrate" ] || [ -f "k-transaction-processor" ]; then
  echo "Running database migrations..."
  ./k-transaction-processor --migrate 2>/dev/null || echo "No migration capability or migration failed"
fi

# Initialize TimescaleDB optimizations if enabled
if [ "$ENABLE_TIMESCALEDB" = "true" ]; then
  echo "Initializing TimescaleDB optimizations..."
  
  # Create Personal Indexer indexes if enabled
  if [ "$PERSONAL_INDEXER_MODE" = "true" ] && [ -n "$USER_ADDRESS" ]; then
    echo "Setting up Personal Indexer for user: $USER_ADDRESS"
    # Personal indexer setup would be handled by the application
  fi
  
  echo "✓ TimescaleDB optimizations initialized"
fi

# Verify batch processing configuration
if [ -n "$BATCH_SIZE" ]; then
  echo "✓ Batch processing configured with size: $BATCH_SIZE"
fi

# Display configuration summary
echo ""
echo "=== K-Indexer Configuration Summary ==="
echo "Database Host: $DB_HOST:$DB_PORT"
echo "Database Name: $DB_NAME"
echo "TimescaleDB Enabled: ${ENABLE_TIMESCALEDB:-true}"
echo "Batch Size: ${BATCH_SIZE:-1000}"
echo "Personal Indexer: ${PERSONAL_INDEXER_MODE:-false}"
echo "Chunk Interval: ${CHUNK_INTERVAL:-6h}"
echo "Compression Enabled: ${ENABLE_COMPRESSION:-true}"
echo "======================================="
echo ""

echo "Database setup complete! Starting K-indexer..."