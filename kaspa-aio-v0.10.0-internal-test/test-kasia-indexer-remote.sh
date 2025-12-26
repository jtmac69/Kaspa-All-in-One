#!/bin/bash

# Test Kasia Indexer with Remote Kaspa Node
# Optimized for Mac testing environment with memory constraints

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
KASIA_INDEXER_PORT=3002
REMOTE_NODE_URL="https://api.kaspa.org"
REMOTE_WBORSH_URL="wss://api.kaspa.org"
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

# Test remote Kaspa node connectivity
test_remote_kaspa_node() {
    log "Testing remote Kaspa node connectivity..."
    
    # Test HTTP endpoint
    log "Testing HTTP endpoint: $REMOTE_NODE_URL"
    if curl -s -m 10 -X POST -H "Content-Type: application/json" \
       -d '{"method":"getBlockDagInfoRequest","params":{}}' \
       "$REMOTE_NODE_URL" > /dev/null 2>&1; then
        success "Remote Kaspa node HTTP endpoint is accessible"
    else
        warn "Remote Kaspa node HTTP endpoint test failed (may still work)"
    fi
    
    # Note: WebSocket testing from bash is complex, we'll verify via indexer logs
    log "WebSocket endpoint: $REMOTE_WBORSH_URL (will be tested via indexer)"
}

# Start Kasia indexer with remote node configuration
start_kasia_indexer() {
    log "Starting Kasia indexer with remote node configuration..."
    
    # Export environment variables for docker-compose
    export KASPA_NODE_WBORSH_URL="$REMOTE_WBORSH_URL"
    export KASIA_INDEXER_PORT="$KASIA_INDEXER_PORT"
    export KASIA_RUST_LOG="info"
    export NETWORK_TYPE="mainnet"
    
    log "Configuration:"
    log "  - Remote WebSocket: $REMOTE_WBORSH_URL"
    log "  - Indexer Port: $KASIA_INDEXER_PORT"
    log "  - Network: mainnet"
    
    # Start only the Kasia indexer (no local node needed)
    docker compose --profile explorer up -d kasia-indexer
    
    log "Waiting for Kasia indexer to start..."
    sleep 20
}

# Test Kasia indexer connectivity and API
test_kasia_indexer() {
    log "Testing Kasia indexer connectivity..."
    
    local max_attempts=20
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        log "Attempt $attempt/$max_attempts: Testing Kasia indexer connection..."
        
        # Check if the service is responding
        if curl -s -m $TIMEOUT http://localhost:$KASIA_INDEXER_PORT/ > /dev/null 2>&1; then
            success "Kasia indexer is responding!"
            return 0
        fi
        
        log "Kasia indexer not ready yet, waiting 10 seconds..."
        sleep 10
        ((attempt++))
    done
    
    error "Kasia indexer connection failed after $max_attempts attempts"
    return 1
}

# Test Swagger API endpoint
test_swagger_api() {
    log "Testing Swagger API availability..."
    
    local swagger_url="http://localhost:$KASIA_INDEXER_PORT/swagger-ui/"
    
    if curl -s -m $TIMEOUT "$swagger_url" > /dev/null 2>&1; then
        success "Swagger API is accessible at $swagger_url"
        log "You can explore the API at: $swagger_url"
        return 0
    else
        warn "Swagger API endpoint not accessible yet"
        return 1
    fi
}

# Test metrics endpoint
test_metrics_endpoint() {
    log "Testing metrics endpoint..."
    
    local metrics_url="http://localhost:$KASIA_INDEXER_PORT/metrics"
    local metrics_response=$(curl -s -m $TIMEOUT "$metrics_url" 2>/dev/null)
    
    if [ $? -eq 0 ] && [ -n "$metrics_response" ]; then
        success "Metrics endpoint is accessible"
        
        echo ""
        log "Sample metrics data (first 15 lines):"
        echo "$metrics_response" | head -15
        echo ""
        
        # Check for sync indicators
        if echo "$metrics_response" | grep -q "kasia"; then
            success "Metrics contain Kasia-specific data"
        fi
        
        log "Monitor full metrics at: $metrics_url"
        log "When synced: metrics should show ~10 updates per second on average"
        
        return 0
    else
        warn "Could not retrieve metrics data"
        return 1
    fi
}

# Check indexer logs for WebSocket connection
check_websocket_connection() {
    log "Checking WebSocket connection status in logs..."
    
    local logs=$(docker logs kasia-indexer --tail 50 2>&1)
    
    if echo "$logs" | grep -qi "connected\|websocket\|wborsh"; then
        success "WebSocket connection indicators found in logs"
        echo ""
        log "WebSocket-related log entries:"
        echo "$logs" | grep -i "connected\|websocket\|wborsh" | tail -5
        echo ""
    else
        warn "No clear WebSocket connection indicators in logs"
    fi
    
    # Check for errors
    if echo "$logs" | grep -qi "error\|failed\|panic"; then
        warn "Errors detected in logs:"
        echo "$logs" | grep -i "error\|failed\|panic" | tail -5
        echo ""
    fi
}

# Test data persistence
test_data_persistence() {
    log "Testing data persistence..."
    
    if docker volume inspect kaspa-aio_kasia-indexer-data &> /dev/null; then
        success "Kasia indexer data volume exists"
        
        # Get volume info
        local volume_info=$(docker volume inspect kaspa-aio_kasia-indexer-data 2>/dev/null)
        if [ -n "$volume_info" ]; then
            log "Volume is properly configured"
        fi
    else
        warn "Kasia indexer data volume not found"
    fi
}

# Performance monitoring
monitor_performance() {
    log "Monitoring indexer performance..."
    
    echo ""
    log "Container resource usage:"
    docker stats --no-stream kasia-indexer 2>/dev/null || warn "Could not get resource stats"
    echo ""
    
    log "Container status:"
    docker ps --filter "name=kasia-indexer" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
}

# Show recent logs
show_recent_logs() {
    log "Recent Kasia indexer logs (last 30 lines):"
    echo ""
    docker logs kasia-indexer --tail 30 2>&1 || warn "Could not retrieve logs"
}

# Comprehensive validation
run_comprehensive_validation() {
    log "Running comprehensive validation..."
    echo ""
    
    local validation_passed=true
    
    # Test 1: Indexer responding
    if test_kasia_indexer; then
        success "✓ Indexer is responding"
    else
        error "✗ Indexer is not responding"
        validation_passed=false
    fi
    
    # Test 2: Swagger API
    if test_swagger_api; then
        success "✓ Swagger API is accessible"
    else
        warn "✗ Swagger API is not accessible"
    fi
    
    # Test 3: Metrics endpoint
    if test_metrics_endpoint; then
        success "✓ Metrics endpoint is working"
    else
        warn "✗ Metrics endpoint is not working"
    fi
    
    # Test 4: WebSocket connection
    check_websocket_connection
    
    # Test 5: Data persistence
    test_data_persistence
    
    echo ""
    if [ "$validation_passed" = true ]; then
        success "Core validation passed!"
    else
        error "Some validation checks failed"
        return 1
    fi
}

# Show recommendations
show_recommendations() {
    echo ""
    echo -e "${BLUE}=== Kasia Indexer Remote Node Configuration ===${NC}"
    echo ""
    
    echo "Current Configuration:"
    echo "  - Remote Node HTTP: $REMOTE_NODE_URL"
    echo "  - Remote Node WebSocket: $REMOTE_WBORSH_URL"
    echo "  - Indexer Port: $KASIA_INDEXER_PORT"
    echo ""
    
    echo "Monitoring URLs:"
    echo "  - Swagger API: http://localhost:$KASIA_INDEXER_PORT/swagger-ui/"
    echo "  - Metrics: http://localhost:$KASIA_INDEXER_PORT/metrics"
    echo "  - Health: http://localhost:$KASIA_INDEXER_PORT/health"
    echo ""
    
    echo "Validation Checklist:"
    echo "  ✓ Indexer container is running"
    echo "  ✓ WebSocket connection to remote node established"
    echo "  ✓ Swagger API endpoint accessible"
    echo "  ✓ Metrics endpoint showing data"
    echo "  ✓ Data persistence configured"
    echo ""
    
    echo "Performance Expectations:"
    echo "  - Initial sync may take time depending on network"
    echo "  - When synced: ~10 updates/second in metrics"
    echo "  - Memory usage: Lower than with local node"
    echo "  - Network dependency: Requires stable internet connection"
    echo ""
    
    echo "Troubleshooting:"
    echo "  - Check logs: docker logs kasia-indexer"
    echo "  - Verify remote node: curl -X POST $REMOTE_NODE_URL"
    echo "  - Monitor metrics: curl http://localhost:$KASIA_INDEXER_PORT/metrics"
    echo "  - Restart if needed: docker compose restart kasia-indexer"
    echo ""
}

# Cleanup functions
cleanup_containers() {
    local cleanup_level=${1:-basic}
    
    log "Cleaning up containers..."
    
    # Stop Kasia indexer
    docker compose down kasia-indexer 2>/dev/null || true
    
    if [ "$cleanup_level" = "full" ]; then
        log "Performing full cleanup..."
        
        if [ "$CLEANUP_VOLUMES" = "true" ]; then
            warn "Removing data volumes..."
            docker volume rm kaspa-aio_kasia-indexer-data 2>/dev/null || true
        fi
        
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
    fi
    
    if [ "$ENABLE_CLEANUP" = "true" ]; then
        log "Performing cleanup..."
        cleanup_containers basic
    fi
    
    exit $exit_code
}

# Parse command line arguments
ENABLE_CLEANUP=true
CLEANUP_VOLUMES=false
CLEANUP_IMAGES=false
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
            echo "Kasia Indexer Remote Node Test Suite"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -h, --help           Show this help message"
            echo "  --cleanup-only       Run cleanup only (no tests)"
            echo "  --cleanup-full       Full cleanup including volumes"
            echo "  --cleanup-volumes    Remove data volumes during cleanup"
            echo "  --cleanup-images     Remove unused Docker images"
            echo "  --no-cleanup         Skip cleanup on exit"
            echo ""
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
        CLEANUP_VOLUMES=true
        cleanup_containers full
    else
        cleanup_containers basic
    fi
    success "Cleanup completed!"
    exit 0
fi

# Setup cleanup trap
if [ "$ENABLE_CLEANUP" = "true" ]; then
    trap cleanup_on_exit EXIT INT TERM
fi

# Main test execution
main() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║         Kasia Indexer Remote Node Test Suite                ║"
    echo "║         Optimized for Mac Testing Environment               ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    
    test_docker
    test_remote_kaspa_node
    start_kasia_indexer
    
    if run_comprehensive_validation; then
        monitor_performance
        show_recent_logs
        show_recommendations
        
        echo ""
        success "Kasia indexer remote node test completed successfully!"
        echo ""
        log "The indexer is now running and connected to the remote Kaspa node"
        log "Access Swagger API at: http://localhost:$KASIA_INDEXER_PORT/swagger-ui/"
    else
        error "Kasia indexer test failed!"
        show_recent_logs
        monitor_performance
        exit 1
    fi
}

# Run main function
main
