# Kasia Messaging Application - Build from Release
# This Dockerfile builds Kasia from a specific stable release
# Using v0.6.2 release from https://github.com/K-Kluster/Kasia/releases/tag/v0.6.2

FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies including Rust for WASM compilation
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++ \
    curl \
    bash \
    rust \
    cargo

# Clone specific release version (v0.6.2 - known stable release)
# Using release tag instead of master branch for stability
ARG KASIA_VERSION=v0.6.2
RUN git clone --depth 1 --branch ${KASIA_VERSION} https://github.com/K-Kluster/Kasia.git . && \
    rm -rf .git

# Create minimal environment for Docker build
RUN mkdir -p .husky && \
    echo 'console.log("Husky install skipped in Docker");' > .husky/install.mjs

# Build arguments for environment configuration
ARG VITE_INDEXER_MAINNET_URL=https://api.kasia.io/
ARG VITE_INDEXER_TESTNET_URL=https://api.kasia.io/
ARG VITE_DEFAULT_MAINNET_KASPA_NODE_URL=wss://api.kasia.io/ws
ARG VITE_DEFAULT_TESTNET_KASPA_NODE_URL=wss://api.kasia.io/ws
ARG VITE_DEFAULT_KASPA_NETWORK=mainnet
ARG VITE_DISABLE_INDEXER=false

# Install wasm-pack for WASM compilation
RUN cargo install wasm-pack

# Install Node.js dependencies
RUN npm ci --ignore-scripts || npm install --ignore-scripts

# Build WASM modules first (required for kaspa-wasm and cipher)
# This compiles the Rust cipher code to WebAssembly
RUN npm run wasm:build

# Build the application with environment variables
# Vite will use these at build time
ENV VITE_INDEXER_MAINNET_URL=${VITE_INDEXER_MAINNET_URL}
ENV VITE_INDEXER_TESTNET_URL=${VITE_INDEXER_TESTNET_URL}
ENV VITE_DEFAULT_MAINNET_KASPA_NODE_URL=${VITE_DEFAULT_MAINNET_KASPA_NODE_URL}
ENV VITE_DEFAULT_TESTNET_KASPA_NODE_URL=${VITE_DEFAULT_TESTNET_KASPA_NODE_URL}
ENV VITE_DEFAULT_KASPA_NETWORK=${VITE_DEFAULT_KASPA_NETWORK}
ENV VITE_DISABLE_INDEXER=${VITE_DISABLE_INDEXER}

# Build the application
# Using the stable v0.6.2 release with proper WASM dependencies
RUN npm run build:production

# Production stage
FROM nginx:alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Create nginx configuration
RUN cat > /etc/nginx/conf.d/default.conf << 'EOF'
server {
    listen 3000;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Enable gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Main application
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # API proxy endpoints for service health checks (optional)
    location /api/indexer-health {
        return 503 "Service not available in standalone mode";
        add_header Content-Type text/plain;
    }

    location /api/node-health {
        return 503 "Service not available in standalone mode";
        add_header Content-Type text/plain;
    }
}
EOF

# Create startup script to handle environment variables
RUN cat > /docker-entrypoint.sh << 'EOF'
#!/bin/sh

# Create environment configuration file for the frontend
cat > /usr/share/nginx/html/env-config.js << EOL
window.ENV = {
  VITE_DEFAULT_KASPA_NETWORK: "${VITE_DEFAULT_KASPA_NETWORK:-mainnet}",
  VITE_ALLOWED_KASPA_NETWORKS: "${VITE_ALLOWED_KASPA_NETWORKS:-mainnet}",
  VITE_DISABLE_PASSWORD_REQUIREMENTS: "${VITE_DISABLE_PASSWORD_REQUIREMENTS:-false}",
  VITE_LOG_LEVEL: "${VITE_LOG_LEVEL:-warn}",
  VITE_DEV_MODE: "${VITE_DEV_MODE:-false}",
  VITE_INDEXER_MAINNET_URL: "${VITE_INDEXER_MAINNET_URL:-}",
  VITE_INDEXER_TESTNET_URL: "${VITE_INDEXER_TESTNET_URL:-}",
  VITE_DISABLE_INDEXER: "${VITE_DISABLE_INDEXER:-false}",
  VITE_DEFAULT_MAINNET_KASPA_NODE_URL: "${VITE_DEFAULT_MAINNET_KASPA_NODE_URL:-}",
  VITE_DEFAULT_TESTNET_KASPA_NODE_URL: "${VITE_DEFAULT_TESTNET_KASPA_NODE_URL:-}"
};
EOL

# Start nginx
exec nginx -g 'daemon off;'
EOF

RUN chmod +x /docker-entrypoint.sh

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Use the startup script
ENTRYPOINT ["/docker-entrypoint.sh"]
