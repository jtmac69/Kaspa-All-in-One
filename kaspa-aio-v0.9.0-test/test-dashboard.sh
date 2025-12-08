#!/bin/bash

# Kaspa Dashboard Testing Suite
# Comprehensive testing for dashboard API endpoints, service management, and UI features

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
DASHBOARD_PORT=${DASHBOARD_PORT:-8080}
KASPA_NODE_PORT=${KASPA_NODE_RPC_PORT:-16111}
KASPA_NODE_MODE=${KASPA_NODE_MODE:-local}
REMOTE_KASPA_NODE_URL=${REMOTE_KASPA_NODE_URL:-}
TIMEOUT=10
TEST_RESULTS=()
SKIP_SYNC_TESTS=false
WAIT_FOR_SYNC=false
MAX_SYNC_WAIT_MINUTES=5
USE_REMOTE_NODE=false

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

# Test Docker availability
test_docker() {
    header "Testing Docker Availability"
    
    if ! docker info &> /dev/null; then
        add_test_result "Docker Availability" "FAIL" "Docker is not running or not accessible"
        exit 1
    fi
    
    add_test_result "Docker Availability" "PASS" "Docker is running"
}

# Start required services
start_services() {
    header "Starting Required Services"
    
    # Check if using remote node
    if [ "$KASPA_NODE_MODE" = "remote" ] || [ -n "$REMOTE_KASPA_NODE_URL" ]; then
        log "Using REMOTE Kaspa node: ${REMOTE_KASPA_NODE_URL:-configured in environment}"
        USE_REMOTE_NODE=true
        STARTED_NODE=false
        NODE_ALREADY_READY=true
        
        # Test remote node connectivity
        local test_url="${REMOTE_KASPA_NODE_URL:-https://api.kaspa.org}"
        if curl -s -m 10 -X POST -H "Content-Type: application/json" \
           -d '{"method":"ping","params":{}}' \
           "$test_url" > /dev/null 2>&1; then
            success "Remote Kaspa node is accessible: $test_url"
            add_test_result "Kaspa Node Startup" "PASS" "Using remote node"
        else
            warn "Could not reach remote node: $test_url"
            add_test_result "Kaspa Node Startup" "WARN" "Remote node may be unreachable"
        fi
    # Check if node is already running locally - if so, DON'T touch it!
    elif docker ps --format "{{.Names}}" | grep -q "^kaspa-node$"; then
        log "Local Kaspa node is already running - will use existing instance"
        STARTED_NODE=false  # We didn't start it, so we won't stop it
        USE_REMOTE_NODE=false
        
        # Check if it's responsive
        if curl -s -m 5 -X POST -H "Content-Type: application/json" \
           -d '{"method":"ping","params":{}}' \
           http://localhost:$KASPA_NODE_PORT > /dev/null 2>&1; then
            success "Local Kaspa node is responsive and ready to use"
            add_test_result "Kaspa Node Startup" "PASS" "Using existing local node"
            # Skip the wait loop entirely since node is already responsive
            NODE_ALREADY_READY=true
        else
            warn "Local Kaspa node container is running but RPC not yet responsive"
            log "Will wait for RPC to become available (node may be starting up)..."
            NODE_ALREADY_READY=false
        fi
    else
        log "Local Kaspa node not running - starting it now..."
        docker compose up -d kaspa-node
        STARTED_NODE=true  # We started it, so we'll stop it on cleanup
        USE_REMOTE_NODE=false
        NODE_ALREADY_READY=false
    fi
    
    # Only wait if node is not already responsive and not using remote
    if [ "$NODE_ALREADY_READY" != "true" ] && [ "$USE_REMOTE_NODE" != "true" ]; then
        
        log "Waiting for Kaspa node to be ready (this can take 2-3 minutes)..."
        local max_attempts=30  # Increased from 20 to 30 (5 minutes total)
        local attempt=1
        
        while [ $attempt -le $max_attempts ]; do
            # Check if container is running first
            if ! docker ps --format "{{.Names}}" | grep -q "^kaspa-node$"; then
                error "Kaspa node container is not running!"
                log "Checking container logs..."
                docker logs kaspa-node --tail 20 2>&1 || true
                add_test_result "Kaspa Node Startup" "FAIL" "Container not running"
                return 1
            fi
            
            if curl -s -m 5 -X POST -H "Content-Type: application/json" \
               -d '{"method":"ping","params":{}}' \
               http://localhost:$KASPA_NODE_PORT > /dev/null 2>&1; then
                add_test_result "Kaspa Node Startup" "PASS" "Kaspa node is ready"
                break
            fi
            
            log "Attempt $attempt/$max_attempts: Waiting for Kaspa node RPC..."
            sleep 10
            ((attempt++))
        done
        
        if [ $attempt -gt $max_attempts ]; then
            warn "Kaspa node RPC not responding after $((max_attempts * 10)) seconds"
            log "Checking container status and logs..."
            docker ps --filter "name=kaspa-node" --format "table {{.Names}}\t{{.Status}}"
            docker logs kaspa-node --tail 30 2>&1 || true
            add_test_result "Kaspa Node Startup" "FAIL" "RPC not responding (may still be initializing)"
            return 1
        fi
    fi
    
    # Check node sync status (don't fail if not synced)
    check_node_sync_status || true
    
    # Check if dashboard is already running
    if docker ps --format "{{.Names}}" | grep -q "^kaspa-dashboard$"; then
        log "Dashboard is already running"
        STARTED_DASHBOARD=false  # We didn't start it
    else
        log "Starting dashboard..."
        docker compose up -d dashboard
        STARTED_DASHBOARD=true  # We started it
        log "Waiting for dashboard to start..."
        sleep 10
    fi
}

# Check Kaspa node sync status
check_node_sync_status() {
    log "Checking Kaspa node sync status..."
    
    local info_response=$(curl -s -m 10 -X POST -H "Content-Type: application/json" \
        -d '{"method":"getInfo","params":{}}' \
        http://localhost:$KASPA_NODE_PORT 2>&1)
    
    if [ $? -eq 0 ]; then
        local is_synced=$(echo "$info_response" | jq -r '.isSynced // .result.isSynced // false' 2>/dev/null)
        
        if [ "$is_synced" = "true" ]; then
            success "Kaspa node is fully synced!"
            add_test_result "Node Sync Status" "PASS" "Node is fully synced"
            return 0
        else
            warn "Kaspa node is NOT fully synced yet"
            warn "This is normal for a new node - initial sync can take several hours"
            
            # Get sync progress if available
            local block_count=$(echo "$info_response" | jq -r '.virtualSelectedParentBlueScore // .result.virtualSelectedParentBlueScore // "unknown"' 2>/dev/null)
            log "Current block height: $block_count"
            
            if [ "$WAIT_FOR_SYNC" = "true" ]; then
                warn "Waiting for node to sync (max $MAX_SYNC_WAIT_MINUTES minutes)..."
                wait_for_node_sync || true
            else
                warn "Node is syncing - some dashboard features may return limited data"
                warn "Use --wait-for-sync to wait for sync completion (can take hours)"
                add_test_result "Node Sync Status" "WARN" "Node is syncing (use --wait-for-sync or --skip-sync-tests)"
                
                if [ "$SKIP_SYNC_TESTS" = "false" ]; then
                    warn "Tests will continue but may show warnings for sync-dependent features"
                    warn "Use --skip-sync-tests to skip tests that require a synced node"
                fi
            fi
            return 1
        fi
    else
        warn "Could not determine node sync status"
        add_test_result "Node Sync Status" "WARN" "Could not determine sync status"
        return 1
    fi
}

# Wait for node to sync (with timeout)
wait_for_node_sync() {
    local max_wait_seconds=$((MAX_SYNC_WAIT_MINUTES * 60))
    local elapsed=0
    local check_interval=30
    
    log "Waiting for Kaspa node to sync (timeout: $MAX_SYNC_WAIT_MINUTES minutes)..."
    log "Note: Initial sync can take several hours. This will timeout and continue with tests."
    
    while [ $elapsed -lt $max_wait_seconds ]; do
        local info_response=$(curl -s -m 10 -X POST -H "Content-Type: application/json" \
            -d '{"method":"getInfo","params":{}}' \
            http://localhost:$KASPA_NODE_PORT 2>&1)
        
        if [ $? -eq 0 ]; then
            local is_synced=$(echo "$info_response" | jq -r '.isSynced // .result.isSynced // false' 2>/dev/null)
            
            if [ "$is_synced" = "true" ]; then
                success "Node is now synced!"
                add_test_result "Node Sync Wait" "PASS" "Node synced after ${elapsed}s"
                return 0
            fi
            
            local block_count=$(echo "$info_response" | jq -r '.virtualSelectedParentBlueScore // .result.virtualSelectedParentBlueScore // "unknown"' 2>/dev/null)
            log "Still syncing... Current block: $block_count (${elapsed}s elapsed)"
        fi
        
        sleep $check_interval
        elapsed=$((elapsed + check_interval))
    done
    
    warn "Sync wait timeout reached ($MAX_SYNC_WAIT_MINUTES minutes)"
    warn "Node is still syncing - continuing with tests anyway"
    add_test_result "Node Sync Wait" "WARN" "Timeout reached, node still syncing"
    return 1
}

# Test dashboard health endpoint
test_health_endpoint() {
    header "Testing Dashboard Health Endpoint"
    
    log "Testing /health endpoint..."
    local response=$(curl -s -m $TIMEOUT http://localhost:$DASHBOARD_PORT/health 2>&1)
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        # Check if response contains expected fields
        if echo "$response" | jq -e '.status' > /dev/null 2>&1; then
            local status=$(echo "$response" | jq -r '.status')
            if [ "$status" = "healthy" ]; then
                add_test_result "Health Endpoint" "PASS" "Dashboard is healthy"
                return 0
            else
                add_test_result "Health Endpoint" "FAIL" "Dashboard status is not healthy: $status"
                return 1
            fi
        else
            add_test_result "Health Endpoint" "FAIL" "Invalid health response format"
            return 1
        fi
    else
        add_test_result "Health Endpoint" "FAIL" "Health endpoint not accessible"
        return 1
    fi
}

# Test service status endpoint
test_service_status_endpoint() {
    header "Testing Service Status Endpoint"
    
    log "Testing /api/status endpoint..."
    local response=$(curl -s -m $TIMEOUT http://localhost:$DASHBOARD_PORT/api/status 2>&1)
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        # Check if response is valid JSON array
        if echo "$response" | jq -e 'type == "array"' > /dev/null 2>&1; then
            local service_count=$(echo "$response" | jq 'length')
            add_test_result "Service Status Endpoint" "PASS" "Retrieved status for $service_count services"
            
            # Validate service structure
            log "Validating service status structure..."
            local has_name=$(echo "$response" | jq -e '.[0].name' > /dev/null 2>&1 && echo "yes" || echo "no")
            local has_status=$(echo "$response" | jq -e '.[0].status' > /dev/null 2>&1 && echo "yes" || echo "no")
            local has_url=$(echo "$response" | jq -e '.[0].url' > /dev/null 2>&1 && echo "yes" || echo "no")
            
            if [ "$has_name" = "yes" ] && [ "$has_status" = "yes" ] && [ "$has_url" = "yes" ]; then
                add_test_result "Service Status Structure" "PASS" "Service objects have required fields"
            else
                add_test_result "Service Status Structure" "FAIL" "Service objects missing required fields"
            fi
            
            return 0
        else
            add_test_result "Service Status Endpoint" "FAIL" "Invalid response format (expected JSON array)"
            return 1
        fi
    else
        add_test_result "Service Status Endpoint" "FAIL" "Status endpoint not accessible"
        return 1
    fi
}

# Test Kaspa info endpoint
test_kaspa_info_endpoint() {
    if [ "$SKIP_SYNC_TESTS" = "true" ]; then
        add_test_result "Kaspa Info Endpoint" "SKIP" "Skipped (requires synced node)"
        return 0
    fi
    
    header "Testing Kaspa Info Endpoint"
    
    log "Testing /api/kaspa/info endpoint..."
    local response=$(curl -s -m $TIMEOUT http://localhost:$DASHBOARD_PORT/api/kaspa/info 2>&1)
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        # Check if response contains Kaspa node info
        if echo "$response" | jq -e '.serverVersion' > /dev/null 2>&1 || \
           echo "$response" | jq -e '.result' > /dev/null 2>&1; then
            add_test_result "Kaspa Info Endpoint" "PASS" "Successfully retrieved Kaspa node info"
            
            # Display some info
            log "Kaspa node information:"
            echo "$response" | jq '.' 2>/dev/null | head -10
            
            # Check sync status in response
            local is_synced=$(echo "$response" | jq -r '.isSynced // .result.isSynced // false' 2>/dev/null)
            if [ "$is_synced" != "true" ]; then
                warn "Note: Node is still syncing - data may be incomplete"
            fi
            
            return 0
        else
            add_test_result "Kaspa Info Endpoint" "WARN" "Unexpected response format"
            return 0
        fi
    else
        add_test_result "Kaspa Info Endpoint" "FAIL" "Kaspa info endpoint not accessible"
        return 1
    fi
}

# Test Kaspa stats endpoint
test_kaspa_stats_endpoint() {
    if [ "$SKIP_SYNC_TESTS" = "true" ]; then
        add_test_result "Kaspa Stats Endpoint" "SKIP" "Skipped (requires synced node)"
        return 0
    fi
    
    header "Testing Kaspa Stats Endpoint"
    
    log "Testing /api/kaspa/stats endpoint..."
    local response=$(curl -s -m $TIMEOUT http://localhost:$DASHBOARD_PORT/api/kaspa/stats 2>&1)
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        # Check if response contains stats
        if echo "$response" | jq -e '.blockDag' > /dev/null 2>&1 || \
           echo "$response" | jq -e '.network' > /dev/null 2>&1; then
            add_test_result "Kaspa Stats Endpoint" "PASS" "Successfully retrieved Kaspa stats"
            
            # Display some stats
            log "Kaspa network statistics:"
            echo "$response" | jq '.' 2>/dev/null | head -15
            
            warn "Note: Stats reflect current sync state - may be incomplete if node is syncing"
            
            return 0
        else
            add_test_result "Kaspa Stats Endpoint" "WARN" "Unexpected response format"
            return 0
        fi
    else
        add_test_result "Kaspa Stats Endpoint" "FAIL" "Kaspa stats endpoint not accessible"
        return 1
    fi
}

# Test dashboard UI accessibility
test_dashboard_ui() {
    header "Testing Dashboard UI Accessibility"
    
    log "Testing dashboard root endpoint..."
    local response=$(curl -s -m $TIMEOUT http://localhost:$DASHBOARD_PORT/ 2>&1)
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        # Check if response contains HTML
        if echo "$response" | grep -q "<html" || echo "$response" | grep -q "<!DOCTYPE"; then
            add_test_result "Dashboard UI" "PASS" "Dashboard UI is accessible"
            
            # Check for key UI elements
            log "Checking for key UI elements..."
            local has_title=$(echo "$response" | grep -q "Kaspa" && echo "yes" || echo "no")
            local has_script=$(echo "$response" | grep -q "<script" && echo "yes" || echo "no")
            local has_style=$(echo "$response" | grep -q "<style\|<link.*css" && echo "yes" || echo "no")
            
            if [ "$has_title" = "yes" ] && [ "$has_script" = "yes" ] && [ "$has_style" = "yes" ]; then
                add_test_result "Dashboard UI Elements" "PASS" "UI contains expected elements"
            else
                add_test_result "Dashboard UI Elements" "WARN" "Some UI elements may be missing"
            fi
            
            return 0
        else
            add_test_result "Dashboard UI" "FAIL" "Response is not valid HTML"
            return 1
        fi
    else
        add_test_result "Dashboard UI" "FAIL" "Dashboard UI not accessible"
        return 1
    fi
}

# Test static assets
test_static_assets() {
    header "Testing Static Assets"
    
    log "Testing JavaScript assets..."
    local js_response=$(curl -s -m $TIMEOUT http://localhost:$DASHBOARD_PORT/script.js 2>&1)
    if [ $? -eq 0 ] && echo "$js_response" | grep -q "function\|class\|const"; then
        add_test_result "JavaScript Assets" "PASS" "JavaScript files are accessible"
    else
        add_test_result "JavaScript Assets" "FAIL" "JavaScript files not accessible"
    fi
    
    log "Testing CSS assets..."
    local css_response=$(curl -s -m $TIMEOUT http://localhost:$DASHBOARD_PORT/styles.css 2>&1)
    if [ $? -eq 0 ] && echo "$css_response" | grep -q "{.*}"; then
        add_test_result "CSS Assets" "PASS" "CSS files are accessible"
    else
        add_test_result "CSS Assets" "FAIL" "CSS files not accessible"
    fi
}

# Test error handling
test_error_handling() {
    header "Testing Error Handling"
    
    log "Testing invalid endpoint..."
    local response=$(curl -s -w "\n%{http_code}" -m $TIMEOUT http://localhost:$DASHBOARD_PORT/api/invalid-endpoint 2>&1)
    local http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" = "404" ]; then
        add_test_result "Error Handling - 404" "PASS" "Returns 404 for invalid endpoints"
    else
        add_test_result "Error Handling - 404" "WARN" "Unexpected status code: $http_code"
    fi
}

# Test CORS headers
test_cors_headers() {
    header "Testing CORS Headers"
    
    log "Testing CORS headers on API endpoints..."
    local headers=$(curl -s -I -m $TIMEOUT http://localhost:$DASHBOARD_PORT/api/status 2>&1)
    
    if echo "$headers" | grep -qi "access-control-allow-origin"; then
        add_test_result "CORS Headers" "PASS" "CORS headers are present"
    else
        add_test_result "CORS Headers" "WARN" "CORS headers not found (may be intentional)"
    fi
}

# Test response times
test_response_times() {
    header "Testing Response Times"
    
    local endpoints=(
        "/health"
        "/api/status"
        "/api/kaspa/info"
    )
    
    for endpoint in "${endpoints[@]}"; do
        log "Testing response time for $endpoint..."
        local start_time=$(date +%s%N)
        curl -s -m $TIMEOUT http://localhost:$DASHBOARD_PORT$endpoint > /dev/null 2>&1
        local end_time=$(date +%s%N)
        local duration=$(( (end_time - start_time) / 1000000 ))
        
        if [ $duration -lt 1000 ]; then
            add_test_result "Response Time $endpoint" "PASS" "${duration}ms (excellent)"
        elif [ $duration -lt 3000 ]; then
            add_test_result "Response Time $endpoint" "PASS" "${duration}ms (good)"
        else
            add_test_result "Response Time $endpoint" "WARN" "${duration}ms (slow)"
        fi
    done
}

# Test profile-aware service visibility
test_profile_awareness() {
    header "Testing Profile-Aware Service Visibility"
    
    log "Checking which profiles are active..."
    local active_services=$(docker compose ps --format json | jq -r '.[].Service' 2>/dev/null || docker compose ps --format "{{.Service}}")
    
    log "Active services: $active_services"
    
    # Get service status from dashboard
    local dashboard_services=$(curl -s -m $TIMEOUT http://localhost:$DASHBOARD_PORT/api/status 2>&1)
    
    if [ $? -eq 0 ]; then
        local dashboard_service_count=$(echo "$dashboard_services" | jq 'length' 2>/dev/null || echo "0")
        add_test_result "Profile Awareness" "PASS" "Dashboard reports $dashboard_service_count services"
        
        # Check if dashboard shows appropriate services
        log "Services reported by dashboard:"
        echo "$dashboard_services" | jq -r '.[].name' 2>/dev/null || echo "Could not parse service names"
    else
        add_test_result "Profile Awareness" "FAIL" "Could not retrieve service list"
    fi
}

# Test concurrent requests
test_concurrent_requests() {
    header "Testing Concurrent Request Handling"
    
    log "Sending 10 concurrent requests to /api/status..."
    local success_count=0
    local fail_count=0
    
    for i in {1..10}; do
        curl -s -m $TIMEOUT http://localhost:$DASHBOARD_PORT/api/status > /dev/null 2>&1 &
    done
    
    wait
    
    # Verify dashboard is still responsive
    if curl -s -m $TIMEOUT http://localhost:$DASHBOARD_PORT/health > /dev/null 2>&1; then
        add_test_result "Concurrent Requests" "PASS" "Dashboard handles concurrent requests"
    else
        add_test_result "Concurrent Requests" "FAIL" "Dashboard unresponsive after concurrent requests"
    fi
}

# Test dashboard logs
test_dashboard_logs() {
    header "Testing Dashboard Logs"
    
    log "Checking dashboard container logs..."
    local logs=$(docker logs kaspa-dashboard --tail 50 2>&1)
    
    if [ -n "$logs" ]; then
        add_test_result "Dashboard Logs" "PASS" "Dashboard logs are accessible"
        
        # Check for errors in logs
        if echo "$logs" | grep -qi "error\|exception\|fatal"; then
            warn "Found potential errors in logs:"
            echo "$logs" | grep -i "error\|exception\|fatal" | tail -5
            add_test_result "Dashboard Log Errors" "WARN" "Errors found in dashboard logs"
        else
            add_test_result "Dashboard Log Errors" "PASS" "No errors in recent logs"
        fi
    else
        add_test_result "Dashboard Logs" "WARN" "No logs available"
    fi
}

# Test dashboard resource usage
test_resource_usage() {
    header "Testing Dashboard Resource Usage"
    
    log "Checking dashboard resource usage..."
    local stats=$(docker stats kaspa-dashboard --no-stream --format "{{.CPUPerc}}|{{.MemUsage}}" 2>/dev/null)
    
    if [ -n "$stats" ]; then
        local cpu=$(echo "$stats" | cut -d'|' -f1)
        local mem=$(echo "$stats" | cut -d'|' -f2)
        
        add_test_result "Resource Usage" "PASS" "CPU: $cpu, Memory: $mem"
        
        # Check if resource usage is reasonable
        local cpu_num=$(echo "$cpu" | sed 's/%//')
        if (( $(echo "$cpu_num < 50" | bc -l 2>/dev/null || echo "1") )); then
            add_test_result "CPU Usage" "PASS" "CPU usage is reasonable ($cpu)"
        else
            add_test_result "CPU Usage" "WARN" "High CPU usage ($cpu)"
        fi
    else
        add_test_result "Resource Usage" "WARN" "Could not retrieve resource stats"
    fi
}

# Test dashboard container health
test_container_health() {
    header "Testing Dashboard Container Health"
    
    log "Checking dashboard container status..."
    local container_status=$(docker inspect kaspa-dashboard --format='{{.State.Status}}' 2>/dev/null)
    
    if [ "$container_status" = "running" ]; then
        add_test_result "Container Status" "PASS" "Dashboard container is running"
        
        # Check restart count
        local restart_count=$(docker inspect kaspa-dashboard --format='{{.RestartCount}}' 2>/dev/null)
        if [ "$restart_count" = "0" ]; then
            add_test_result "Container Stability" "PASS" "No restarts detected"
        else
            add_test_result "Container Stability" "WARN" "Container has restarted $restart_count times"
        fi
    else
        add_test_result "Container Status" "FAIL" "Dashboard container is not running: $container_status"
    fi
}

# Test network connectivity
test_network_connectivity() {
    header "Testing Network Connectivity"
    
    log "Testing dashboard to Kaspa node connectivity..."
    if docker exec kaspa-dashboard curl -s -m 5 -X POST -H "Content-Type: application/json" \
       -d '{"method":"ping","params":{}}' \
       http://kaspa-node:16111 > /dev/null 2>&1; then
        add_test_result "Network Connectivity" "PASS" "Dashboard can reach Kaspa node"
    else
        add_test_result "Network Connectivity" "FAIL" "Dashboard cannot reach Kaspa node"
    fi
}

# Display test summary
display_test_summary() {
    header "Test Summary"
    
    local total_tests=${#TEST_RESULTS[@]}
    local passed=0
    local failed=0
    local warnings=0
    local skipped=0
    
    for result in "${TEST_RESULTS[@]}"; do
        local status=$(echo "$result" | cut -d'|' -f2)
        case "$status" in
            "PASS") ((passed++)) ;;
            "FAIL") ((failed++)) ;;
            "WARN") ((warnings++)) ;;
            "SKIP") ((skipped++)) ;;
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
    echo -e "${CYAN}║${NC} Skipped:        ${BLUE}$skipped${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    if [ $failed -eq 0 ]; then
        success "All critical tests passed! ✓"
        if [ $skipped -gt 0 ]; then
            warn "Note: $skipped tests were skipped (likely due to node sync status)"
            warn "Run without --skip-sync-tests once node is fully synced for complete testing"
        fi
        return 0
    else
        error "Some tests failed. Please review the results above."
        return 1
    fi
}

# Show recommendations
show_recommendations() {
    header "Recommendations"
    
    echo "Dashboard Configuration:"
    echo "  • DASHBOARD_PORT: Port for dashboard access (default: 8080)"
    echo "  • KASPA_NODE_URL: Internal Kaspa node URL for API calls"
    echo "  • REMOTE_KASPA_NODE_URL: Optional external node URL"
    echo ""
    
    echo "Performance Optimization:"
    echo "  • Monitor dashboard response times regularly"
    echo "  • Check container resource usage during peak loads"
    echo "  • Review logs for errors and warnings"
    echo "  • Consider caching for frequently accessed data"
    echo ""
    
    echo "Security Considerations:"
    echo "  • Use reverse proxy (nginx) for production deployments"
    echo "  • Enable HTTPS with valid SSL certificates"
    echo "  • Implement rate limiting for API endpoints"
    echo "  • Restrict dashboard access to trusted networks"
    echo ""
    
    echo "Monitoring:"
    echo "  • Dashboard UI: http://localhost:$DASHBOARD_PORT"
    echo "  • Health Check: http://localhost:$DASHBOARD_PORT/health"
    echo "  • Service Status: http://localhost:$DASHBOARD_PORT/api/status"
    echo "  • Container Logs: docker logs kaspa-dashboard"
    echo ""
    
    echo "Node Sync Information:"
    echo "  • Initial sync can take several hours (depends on network speed)"
    echo "  • Dashboard will work during sync but show incomplete data"
    echo "  • Use --skip-sync-tests to skip tests requiring synced node"
    echo "  • Use --wait-for-sync to wait briefly for sync (with timeout)"
    echo "  • Monitor sync: docker logs kaspa-node --follow"
    echo ""
}

# Main test execution
main() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║           Kaspa Dashboard Testing Suite                     ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    
    if [ "$SKIP_SYNC_TESTS" = "true" ]; then
        warn "Sync-dependent tests will be skipped"
    fi
    
    if [ "$WAIT_FOR_SYNC" = "true" ]; then
        warn "Will wait up to $MAX_SYNC_WAIT_MINUTES minutes for node sync"
    fi
    
    echo ""
    
    test_docker
    
    # Start services - if this fails, we can't continue
    if ! start_services; then
        error "Failed to start required services"
        error "Cannot continue with dashboard tests"
        display_test_summary
        return 1
    fi
    
    # Core API endpoint tests
    test_health_endpoint || true
    test_service_status_endpoint || true
    test_kaspa_info_endpoint || true
    test_kaspa_stats_endpoint || true
    
    # UI and asset tests
    test_dashboard_ui || true
    test_static_assets || true
    
    # Functionality tests
    test_error_handling || true
    test_cors_headers || true
    test_response_times || true
    test_profile_awareness || true
    test_concurrent_requests || true
    
    # Infrastructure tests
    test_dashboard_logs || true
    test_resource_usage || true
    test_container_health || true
    test_network_connectivity || true
    
    # Display results
    display_test_summary
    local test_exit_code=$?
    
    show_recommendations
    
    return $test_exit_code
}

# Track which services we started
STARTED_NODE=false
STARTED_DASHBOARD=false
NODE_ALREADY_READY=false

# Cleanup functions
cleanup_containers() {
    local cleanup_level=${1:-basic}
    
    log "Cleaning up containers..."
    
    # Stop and remove test containers
    local test_containers=("kaspa-dashboard-test" "kaspa-node-test")
    for container in "${test_containers[@]}"; do
        if docker ps -a --format "{{.Names}}" | grep -q "^${container}$"; then
            log "Removing test container: $container"
            docker stop "$container" 2>/dev/null || true
            docker rm "$container" 2>/dev/null || true
        fi
    done
    
    # Only stop services that WE started
    log "Stopping services started by test..."
    if [ "$STARTED_DASHBOARD" = true ]; then
        log "Stopping dashboard (started by test)..."
        docker compose stop dashboard 2>/dev/null || true
    fi
    
    if [ "$STARTED_NODE" = true ]; then
        log "Stopping kaspa-node (started by test)..."
        docker compose stop kaspa-node 2>/dev/null || true
    fi
    
    if [ "$STARTED_NODE" = false ] && [ "$STARTED_DASHBOARD" = false ]; then
        log "No services to stop (all were already running)"
    fi
    
    if [ "$cleanup_level" = "full" ]; then
        log "Performing full cleanup..."
        
        # Remove volumes (optional - preserves data by default)
        if [ "$CLEANUP_VOLUMES" = "true" ]; then
            warn "Removing data volumes..."
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
        --skip-sync-tests)
            SKIP_SYNC_TESTS=true
            shift
            ;;
        --wait-for-sync)
            WAIT_FOR_SYNC=true
            shift
            ;;
        --sync-wait-minutes)
            MAX_SYNC_WAIT_MINUTES="$2"
            shift 2
            ;;
        --use-remote-node)
            USE_REMOTE_NODE=true
            KASPA_NODE_MODE=remote
            if [ -n "$2" ] && [ "${2:0:1}" != "-" ]; then
                REMOTE_KASPA_NODE_URL="$2"
                shift 2
            else
                REMOTE_KASPA_NODE_URL="${REMOTE_KASPA_NODE_URL:-https://api.kaspa.org}"
                shift
            fi
            ;;
        --use-local-node)
            USE_REMOTE_NODE=false
            KASPA_NODE_MODE=local
            shift
            ;;
        -h|--help)
            echo "Kaspa Dashboard Testing Suite"
            echo
            echo "Usage: $0 [OPTIONS]"
            echo
            echo "Test Options:"
            echo "  -h, --help                Show this help message"
            echo "  --skip-sync-tests         Skip tests that require a fully synced node"
            echo "  --wait-for-sync           Wait for node to sync before running tests (with timeout)"
            echo "  --sync-wait-minutes N     Max minutes to wait for sync (default: 5)"
            echo
            echo "Node Options:"
            echo "  --use-remote-node [URL]   Use a remote Kaspa node (default: https://api.kaspa.org)"
            echo "  --use-local-node          Use local Kaspa node container"
            echo
            echo "Note: Remote node is recommended for systems with <8GB RAM."
            echo "      Local node sync can take several hours and requires significant memory."
            echo "      Use --skip-sync-tests for immediate testing of dashboard functionality."
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
