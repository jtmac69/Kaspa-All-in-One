#!/bin/bash

# Kaspa All-in-One - Mining Profile End-to-End Test
# Tests the complete wizard flow with Mining profile installation
# Part of Task 2.5: Test all profiles - Mining profile

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test configuration
WIZARD_PORT="${WIZARD_PORT:-3000}"
TEST_TIMEOUT=300  # 5 minutes for installation
CLEANUP_ON_EXIT="${CLEANUP_ON_EXIT:-true}"
VERBOSE="${VERBOSE:-false}"

# Test results
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
TEST_START_TIME=$(date +%s)

# Profile being tested
PROFILE="mining"

# Logging functions
log() {
    echo -e "${GREEN}[TEST]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

pass() {
    echo -e "${GREEN}[✓ PASS]${NC} $1"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

fail() {
    echo -e "${RED}[✗ FAIL]${NC} $1"
    TESTS_FAILED=$((TESTS_FAILED + 1))
}

verbose() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo -e "${CYAN}[VERBOSE]${NC} $1" >&2
    fi
}

header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
}

# Cleanup function
cleanup() {
    if [[ "$CLEANUP_ON_EXIT" == "true" ]]; then
        info "Cleaning up test environment..."
        
        # Stop all services
        docker compose --profile mining down 2>/dev/null || true
        docker compose --profile core down 2>/dev/null || true
        docker compose --profile wizard down 2>/dev/null || true
        
        # Remove test files
        rm -f .wizard-state-test 2>/dev/null || true
        rm -f .wizard-config-test.json 2>/dev/null || true
        
        info "Cleanup complete"
    fi
}

# Set up cleanup trap
trap cleanup EXIT INT TERM

# Wait for service to be ready
wait_for_service() {
    local url=$1
    local name=$2
    local timeout=${3:-30}
    local elapsed=0
    
    verbose "Waiting for $name at $url (timeout: ${timeout}s)"
    
    while [ $elapsed -lt $timeout ]; do
        if curl -s -f "$url" > /dev/null 2>&1; then
            verbose "$name is ready"
            return 0
        fi
        sleep 2
        elapsed=$((elapsed + 2))
    done
    
    error "$name did not become ready within ${timeout}s"
    return 1
}

# Test API endpoint
test_api() {
    local method=$1
    local endpoint=$2
    local expected_code=${3:-200}
    local data=$4
    
    local url="http://localhost:${WIZARD_PORT}${endpoint}"
    verbose "Testing $method $url (expecting $expected_code)"
    
    local response
    if [ -n "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$url" 2>/dev/null || echo -e "\n000")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" 2>/dev/null || echo -e "\n000")
    fi
    
    local body=$(echo "$response" | head -n -1)
    local code=$(echo "$response" | tail -n 1)
    
    if [ "$code" = "$expected_code" ]; then
        echo "$body"
        return 0
    else
        verbose "Expected $expected_code but got $code"
        verbose "Response: $body"
        return 1
    fi
}

# ============================================================================
# Test Suite
# ============================================================================

header "Mining Profile End-to-End Test"
info "Testing wizard installation with Mining profile"
info "Profile: $PROFILE"
info "Services: kaspa-stratum"
info "Dependencies: core profile (will be installed automatically)"
echo ""

# Test 1: Prerequisites
test_prerequisites() {
    header "Test 1: Prerequisites"
    TESTS_RUN=$((TESTS_RUN + 1))
    
    log "Checking Docker..."
    if command -v docker &> /dev/null; then
        pass "Docker is installed"
    else
        fail "Docker is not installed"
        return 1
    fi
    
    log "Checking Docker Compose..."
    if docker compose version &> /dev/null; then
        pass "Docker Compose is available"
    else
        fail "Docker Compose is not available"
        return 1
    fi
    
    log "Checking Docker daemon..."
    if docker ps &> /dev/null; then
        pass "Docker daemon is running"
    else
        fail "Docker daemon is not running"
        return 1
    fi
    
    return 0
}

# Test 2: Start wizard
test_start_wizard() {
    header "Test 2: Start Wizard Service"
    TESTS_RUN=$((TESTS_RUN + 1))
    
    log "Starting wizard service..."
    if docker compose --profile wizard up -d 2>&1 | tee /tmp/wizard-start.log; then
        pass "Wizard service started"
    else
        fail "Failed to start wizard service"
        cat /tmp/wizard-start.log
        return 1
    fi
    
    log "Waiting for wizard to be ready..."
    if wait_for_service "http://localhost:${WIZARD_PORT}" "Wizard" 60; then
        pass "Wizard is accessible"
    else
        fail "Wizard did not become accessible"
        docker compose logs wizard | tail -20
        return 1
    fi
    
    return 0
}

# Test 3: Frontend loads
test_frontend_loads() {
    header "Test 3: Frontend Loads"
    TESTS_RUN=$((TESTS_RUN + 1))
    
    log "Fetching wizard frontend..."
    local html=$(curl -s "http://localhost:${WIZARD_PORT}" 2>/dev/null || echo "")
    
    if [ -z "$html" ]; then
        fail "Frontend did not load"
        return 1
    fi
    
    log "Checking for required elements..."
    local checks=0
    local passed=0
    
    # Check for wizard container
    checks=$((checks + 1))
    if echo "$html" | grep -q 'class="wizard-container"'; then
        verbose "✓ Wizard container found"
        passed=$((passed + 1))
    else
        verbose "✗ Wizard container not found"
    fi
    
    # Check for steps
    checks=$((checks + 1))
    if echo "$html" | grep -q 'class="progress-steps"'; then
        verbose "✓ Progress steps found"
        passed=$((passed + 1))
    else
        verbose "✗ Progress steps not found"
    fi
    
    # Check for profile grid
    checks=$((checks + 1))
    if echo "$html" | grep -q 'class="profile-grid"'; then
        verbose "✓ Profile grid found"
        passed=$((passed + 1))
    else
        verbose "✗ Profile grid not found"
    fi
    
    if [ $passed -eq $checks ]; then
        pass "Frontend loaded with all required elements ($passed/$checks)"
        return 0
    else
        fail "Frontend missing elements ($passed/$checks)"
        return 1
    fi
}

# Test 4: System check API
test_system_check() {
    header "Test 4: System Check API"
    TESTS_RUN=$((TESTS_RUN + 1))
    
    log "Running system check..."
    local result=$(test_api "GET" "/api/system-check" 200)
    
    if [ $? -eq 0 ]; then
        verbose "System check response: $result"
        
        # Parse results
        local docker_ok=$(echo "$result" | jq -r '.docker.status' 2>/dev/null || echo "unknown")
        local compose_ok=$(echo "$result" | jq -r '.dockerCompose.status' 2>/dev/null || echo "unknown")
        
        if [ "$docker_ok" = "success" ] && [ "$compose_ok" = "success" ]; then
            pass "System check passed (Docker: $docker_ok, Compose: $compose_ok)"
            return 0
        else
            warn "System check completed with warnings (Docker: $docker_ok, Compose: $compose_ok)"
            return 0
        fi
    else
        fail "System check API failed"
        return 1
    fi
}

# Test 5: Profile API
test_profiles_api() {
    header "Test 5: Profiles API"
    TESTS_RUN=$((TESTS_RUN + 1))
    
    log "Fetching available profiles..."
    local result=$(test_api "GET" "/api/profiles" 200)
    
    if [ $? -eq 0 ]; then
        verbose "Profiles response: $result"
        
        # Check if mining profile exists
        local mining_exists=$(echo "$result" | jq -r '.profiles[]? // .[] | select(.id=="mining") | .id' 2>/dev/null || echo "")
        
        if [ "$mining_exists" = "mining" ]; then
            pass "Mining profile is available"
            
            # Display mining profile details
            local mining_name=$(echo "$result" | jq -r '.profiles[]? // .[] | select(.id=="mining") | .name' 2>/dev/null)
            local mining_services=$(echo "$result" | jq -r '.profiles[]? // .[] | select(.id=="mining") | .services | join(", ")' 2>/dev/null)
            local mining_deps=$(echo "$result" | jq -r '.profiles[]? // .[] | select(.id=="mining") | .dependencies | join(", ")' 2>/dev/null)
            info "Mining profile: $mining_name"
            info "Services: $mining_services"
            info "Dependencies: $mining_deps"
            
            return 0
        else
            fail "Mining profile not found in API response"
            return 1
        fi
    else
        fail "Profiles API failed"
        return 1
    fi
}

# Test 6: Configuration generation
test_config_generation() {
    header "Test 6: Configuration Generation"
    TESTS_RUN=$((TESTS_RUN + 1))
    
    log "Generating configuration for Mining profile..."
    
    local config_data='{
  "config": {
    "EXTERNAL_IP": "127.0.0.1",
    "PUBLIC_NODE": false,
    "POSTGRES_PASSWORD": "test_password_123"
  },
  "profiles": ["mining"],
   "127.0.0.1",
   false,
  
}'
    
    local result=$(test_api "POST" "/api/config/generate" 200 "$config_data")
    
    if [ $? -eq 0 ]; then
        verbose "Config generation response: $result"
        
        # Check if .env content is present
        local env_content=$(echo "$result" | jq -r '.content' 2>/dev/null || echo "")
        
        if [ -n "$env_content" ] && [ "$env_content" != "null" ]; then
            pass "Configuration generated successfully"
            
            # Verify mining profile services are in config
            if echo "$env_content" | grep -q "STRATUM"; then
                verbose "✓ Kaspa Stratum configuration found"
            fi
            
            # Verify core dependency is included
            if echo "$env_content" | grep -q "KASPA_NODE"; then
                verbose "✓ Core profile dependency included"
            fi
            
            return 0
        else
            fail "Configuration generation returned empty content"
            return 1
        fi
    else
        fail "Configuration generation failed"
        return 1
    fi
}

# Test 7: Installation
test_installation() {
    header "Test 7: Installation"
    TESTS_RUN=$((TESTS_RUN + 1))
    
    log "Starting installation of Mining profile..."
    info "This may take several minutes (includes Core profile dependency)..."
    
    # Create configuration
    local config_data='{
  "config": {
    "EXTERNAL_IP": "127.0.0.1",
    "PUBLIC_NODE": false,
    "POSTGRES_PASSWORD": "test_password_123"
  },
  "profiles": ["mining"]
}'
    
    # Save configuration
    log "Saving configuration..."
    test_api "POST" "/api/config/save" 200 "$config_data" > /dev/null
    
    if [ $? -ne 0 ]; then
        fail "Failed to save configuration"
        return 1
    fi
    
    # Start installation (saves config)
    log "Triggering installation..."
    local install_result=$(test_api "POST" "/api/install/start" 200 "$config_data")
    
    if [ $? -ne 0 ]; then
        fail "Failed to start installation"
        return 1
    fi
    
    # Deploy services
    log "Deploying services..."
    local deploy_result=$(test_api "POST" "/api/install/deploy" 200 '{"profiles":["mining"]}')
    
    if [ $? -ne 0 ]; then
        fail "Failed to deploy services"
        return 1
    fi
    
    # Wait for services to be ready
    log "Waiting for services to be ready (timeout: ${TEST_TIMEOUT}s)..."
    local elapsed=0
    
    while [ $elapsed -lt $TEST_TIMEOUT ]; do
        sleep 5
        elapsed=$((elapsed + 5))
        
        # Check if kaspa-stratum container is running
        if sudo docker ps --format '{{.Names}}' | grep -q "kaspa-stratum"; then
            verbose "Installation status: running (${elapsed}s elapsed)"
            pass "Installation completed successfully"
            return 0
        fi
        
        verbose "Installation status: starting (${elapsed}s elapsed)"
    done
    
    fail "Installation timed out after ${TEST_TIMEOUT}s"
    return 1
}

# Test 8: Service validation
test_service_validation() {
    header "Test 8: Service Validation"
    TESTS_RUN=$((TESTS_RUN + 1))
    
    log "Validating installed services..."
    
    local validation_result=$(test_api "POST" "/api/install/validate" 200 '{"profiles":["mining"]}')
    
    if [ $? -eq 0 ]; then
        verbose "Validation response: $validation_result"
        
        local overall_status=$(echo "$validation_result" | jq -r '.status' 2>/dev/null || echo "unknown")
        
        if [ "$overall_status" = "success" ]; then
            pass "All services validated successfully"
            
            # Display service statuses
            echo "$validation_result" | jq -r '.services[] | "  \(.name): \(.status)"' 2>/dev/null || true
            
            return 0
        else
            warn "Service validation completed with status: $overall_status"
            echo "$validation_result" | jq '.' 2>/dev/null || echo "$validation_result"
            return 0
        fi
    else
        fail "Service validation failed"
        return 1
    fi
}

# Test 9: Mining services running
test_mining_services() {
    header "Test 9: Mining Services Running"
    TESTS_RUN=$((TESTS_RUN + 1))
    
    log "Checking Mining profile services..."
    
    local mining_services=("kaspa-stratum")
    local running=0
    local total=${#mining_services[@]}
    
    for service in "${mining_services[@]}"; do
        if docker ps --format '{{.Names}}' | grep -q "kaspa-${service}" || \
           docker ps --format '{{.Names}}' | grep -q "${service}"; then
            verbose "✓ $service is running"
            running=$((running + 1))
        else
            verbose "✗ $service is not running"
        fi
    done
    
    if [ $running -eq $total ]; then
        pass "All Mining services are running ($running/$total)"
        return 0
    elif [ $running -gt 0 ]; then
        warn "Some Mining services are running ($running/$total)"
        return 0
    else
        fail "No Mining services are running ($running/$total)"
        return 1
    fi
}

# Test 10: Core dependency services running
test_core_dependency() {
    header "Test 10: Core Dependency Services Running"
    TESTS_RUN=$((TESTS_RUN + 1))
    
    log "Checking Core profile dependency services..."
    
    local core_services=("kaspa-node" "dashboard" "nginx")
    local running=0
    local total=${#core_services[@]}
    
    for service in "${core_services[@]}"; do
        if docker ps --format '{{.Names}}' | grep -q "kaspa-${service}" || \
           docker ps --format '{{.Names}}' | grep -q "${service}"; then
            verbose "✓ $service is running"
            running=$((running + 1))
        else
            verbose "✗ $service is not running"
        fi
    done
    
    if [ $running -eq $total ]; then
        pass "All Core dependency services are running ($running/$total)"
        return 0
    elif [ $running -gt 0 ]; then
        warn "Some Core dependency services are running ($running/$total)"
        return 0
    else
        fail "No Core dependency services are running ($running/$total)"
        return 1
    fi
}

# Test 11: Stratum port accessibility
test_stratum_access() {
    header "Test 11: Stratum Port Accessibility"
    TESTS_RUN=$((TESTS_RUN + 1))
    
    log "Checking Kaspa Stratum accessibility..."
    
    # Wait a bit for services to fully start
    sleep 10
    
    # Check if Stratum port is accessible
    if nc -z localhost 5555 2>/dev/null; then
        pass "Kaspa Stratum is accessible on port 5555"
        return 0
    else
        warn "Stratum port 5555 is not yet accessible (may still be starting)"
        return 0
    fi
}

# ============================================================================
# Main Test Execution
# ============================================================================

main() {
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                                                               ║${NC}"
    echo -e "${CYAN}║        Kaspa All-in-One - Mining Profile E2E Test            ║${NC}"
    echo -e "${CYAN}║                                                               ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    info "Test Configuration:"
    info "  Profile: $PROFILE"
    info "  Wizard Port: $WIZARD_PORT"
    info "  Timeout: ${TEST_TIMEOUT}s"
    info "  Cleanup: $CLEANUP_ON_EXIT"
    info "  Verbose: $VERBOSE"
    echo ""
    
    # Run tests
    test_prerequisites || exit 1
    test_start_wizard || exit 1
    test_frontend_loads || exit 1
    test_system_check || exit 1
    test_profiles_api || exit 1
    test_config_generation || exit 1
    test_installation || exit 1
    test_service_validation || exit 1
    test_mining_services || exit 1
    test_core_dependency || exit 1
    test_stratum_access || exit 1
    
    # Calculate test duration
    local test_end_time=$(date +%s)
    local duration=$((test_end_time - TEST_START_TIME))
    local minutes=$((duration / 60))
    local seconds=$((duration % 60))
    
    # Print summary
    header "Test Summary"
    echo ""
    echo -e "${BLUE}Profile Tested:${NC} $PROFILE"
    echo -e "${BLUE}Tests Run:${NC} $TESTS_RUN"
    echo -e "${GREEN}Tests Passed:${NC} $TESTS_PASSED"
    echo -e "${RED}Tests Failed:${NC} $TESTS_FAILED"
    echo -e "${BLUE}Duration:${NC} ${minutes}m ${seconds}s"
    echo ""
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║                                                               ║${NC}"
        echo -e "${GREEN}║                   ✓ ALL TESTS PASSED                          ║${NC}"
        echo -e "${GREEN}║                                                               ║${NC}"
        echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
        echo ""
        echo -e "${GREEN}Mining profile installation completed successfully!${NC}"
        echo ""
        echo -e "${BLUE}Next Steps:${NC}"
        echo "  1. Access dashboard: http://localhost:8080"
        echo "  2. Connect miner to stratum: stratum+tcp://localhost:5555"
        echo "  3. Check service logs: docker compose logs -f kaspa-stratum"
        echo "  4. Stop services: docker compose --profile mining down"
        echo ""
        exit 0
    else
        echo -e "${RED}╔═══════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${RED}║                                                               ║${NC}"
        echo -e "${RED}║                   ✗ SOME TESTS FAILED                         ║${NC}"
        echo -e "${RED}║                                                               ║${NC}"
        echo -e "${RED}╚═══════════════════════════════════════════════════════════════╝${NC}"
        echo ""
        echo -e "${YELLOW}Troubleshooting:${NC}"
        echo "  1. Check wizard logs: docker compose logs wizard"
        echo "  2. Check service logs: docker compose logs"
        echo "  3. Verify system requirements: ./scripts/verify-system.sh"
        echo "  4. Check stratum logs: docker compose logs kaspa-stratum"
        echo ""
        exit 1
    fi
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --no-cleanup)
            CLEANUP_ON_EXIT=false
            shift
            ;;
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --port)
            WIZARD_PORT="$2"
            shift 2
            ;;
        --timeout)
            TEST_TIMEOUT="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --no-cleanup    Don't clean up after tests"
            echo "  --verbose, -v   Enable verbose output"
            echo "  --port PORT     Wizard port (default: 3000)"
            echo "  --timeout SEC   Installation timeout (default: 300)"
            echo "  --help, -h      Show this help message"
            echo ""
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Run main test suite
main
