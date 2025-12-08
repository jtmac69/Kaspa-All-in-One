#!/bin/bash

# Test Kasia Indexer Setup Script
# Tests the Kasia indexer configuration and connectivity

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
KASIA_INDEXER_PORT=3002
KASPA_NODE_PORT=16111
KASPA_NODE_WBORSH_PORT=17110
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

# Start Kaspa node and Kasia indexer
start_services() {
    log "Starting Kaspa node and Kasia indexer..."
    docker compose up -d kaspa-node
    
    log "Waiting for Kaspa node to be ready..."
    local max_attempts=20
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -m 5 -X POST -H "Content-Type: application/json" \
           -d '{"method":"ping","params":{}}' \
           http://localhost:$KASPA_NODE_PORT > /dev/null 2>&1; then
            success "Kaspa node is ready!"
            break
        fi
        
        log "Attempt $attempt/$max_attempts: Waiting for Kaspa node..."
        sleep 10
        ((attempt++))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        error "Kaspa node failed to start within expected time"
        return 1
    fi
    
    log "Starting Kasia indexer..."
    docker compose --profile explorer up -d kasia-indexer
    
    log "Waiting for Kasia indexer to start..."
    sleep 15
}

# Test WebSocket connection to Kaspa node
test_kaspa_websocket() {
    log "Testing Kaspa node WebSocket connection..."
    
    # Check if WebSocket port is accessible
    if nc -z localhost $KASPA_NODE_WBORSH_PORT 2>/dev/null; then
        success "Kaspa node WebSocket port $KASPA_NODE_WBORSH_PORT is accessible"
        return 0
    else
        warn "Kaspa node WebSocket port $KASPA_NODE_WBORSH_PORT is not accessible"
        return 1
    fi
}

# Test Kasia indexer connectivity and API
test_kasia_indexer() {
    log "Testing Kasia indexer connectivity..."
    
    local max_attempts=15
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        log "Attempt $attempt/$max_attempts: Testing Kasia indexer connection..."
        
        # First check if the service is responding at all
        if curl -s -m $TIMEOUT http://localhost:$KASIA_INDEXER_PORT/ > /dev/null 2>&1; then
            success "Kasia indexer is responding!"
            
            # Now test the Swagger API endpoint
            log "Testing Swagger API availability..."
            if curl -s -m $TIMEOUT http://localhost:$KASIA_INDEXER_PORT/swagger-ui/ > /dev/null 2>&1; then
                success "Swagger API is accessible at http://localhost:$KASIA_INDEXER_PORT/swagger-ui/"
                return 0
            else
                warn "Swagger API not yet available, but service is responding"
                return 0
            fi
        fi
        
        log "Kasia indexer not ready yet, waiting 15 seconds..."
        sleep 15
        ((attempt++))
    done
    
    error "Kasia indexer connection failed after $max_attempts attempts"
    return 1
}

# Test Kasia indexer metrics and sync status
test_indexer_metrics() {
    log "Testing Kasia indexer metrics and sync status..."
    
    # Test metrics endpoint (recommended by Kasia developer)
    log "Checking /metrics endpoint for sync status..."
    local metrics_response=$(curl -s -m $TIMEOUT http://localhost:$KASIA_INDEXER_PORT/metrics 2>/dev/null)
    
    if [ $? -eq 0 ] && [ -n "$metrics_response" ]; then
        success "Metrics endpoint is accessible"
        
        # Check if we can parse any useful metrics
        echo "Sample metrics data:"
        echo "$metrics_response" | head -10
        
        log "To verify proper sync: metrics should show ~10 updates per second on average"
        log "Monitor the metrics endpoint: http://localhost:$KASIA_INDEXER_PORT/metrics"
        
        return 0
    else
        warn "Could not retrieve metrics data"
        return 1
    fi
}

# Get Kasia indexer status
get_indexer_status() {
    log "Retrieving Kasia indexer status..."
    
    # Try the metrics endpoint first (most reliable)
    if test_indexer_metrics; then
        echo ""
    fi
    
    # Try other common endpoints
    local endpoints=("/status" "/health" "/info" "/")
    
    for endpoint in "${endpoints[@]}"; do
        log "Trying endpoint: $endpoint"
        local response=$(curl -s -m $TIMEOUT http://localhost:$KASIA_INDEXER_PORT$endpoint 2>/dev/null)
        
        if [ $? -eq 0 ] && [ -n "$response" ]; then
            echo "Response from $endpoint:"
            echo "$response" | jq . 2>/dev/null || echo "$response" | head -5
            echo ""
            break
        fi
    done
}

# Check indexer logs
check_indexer_logs() {
    log "Checking Kasia indexer logs..."
    
    echo ""
    log "Recent Kasia indexer logs:"
    docker logs kasia-indexer --tail 20 2>/dev/null || warn "Could not retrieve logs"
}

# Show container status
show_container_status() {
    log "Container status:"
    docker ps --filter "name=kaspa-node" --filter "name=kasia-indexer" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    echo ""
    log "Container resource usage:"
    docker stats --no-stream kaspa-node kasia-indexer 2>/dev/null || warn "Could not get resource stats"
}

# Test indexer data directory
test_data_persistence() {
    log "Testing data persistence..."
    
    # Check if volume exists
    if docker volume inspect kaspa-aio_kasia-indexer-data &> /dev/null; then
        success "Kasia indexer data volume exists"
        
        # Check volume size
        local volume_size=$(docker system df -v | grep kasia-indexer-data | awk '{print $3}' || echo "unknown")
        log "Data volume size: $volume_size"
    else
        warn "Kasia indexer data volume not found"
    fi
}

# Provide configuration recommendations
show_recommendations() {
    echo ""
    echo -e "${BLUE}=== Kasia Indexer Configuration Recommendations ===${NC}"
    echo ""
    
    echo "Environment Variables:"
    echo "- KASPA_NODE_WBORSH_URL: WebSocket connection to Kaspa node"
    echo "- RUST_LOG: Logging level (debug, info, warn, error)"
    echo "- NETWORK_TYPE: mainnet, testnet, or devnet"
    echo "- KASIA_INDEXER_DB_ROOT: Data storage directory"
    echo ""
    
    echo "Performance Tuning:"
    echo "- Monitor data volume growth over time"
    echo "- Adjust RUST_LOG level based on needs"
    echo "- Ensure sufficient disk space for indexing"
    echo "- Monitor WebSocket connection stability"
    echo ""
    
    echo "Validation and Monitoring:"
    echo "- Access Swagger API: http://localhost:$KASIA_INDEXER_PORT/swagger-ui/"
    echo "- Monitor metrics: http://localhost:$KASIA_INDEXER_PORT/metrics"
    echo "- Proper sync: metrics should show ~10 updates per second on average"
    echo "- Check sync status regularly via metrics endpoint"
    echo ""
    
    echo "Troubleshooting:"
    echo "- Check Kaspa node WebSocket is accessible on port 17110"
    echo "- Verify network connectivity between containers"
    echo "- Monitor indexer logs for connection issues"
    echo "- Ensure data volume has write permissions"
    echo "- If metrics show <10/sec, indexer may still be syncing"
}

# Main test function
main() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                   Kasia Indexer Test Suite                   ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    
    test_docker
    start_services
    
    if test_kaspa_websocket && test_kasia_indexer; then
        get_indexer_status
        test_data_persistence
        check_indexer_logs
        show_container_status
        show_recommendations
        
        success "Kasia indexer test completed successfully!"
    else
        error "Kasia indexer test failed!"
        check_indexer_logs
        show_container_status
        exit 1
    fi
}

# Cleanup functions
cleanup_containers() {
    local cleanup_level=${1:-basic}
    
    log "Cleaning up containers..."
    
    # Stop and remove test containers
    local test_containers=("kasia-indexer-test" "kaspa-node-test")
    for container in "${test_containers[@]}"; do
        if docker ps -a --format "{{.Names}}" | grep -q "^${container}$"; then
            log "Removing test container: $container"
            docker stop "$container" 2>/dev/null || true
            docker rm "$container" 2>/dev/null || true
        fi
    done
    
    # Stop compose services
    log "Stopping compose services..."
    docker compose down kasia-indexer kaspa-node 2>/dev/null || true
    
    if [ "$cleanup_level" = "full" ]; then
        log "Performing full cleanup..."
        
        # Remove volumes (optional - preserves data by default)
        if [ "$CLEANUP_VOLUMES" = "true" ]; then
            warn "Removing data volumes..."
            docker volume rm kaspa-aio_kasia-indexer-data 2>/dev/null || true
            docker volume rm kaspa-aio_kaspa-data 2>/dev/null || true
        fi
        
        # Remove networks
        docker network rm kaspa-aio_kaspa-network 2>/dev/null || true
        
        # Remove unused images (optional)
        if [ "$CLEANUP_IMAGES" = "true" ]; then
            warn "Removing unused images..."
            docker image prune -f 2>/dev/null || true
        fi
    fi
}

cleanup_on_exit() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        error "Test failed with exit code $exit_code"
        log "Performing cleanup due to test failure..."
    else
        log "Test completed, performing cleanup..."
    fi
    
    cleanup_containers basic
    exit $exit_code
}

cleanup_full() {
    log "Performing full cleanup (including volumes and networks)..."
    cleanup_containers full
}

# Function to show cleanup options
show_cleanup_help() {
    echo "Cleanup Options:"
    echo "  --cleanup-only     Run cleanup only (no tests)"
    echo "  --cleanup-full     Full cleanup including volumes and networks"
    echo "  --cleanup-volumes  Remove data volumes during cleanup"
    echo "  --cleanup-images   Remove unused Docker images during cleanup"
    echo "  --no-cleanup       Skip cleanup on exit"
    echo
}

# Set trap for cleanup (can be disabled with --no-cleanup)
ENABLE_CLEANUP=true
CLEANUP_VOLUMES=false
CLEANUP_IMAGES=false

setup_cleanup_trap() {
    if [ "$ENABLE_CLEANUP" = "true" ]; then
        trap cleanup_on_exit EXIT INT TERM
        log "Cleanup trap enabled (use --no-cleanup to disable)"
    else
        log "Cleanup disabled"
    fi
}

# Parse command line arguments for cleanup options
CLEANUP_ONLY=false
FULL_CLEANUP=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --cleanup-only)
            CLEANUP_ONLY=true
            shift
            ;;
        --cleanup-full)
            FULL_CLEANUP=true
            shift
            ;;
        --cleanup-volumes)
            CLEANUP_VOLUMES=true
            shift
            ;;
        --cleanup-images)
            CLEANUP_IMAGES=true
            shift
            ;;
        --no-cleanup)
            ENABLE_CLEANUP=false
            shift
            ;;
        -h|--help)
            echo "Kasia Indexer Test Suite"
            echo
            echo "Usage: $0 [OPTIONS]"
            echo
            echo "Test Options:"
            echo "  -h, --help         Show this help message"
            echo
            show_cleanup_help
            exit 0
            ;;
        *)
            warn "Unknown option: $1"
            shift
            ;;
    esac
done

# Handle cleanup-only mode
if [ "$CLEANUP_ONLY" = "true" ]; then
    log "Running cleanup only..."
    if [ "$FULL_CLEANUP" = "true" ]; then
        cleanup_full
    else
        cleanup_containers basic
    fi
    success "Cleanup completed!"
    exit 0
fi

# Handle full cleanup mode
if [ "$FULL_CLEANUP" = "true" ]; then
    log "Full cleanup mode enabled"
    CLEANUP_VOLUMES=true
fi

# Setup cleanup trap
setup_cleanup_trap

# Run main function
main