#!/bin/bash
# K-Social Integration Test Script
# Tests K-Social app and K-indexer integration with TimescaleDB optimizations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.yml"
PROFILES="--profile explorer --profile prod"
TEST_TIMEOUT=300  # 5 minutes
CLEANUP_ON_EXIT=true

# Service names
SERVICES=("indexer-db" "k-indexer" "k-social")
KASPA_NODE="kaspa-node"

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

# Cleanup function
cleanup() {
    if [ "$CLEANUP_ON_EXIT" = true ]; then
        log_info "Cleaning up test environment..."
        docker-compose -f "$COMPOSE_FILE" $PROFILES down -v --remove-orphans 2>/dev/null || true
        
        # Remove test images if they exist
        docker rmi k-social-test k-indexer-test 2>/dev/null || true
        
        log_info "Cleanup completed"
    fi
}

# Set up cleanup trap
trap cleanup EXIT

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi
    
    # Check if compose file exists
    if [ ! -f "$COMPOSE_FILE" ]; then
        log_error "Docker Compose file not found: $COMPOSE_FILE"
        exit 1
    fi
    
    log_info "✓ Prerequisites check passed"
}

# Build services
build_services() {
    log_info "Building K-Social services..."
    
    # Build K-indexer with TimescaleDB optimizations
    log_info "Building K-indexer with TimescaleDB optimizations..."
    cd services/k-indexer
    ./build.sh timescaledb k-indexer-test
    cd ../..
    
    # Build K-Social app
    log_info "Building K-Social app..."
    cd services/k-social
    ./build.sh docker k-social-test
    cd ../..
    
    log_info "✓ Services built successfully"
}

# Start services
start_services() {
    log_info "Starting K-Social integration test environment..."
    
    # Start core services first
    log_info "Starting core infrastructure..."
    docker-compose -f "$COMPOSE_FILE" --profile core up -d kaspa-node
    
    # Wait for Kaspa node to be ready
    log_info "Waiting for Kaspa node to be ready..."
    wait_for_service "kaspa-node" "16111" 60
    
    # Start database
    log_info "Starting TimescaleDB..."
    docker-compose -f "$COMPOSE_FILE" --profile explorer up -d indexer-db
    
    # Wait for database to be ready
    log_info "Waiting for TimescaleDB to be ready..."
    wait_for_service "indexer-db" "5432" 60
    
    # Start K-indexer
    log_info "Starting K-indexer..."
    docker-compose -f "$COMPOSE_FILE" --profile explorer up -d k-indexer
    
    # Wait for K-indexer to be ready
    log_info "Waiting for K-indexer to be ready..."
    wait_for_service "k-indexer" "3000" 120
    
    # Start K-Social app
    log_info "Starting K-Social app..."
    docker-compose -f "$COMPOSE_FILE" --profile prod up -d k-social
    
    # Wait for K-Social to be ready
    log_info "Waiting for K-Social app to be ready..."
    wait_for_service "k-social" "3000" 60
    
    log_info "✓ All services started successfully"
}

# Wait for service to be ready
wait_for_service() {
    local service=$1
    local port=$2
    local timeout=${3:-60}
    local count=0
    
    while [ $count -lt $timeout ]; do
        if docker-compose -f "$COMPOSE_FILE" exec -T "$service" curl -f "http://localhost:$port/health" &>/dev/null; then
            log_info "✓ $service is ready"
            return 0
        fi
        
        if [ $((count % 10)) -eq 0 ]; then
            log_debug "Waiting for $service to be ready... ($count/$timeout)"
        fi
        
        sleep 1
        count=$((count + 1))
    done
    
    log_error "✗ $service failed to become ready within $timeout seconds"
    return 1
}

# Test TimescaleDB integration
test_timescaledb() {
    log_info "Testing TimescaleDB integration..."
    
    # Check TimescaleDB extension
    local timescaledb_check
    timescaledb_check=$(docker-compose -f "$COMPOSE_FILE" exec -T indexer-db psql -U indexer -d ksocial -t -c "SELECT COUNT(*) FROM pg_extension WHERE extname='timescaledb';" 2>/dev/null | tr -d ' \n' || echo "0")
    
    if [ "$timescaledb_check" -gt 0 ]; then
        log_info "✓ TimescaleDB extension is installed"
    else
        log_error "✗ TimescaleDB extension not found"
        return 1
    fi
    
    # Check hypertables
    local hypertables_count
    hypertables_count=$(docker-compose -f "$COMPOSE_FILE" exec -T indexer-db psql -U indexer -d ksocial -t -c "SELECT COUNT(*) FROM timescaledb_information.hypertables WHERE schema_name='public';" 2>/dev/null | tr -d ' \n' || echo "0")
    
    if [ "$hypertables_count" -gt 0 ]; then
        log_info "✓ Found $hypertables_count hypertables"
    else
        log_error "✗ No hypertables found"
        return 1
    fi
    
    # Check compression policies
    local compression_count
    compression_count=$(docker-compose -f "$COMPOSE_FILE" exec -T indexer-db psql -U indexer -d ksocial -t -c "SELECT COUNT(*) FROM timescaledb_information.compression_settings;" 2>/dev/null | tr -d ' \n' || echo "0")
    
    if [ "$compression_count" -gt 0 ]; then
        log_info "✓ Found $compression_count compression policies"
    else
        log_warn "⚠ No compression policies found (may be normal for new installation)"
    fi
    
    log_info "✓ TimescaleDB integration test passed"
}

# Test K-indexer functionality
test_k_indexer() {
    log_info "Testing K-indexer functionality..."
    
    # Test health endpoint
    local health_response
    health_response=$(docker-compose -f "$COMPOSE_FILE" exec -T k-indexer curl -s http://localhost:3000/health || echo "")
    
    if [ -n "$health_response" ]; then
        log_info "✓ K-indexer health endpoint responding"
    else
        log_error "✗ K-indexer health endpoint not responding"
        return 1
    fi
    
    # Test metrics endpoint
    local metrics_response
    metrics_response=$(docker-compose -f "$COMPOSE_FILE" exec -T k-indexer curl -s http://localhost:3000/metrics || echo "")
    
    if [ -n "$metrics_response" ]; then
        log_info "✓ K-indexer metrics endpoint responding"
    else
        log_warn "⚠ K-indexer metrics endpoint not responding (may not be implemented)"
    fi
    
    # Test database connection
    local db_test
    db_test=$(docker-compose -f "$COMPOSE_FILE" exec -T k-indexer sh -c 'pg_isready -h indexer-db -p 5432 -U indexer -d ksocial' 2>/dev/null || echo "failed")
    
    if [[ "$db_test" == *"accepting connections"* ]]; then
        log_info "✓ K-indexer database connection working"
    else
        log_error "✗ K-indexer database connection failed"
        return 1
    fi
    
    log_info "✓ K-indexer functionality test passed"
}

# Test K-Social app functionality
test_k_social() {
    log_info "Testing K-Social app functionality..."
    
    # Test health endpoint
    local health_response
    health_response=$(docker-compose -f "$COMPOSE_FILE" exec -T k-social curl -s http://localhost:3000/health || echo "")
    
    if [[ "$health_response" == *"healthy"* ]]; then
        log_info "✓ K-Social health endpoint responding"
    else
        log_error "✗ K-Social health endpoint not responding properly"
        return 1
    fi
    
    # Test static file serving
    local static_test
    static_test=$(docker-compose -f "$COMPOSE_FILE" exec -T k-social curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ || echo "000")
    
    if [ "$static_test" = "200" ]; then
        log_info "✓ K-Social static files serving correctly"
    else
        log_error "✗ K-Social static files not serving (HTTP $static_test)"
        return 1
    fi
    
    # Test API proxy to K-indexer
    local api_test
    api_test=$(docker-compose -f "$COMPOSE_FILE" exec -T k-social curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health || echo "000")
    
    if [ "$api_test" = "200" ]; then
        log_info "✓ K-Social API proxy to K-indexer working"
    else
        log_warn "⚠ K-Social API proxy may not be working (HTTP $api_test)"
    fi
    
    log_info "✓ K-Social app functionality test passed"
}

# Test service integration
test_integration() {
    log_info "Testing K-Social integration..."
    
    # Test service dependencies
    local services_status=0
    
    for service in "${SERVICES[@]}"; do
        if docker-compose -f "$COMPOSE_FILE" ps "$service" | grep -q "Up"; then
            log_info "✓ $service is running"
        else
            log_error "✗ $service is not running"
            services_status=1
        fi
    done
    
    if [ $services_status -ne 0 ]; then
        log_error "Service dependency test failed"
        return 1
    fi
    
    # Test network connectivity between services
    log_info "Testing inter-service connectivity..."
    
    # K-indexer to database
    if docker-compose -f "$COMPOSE_FILE" exec -T k-indexer pg_isready -h indexer-db -p 5432 &>/dev/null; then
        log_info "✓ K-indexer → TimescaleDB connectivity"
    else
        log_error "✗ K-indexer → TimescaleDB connectivity failed"
        return 1
    fi
    
    # K-Social to K-indexer
    if docker-compose -f "$COMPOSE_FILE" exec -T k-social curl -f http://k-indexer:3000/health &>/dev/null; then
        log_info "✓ K-Social → K-indexer connectivity"
    else
        log_error "✗ K-Social → K-indexer connectivity failed"
        return 1
    fi
    
    log_info "✓ Service integration test passed"
}

# Test performance
test_performance() {
    log_info "Testing performance characteristics..."
    
    # Test K-indexer response time
    local start_time=$(date +%s%N)
    docker-compose -f "$COMPOSE_FILE" exec -T k-indexer curl -s http://localhost:3000/health > /dev/null
    local end_time=$(date +%s%N)
    local response_time=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
    
    if [ $response_time -lt 1000 ]; then
        log_info "✓ K-indexer response time: ${response_time}ms (good)"
    else
        log_warn "⚠ K-indexer response time: ${response_time}ms (slow)"
    fi
    
    # Test K-Social response time
    start_time=$(date +%s%N)
    docker-compose -f "$COMPOSE_FILE" exec -T k-social curl -s http://localhost:3000/health > /dev/null
    end_time=$(date +%s%N)
    response_time=$(( (end_time - start_time) / 1000000 ))
    
    if [ $response_time -lt 1000 ]; then
        log_info "✓ K-Social response time: ${response_time}ms (good)"
    else
        log_warn "⚠ K-Social response time: ${response_time}ms (slow)"
    fi
    
    log_info "✓ Performance test completed"
}

# Display service logs
show_logs() {
    log_info "Displaying service logs..."
    
    for service in "${SERVICES[@]}"; do
        echo ""
        log_info "=== $service logs ==="
        docker-compose -f "$COMPOSE_FILE" logs --tail=20 "$service" || true
    done
}

# Main test execution
main() {
    log_info "Starting K-Social Integration Test"
    log_info "=================================="
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --no-cleanup)
                CLEANUP_ON_EXIT=false
                shift
                ;;
            --timeout)
                TEST_TIMEOUT="$2"
                shift 2
                ;;
            --help|-h)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  --no-cleanup    Don't cleanup containers after test"
                echo "  --timeout SEC   Set test timeout (default: 300)"
                echo "  --help, -h      Show this help message"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Run tests
    check_prerequisites
    build_services
    start_services
    
    # Run test suite
    local test_results=0
    
    test_timescaledb || test_results=1
    test_k_indexer || test_results=1
    test_k_social || test_results=1
    test_integration || test_results=1
    test_performance || test_results=1
    
    # Show logs if tests failed
    if [ $test_results -ne 0 ]; then
        show_logs
    fi
    
    # Final results
    echo ""
    log_info "=================================="
    if [ $test_results -eq 0 ]; then
        log_info "✅ All K-Social integration tests PASSED!"
        log_info "K-Social app and K-indexer are working correctly with TimescaleDB optimizations"
    else
        log_error "❌ Some K-Social integration tests FAILED!"
        log_error "Check the logs above for details"
    fi
    log_info "=================================="
    
    exit $test_results
}

# Execute main function
main "$@"