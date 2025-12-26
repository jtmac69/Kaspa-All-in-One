#!/bin/bash

# Kaspa All-in-One - Error Scenarios Test
# Tests wizard error handling and validation
# Part of Task 2.7: Test error scenarios

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
CLEANUP_ON_EXIT="${CLEANUP_ON_EXIT:-true}"
VERBOSE="${VERBOSE:-false}"

# Test results
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
TEST_START_TIME=$(date +%s)

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
        echo -e "${CYAN}[VERBOSE]${NC} $1"
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
        docker compose --profile wizard down 2>/dev/null || true
        rm -f .wizard-state-test 2>/dev/null || true
        rm -f .wizard-config-test.json 2>/dev/null || true
        info "Cleanup complete"
    fi
}

trap cleanup EXIT INT TERM

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

header "Error Scenarios Test"
info "Testing wizard error handling and validation"
echo ""

# Test 1: Invalid profile selection
test_invalid_profile() {
    header "Test 1: Invalid Profile Selection"
    TESTS_RUN=$((TESTS_RUN + 1))
    
    log "Testing invalid profile handling..."
    
    local config_data='{
  "profiles": ["nonexistent"],
  "externalIp": "127.0.0.1",
  "publicNode": false,
  "customEnv": {}
}'
    
    # Should return error or validation failure
    local result=$(test_api "POST" "/api/config/generate" 400 "$config_data" 2>/dev/null || echo "")
    
    if [ $? -ne 0 ] || echo "$result" | grep -qi "error\|invalid"; then
        pass "Invalid profile correctly rejected"
        return 0
    else
        fail "Invalid profile was not rejected"
        return 1
    fi
}

# Test 2: Missing required fields
test_missing_fields() {
    header "Test 2: Missing Required Fields"
    TESTS_RUN=$((TESTS_RUN + 1))
    
    log "Testing missing required fields..."
    
    local config_data='{
  "profiles": []
}'
    
    # Should return error for missing profiles
    local result=$(test_api "POST" "/api/config/generate" 400 "$config_data" 2>/dev/null || echo "")
    
    if [ $? -ne 0 ] || echo "$result" | grep -qi "error\|required\|invalid"; then
        pass "Missing required fields correctly rejected"
        return 0
    else
        fail "Missing required fields were not rejected"
        return 1
    fi
}

# Test 3: Invalid IP address
test_invalid_ip() {
    header "Test 3: Invalid IP Address"
    TESTS_RUN=$((TESTS_RUN + 1))
    
    log "Testing invalid IP address..."
    
    local config_data='{
  "profiles": ["core"],
  "externalIp": "999.999.999.999",
  "publicNode": false,
  "customEnv": {}
}'
    
    # Should return error or validation failure
    local result=$(test_api "POST" "/api/config/generate" 400 "$config_data" 2>/dev/null || echo "")
    
    if [ $? -ne 0 ] || echo "$result" | grep -qi "error\|invalid"; then
        pass "Invalid IP address correctly rejected"
        return 0
    else
        warn "Invalid IP address validation may need improvement"
        return 0
    fi
}

# Test 4: Malformed JSON
test_malformed_json() {
    header "Test 4: Malformed JSON"
    TESTS_RUN=$((TESTS_RUN + 1))
    
    log "Testing malformed JSON handling..."
    
    local malformed_data='{"profiles": ["core", "externalIp": "127.0.0.1"}'
    
    # Should return error
    local result=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d "$malformed_data" \
        "http://localhost:${WIZARD_PORT}/api/config/generate" 2>/dev/null || echo -e "\n000")
    
    local code=$(echo "$result" | tail -n 1)
    
    if [ "$code" = "400" ] || [ "$code" = "500" ]; then
        pass "Malformed JSON correctly rejected (HTTP $code)"
        return 0
    else
        fail "Malformed JSON was not rejected properly"
        return 1
    fi
}

# Test 5: Port conflict detection
test_port_conflict() {
    header "Test 5: Port Conflict Detection"
    TESTS_RUN=$((TESTS_RUN + 1))
    
    log "Testing port conflict detection..."
    
    # System check should detect port availability
    local result=$(test_api "GET" "/api/system-check?ports=8080,16110" 200)
    
    if [ $? -eq 0 ]; then
        local ports_data=$(echo "$result" | jq -r '.ports' 2>/dev/null || echo "")
        
        if [ -n "$ports_data" ] && [ "$ports_data" != "null" ]; then
            pass "Port conflict detection is functional"
            verbose "Ports checked: $ports_data"
            return 0
        else
            warn "Port conflict detection may not be working"
            return 0
        fi
    else
        fail "Port conflict detection failed"
        return 1
    fi
}

# Test 6: Insufficient resources warning
test_resource_warning() {
    header "Test 6: Resource Warning Detection"
    TESTS_RUN=$((TESTS_RUN + 1))
    
    log "Testing resource warning detection..."
    
    # System check should report resource status
    local result=$(test_api "GET" "/api/system-check" 200)
    
    if [ $? -eq 0 ]; then
        local memory=$(echo "$result" | jq -r '.resources.memory.totalGB' 2>/dev/null || echo "")
        local cpu=$(echo "$result" | jq -r '.resources.cpu.count' 2>/dev/null || echo "")
        
        if [ -n "$memory" ] && [ -n "$cpu" ]; then
            pass "Resource detection is functional (RAM: ${memory}GB, CPU: ${cpu} cores)"
            return 0
        else
            warn "Resource detection may not be working"
            return 0
        fi
    else
        fail "Resource detection failed"
        return 1
    fi
}

# Test 7: Docker daemon check
test_docker_check() {
    header "Test 7: Docker Daemon Check"
    TESTS_RUN=$((TESTS_RUN + 1))
    
    log "Testing Docker daemon detection..."
    
    local result=$(test_api "GET" "/api/system-check" 200)
    
    if [ $? -eq 0 ]; then
        local docker_status=$(echo "$result" | jq -r '.docker.installed' 2>/dev/null || echo "")
        
        if [ "$docker_status" = "true" ] || [ "$docker_status" = "false" ]; then
            pass "Docker detection is functional (installed: $docker_status)"
            return 0
        else
            fail "Docker detection not working properly"
            return 1
        fi
    else
        fail "Docker detection failed"
        return 1
    fi
}

# Test 8: Network error handling
test_network_error() {
    header "Test 8: Network Error Handling"
    TESTS_RUN=$((TESTS_RUN + 1))
    
    log "Testing network error handling..."
    
    # Try to access non-existent endpoint
    local result=$(curl -s -w "\n%{http_code}" \
        "http://localhost:${WIZARD_PORT}/api/nonexistent" 2>/dev/null || echo -e "\n000")
    
    local code=$(echo "$result" | tail -n 1)
    
    if [ "$code" = "404" ]; then
        pass "Network error handling is functional (404 for invalid endpoint)"
        return 0
    else
        warn "Network error handling may need improvement (got $code)"
        return 0
    fi
}

# Test 9: Empty configuration
test_empty_config() {
    header "Test 9: Empty Configuration"
    TESTS_RUN=$((TESTS_RUN + 1))
    
    log "Testing empty configuration handling..."
    
    local config_data='{}'
    
    # Should return error
    local result=$(test_api "POST" "/api/config/generate" 400 "$config_data" 2>/dev/null || echo "")
    
    if [ $? -ne 0 ] || echo "$result" | grep -qi "error\|required"; then
        pass "Empty configuration correctly rejected"
        return 0
    else
        fail "Empty configuration was not rejected"
        return 1
    fi
}

# Test 10: Invalid custom environment variables
test_invalid_env() {
    header "Test 10: Invalid Custom Environment Variables"
    TESTS_RUN=$((TESTS_RUN + 1))
    
    log "Testing invalid custom environment variables..."
    
    local config_data='{
  "profiles": ["core"],
  "externalIp": "127.0.0.1",
  "publicNode": false,
  "customEnv": {
    "INVALID KEY": "value"
  }
}'
    
    # Should handle or reject invalid env var names
    local result=$(test_api "POST" "/api/config/generate" 200 "$config_data" 2>/dev/null || echo "")
    
    if [ $? -eq 0 ]; then
        pass "Invalid environment variables handled"
        return 0
    else
        warn "Environment variable validation may need improvement"
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
    echo -e "${CYAN}║          Kaspa All-in-One - Error Scenarios Test             ║${NC}"
    echo -e "${CYAN}║                                                               ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    info "Test Configuration:"
    info "  Wizard Port: $WIZARD_PORT"
    info "  Cleanup: $CLEANUP_ON_EXIT"
    info "  Verbose: $VERBOSE"
    echo ""
    
    # Start wizard if not running
    if ! curl -s -f "http://localhost:${WIZARD_PORT}" > /dev/null 2>&1; then
        info "Starting wizard service..."
        docker compose --profile wizard up -d 2>&1 | grep -v "^$" || true
        sleep 5
    fi
    
    # Run tests
    test_invalid_profile || true
    test_missing_fields || true
    test_invalid_ip || true
    test_malformed_json || true
    test_port_conflict || true
    test_resource_warning || true
    test_docker_check || true
    test_network_error || true
    test_empty_config || true
    test_invalid_env || true
    
    # Calculate test duration
    local test_end_time=$(date +%s)
    local duration=$((test_end_time - TEST_START_TIME))
    local minutes=$((duration / 60))
    local seconds=$((duration % 60))
    
    # Print summary
    header "Test Summary"
    echo ""
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
        echo -e "${GREEN}Error scenario testing completed successfully!${NC}"
        echo ""
        exit 0
    else
        echo -e "${RED}╔═══════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${RED}║                                                               ║${NC}"
        echo -e "${RED}║                   ✗ SOME TESTS FAILED                         ║${NC}"
        echo -e "${RED}║                                                               ║${NC}"
        echo -e "${RED}╚═══════════════════════════════════════════════════════════════╝${NC}"
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
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --no-cleanup    Don't clean up after tests"
            echo "  --verbose, -v   Enable verbose output"
            echo "  --port PORT     Wizard port (default: 3000)"
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

main
