#!/bin/sh

# Create environment configuration file for the frontend
# This allows runtime env vars to override build-time defaults
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
