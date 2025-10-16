#!/bin/bash

# Test Kaspa Node Setup Script
# Tests the Kaspa node configuration and connectivity

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
KASPA_RPC_PORT=16111
KASPA_P2P_PORT=16110
TIMEOUT=30

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

# Test if Docker is running
test_docker() {
    log "Testing Docker availability..."
    if ! docker info &> /dev/null; then
        error "Docker is not running or not accessible"
        exit 1
    fi
    success "Docker is running"
}

# Start only the Kaspa node
start_kaspa_node() {
    log "Starting Kaspa node..."
    docker compose up -d kaspa-node
    
    log "Waiting for Kaspa node to start..."
    sleep 10
}

# Test RPC connectivity
test_rpc_connectivity() {
    log "Testing Kaspa node RPC connectivity..."
    
    local max_attempts=10
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        log "Attempt $attempt/$max_attempts: Testing RPC connection..."
        
        if curl -s -m $TIMEOUT -X POST -H "Content-Type: application/json" \
           -d '{"method":"getInfo","params":{}}' \
           http://localhost:$KASPA_RPC_PORT > /dev/null 2>&1; then
            success "RPC connection successful!"
            return 0
        fi
        
        log "RPC not ready yet, waiting 10 seconds..."
        sleep 10
        ((attempt++))
    done
    
    error "RPC connection failed after $max_attempts attempts"
    return 1
}

# Get node information
get_node_info() {
    log "Retrieving node information..."
    
    local response=$(curl -s -m $TIMEOUT -X POST -H "Content-Type: application/json" \
        -d '{"method":"getInfo","params":{}}' \
        http://localhost:$KASPA_RPC_PORT)
    
    if [ $? -eq 0 ]; then
        echo "$response" | jq . 2>/dev/null || echo "$response"
    else
        error "Failed to retrieve node information"
        return 1
    fi
}

# Test P2P connectivity
test_p2p_connectivity() {
    log "Testing P2P port accessibility..."
    
    if nc -z localhost $KASPA_P2P_PORT 2>/dev/null; then
        success "P2P port $KASPA_P2P_PORT is accessible locally"
    else
        warn "P2P port $KASPA_P2P_PORT is not accessible locally"
    fi
}

# Check if ports are exposed publicly
test_public_accessibility() {
    log "Testing public accessibility..."
    
    # Get external IP
    local external_ip=$(curl -s -m 10 ifconfig.me 2>/dev/null || curl -s -m 10 ipinfo.io/ip 2>/dev/null || echo "unknown")
    
    if [ "$external_ip" != "unknown" ]; then
        log "External IP detected: $external_ip"
        
        # Test if P2P port is publicly accessible
        log "Testing public P2P accessibility (this may take a moment)..."
        if timeout 15 nc -z $external_ip $KASPA_P2P_PORT 2>/dev/null; then
            success "P2P port is publicly accessible!"
        else
            warn "P2P port is NOT publicly accessible"
            warn "You may need to configure port forwarding on your router"
        fi
    else
        warn "Could not determine external IP address"
    fi
}

# Show node status and logs
show_node_status() {
    log "Kaspa node container status:"
    docker ps --filter "name=kaspa-node" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    echo ""
    log "Recent Kaspa node logs:"
    docker logs kaspa-node --tail 20
}

# Provide configuration recommendations
show_recommendations() {
    echo ""
    echo -e "${BLUE}=== Configuration Recommendations ===${NC}"
    echo ""
    
    echo "For PUBLIC node operation:"
    echo "1. Configure router port forwarding:"
    echo "   - Forward external port $KASPA_P2P_PORT to internal IP:$KASPA_P2P_PORT"
    echo "   - Protocol: TCP"
    echo ""
    
    echo "2. Firewall configuration:"
    echo "   - Allow incoming connections on port $KASPA_P2P_PORT"
    echo "   - Ubuntu: sudo ufw allow $KASPA_P2P_PORT"
    echo ""
    
    echo "3. Test public accessibility:"
    echo "   - Use online port checker tools"
    echo "   - Check https://www.yougetsignal.com/tools/open-ports/"
    echo "   - Test port $KASPA_P2P_PORT with your external IP"
    echo ""
    
    echo "4. Monitor node performance:"
    echo "   - Check sync status regularly"
    echo "   - Monitor peer connections"
    echo "   - Watch resource usage"
}

# Main test function
main() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    Kaspa Node Test Suite                     ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    
    test_docker
    start_kaspa_node
    
    if test_rpc_connectivity; then
        get_node_info
        test_p2p_connectivity
        test_public_accessibility
        show_node_status
        show_recommendations
        
        success "Kaspa node test completed successfully!"
    else
        error "Kaspa node test failed!"
        show_node_status
        exit 1
    fi
}

# Cleanup function
cleanup() {
    log "Cleaning up..."
    docker compose down kaspa-node 2>/dev/null || true
}

# Set trap for cleanup
trap cleanup EXIT

# Run main function
main "$@"