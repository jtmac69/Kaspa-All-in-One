#!/bin/bash

# Performance and Load Testing Script
# Tests system performance under various load conditions

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_header() {
    echo -e "\n${BLUE}🔍 $1${NC}"
    echo "========================================"
}

# Configuration
CONCURRENT_REQUESTS=50
DURATION=60
RAMP_UP_TIME=10

# Performance thresholds
MAX_RESPONSE_TIME=2000  # milliseconds
MIN_SUCCESS_RATE=95     # percentage
MAX_ERROR_RATE=5        # percentage

# Test results tracking
declare -A LOAD_TEST_RESULTS
declare -A PERFORMANCE_METRICS

# Function to check if service is available
check_service_availability() {
    local service=$1
    local port=$2
    local endpoint=${3:-/}
    
    if curl -s -f "http://localhost:${port}${endpoint}" > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to measure response time
measure_response_time() {
    local url=$1
    local response_time=$(curl -o /dev/null -s -w '%{time_total}' "$url" 2>/dev/null)
    echo "$response_time"
}

# Function to run concurrent requests
run_concurrent_requests() {
    local url=$1
    local count=$2
    local output_file=$3
    
    log_info "Running $count concurrent requests to $url..."
    
    local start_time=$(date +%s.%N)
    local success_count=0
    local error_count=0
    
    for i in $(seq 1 $count); do
        {
            if curl -s -f -o /dev/null -w '%{http_code}\n' "$url" >> "$output_file" 2>&1; then
                echo "success" >> "${output_file}.status"
            else
                echo "error" >> "${output_file}.status"
            fi
        } &
    done
    
    wait
    
    local end_time=$(date +%s.%N)
    local duration=$(echo "$end_time - $start_time" | bc)
    
    success_count=$(grep -c "success" "${output_file}.status" 2>/dev/null || echo 0)
    error_count=$(grep -c "error" "${output_file}.status" 2>/dev/null || echo 0)
    
    local success_rate=$((success_count * 100 / count))
    local requests_per_sec=$(echo "scale=2; $count / $duration" | bc)
    
    echo "$duration:$success_count:$error_count:$success_rate:$requests_per_sec"
}

# Function to test dashboard under load
test_dashboard_load() {
    log_header "Testing Dashboard Under Load"
    
    if ! check_service_availability "dashboard" "8080" "/"; then
        log_error "Dashboard is not available"
        LOAD_TEST_RESULTS["dashboard"]="SKIP"
        return 1
    fi
    
    local output_file="/tmp/load-dashboard.txt"
    > "$output_file"
    > "${output_file}.status"
    
    local result=$(run_concurrent_requests "http://localhost:8080/" $CONCURRENT_REQUESTS "$output_file")
    
    local duration=$(echo "$result" | cut -d: -f1)
    local success_count=$(echo "$result" | cut -d: -f2)
    local error_count=$(echo "$result" | cut -d: -f3)
    local success_rate=$(echo "$result" | cut -d: -f4)
    local req_per_sec=$(echo "$result" | cut -d: -f5)
    
    log_info "Dashboard load test results:"
    log_info "  Duration: ${duration}s"
    log_info "  Successful requests: $success_count"
    log_info "  Failed requests: $error_count"
    log_info "  Success rate: ${success_rate}%"
    log_info "  Requests/sec: $req_per_sec"
    
    PERFORMANCE_METRICS["dashboard_success_rate"]=$success_rate
    PERFORMANCE_METRICS["dashboard_req_per_sec"]=$req_per_sec
    
    if [ $success_rate -ge $MIN_SUCCESS_RATE ]; then
        log_success "Dashboard passed load test (${success_rate}% success rate)"
        LOAD_TEST_RESULTS["dashboard"]="PASS"
        return 0
    else
        log_error "Dashboard failed load test (${success_rate}% success rate < ${MIN_SUCCESS_RATE}%)"
        LOAD_TEST_RESULTS["dashboard"]="FAIL"
        return 1
    fi
}

# Function to test nginx under load
test_nginx_load() {
    log_header "Testing Nginx Under Load"
    
    if ! check_service_availability "nginx" "80" "/"; then
        log_error "Nginx is not available"
        LOAD_TEST_RESULTS["nginx"]="SKIP"
        return 1
    fi
    
    local output_file="/tmp/load-nginx.txt"
    > "$output_file"
    > "${output_file}.status"
    
    local result=$(run_concurrent_requests "http://localhost:80/" $CONCURRENT_REQUESTS "$output_file")
    
    local duration=$(echo "$result" | cut -d: -f1)
    local success_count=$(echo "$result" | cut -d: -f2)
    local error_count=$(echo "$result" | cut -d: -f3)
    local success_rate=$(echo "$result" | cut -d: -f4)
    local req_per_sec=$(echo "$result" | cut -d: -f5)
    
    log_info "Nginx load test results:"
    log_info "  Duration: ${duration}s"
    log_info "  Successful requests: $success_count"
    log_info "  Failed requests: $error_count"
    log_info "  Success rate: ${success_rate}%"
    log_info "  Requests/sec: $req_per_sec"
    
    PERFORMANCE_METRICS["nginx_success_rate"]=$success_rate
    PERFORMANCE_METRICS["nginx_req_per_sec"]=$req_per_sec
    
    if [ $success_rate -ge $MIN_SUCCESS_RATE ]; then
        log_success "Nginx passed load test (${success_rate}% success rate)"
        LOAD_TEST_RESULTS["nginx"]="PASS"
        return 0
    else
        log_error "Nginx failed load test (${success_rate}% success rate < ${MIN_SUCCESS_RATE}%)"
        LOAD_TEST_RESULTS["nginx"]="FAIL"
        return 1
    fi
}

# Function to test indexer API under load
test_indexer_load() {
    local indexer=$1
    local port=$2
    local endpoint=${3:-/health}
    
    log_header "Testing $indexer Under Load"
    
    if ! check_service_availability "$indexer" "$port" "$endpoint"; then
        log_warning "$indexer is not available"
        LOAD_TEST_RESULTS["$indexer"]="SKIP"
        return 1
    fi
    
    local output_file="/tmp/load-${indexer}.txt"
    > "$output_file"
    > "${output_file}.status"
    
    local result=$(run_concurrent_requests "http://localhost:${port}${endpoint}" $CONCURRENT_REQUESTS "$output_file")
    
    local duration=$(echo "$result" | cut -d: -f1)
    local success_count=$(echo "$result" | cut -d: -f2)
    local error_count=$(echo "$result" | cut -d: -f3)
    local success_rate=$(echo "$result" | cut -d: -f4)
    local req_per_sec=$(echo "$result" | cut -d: -f5)
    
    log_info "$indexer load test results:"
    log_info "  Duration: ${duration}s"
    log_info "  Successful requests: $success_count"
    log_info "  Failed requests: $error_count"
    log_info "  Success rate: ${success_rate}%"
    log_info "  Requests/sec: $req_per_sec"
    
    PERFORMANCE_METRICS["${indexer}_success_rate"]=$success_rate
    PERFORMANCE_METRICS["${indexer}_req_per_sec"]=$req_per_sec
    
    if [ $success_rate -ge $MIN_SUCCESS_RATE ]; then
        log_success "$indexer passed load test (${success_rate}% success rate)"
        LOAD_TEST_RESULTS["$indexer"]="PASS"
        return 0
    else
        log_warning "$indexer had issues under load (${success_rate}% success rate)"
        LOAD_TEST_RESULTS["$indexer"]="WARN"
        return 1
    fi
}

# Function to test database performance
test_database_performance() {
    log_header "Testing Database Performance"
    
    if ! docker ps | grep -q "indexer-db.*Up"; then
        log_warning "Indexer database is not running"
        LOAD_TEST_RESULTS["database"]="SKIP"
        return 1
    fi
    
    log_info "Testing database connection pool..."
    
    # Test concurrent connections
    local start_time=$(date +%s.%N)
    for i in {1..20}; do
        {
            docker compose exec -T indexer-db pg_isready -U indexer > /dev/null 2>&1
        } &
    done
    wait
    local end_time=$(date +%s.%N)
    local duration=$(echo "$end_time - $start_time" | bc)
    
    log_info "Database handled 20 concurrent connections in ${duration}s"
    
    if (( $(echo "$duration < 5" | bc -l) )); then
        log_success "Database performance is good"
        LOAD_TEST_RESULTS["database"]="PASS"
        return 0
    else
        log_warning "Database performance may need optimization"
        LOAD_TEST_RESULTS["database"]="WARN"
        return 1
    fi
}

# Function to test resource usage under load
test_resource_usage() {
    log_header "Testing Resource Usage Under Load"
    
    log_info "Monitoring resource usage during load test..."
    
    # Start resource monitoring
    local stats_file="/tmp/resource-stats.txt"
    > "$stats_file"
    
    # Monitor for 30 seconds
    for i in {1..6}; do
        docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" >> "$stats_file"
        sleep 5
    done
    
    log_info "Resource usage statistics saved to $stats_file"
    
    # Show summary
    log_info "Resource usage summary:"
    cat "$stats_file" | tail -10
    
    log_success "Resource monitoring completed"
    return 0
}

# Function to test sustained load
test_sustained_load() {
    log_header "Testing Sustained Load"
    
    if ! check_service_availability "dashboard" "8080" "/"; then
        log_error "Dashboard is not available"
        return 1
    fi
    
    log_info "Running sustained load test for ${DURATION}s..."
    
    local output_file="/tmp/sustained-load.txt"
    > "$output_file"
    
    local start_time=$(date +%s)
    local end_time=$((start_time + DURATION))
    local request_count=0
    local error_count=0
    
    while [ $(date +%s) -lt $end_time ]; do
        if curl -s -f http://localhost:8080/ > /dev/null 2>&1; then
            ((request_count++))
        else
            ((error_count++))
        fi
        sleep 0.1
    done
    
    local actual_duration=$(($(date +%s) - start_time))
    local success_rate=$((request_count * 100 / (request_count + error_count)))
    local req_per_sec=$((request_count / actual_duration))
    
    log_info "Sustained load test results:"
    log_info "  Duration: ${actual_duration}s"
    log_info "  Total requests: $request_count"
    log_info "  Failed requests: $error_count"
    log_info "  Success rate: ${success_rate}%"
    log_info "  Average requests/sec: $req_per_sec"
    
    if [ $success_rate -ge $MIN_SUCCESS_RATE ]; then
        log_success "System handled sustained load successfully"
        return 0
    else
        log_error "System struggled under sustained load"
        return 1
    fi
}

# Function to test spike load
test_spike_load() {
    log_header "Testing Spike Load"
    
    if ! check_service_availability "dashboard" "8080" "/"; then
        log_error "Dashboard is not available"
        return 1
    fi
    
    log_info "Testing system response to traffic spike..."
    
    # Normal load
    log_info "Phase 1: Normal load (10 requests)..."
    run_concurrent_requests "http://localhost:8080/" 10 "/tmp/spike-normal.txt" > /dev/null
    sleep 2
    
    # Spike
    log_info "Phase 2: Traffic spike (100 requests)..."
    local spike_result=$(run_concurrent_requests "http://localhost:8080/" 100 "/tmp/spike-high.txt")
    local spike_success_rate=$(echo "$spike_result" | cut -d: -f4)
    sleep 2
    
    # Recovery
    log_info "Phase 3: Recovery (10 requests)..."
    local recovery_result=$(run_concurrent_requests "http://localhost:8080/" 10 "/tmp/spike-recovery.txt")
    local recovery_success_rate=$(echo "$recovery_result" | cut -d: -f4)
    
    log_info "Spike test results:"
    log_info "  Spike success rate: ${spike_success_rate}%"
    log_info "  Recovery success rate: ${recovery_success_rate}%"
    
    if [ $spike_success_rate -ge 80 ] && [ $recovery_success_rate -ge 95 ]; then
        log_success "System handled traffic spike and recovered well"
        return 0
    else
        log_warning "System may struggle with traffic spikes"
        return 1
    fi
}

# Function to show performance results
show_performance_results() {
    log_header "Performance Test Results"
    
    echo ""
    echo "Load Test Results:"
    echo "=================="
    for service in "${!LOAD_TEST_RESULTS[@]}"; do
        result=${LOAD_TEST_RESULTS[$service]}
        case $result in
            PASS)
                echo -e "  ${GREEN}✅${NC} $service: PASSED"
                ;;
            FAIL)
                echo -e "  ${RED}❌${NC} $service: FAILED"
                ;;
            WARN)
                echo -e "  ${YELLOW}⚠️${NC} $service: WARNING"
                ;;
            SKIP)
                echo -e "  ${BLUE}⏭️${NC} $service: SKIPPED"
                ;;
        esac
    done
    
    echo ""
    echo "Performance Metrics:"
    echo "==================="
    for metric in "${!PERFORMANCE_METRICS[@]}"; do
        value=${PERFORMANCE_METRICS[$metric]}
        echo "  $metric: $value"
    done
    
    echo ""
    
    # Calculate pass rate
    local total_tests=${#LOAD_TEST_RESULTS[@]}
    local passed_tests=0
    local failed_tests=0
    
    for service in "${!LOAD_TEST_RESULTS[@]}"; do
        result=${LOAD_TEST_RESULTS[$service]}
        if [ "$result" = "PASS" ]; then
            ((passed_tests++))
        elif [ "$result" = "FAIL" ]; then
            ((failed_tests++))
        fi
    done
    
    echo "Summary:"
    echo "========"
    echo "  Total Tests: $total_tests"
    echo "  Passed: $passed_tests"
    echo "  Failed: $failed_tests"
    
    if [ $failed_tests -eq 0 ]; then
        log_success "All performance tests passed! 🎉"
        return 0
    else
        log_error "$failed_tests test(s) failed"
        return 1
    fi
}

# Cleanup functions
cleanup_test_files() {
    log_info "Cleaning up test files..."
    rm -f /tmp/load-*.txt /tmp/load-*.txt.status
    rm -f /tmp/spike-*.txt /tmp/spike-*.txt.status
    rm -f /tmp/sustained-load.txt
    rm -f /tmp/resource-stats.txt
    log_success "Cleanup completed"
}

cleanup_on_exit() {
    local exit_code=$?
    if [ "$ENABLE_CLEANUP" = true ]; then
        cleanup_test_files
    fi
    exit $exit_code
}

# Function to show usage
show_usage() {
    echo "Performance and Load Testing Script"
    echo
    echo "Usage: $0 [OPTIONS]"
    echo
    echo "Options:"
    echo "  -h, --help            Show this help message"
    echo "  --concurrent N        Number of concurrent requests (default: 50)"
    echo "  --duration N          Duration for sustained load test in seconds (default: 60)"
    echo "  --service SERVICE     Test specific service only"
    echo "  --skip-sustained      Skip sustained load test"
    echo "  --skip-spike          Skip spike load test"
    echo "  --no-cleanup          Skip cleanup on exit"
    echo
    echo "Examples:"
    echo "  $0                    # Run all load tests"
    echo "  $0 --concurrent 100   # Test with 100 concurrent requests"
    echo "  $0 --service dashboard # Test dashboard only"
    echo
}

# Parse command line arguments
SPECIFIC_SERVICE=""
SKIP_SUSTAINED=false
SKIP_SPIKE=false
ENABLE_CLEANUP=true

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_usage
            exit 0
            ;;
        --concurrent)
            CONCURRENT_REQUESTS=$2
            shift 2
            ;;
        --duration)
            DURATION=$2
            shift 2
            ;;
        --service)
            SPECIFIC_SERVICE=$2
            shift 2
            ;;
        --skip-sustained)
            SKIP_SUSTAINED=true
            shift
            ;;
        --skip-spike)
            SKIP_SPIKE=true
            shift
            ;;
        --no-cleanup)
            ENABLE_CLEANUP=false
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Main execution
main() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║         Kaspa All-in-One Performance Testing Suite          ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    
    # Check prerequisites
    if ! command -v docker &> /dev/null || ! docker compose version &> /dev/null; then
        log_error "Docker and Docker Compose are required"
        exit 1
    fi
    
    if ! command -v bc &> /dev/null; then
        log_error "bc (calculator) is required for performance calculations"
        exit 1
    fi
    
    if [ ! -f "docker-compose.yml" ]; then
        log_error "docker-compose.yml not found. Run from project root."
        exit 1
    fi
    
    # Setup cleanup trap
    if [ "$ENABLE_CLEANUP" = true ]; then
        trap cleanup_on_exit EXIT INT TERM
    fi
    
    log_info "Performance test configuration:"
    log_info "  Concurrent requests: $CONCURRENT_REQUESTS"
    log_info "  Sustained load duration: ${DURATION}s"
    log_info "  Min success rate: ${MIN_SUCCESS_RATE}%"
    echo ""
    
    # Run tests
    if [ -n "$SPECIFIC_SERVICE" ]; then
        log_info "Testing specific service: $SPECIFIC_SERVICE"
        case $SPECIFIC_SERVICE in
            dashboard)
                test_dashboard_load
                ;;
            nginx)
                test_nginx_load
                ;;
            kasia-indexer)
                test_indexer_load "kasia-indexer" "3002" "/swagger-ui/"
                ;;
            k-indexer)
                test_indexer_load "k-indexer" "3004" "/health"
                ;;
            simply-kaspa-indexer)
                test_indexer_load "simply-kaspa-indexer" "3005" "/health"
                ;;
            database)
                test_database_performance
                ;;
            *)
                log_error "Unknown service: $SPECIFIC_SERVICE"
                exit 1
                ;;
        esac
    else
        log_info "Running comprehensive performance tests..."
        
        test_dashboard_load || log_warning "Dashboard load test had issues"
        test_nginx_load || log_warning "Nginx load test had issues"
        test_indexer_load "kasia-indexer" "3002" "/swagger-ui/" || log_warning "Kasia indexer load test had issues"
        test_indexer_load "k-indexer" "3004" "/health" || log_warning "K-indexer load test had issues"
        test_indexer_load "simply-kaspa-indexer" "3005" "/health" || log_warning "Simply Kaspa indexer load test had issues"
        test_database_performance || log_warning "Database performance test had issues"
        
        test_resource_usage || log_warning "Resource usage test had issues"
        
        if [ "$SKIP_SUSTAINED" != true ]; then
            test_sustained_load || log_warning "Sustained load test had issues"
        fi
        
        if [ "$SKIP_SPIKE" != true ]; then
            test_spike_load || log_warning "Spike load test had issues"
        fi
    fi
    
    # Show results
    show_performance_results
}

# Run main function
main
