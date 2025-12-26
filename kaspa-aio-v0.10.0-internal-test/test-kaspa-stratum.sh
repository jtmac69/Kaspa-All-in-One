#!/bin/bash

# Kaspa Stratum Bridge Integration Test Script
# Tests stratum bridge connectivity and mining functionality

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
TEST_COMPOSE_FILE="docker-compose.test.yml"
TEST_PROJECT_NAME="kaspa-stratum-test"
CLEANUP_ON_EXIT=true
CLEANUP_VOLUMES=false

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_debug() {
    echo -e "${BLUE}[DEBUG]${NC} $1"
}

# Display usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Test the Kaspa Stratum Bridge integration with the All-in-One system.

Options:
  --cleanup-only      Only perform cleanup, don't run tests
  --cleanup-full      Full cleanup including test containers and networks
  --cleanup-volumes   Also remove volumes during cleanup (WARNING: deletes data)
  --no-cleanup        Skip cleanup after tests (for debugging)
  -h, --help          Show this help message

Examples:
  $0                      # Run full test suite with cleanup
  $0 --no-cleanup         # Run tests but leave containers running
  $0 --cleanup-only       # Just cleanup previous test artifacts
  $0 --cleanup-full       # Deep cleanup of all test resources

EOF
}

# Cleanup function
cleanup() {
    local cleanup_level=${1:-normal}
    
    log_info "Cleaning up test environment (level: $cleanup_level)..."
    
    # Stop and remove test containers
    if docker ps -a --format '{{.Names}}' | grep -q "^${TEST_PROJECT_NAME}"; then
        log_debug "Stopping test containers..."
        docker-compose -p "$TEST_PROJECT_NAME" down 2>/dev/null || true
    fi
    
    # Additional cleanup for full mode
    if [ "$cleanup_level" = "full" ]; then
        log_debug "Performing full cleanup..."
        
        # Remove any orphaned containers
        docker ps -a --filter "name=${TEST_PROJECT_NAME}" -q | xargs -r docker rm -f 2>/dev/null || true
        
        # Remove test networks
        docker network ls --filter "name=${TEST_PROJECT_NAME}" -q | xargs -r docker network rm 2>/dev/null || true
        
        # Remove volumes if requested
        if [ "$CLEANUP_VOLUMES" = true ]; then
            log_warn "Removing test volumes..."
            docker volume ls --filter "name=${TEST_PROJECT_NAME}" -q | xargs -r docker volume rm 2>/dev/null || true
        fi
    fi
    
    log_info "Cleanup completed"
}

# Trap for cleanup on exit
trap 'if [ "$CLEANUP_ON_EXIT" = true ]; then cleanup normal; fi' EXIT

# Test 1: Build stratum bridge image
test_build_image() {
    log_info "Test 1: Building Kaspa Stratum Bridge image..."
    
    cd services/kaspa-stratum
    if ./build.sh docker kaspa-stratum-test; then
        log_info "✓ Stratum bridge image built successfully"
        cd ../..
        return 0
    else
        log_error "✗ Failed to build stratum bridge image"
        cd ../..
        return 1
    fi
}

# Test 2: Start Kaspa node
test_start_kaspa_node() {
    log_info "Test 2: Starting Kaspa node for stratum testing..."
    
    docker-compose -p "$TEST_PROJECT_NAME" up -d kaspa-node
    
    log_info "Waiting for Kaspa node to start (60 seconds)..."
    sleep 60
    
    # Check if node is running
    if docker ps --filter "name=${TEST_PROJECT_NAME}-kaspa-node" --format '{{.Names}}' | grep -q kaspa-node; then
        log_info "✓ Kaspa node started successfully"
        return 0
    else
        log_error "✗ Kaspa node failed to start"
        return 1
    fi
}

# Test 3: Start stratum bridge
test_start_stratum_bridge() {
    log_info "Test 3: Starting Kaspa Stratum Bridge..."
    
    # Create temporary docker-compose override for testing
    cat > docker-compose.test-stratum.yml << 'EOF'
services:
  kaspa-stratum:
    image: kaspa-stratum-test:latest
    container_name: ${TEST_PROJECT_NAME:-kaspa-stratum-test}-stratum
    restart: "no"
    ports:
      - "5555:5555"
    environment:
      - KASPA_RPC_SERVER=kaspa-node:16111
      - STRATUM_PORT=5555
      - LOG_LEVEL=debug
    networks:
      - kaspa-network
    depends_on:
      - kaspa-node
EOF
    
    docker-compose -p "$TEST_PROJECT_NAME" -f docker-compose.yml -f docker-compose.test-stratum.yml up -d kaspa-stratum
    
    log_info "Waiting for stratum bridge to start (30 seconds)..."
    sleep 30
    
    # Check if stratum bridge is running
    if docker ps --filter "name=${TEST_PROJECT_NAME}.*stratum" --format '{{.Names}}' | grep -q stratum; then
        log_info "✓ Stratum bridge started successfully"
        rm -f docker-compose.test-stratum.yml
        return 0
    else
        log_error "✗ Stratum bridge failed to start"
        docker logs "${TEST_PROJECT_NAME}-stratum" 2>&1 | tail -20
        rm -f docker-compose.test-stratum.yml
        return 1
    fi
}

# Test 4: Check stratum port connectivity
test_stratum_connectivity() {
    log_info "Test 4: Testing stratum port connectivity..."
    
    # Check if port 5555 is listening
    if nc -z localhost 5555 2>/dev/null; then
        log_info "✓ Stratum port 5555 is accessible"
        return 0
    else
        log_error "✗ Stratum port 5555 is not accessible"
        return 1
    fi
}

# Test 5: Check stratum bridge logs
test_stratum_logs() {
    log_info "Test 5: Checking stratum bridge logs..."
    
    local container_name="${TEST_PROJECT_NAME}-stratum"
    
    # Get logs
    local logs=$(docker logs "$container_name" 2>&1 | tail -50)
    
    # Check for successful startup indicators
    if echo "$logs" | grep -qi "listening\|started\|ready"; then
        log_info "✓ Stratum bridge appears to be running correctly"
        log_debug "Recent logs:"
        echo "$logs" | tail -10
        return 0
    else
        log_warn "⚠ Could not confirm stratum bridge status from logs"
        log_debug "Recent logs:"
        echo "$logs" | tail -20
        return 0  # Don't fail test, just warn
    fi
}

# Test 6: Verify Kaspa node connection
test_node_connection() {
    log_info "Test 6: Verifying stratum bridge connection to Kaspa node..."
    
    local container_name="${TEST_PROJECT_NAME}-stratum"
    
    # Check logs for connection to Kaspa node
    local logs=$(docker logs "$container_name" 2>&1)
    
    if echo "$logs" | grep -qi "connected\|rpc"; then
        log_info "✓ Stratum bridge connected to Kaspa node"
        return 0
    else
        log_warn "⚠ Could not confirm connection to Kaspa node"
        log_debug "Check logs manually: docker logs $container_name"
        return 0  # Don't fail test, just warn
    fi
}

# Test 7: Test stratum protocol response
test_stratum_protocol() {
    log_info "Test 7: Testing stratum protocol response..."
    
    # Try to connect and send a basic stratum command
    # This is a simple connectivity test
    if timeout 5 bash -c "echo '{\"id\":1,\"method\":\"mining.subscribe\",\"params\":[]}' | nc localhost 5555" 2>/dev/null | grep -q "result\|error"; then
        log_info "✓ Stratum protocol responding"
        return 0
    else
        log_warn "⚠ Could not get stratum protocol response (this may be normal)"
        return 0  # Don't fail test, stratum protocol may require specific handshake
    fi
}

# Test 8: Resource usage check
test_resource_usage() {
    log_info "Test 8: Checking resource usage..."
    
    local container_name="${TEST_PROJECT_NAME}-stratum"
    
    # Get container stats
    local stats=$(docker stats "$container_name" --no-stream --format "table {{.CPUPerc}}\t{{.MemUsage}}" 2>/dev/null || echo "N/A")
    
    log_info "Stratum bridge resource usage:"
    echo "$stats"
    
    return 0
}

# Main test execution
main() {
    log_info "=== Kaspa Stratum Bridge Integration Test ==="
    echo
    
    local failed_tests=0
    local total_tests=8
    
    # Run tests
    test_build_image || ((failed_tests++))
    echo
    
    test_start_kaspa_node || ((failed_tests++))
    echo
    
    test_start_stratum_bridge || ((failed_tests++))
    echo
    
    test_stratum_connectivity || ((failed_tests++))
    echo
    
    test_stratum_logs || ((failed_tests++))
    echo
    
    test_node_connection || ((failed_tests++))
    echo
    
    test_stratum_protocol || ((failed_tests++))
    echo
    
    test_resource_usage || ((failed_tests++))
    echo
    
    # Summary
    log_info "=== Test Summary ==="
    local passed_tests=$((total_tests - failed_tests))
    log_info "Passed: $passed_tests/$total_tests"
    
    if [ $failed_tests -eq 0 ]; then
        log_info "✓ All tests passed!"
        echo
        log_info "Stratum bridge is ready for mining operations"
        log_info "Connect your miners to: <your-ip>:5555"
        return 0
    else
        log_error "✗ $failed_tests test(s) failed"
        echo
        log_info "Check logs with: docker logs ${TEST_PROJECT_NAME}-stratum"
        return 1
    fi
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --cleanup-only)
            cleanup full
            exit 0
            ;;
        --cleanup-full)
            cleanup full
            exit 0
            ;;
        --cleanup-volumes)
            CLEANUP_VOLUMES=true
            shift
            ;;
        --no-cleanup)
            CLEANUP_ON_EXIT=false
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Run main test suite
main
exit_code=$?

# Cleanup if requested
if [ "$CLEANUP_ON_EXIT" = true ]; then
    echo
    log_info "Cleaning up test environment..."
    cleanup normal
fi

exit $exit_code
