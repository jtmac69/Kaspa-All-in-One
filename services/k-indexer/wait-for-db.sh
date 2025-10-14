#!/bin/sh

# Wait for database to be ready
echo "Waiting for database to be ready..."

# Extract database connection details from DATABASE_URL
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*\/\/\([^:]*\):.*/\1/p')

# Default values if extraction fails
DB_HOST=${DB_HOST:-k-social-db}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-ksocial}
DB_USER=${DB_USER:-ksocial}

echo "Checking connection to $DB_HOST:$DB_PORT..."

# Wait for PostgreSQL to be ready
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"; do
  echo "Database is unavailable - sleeping"
  sleep 2
done

echo "Database is ready!"

# Run database migrations if they exist
if [ -f "migrations/migrate.js" ] || [ -f "migrate.js" ] || [ -f "scripts/migrate.js" ]; then
  echo "Running database migrations..."
  npm run migrate 2>/dev/null || echo "No migration script found or migration failed"
fi

echo "Database setup complete!"