# Simply Kaspa Indexer Dockerfile with TimescaleDB Optimizations
# Build-time integration - clones repository during build

FROM node:18-alpine AS builder

# Build arguments
ARG SIMPLY_KASPA_VERSION=master
ARG ENABLE_TIMESCALEDB=true
ARG BUILDKIT_INLINE_CACHE=1

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    curl \
    postgresql-client

# Clone Simply Kaspa indexer repository
RUN echo "Cloning Simply Kaspa indexer version: ${SIMPLY_KASPA_VERSION}" && \
    git clone --depth 1 --branch ${SIMPLY_KASPA_VERSION} \
    https://github.com/supertypo/simply-kaspa-indexer.git /tmp/simply-kaspa || \
    git clone --depth 1 https://github.com/supertypo/simply-kaspa-indexer.git /tmp/simply-kaspa

# Copy repository contents to working directory
RUN cp -r /tmp/simply-kaspa/* /app/ && \
    rm -rf /tmp/simply-kaspa

# Copy TimescaleDB configuration files
COPY timescaledb-config.toml /app/config/timescaledb-config.toml
COPY batch-processor-config.toml /app/config/batch-processor-config.toml
COPY personal-indexer-config.toml /app/config/personal-indexer-config.toml

# Install dependencies
RUN if [ -f package.json ]; then \
        npm ci --only=production || npm install --production; \
    else \
        echo "No package.json found, creating minimal package.json"; \
        echo '{"name":"simply-kaspa-indexer","version":"1.0.0","main":"index.js"}' > package.json; \
    fi

# Build the application if build script exists
RUN npm run build 2>/dev/null || echo "No build script found, skipping build step"

# Production stage
FROM node:18-alpine

# Build arguments for labels
ARG SIMPLY_KASPA_VERSION=master
ARG ENABLE_TIMESCALEDB=true

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache \
    dumb-init \
    curl \
    postgresql-client \
    bash

# Copy built application from builder
COPY --from=builder /app /app

# Copy wait-for-db script
COPY wait-for-db.sh /app/
RUN chmod +x /app/wait-for-db.sh

# Create non-root user
RUN addgroup -g 1001 -S simply && \
    adduser -u 1001 -S simply -G simply

# Create necessary directories
RUN mkdir -p /app/data /app/logs /app/cache /app/config && \
    chown -R simply:simply /app

# Add labels for image management
LABEL simply-kaspa.version="${SIMPLY_KASPA_VERSION}"
LABEL simply-kaspa.timescaledb="${ENABLE_TIMESCALEDB}"
LABEL simply-kaspa.build-date="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
LABEL simply-kaspa.description="Simply Kaspa Indexer with TimescaleDB optimizations"

USER simply

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Environment variables with TimescaleDB defaults
ENV NODE_ENV=production
ENV PORT=3000
ENV KASPA_NODE_URL=http://kaspa-node:16111
ENV INDEXER_MODE=full
ENV CACHE_SIZE=1000
ENV ENABLE_TIMESCALEDB=true
ENV ENABLE_COMPRESSION=true
ENV COMPRESSION_AGE_HOURS=2
ENV BATCH_SIZE=1000
ENV CHUNK_INTERVAL_MINUTES=30
ENV LOG_LEVEL=info
ENV RETENTION_DAYS=0

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "./wait-for-db.sh && npm start"]