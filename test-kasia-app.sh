#!/bin/bash

# Test script for Kasia messaging application integration
# This script validates that the Kasia app is properly integrated and functional

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
KASIA_APP_URL="http://localhost:3001"
KASIA_INDEXER_URL="http://localhost:3002"
KASPA_NODE_RPC_URL="http://localhost:16111"
KASPA_NODE_WS_URL="ws://localhost:17110"

echo -e "${BLUE}=== Kasia Messaging App Integration Test ===${NC}"
echo "Testing Kasia app integration with local indexer and node..."
echo

# Function to check if a service is running
check_service() {
    local service_name=$1
    local url=$2
    local timeout=${3:-30}
    
    echo -n "Checking $service_name... "
    
    for i in $(seq 1 $timeout); do
        if curl -s -f "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Running${NC}"
            return 0
        fi
        sleep 1
    done
    
    echo -e "${RED}✗ Not responding${NC}"
    return 1
}

# Function to check Docker container status
check_container() {
    local container_name=$1
    echo -n "Checking container $container_name... "
    
    if docker ps --format "table {{.Names}}" | grep -q "^$container_name$"; then
        echo -e "${GREEN}✓ Running${NC}"
        return 0
    else
        echo -e "${RED}✗ Not running${NC}"
        return 1
    fi
}

# Function to check container logs for errors
check_container_logs() {
    local container_name=$1
    local lines=${2:-50}
    
    echo "Checking $container_name logs for errors..."
    
    if docker logs --tail $lines "$container_name" 2>&1 | grep -i "error\|failed\|exception" | head -5; then
        echo -e "${YELLOW}⚠ Found potential issues in logs${NC}"
    else
        echo -e "${GREEN}✓ No obvious errors in recent logs${NC}"
    fi
    echo
}

# Function to test HTTP endpoint
test_http_endpoint() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}
    
    echo -n "Testing $name endpoint... "
    
    local response=$(curl -s -w "%{http_code}" -o /dev/null "$url" 2>/dev/null || echo "000")
    
    if [ "$response" = "$expected_status" ]; then
        echo -e "${GREEN}✓ HTTP $response${NC}"
        return 0
    else
        echo -e "${RED}✗ HTTP $response (expected $expected_status)${NC}"
        return 1
    fi
}

# Function to test WebSocket connection
test_websocket() {
    local name=$1
    local url=$2
    
    echo -n "Testing $name WebSocket... "
    
    # Use a simple WebSocket test with timeout
    if timeout 5 bash -c "exec 3<>/dev/tcp/localhost/17110" 2>/dev/null; then
        echo -e "${GREEN}✓ WebSocket port accessible${NC}"
        exec 3>&-
        return 0
    else
        echo -e "${RED}✗ WebSocket connection failed${NC}"
        return 1
    fi
}

# Function to validate Kasia app configuration
validate_kasia_config() {
    echo "Validating Kasia app configuration..."
    
    # Check if the app serves the main page
    if curl -s "$KASIA_APP_URL" | grep -q "Kasia"; then
        echo -e "${GREEN}✓ Kasia app main page accessible${NC}"
    else
        echo -e "${RED}✗ Kasia app main page not accessible${NC}"
        return 1
    fi
    
    # Check if environment configuration is injected
    if curl -s "$KASIA_APP_URL/env-config.js" | grep -q "window.ENV"; then
        echo -e "${GREEN}✓ Environment configuration available${NC}"
    else
        echo -e "${YELLOW}⚠ Environment configuration not found${NC}"
    fi
    
    echo
}

# Function to test service dependencies
test_dependencies() {
    echo "Testing service dependencies..."
    
    # Test Kaspa node RPC
    echo -n "Testing Kaspa node RPC... "
    local rpc_response=$(curl -s -X POST -H "Content-Type: application/json" \
        -d '{"method":"ping","params":{}}' \
        "$KASPA_NODE_RPC_URL" 2>/dev/null || echo "")
    
    if echo "$rpc_response" | grep -q "pong\|result"; then
        echo -e "${GREEN}✓ RPC responding${NC}"
    else
        echo -e "${RED}✗ RPC not responding${NC}"
    fi
    
    # Test Kasia indexer API
    echo -n "Testing Kasia indexer API... "
    if curl -s -f "$KASIA_INDEXER_URL/swagger-ui/" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Indexer API accessible${NC}"
    else
        echo -e "${RED}✗ Indexer API not accessible${NC}"
    fi
    
    # Test indexer metrics
    echo -n "Testing Kasia indexer metrics... "
    if curl -s -f "$KASIA_INDEXER_URL/metrics" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Indexer metrics available${NC}"
    else
        echo -e "${YELLOW}⚠ Indexer metrics not available${NC}"
    fi
    
    echo
}

# Function to run comprehensive tests
run_comprehensive_tests() {
    local failed_tests=0
    
    echo -e "${BLUE}=== Container Status Check ===${NC}"
    check_container "kaspa-node" || ((failed_tests++))
    check_container "kasia-indexer" || ((failed_tests++))
    check_container "kasia-app" || ((failed_tests++))
    echo
    
    echo -e "${BLUE}=== Service Health Check ===${NC}"
    check_service "Kaspa Node RPC" "$KASPA_NODE_RPC_URL" 10 || ((failed_tests++))
    check_service "Kasia Indexer" "$KASIA_INDEXER_URL/swagger-ui/" 10 || ((failed_tests++))
    check_service "Kasia App" "$KASIA_APP_URL/health" 10 || ((failed_tests++))
    echo
    
    echo -e "${BLUE}=== Endpoint Testing ===${NC}"
    test_http_endpoint "Kasia App Health" "$KASIA_APP_URL/health" 200 || ((failed_tests++))
    test_http_endpoint "Kasia App Main Page" "$KASIA_APP_URL" 200 || ((failed_tests++))
    test_http_endpoint "Kasia Indexer Swagger" "$KASIA_INDEXER_URL/swagger-ui/" 200 || ((failed_tests++))
    test_websocket "Kaspa Node WebSocket" "$KASPA_NODE_WS_URL" || ((failed_tests++))
    echo
    
    echo -e "${BLUE}=== Configuration Validation ===${NC}"
    validate_kasia_config || ((failed_tests++))
    
    echo -e "${BLUE}=== Dependency Testing ===${NC}"
    test_dependencies || ((failed_tests++))
    
    echo -e "${BLUE}=== Container Logs Check ===${NC}"
    check_container_logs "kasia-app" 20
    check_container_logs "kasia-indexer" 20
    
    return $failed_tests
}

# Function to show usage information
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  -q, --quick    Run quick health checks only"
    echo "  -v, --verbose  Show detailed output"
    echo
    echo "This script tests the Kasia messaging app integration with:"
    echo "  - Local Kaspa node (RPC and WebSocket)"
    echo "  - Local Kasia indexer"
    echo "  - Kasia app configuration and accessibility"
    echo
}

# Cleanup functions
cleanup_containers() {
    local cleanup_level=${1:-basic}
    
    echo -e "${BLUE}Cleaning up containers...${NC}"
    
    # Stop and remove test containers
    local test_containers=("kasia-app-test" "kasia-indexer-test" "kaspa-node-test")
    for container in "${test_containers[@]}"; do
        if docker ps -a --format "{{.Names}}" | grep -q "^${container}$"; then
            echo "Removing test container: $container"
            docker stop "$container" 2>/dev/null || true
            docker rm "$container" 2>/dev/null || true
        fi
    done
    
    # Stop compose services
    echo "Stopping compose services..."
    docker-compose down 2>/dev/null || true
    
    if [ "$cleanup_level" = "full" ]; then
        echo "Performing full cleanup..."
        
        # Remove volumes (optional - preserves data by default)
        if [ "$CLEANUP_VOLUMES" = "true" ]; then
            echo -e "${YELLOW}Removing data volumes...${NC}"
            docker volume rm all-in-one_kasia-indexer-data 2>/dev/null || true
            docker volume rm all-in-one_kaspa-data 2>/dev/null || true
            docker volume rm all-in-one_indexer-db-data 2>/dev/null || true
        fi
        
        # Remove networks
        docker network rm all-in-one_kaspa-network 2>/dev/null || true
        
        # Remove unused images (optional)
        if [ "$CLEANUP_IMAGES" = "true" ]; then
            echo -e "${YELLOW}Removing unused images...${NC}"
            docker image prune -f 2>/dev/null || true
        fi
    fi
}

cleanup_on_exit() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        echo -e "${RED}Test failed with exit code $exit_code${NC}"
        echo "Performing cleanup due to test failure..."
    else
        echo "Test completed, performing cleanup..."
    fi
    
    cleanup_containers basic
    exit $exit_code
}

cleanup_full() {
    echo "Performing full cleanup (including volumes and networks)..."
    cleanup_containers full
}

# Function to show cleanup options in usage
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
        echo "Cleanup trap enabled (use --no-cleanup to disable)"
    else
        echo "Cleanup disabled"
    fi
}

# Parse command line arguments
QUICK_MODE=false
VERBOSE_MODE=false
CLEANUP_ONLY=false
FULL_CLEANUP=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_usage
            echo
            show_cleanup_help
            exit 0
            ;;
        -q|--quick)
            QUICK_MODE=true
            shift
            ;;
        -v|--verbose)
            VERBOSE_MODE=true
            shift
            ;;
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
        *)
            echo "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Handle cleanup-only mode
if [ "$CLEANUP_ONLY" = true ]; then
    echo "Running cleanup only..."
    if [ "$FULL_CLEANUP" = true ]; then
        cleanup_full
    else
        cleanup_containers basic
    fi
    echo -e "${GREEN}✓ Cleanup completed!${NC}"
    exit 0
fi

# Handle full cleanup mode
if [ "$FULL_CLEANUP" = true ]; then
    echo "Full cleanup mode enabled"
    CLEANUP_VOLUMES=true
fi

# Setup cleanup trap
setup_cleanup_trap

# Main execution
echo "Starting Kasia app integration tests..."
echo "Kasia App URL: $KASIA_APP_URL"
echo "Kasia Indexer URL: $KASIA_INDEXER_URL"
echo "Kaspa Node RPC URL: $KASPA_NODE_RPC_URL"
echo

if [ "$QUICK_MODE" = true ]; then
    echo -e "${BLUE}=== Quick Health Check ===${NC}"
    failed_tests=0
    check_service "Kasia App" "$KASIA_APP_URL/health" 5 || ((failed_tests++))
    check_service "Kasia Indexer" "$KASIA_INDEXER_URL/swagger-ui/" 5 || ((failed_tests++))
    check_service "Kaspa Node" "$KASPA_NODE_RPC_URL" 5 || ((failed_tests++))
else
    run_comprehensive_tests
    failed_tests=$?
fi

echo
echo -e "${BLUE}=== Test Summary ===${NC}"
if [ $failed_tests -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed! Kasia app integration is working correctly.${NC}"
    echo
    echo "You can access:"
    echo "  - Kasia App: $KASIA_APP_URL"
    echo "  - Kasia Indexer API: $KASIA_INDEXER_URL/swagger-ui/"
    echo "  - Kasia Indexer Metrics: $KASIA_INDEXER_URL/metrics"
    exit 0
else
    echo -e "${RED}✗ $failed_tests test(s) failed. Please check the output above.${NC}"
    echo
    echo "Troubleshooting tips:"
    echo "1. Ensure all services are running: docker-compose --profile prod --profile explorer up -d"
    echo "2. Check container logs: docker logs kasia-app"
    echo "3. Verify network connectivity between containers"
    echo "4. Ensure Kasia indexer is synced with the Kaspa node"
    exit 1
fi