#!/bin/bash

# Test Kaspa Node Only - Simplified Test
# Tests just the Kaspa node without other services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                 Kaspa Node Only Test Suite                   ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Test Docker
log "Testing Docker availability..."
if ! docker info &> /dev/null; then
    error "Docker is not running or not accessible"
    exit 1
fi
success "Docker is running"

# Start only Kaspa node
log "Starting Kaspa node only..."
docker compose -f docker-compose.test.yml up -d kaspa-node

if [ $? -ne 0 ]; then
    error "Failed to start Kaspa node"
    exit 1
fi

log "Waiting for Kaspa node to initialize..."
sleep 15

# Test RPC connectivity
log "Testing Kaspa node RPC connectivity..."
max_attempts=10
attempt=1

while [ $attempt -le $max_attempts ]; do
    log "Attempt $attempt/$max_attempts: Testing RPC connection..."
    
    if curl -s -m 10 -X POST -H "Content-Type: application/json" \
       -d '{"method":"getInfo","params":{}}' \
       http://localhost:16111 > /dev/null 2>&1; then
        success "Kaspa node RPC is responding!"
        break
    fi
    
    if [ $attempt -eq $max_attempts ]; then
        error "Kaspa node RPC failed to respond after $max_attempts attempts"
        
        log "Checking container status..."
        docker ps --filter "name=kaspa-node"
        
        log "Checking container logs..."
        docker logs kaspa-node --tail 20
        
        exit 1
    fi
    
    log "RPC not ready yet, waiting 10 seconds..."
    sleep 10
    ((attempt++))
done

# Get node info
log "Retrieving node information..."
response=$(curl -s -m 10 -X POST -H "Content-Type: application/json" \
    -d '{"method":"getInfo","params":{}}' \
    http://localhost:16111)

if [ $? -eq 0 ]; then
    echo "$response" | jq . 2>/dev/null || echo "$response"
else
    warn "Failed to retrieve detailed node information"
fi

# Show container status
log "Container status:"
docker ps --filter "name=kaspa-node" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

success "Kaspa node test completed successfully!"

# Cleanup
log "Stopping Kaspa node..."
docker compose -f docker-compose.test.yml down