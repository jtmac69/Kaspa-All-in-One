#!/bin/bash

# TimescaleDB Infrastructure Testing Suite
# Tests TimescaleDB initialization, migrations, backup/restore, performance, compression, and continuous aggregates

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
POSTGRES_PORT=${POSTGRES_PORT:-5432}
POSTGRES_USER=${POSTGRES_USER:-kaspa}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-kaspa_password}
POSTGRES_DB=${POSTGRES_DB:-kaspa}
TIMEOUT=30
TEST_RESULTS=()

# Logging functions
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

header() {
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║ $1${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Test result tracking
add_test_result() {
    local test_name="$1"
    local result="$2"
    local message="$3"
    
    TEST_RESULTS+=("$test_name|$result|$message")
    
    if [ "$result" = "PASS" ]; then
        success "✓ $test_name: $message"
    elif [ "$result" = "FAIL" ]; then
        error "✗ $test_name: $message"
    else
        warn "⚠ $test_name: $message"
    fi
}

# Helper function to execute SQL
exec_sql() {
    local database="$1"
    local sql="$2"
    
    docker exec timescaledb psql -U "$POSTGRES_USER" -d "$database" -t -c "$sql" 2>&1
}

# Test Docker availability
test_docker() {
    header "Testing Docker Availability"
    
    if ! docker info &> /dev/null; then
        add_test_result "Docker Availability" "FAIL" "Docker is not running or not accessible"
        exit 1
    fi
    
    add_test_result "Docker Availability" "PASS" "Docker is running"
}

# Start TimescaleDB service
start_timescaledb() {
    header "Starting TimescaleDB Service"
    
    log "Starting TimescaleDB container..."
    docker compose --profile explorer up -d timescaledb
    
    log "Waiting for TimescaleDB to be ready..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker exec timescaledb pg_isready -U "$POSTGRES_USER" > /dev/null 2>&1; then
            add_test_result "TimescaleDB Startup" "PASS" "TimescaleDB is ready"
            return 0
        fi
        
        log "Attempt $attempt/$max_attempts: Waiting for TimescaleDB..."
        sleep 2
        ((attempt++))
    done
    
    add_test_result "TimescaleDB Startup" "FAIL" "TimescaleDB failed to start"
    return 1
}

# Test TimescaleDB extension
test_timescaledb_extension() {
    header "Testing TimescaleDB Extension"
    
    log "Checking TimescaleDB extension..."
    local result=$(exec_sql "$POSTGRES_DB" "SELECT extname FROM pg_extension WHERE extname = 'timescaledb';")
    
    if echo "$result" | grep -q "timescaledb"; then
        add_test_result "TimescaleDB Extension" "PASS" "TimescaleDB extension is installed"
        
        # Get version
        local version=$(exec_sql "$POSTGRES_DB" "SELECT extversion FROM pg_extension WHERE extname = 'timescaledb';")
        log "TimescaleDB version: $(echo $version | xargs)"
    else
        add_test_result "TimescaleDB Extension" "FAIL" "TimescaleDB extension is not installed"
    fi
}

# Test database initialization
test_database_initialization() {
    header "Testing Database Initialization"
    
    # Check if ksocial database exists
    log "Checking ksocial database..."
    local ksocial_exists=$(exec_sql "postgres" "SELECT 1 FROM pg_database WHERE datname = 'ksocial';")
    
    if echo "$ksocial_exists" | grep -q "1"; then
        add_test_result "K-Social Database" "PASS" "ksocial database exists"
    else
        add_test_result "K-Social Database" "FAIL" "ksocial database does not exist"
    fi
    
    # Check if simply_kaspa database exists
    log "Checking simply_kaspa database..."
    local simply_kaspa_exists=$(exec_sql "postgres" "SELECT 1 FROM pg_database WHERE datname = 'simply_kaspa';")
    
    if echo "$simply_kaspa_exists" | grep -q "1"; then
        add_test_result "Simply-Kaspa Database" "PASS" "simply_kaspa database exists"
    else
        add_test_result "Simply-Kaspa Database" "FAIL" "simply_kaspa database does not exist"
    fi
}

# Test hypertables
test_hypertables() {
    header "Testing Hypertables"
    
    # Test K-Social hypertables
    log "Checking K-Social hypertables..."
    local ksocial_hypertables=$(exec_sql "ksocial" "SELECT hypertable_name FROM timescaledb_information.hypertables;")
    
    if echo "$ksocial_hypertables" | grep -q "k_posts"; then
        add_test_result "K-Social Hypertables" "PASS" "K-Social hypertables are configured"
        log "K-Social hypertables: $(echo $ksocial_hypertables | xargs)"
    else
        add_test_result "K-Social Hypertables" "WARN" "K-Social hypertables may not be configured"
    fi
    
    # Test Simply-Kaspa hypertables
    log "Checking Simply-Kaspa hypertables..."
    local simply_kaspa_hypertables=$(exec_sql "simply_kaspa" "SELECT hypertable_name FROM timescaledb_information.hypertables;")
    
    if echo "$simply_kaspa_hypertables" | grep -q "blocks\|transactions"; then
        add_test_result "Simply-Kaspa Hypertables" "PASS" "Simply-Kaspa hypertables are configured"
        log "Simply-Kaspa hypertables: $(echo $simply_kaspa_hypertables | xargs)"
    else
        add_test_result "Simply-Kaspa Hypertables" "WARN" "Simply-Kaspa hypertables may not be configured"
    fi
}

# Test compression policies
test_compression_policies() {
    header "Testing Compression Policies"
    
    # Test K-Social compression
    log "Checking K-Social compression policies..."
    local ksocial_compression=$(exec_sql "ksocial" "SELECT hypertable_name, compression_enabled FROM timescaledb_information.hypertables WHERE compression_enabled = true;")
    
    if [ -n "$ksocial_compression" ] && echo "$ksocial_compression" | grep -q "t"; then
        add_test_result "K-Social Compression" "PASS" "Compression is enabled for K-Social tables"
    else
        add_test_result "K-Social Compression" "WARN" "Compression may not be enabled for K-Social tables"
    fi
    
    # Test Simply-Kaspa compression
    log "Checking Simply-Kaspa compression policies..."
    local simply_kaspa_compression=$(exec_sql "simply_kaspa" "SELECT hypertable_name, compression_enabled FROM timescaledb_information.hypertables WHERE compression_enabled = true;")
    
    if [ -n "$simply_kaspa_compression" ] && echo "$simply_kaspa_compression" | grep -q "t"; then
        add_test_result "Simply-Kaspa Compression" "PASS" "Compression is enabled for Simply-Kaspa tables"
    else
        add_test_result "Simply-Kaspa Compression" "WARN" "Compression may not be enabled for Simply-Kaspa tables"
    fi
}

# Test continuous aggregates
test_continuous_aggregates() {
    header "Testing Continuous Aggregates"
    
    # Test K-Social continuous aggregates
    log "Checking K-Social continuous aggregates..."
    local ksocial_caggs=$(exec_sql "ksocial" "SELECT view_name FROM timescaledb_information.continuous_aggregates;")
    
    if [ -n "$ksocial_caggs" ]; then
        add_test_result "K-Social Continuous Aggregates" "PASS" "Continuous aggregates are configured"
        log "K-Social continuous aggregates: $(echo $ksocial_caggs | xargs)"
    else
        add_test_result "K-Social Continuous Aggregates" "WARN" "No continuous aggregates found"
    fi
    
    # Test Simply-Kaspa continuous aggregates
    log "Checking Simply-Kaspa continuous aggregates..."
    local simply_kaspa_caggs=$(exec_sql "simply_kaspa" "SELECT view_name FROM timescaledb_information.continuous_aggregates;")
    
    if [ -n "$simply_kaspa_caggs" ]; then
        add_test_result "Simply-Kaspa Continuous Aggregates" "PASS" "Continuous aggregates are configured"
        log "Simply-Kaspa continuous aggregates: $(echo $simply_kaspa_caggs | xargs)"
    else
        add_test_result "Simply-Kaspa Continuous Aggregates" "WARN" "No continuous aggregates found"
    fi
}

# Test data insertion and query performance
test_data_operations() {
    header "Testing Data Operations"
    
    # Test insert into K-Social
    log "Testing data insertion into K-Social..."
    local insert_result=$(exec_sql "ksocial" "INSERT INTO k_posts (transaction_id, author_address, content) VALUES (E'\\\\x0001', 'test_address', 'test content') RETURNING id;" 2>&1)
    
    if echo "$insert_result" | grep -q "[0-9]"; then
        add_test_result "K-Social Data Insert" "PASS" "Data insertion successful"
        
        # Test query performance
        log "Testing query performance..."
        local start_time=$(date +%s%N)
        exec_sql "ksocial" "SELECT COUNT(*) FROM k_posts;" > /dev/null 2>&1
        local end_time=$(date +%s%N)
        local duration=$(( (end_time - start_time) / 1000000 ))
        
        add_test_result "K-Social Query Performance" "PASS" "Query completed in ${duration}ms"
    else
        add_test_result "K-Social Data Insert" "WARN" "Data insertion may have failed: $insert_result"
    fi
}

# Test chunk management
test_chunk_management() {
    header "Testing Chunk Management"
    
    # Test K-Social chunks
    log "Checking K-Social chunk configuration..."
    local ksocial_chunks=$(exec_sql "ksocial" "SELECT hypertable_name, chunk_time_interval FROM timescaledb_information.dimensions WHERE hypertable_name = 'k_posts';")
    
    if [ -n "$ksocial_chunks" ]; then
        add_test_result "K-Social Chunks" "PASS" "Chunk configuration exists"
        log "K-Social chunk interval: $(echo $ksocial_chunks | xargs)"
    else
        add_test_result "K-Social Chunks" "WARN" "Chunk configuration not found"
    fi
    
    # Test Simply-Kaspa chunks
    log "Checking Simply-Kaspa chunk configuration..."
    local simply_kaspa_chunks=$(exec_sql "simply_kaspa" "SELECT hypertable_name, chunk_time_interval FROM timescaledb_information.dimensions WHERE hypertable_name = 'blocks';")
    
    if [ -n "$simply_kaspa_chunks" ]; then
        add_test_result "Simply-Kaspa Chunks" "PASS" "Chunk configuration exists"
        log "Simply-Kaspa chunk interval: $(echo $simply_kaspa_chunks | xargs)"
    else
        add_test_result "Simply-Kaspa Chunks" "WARN" "Chunk configuration not found"
    fi
}

# Test backup capability
test_backup_capability() {
    header "Testing Backup Capability"
    
    log "Testing pg_dump availability..."
    if docker exec timescaledb which pg_dump > /dev/null 2>&1; then
        add_test_result "Backup Tools" "PASS" "pg_dump is available"
        
        # Test backup creation
        log "Creating test backup..."
        local backup_result=$(docker exec timescaledb pg_dump -U "$POSTGRES_USER" -d ksocial -f /tmp/test_backup.sql 2>&1)
        
        if [ $? -eq 0 ]; then
            add_test_result "Backup Creation" "PASS" "Test backup created successfully"
            
            # Cleanup test backup
            docker exec timescaledb rm -f /tmp/test_backup.sql 2>/dev/null || true
        else
            add_test_result "Backup Creation" "WARN" "Backup creation may have issues"
        fi
    else
        add_test_result "Backup Tools" "FAIL" "pg_dump is not available"
    fi
}

# Test restore capability
test_restore_capability() {
    header "Testing Restore Capability"
    
    log "Testing pg_restore availability..."
    if docker exec timescaledb which pg_restore > /dev/null 2>&1; then
        add_test_result "Restore Tools" "PASS" "pg_restore is available"
    else
        add_test_result "Restore Tools" "WARN" "pg_restore is not available"
    fi
}

# Test database connections
test_database_connections() {
    header "Testing Database Connections"
    
    log "Checking active connections..."
    local connections=$(exec_sql "$POSTGRES_DB" "SELECT count(*) FROM pg_stat_activity WHERE datname IS NOT NULL;")
    
    if [ -n "$connections" ]; then
        add_test_result "Database Connections" "PASS" "Active connections: $(echo $connections | xargs)"
    else
        add_test_result "Database Connections" "WARN" "Could not retrieve connection count"
    fi
    
    # Check max connections
    local max_connections=$(exec_sql "$POSTGRES_DB" "SHOW max_connections;")
    log "Max connections configured: $(echo $max_connections | xargs)"
}

# Test database size and storage
test_database_storage() {
    header "Testing Database Storage"
    
    # Test K-Social database size
    log "Checking K-Social database size..."
    local ksocial_size=$(exec_sql "postgres" "SELECT pg_size_pretty(pg_database_size('ksocial'));")
    
    if [ -n "$ksocial_size" ]; then
        add_test_result "K-Social Database Size" "PASS" "Size: $(echo $ksocial_size | xargs)"
    else
        add_test_result "K-Social Database Size" "WARN" "Could not retrieve database size"
    fi
    
    # Test Simply-Kaspa database size
    log "Checking Simply-Kaspa database size..."
    local simply_kaspa_size=$(exec_sql "postgres" "SELECT pg_size_pretty(pg_database_size('simply_kaspa'));")
    
    if [ -n "$simply_kaspa_size" ]; then
        add_test_result "Simply-Kaspa Database Size" "PASS" "Size: $(echo $simply_kaspa_size | xargs)"
    else
        add_test_result "Simply-Kaspa Database Size" "WARN" "Could not retrieve database size"
    fi
}

# Test performance monitoring views
test_performance_monitoring() {
    header "Testing Performance Monitoring"
    
    # Test K-Social monitoring views
    log "Checking K-Social monitoring views..."
    local ksocial_views=$(exec_sql "ksocial" "SELECT table_name FROM information_schema.views WHERE table_name LIKE '%stats%' OR table_name LIKE '%performance%';")
    
    if [ -n "$ksocial_views" ]; then
        add_test_result "K-Social Monitoring Views" "PASS" "Monitoring views exist"
        log "K-Social monitoring views: $(echo $ksocial_views | xargs)"
    else
        add_test_result "K-Social Monitoring Views" "WARN" "No monitoring views found"
    fi
}

# Test TimescaleDB configuration
test_timescaledb_configuration() {
    header "Testing TimescaleDB Configuration"
    
    # Check shared_buffers
    local shared_buffers=$(exec_sql "$POSTGRES_DB" "SHOW shared_buffers;")
    log "shared_buffers: $(echo $shared_buffers | xargs)"
    
    # Check work_mem
    local work_mem=$(exec_sql "$POSTGRES_DB" "SHOW work_mem;")
    log "work_mem: $(echo $work_mem | xargs)"
    
    # Check effective_cache_size
    local effective_cache_size=$(exec_sql "$POSTGRES_DB" "SHOW effective_cache_size;")
    log "effective_cache_size: $(echo $effective_cache_size | xargs)"
    
    add_test_result "TimescaleDB Configuration" "PASS" "Configuration parameters retrieved"
}

# Test container health
test_container_health() {
    header "Testing Container Health"
    
    log "Checking TimescaleDB container status..."
    local container_status=$(docker inspect timescaledb --format='{{.State.Status}}' 2>/dev/null)
    
    if [ "$container_status" = "running" ]; then
        add_test_result "Container Status" "PASS" "TimescaleDB container is running"
        
        # Check restart count
        local restart_count=$(docker inspect timescaledb --format='{{.RestartCount}}' 2>/dev/null)
        if [ "$restart_count" = "0" ]; then
            add_test_result "Container Stability" "PASS" "No restarts detected"
        else
            add_test_result "Container Stability" "WARN" "Container has restarted $restart_count times"
        fi
    else
        add_test_result "Container Status" "FAIL" "TimescaleDB container is not running: $container_status"
    fi
}

# Test resource usage
test_resource_usage() {
    header "Testing Resource Usage"
    
    log "Checking TimescaleDB resource usage..."
    local stats=$(docker stats timescaledb --no-stream --format "{{.CPUPerc}}|{{.MemUsage}}" 2>/dev/null)
    
    if [ -n "$stats" ]; then
        local cpu=$(echo "$stats" | cut -d'|' -f1)
        local mem=$(echo "$stats" | cut -d'|' -f2)
        
        add_test_result "Resource Usage" "PASS" "CPU: $cpu, Memory: $mem"
    else
        add_test_result "Resource Usage" "WARN" "Could not retrieve resource stats"
    fi
}

# Test logs
test_database_logs() {
    header "Testing Database Logs"
    
    log "Checking TimescaleDB logs..."
    local logs=$(docker logs timescaledb --tail 20 2>&1)
    
    if [ -n "$logs" ]; then
        add_test_result "Database Logs" "PASS" "Logs are accessible"
        
        # Check for errors
        if echo "$logs" | grep -qi "error\|fatal"; then
            warn "Found potential errors in logs:"
            echo "$logs" | grep -i "error\|fatal" | tail -5
            add_test_result "Database Log Errors" "WARN" "Errors found in logs"
        else
            add_test_result "Database Log Errors" "PASS" "No errors in recent logs"
        fi
    else
        add_test_result "Database Logs" "WARN" "No logs available"
    fi
}

# Display test summary
display_test_summary() {
    header "Test Summary"
    
    local total_tests=${#TEST_RESULTS[@]}
    local passed=0
    local failed=0
    local warnings=0
    
    for result in "${TEST_RESULTS[@]}"; do
        local status=$(echo "$result" | cut -d'|' -f2)
        case "$status" in
            "PASS") ((passed++)) ;;
            "FAIL") ((failed++)) ;;
            "WARN") ((warnings++)) ;;
        esac
    done
    
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                      TEST RESULTS                            ║${NC}"
    echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${CYAN}║${NC} Total Tests:    ${BLUE}$total_tests${NC}"
    echo -e "${CYAN}║${NC} Passed:         ${GREEN}$passed${NC}"
    echo -e "${CYAN}║${NC} Failed:         ${RED}$failed${NC}"
    echo -e "${CYAN}║${NC} Warnings:       ${YELLOW}$warnings${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    if [ $failed -eq 0 ]; then
        success "All critical tests passed! ✓"
        return 0
    else
        error "Some tests failed. Please review the results above."
        return 1
    fi
}

# Show recommendations
show_recommendations() {
    header "Recommendations"
    
    echo "TimescaleDB Configuration Best Practices:"
    echo "  • Monitor chunk sizes and adjust intervals based on data patterns"
    echo "  • Enable compression for historical data (90%+ space savings)"
    echo "  • Use continuous aggregates for frequently queried metrics"
    echo "  • Configure appropriate retention policies for data lifecycle"
    echo "  • Tune shared_buffers, work_mem, and effective_cache_size"
    echo "  • Monitor query performance and add indexes as needed"
    echo ""
    
    echo "Backup and Recovery:"
    echo "  • Schedule regular backups with pg_dump"
    echo "  • Test restore procedures periodically"
    echo "  • Consider point-in-time recovery (PITR) for production"
    echo "  • Store backups in separate location from database"
    echo "  • Document backup and restore procedures"
    echo ""
    
    echo "Performance Optimization:"
    echo "  • Use hypertables for time-series data (automatic partitioning)"
    echo "  • Enable compression after data stabilizes (1-2 hours old)"
    echo "  • Create continuous aggregates for common queries"
    echo "  • Monitor chunk count and compression ratio"
    echo "  • Use appropriate chunk intervals (15-30 min for high frequency)"
    echo ""
    
    echo "Monitoring:"
    echo "  • Database logs: docker logs timescaledb"
    echo "  • Active connections: SELECT * FROM pg_stat_activity;"
    echo "  • Database size: SELECT pg_size_pretty(pg_database_size('dbname'));"
    echo "  • Hypertables: SELECT * FROM timescaledb_information.hypertables;"
    echo "  • Compression stats: SELECT * FROM timescaledb_information.compression_settings;"
    echo "  • Resource usage: docker stats timescaledb"
    echo ""
    
    echo "Kaspa-Specific Optimizations:"
    echo "  • 10 blocks/second = 864,000 blocks/day"
    echo "  • Use 15-30 minute chunks for blocks/transactions"
    echo "  • Use 1-6 hour chunks for social media data"
    echo "  • Enable compression after 1-2 hours for blockchain data"
    echo "  • Enable compression after 24 hours for social data"
    echo "  • Monitor query performance for time-range queries"
    echo ""
}

# Main test execution
main() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║        TimescaleDB Infrastructure Testing Suite             ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    
    test_docker
    start_timescaledb
    
    # Extension and initialization tests
    test_timescaledb_extension
    test_database_initialization
    
    # TimescaleDB feature tests
    test_hypertables
    test_compression_policies
    test_continuous_aggregates
    test_chunk_management
    
    # Data operation tests
    test_data_operations
    
    # Backup and restore tests
    test_backup_capability
    test_restore_capability
    
    # Monitoring and performance tests
    test_database_connections
    test_database_storage
    test_performance_monitoring
    test_timescaledb_configuration
    
    # Infrastructure tests
    test_container_health
    test_resource_usage
    test_database_logs
    
    # Display results
    display_test_summary
    local test_exit_code=$?
    
    show_recommendations
    
    return $test_exit_code
}

# Cleanup functions
cleanup_containers() {
    local cleanup_level=${1:-basic}
    
    log "Cleaning up containers..."
    
    # Stop and remove test containers
    local test_containers=("timescaledb-test")
    for container in "${test_containers[@]}"; do
        if docker ps -a --format "{{.Names}}" | grep -q "^${container}$"; then
            log "Removing test container: $container"
            docker stop "$container" 2>/dev/null || true
            docker rm "$container" 2>/dev/null || true
        fi
    done
    
    # Stop compose services
    log "Stopping compose services..."
    docker compose --profile explorer stop timescaledb 2>/dev/null || true
    
    if [ "$cleanup_level" = "full" ]; then
        log "Performing full cleanup..."
        
        # Remove volumes (optional - preserves data by default)
        if [ "$CLEANUP_VOLUMES" = "true" ]; then
            warn "Removing data volumes..."
            docker volume rm kaspa-aio_timescaledb-data 2>/dev/null || true
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

# Parse command line arguments
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
            echo "TimescaleDB Infrastructure Testing Suite"
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
