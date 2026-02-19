# Kasia Messaging Application - Build from Release
# This Dockerfile builds Kasia from a specific stable release
# Using v0.6.2 release from https://github.com/K-Kluster/Kasia/releases/tag/v0.6.2
# Downloads pre-built kaspa-wasm from IzioDev/rusty-kaspa (same as Kasia CI)

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
    clang \
    llvm \
    unzip

# Install Rust via rustup (needed for wasm32 target support for cipher)
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable
ENV PATH="/root/.cargo/bin:${PATH}"

# Install wasm-pack and wasm32 target for cipher WASM compilation
RUN rustup target add wasm32-unknown-unknown && \
    cargo install wasm-pack

# Clone specific release version (v0.6.2 - known stable release)
# Note: We need to clone with submodules for tauri-plugin-biometry
ARG KASIA_VERSION=v0.6.2
RUN git clone --depth 1 --branch ${KASIA_VERSION} --recurse-submodules https://github.com/K-Kluster/Kasia.git . && \
    rm -rf .git

# Create minimal environment for Docker build
RUN mkdir -p .husky && \
    echo 'console.log("Husky install skipped in Docker");' > .husky/install.mjs

# Build arguments for environment configuration
# These defaults match Kasia's official .env.production file
# See: https://github.com/K-Kluster/Kasia/blob/staging/.env.production
ARG VITE_INDEXER_MAINNET_URL=https://indexer.kasia.fyi/
ARG VITE_INDEXER_TESTNET_URL=https://dev-indexer.kasia.fyi/
ARG VITE_DEFAULT_MAINNET_KASPA_NODE_URL=wss://wrpc.kasia.fyi
ARG VITE_DEFAULT_TESTNET_KASPA_NODE_URL=wss://wrpc.kasia.fyi
ARG VITE_DEFAULT_KASPA_NETWORK=mainnet
ARG VITE_DISABLE_INDEXER=false

# ============================================================
# DOWNLOAD PRE-BUILT KASPA-WASM
# The Kasia CI downloads pre-built WASM from IzioDev/rusty-kaspa
# This is the same approach used in their GitHub Actions workflow
# ============================================================
ARG KASPA_WASM_VERSION=v1.0.1-beta1
RUN curl -L -o kaspa-wasm32-sdk.zip \
    "https://github.com/IzioDev/rusty-kaspa/releases/download/${KASPA_WASM_VERSION}/kaspa-wasm32-sdk-${KASPA_WASM_VERSION}.zip" && \
    unzip kaspa-wasm32-sdk.zip -d kaspa-wasm32-sdk && \
    mv kaspa-wasm32-sdk/kaspa-wasm32-sdk/web/kaspa/* wasm/ && \
    rm -rf kaspa-wasm32-sdk.zip kaspa-wasm32-sdk && \
    ls -la wasm/

# ============================================================
# BUILD KASIA APPLICATION
# ============================================================

# Build the tauri-plugin-biometry submodule (required dependency)
RUN npm run submodule:init || echo "Submodule init skipped or failed, continuing..."

# Install Node.js dependencies (kaspa-wasm is now available in ./wasm)
RUN npm ci --ignore-scripts || npm install --ignore-scripts

# Build cipher WASM module (Kasia's own cipher)
RUN npm run wasm:build

# Build the application with environment variables
ENV VITE_INDEXER_MAINNET_URL=${VITE_INDEXER_MAINNET_URL}
ENV VITE_INDEXER_TESTNET_URL=${VITE_INDEXER_TESTNET_URL}
ENV VITE_DEFAULT_MAINNET_KASPA_NODE_URL=${VITE_DEFAULT_MAINNET_KASPA_NODE_URL}
ENV VITE_DEFAULT_TESTNET_KASPA_NODE_URL=${VITE_DEFAULT_TESTNET_KASPA_NODE_URL}
ENV VITE_DEFAULT_KASPA_NETWORK=${VITE_DEFAULT_KASPA_NETWORK}
ENV VITE_DISABLE_INDEXER=${VITE_DISABLE_INDEXER}

# Build the application
RUN npm run build:production

# ============================================================
# PRODUCTION STAGE
# ============================================================
FROM nginx:alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
# Note: Using COPY instead of heredoc RUN to avoid Docker BuildKit
# heredoc parsing issue that produces 0-byte files.
COPY nginx-default.conf /etc/nginx/conf.d/default.conf

# Copy startup script to handle runtime environment variables
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Use the startup script
ENTRYPOINT ["/docker-entrypoint.sh"]
