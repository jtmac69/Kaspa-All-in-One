FROM rust:1.88-alpine AS builder

# Build arguments for version control
ARG K_INDEXER_VERSION=master
ARG ENABLE_TIMESCALEDB=true

# Install build dependencies
RUN apk add --no-cache musl-dev git pkgconfig openssl-dev

# Clone K-indexer repository at build time
RUN git clone --depth 1 --branch ${K_INDEXER_VERSION} https://github.com/thesheepcat/K-indexer.git /app

WORKDIR /app

# Build the Rust application
RUN cargo build --release

# Production stage
FROM alpine:latest

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache curl postgresql-client ca-certificates

# Copy built application from builder stage
COPY --from=builder /app/target/release/K-webserver ./k-indexer
COPY --from=builder /app/target/release/K-transaction-processor ./k-transaction-processor

# Copy TimescaleDB configuration and optimizations (as JSON/TOML configs)
COPY timescaledb-config.toml ./config/
COPY batch-processor-config.toml ./config/
COPY personal-indexer-config.toml ./config/

# Copy database wait script
COPY wait-for-db.sh ./
RUN chmod +x ./wait-for-db.sh

# Create non-root user
RUN addgroup -g 1001 -S ksocial && \
    adduser -u 1001 -S ksocial -G ksocial

# Create necessary directories
RUN mkdir -p /app/data /app/logs /app/metrics /app/config && \
    chown -R ksocial:ksocial /app

USER ksocial

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Environment variables
ENV RUST_LOG=info
ENV PORT=8080
ENV KASPA_NODE_URL=http://kaspa-node:16111
ENV DATABASE_URL=postgresql://indexer:secure_password@indexer-db:5432/ksocial
ENV ENABLE_TIMESCALEDB=true
ENV BATCH_SIZE=1000
ENV CHUNK_INTERVAL=6h
ENV ENABLE_COMPRESSION=true
ENV PERSONAL_INDEXER_MODE=false

# Start the K-indexer webserver
# Extract database credentials from DATABASE_URL and pass as CLI arguments
CMD ["sh", "-c", "\
    ./wait-for-db.sh && \
    DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\\([^:]*\\):.*/\\1/p') && \
    DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\\([0-9]*\\)\\/.*/\\1/p') && \
    DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\\/\\([^?]*\\).*/\\1/p') && \
    DB_USER=$(echo $DATABASE_URL | sed -n 's/.*\\/\\/\\([^:]*\\):.*/\\1/p') && \
    DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\\/\\/[^:]*:\\([^@]*\\)@.*/\\1/p') && \
    ./k-indexer \
        --db-host ${DB_HOST:-indexer-db} \
        --db-port ${DB_PORT:-5432} \
        --db-name ${DB_NAME:-ksocial} \
        --db-user ${DB_USER:-indexer} \
        --db-password ${DB_PASS:-secure_password} \
"]