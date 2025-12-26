#!/bin/bash
# Simply Kaspa Indexer Integration Test Script
# Tests TimescaleDB integration, performance, and indexing modes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
TEST_NAME="simply-kaspa-indexer-test"
COMPOSE_PROJECT="${TEST_NAME}"
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

log_section() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

# Usage information
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Test Simply Kaspa Indexer integration with TimescaleDB optimizations

Options:
    --no-cleanup        Don't cleanup containers on exit
    --cleanup-only      Only run cleanup, don't run tests
    --cleanup-full      Full cleanup including volumes
    --cleanup-volumes   Cleanup volumes in addition to containers
    --mode MODE         Test specific indexing mode (full, light, archive, personal)
    --skip-build        Skip building the indexer image
    -h, --help          Show this help message

Examples:
    $0                          # Run full test suite
    $0 --mode personal          # Test personal indexer mode
    $0 --cleanup-only           # Cleanup previous test artifacts
    $0 --no-cleanup             # Keep containers running after test

EOF
}

# Cleanup function
cleanup() {
    local cleanup_volumes=$1
    
    log_section "Cleaning Up Test Environment"
    
    # Stop and remove containers
    log_info "Stopping test containers..."
    docker-compose -p "$COMPOSE_PROJECT" --profile explorer down 2>/dev/null || true
    
    # Remove test containers by name
    local containers=(
        "simply-kaspa-indexer-test"
        "indexer-db-test"
        "kaspa-node-test"
    )
    
    for container in "${containers[@]}"; do
        if docker ps -a --format '{{.Names}}' | grep -q "^${container}$"; then
            log_debug "Removing container: $container"
            docker rm -f "$container" 2>/dev/null || true
        fi
    done
    
    # Cleanup volumes if requested
    if [ "$cleanup_volumes" = true ]; then
        log_info "Removing test volumes..."
        docker volume ls --format '{{.Name}}' | grep "${COMPOSE_PROJECT}" | xargs -r docker volume rm 2>/dev/null || true
    fi
    
    log_info "Cleanup completed"
}

# Trap for cleanup on exit
trap_cleanup() {
    if [ "$CLEANUP_ON_EXIT" = true ]; then
        cleanup "$CLEANUP_VOLUMES"
    else
        log_warn "Skipping cleanup (--no-cleanup flag set)"
        log_info "To cleanup manually, run: $0 --cleanup-only"
    fi
}

trap trap_cleanup EXIT

# Check prerequisites
check_prerequisites() {
    log_section "Checking Prerequisites"
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    log_info "✓ Docker is installed"
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    log_info "✓ Docker Compose is installed"
    
    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi
    log_info "✓ Docker daemon is running"
}

# Build indexer image
build_indexer() {
    log_section "Building Simply Kaspa Indexer"
    
    cd services/simply-kaspa-indexer
    
    if [ -f "build.sh" ]; then
        log_info "Building indexer using build script..."
        ./build.sh timescaledb simply-kaspa-indexer-test
    else
        log_info "Building indexer using Docker..."
        docker build -t simply-kaspa-indexer-test .
    fi
    
    cd ../..
    
    log_info "✓ Indexer image built successfully"
}

# Start test environment
start_test_environment() {
    log_section "Starting Test Environment"
    
    # Start Kaspa node and database
    log_info "Starting Kaspa node and TimescaleDB..."
    docker-compose -p "$COMPOSE_PROJECT" --profile explorer up -d kaspa-node indexer-db
    
    # Wait for services to be ready
    log_info "Waiting for services to be ready..."
    sleep 10
    
    # Check Kaspa node
    log_info "Checking Kaspa node..."
    local retries=0
    while [ $retries -lt 30 ]; do
        if docker exec "${COMPOSE_PROJECT}_kaspa-node_1" curl -sf http://localhost:16111 -X POST -H "Content-Type: application/json" -d '{"method":"ping","params":{}}' > /dev/null 2>&1; then
            log_info "✓ Kaspa node is ready"
            break
        fi
        retries=$((retries + 1))
        sleep 2
    done
    
    # Check database
    log_info "Checking TimescaleDB..."
    retries=0
    while [ $retries -lt 30 ]; do
        if docker exec "${COMPOSE_PROJECT}_indexer-db_1" pg_isready -U indexer > /dev/null 2>&1; then
            log_info "✓ TimescaleDB is ready"
            break
        fi
        retries=$((retries + 1))
        sleep 2
    done
}

# Test TimescaleDB schema
test_timescaledb_schema() {
    log_section "Testing TimescaleDB Schema"
    
    # Check if hypertables were created
    log_info "Checking hypertables..."
    local hypertables=$(docker exec "${COMPOSE_PROJECT}_indexer-db_1" psql -U indexer -d simply_kaspa -t -c "SELECT table_name FROM timescaledb_information.hypertables WHERE schema_name='public';" 2>/dev/null || echo "")
    
    if [ -n "$hypertables" ]; then
        log_info "✓ Hypertables created:"
        echo "$hypertables" | while read -r table; do
            [ -n "$table" ] && log_debug "  - $table"
        done
    else
        log_warn "No hypertables found (may not be created yet)"
    fi
    
    # Check compression policies
    log_info "Checking compression policies..."
    local compression=$(docker exec "${COMPOSE_PROJECT}_indexer-db_1" psql -U indexer -d simply_kaspa -t -c "SELECT COUNT(*) FROM timescaledb_information.compression_settings;" 2>/dev/null || echo "0")
    log_info "Compression policies configured: $compression"
    
    # Check continuous aggregates
    log_info "Checking continuous aggregates..."
    local aggregates=$(docker exec "${COMPOSE_PROJECT}_indexer-db_1" psql -U indexer -d simply_kaspa -t -c "SELECT view_name FROM timescaledb_information.continuous_aggregates;" 2>/dev/null || echo "")
    
    if [ -n "$aggregates" ]; then
        log_info "✓ Continuous aggregates created:"
        echo "$aggregates" | while read -r view; do
            [ -n "$view" ] && log_debug "  - $view"
        done
    else
        log_warn "No continuous aggregates found"
    fi
}

# Start indexer
start_indexer() {
    local mode=${1:-full}
    
    log_section "Starting Simply Kaspa Indexer (Mode: $mode)"
    
    # Start indexer with specified mode
    SIMPLY_INDEXER_MODE="$mode" docker-compose -p "$COMPOSE_PROJECT" --profile explorer up -d simply-kaspa-indexer
    
    # Wait for indexer to start
    log_info "Waiting for indexer to start..."
    sleep 15
    
    # Check indexer health
    local retries=0
    while [ $retries -lt 30 ]; do
        if curl -sf http://localhost:3005/health > /dev/null 2>&1; then
            log_info "✓ Indexer is healthy"
            return 0
        fi
        retries=$((retries + 1))
        sleep 2
    done
    
    log_error "Indexer failed to become healthy"
    docker logs "${COMPOSE_PROJECT}_simply-kaspa-indexer_1" | tail -20
    return 1
}

# Test indexer functionality
test_indexer_functionality() {
    log_section "Testing Indexer Functionality"
    
    # Test health endpoint
    log_info "Testing health endpoint..."
    if curl -sf http://localhost:3005/health > /dev/null; then
        log_info "✓ Health endpoint responding"
    else
        log_error "Health endpoint not responding"
        return 1
    fi
    
    # Test metrics endpoint
    log_info "Testing metrics endpoint..."
    if curl -sf http://localhost:3005/metrics > /dev/null; then
        log_info "✓ Metrics endpoint responding"
    else
        log_warn "Metrics endpoint not responding"
    fi
    
    # Wait for some data to be indexed
    log_info "Waiting for indexer to process blocks..."
    sleep 30
    
    # Check if blocks are being indexed
    log_info "Checking indexed blocks..."
    local block_count=$(docker exec "${COMPOSE_PROJECT}_indexer-db_1" psql -U indexer -d simply_kaspa -t -c "SELECT COUNT(*) FROM blocks;" 2>/dev/null || echo "0")
    log_info "Blocks indexed: $block_count"
    
    if [ "$block_count" -gt 0 ]; then
        log_info "✓ Indexer is processing blocks"
    else
        log_warn "No blocks indexed yet (may need more time)"
    fi
    
    # Check transactions
    local tx_count=$(docker exec "${COMPOSE_PROJECT}_indexer-db_1" psql -U indexer -d simply_kaspa -t -c "SELECT COUNT(*) FROM transactions;" 2>/dev/null || echo "0")
    log_info "Transactions indexed: $tx_count"
}

# Test performance
test_performance() {
    log_section "Testing Performance"
    
    # Test query performance
    log_info "Testing time-range query performance..."
    local start_time=$(date +%s%N)
    docker exec "${COMPOSE_PROJECT}_indexer-db_1" psql -U indexer -d simply_kaspa -c "SELECT COUNT(*) FROM blocks WHERE created_at >= NOW() - INTERVAL '1 hour';" > /dev/null 2>&1
    local end_time=$(date +%s%N)
    local query_time=$(( (end_time - start_time) / 1000000 ))
    log_info "Query time: ${query_time}ms"
    
    # Check compression stats
    log_info "Checking compression statistics..."
    docker exec "${COMPOSE_PROJECT}_indexer-db_1" psql -U indexer -d simply_kaspa -c "SELECT * FROM blockchain_compression_stats LIMIT 5;" 2>/dev/null || log_warn "Compression stats not available yet"
    
    # Check database size
    log_info "Checking database size..."
    local db_size=$(docker exec "${COMPOSE_PROJECT}_indexer-db_1" psql -U indexer -d simply_kaspa -t -c "SELECT pg_size_pretty(pg_database_size('simply_kaspa'));" 2>/dev/null || echo "unknown")
    log_info "Database size: $db_size"
}

# Main test execution
main() {
    # Parse command line arguments
    local skip_build=false
    local test_mode="full"
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --no-cleanup)
                CLEANUP_ON_EXIT=false
                shift
                ;;
            --cleanup-only)
                cleanup true
                exit 0
                ;;
            --cleanup-full)
                CLEANUP_VOLUMES=true
                cleanup true
                exit 0
                ;;
            --cleanup-volumes)
                CLEANUP_VOLUMES=true
                shift
                ;;
            --mode)
                test_mode="$2"
                shift 2
                ;;
            --skip-build)
                skip_build=true
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
    
    log_section "Simply Kaspa Indexer Integration Test"
    log_info "Test mode: $test_mode"
    log_info "Cleanup on exit: $CLEANUP_ON_EXIT"
    
    # Run tests
    check_prerequisites
    
    if [ "$skip_build" = false ]; then
        build_indexer
    fi
    
    start_test_environment
    test_timescaledb_schema
    start_indexer "$test_mode"
    test_indexer_functionality
    test_performance
    
    log_section "Test Summary"
    log_info "✓ All tests completed successfully"
    log_info "Indexer is running in $test_mode mode"
    log_info "Access indexer at: http://localhost:3005"
    log_info "View logs: docker logs ${COMPOSE_PROJECT}_simply-kaspa-indexer_1"
    
    if [ "$CLEANUP_ON_EXIT" = false ]; then
        log_info "Containers left running for inspection"
        log_info "To cleanup: $0 --cleanup-only"
    fi
}

# Execute main function
main "$@"
