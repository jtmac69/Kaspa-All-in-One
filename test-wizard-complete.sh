#!/bin/bash

# Comprehensive Wizard Integration Test
# Tests wizard Docker service, API endpoints, and integration with main system

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
WIZARD_PORT=${WIZARD_PORT:-3000}
WIZARD_URL="http://localhost:$WIZARD_PORT"
TEST_RESULTS=()
FAILED_TESTS=0
PASSED_TESTS=0

# Print functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_test() {
    echo -e "${YELLOW}TEST:${NC} $1"
}

print_pass() {
    echo -e "${GREEN}✓ PASS:${NC} $1"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    TEST_RESULTS+=("PASS: $1")
}

print_fail() {
    echo -e "${RED}✗ FAIL:${NC} $1"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    TEST_RESULTS+=("FAIL: $1")
}

print_info() {
    echo -e "${BLUE}ℹ INFO:${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠ WARNING:${NC} $1"
}

# Cleanup function
cleanup() {
    print_header "Cleanup"
    print_info "Stopping wizard service..."
    docker-compose --profile wizard down wizard 2>/dev/null || true
    print_info "Cleanup complete"
}

# Set trap for cleanup
trap cleanup EXIT

# Test 1: Check wizard service definition
test_docker_compose_config() {
    print_header "Test 1: Docker Compose Configuration"
    
    print_test "Checking if wizard service is defined in docker-compose.yml"
    if grep -q "wizard:" docker-compose.yml; then
        print_pass "Wizard service found in docker-compose.yml"
    else
        print_fail "Wizard service not found in docker-compose.yml"
        return 1
    fi
    
    print_test "Checking wizard profile configuration"
    if grep -A20 "wizard:" docker-compose.yml | grep -q "profiles:" && \
       grep -A20 "wizard:" docker-compose.yml | grep -q "- wizard"; then
        print_pass "Wizard profile configured correctly"
    else
        print_fail "Wizard profile not configured"
        return 1
    fi
    
    print_test "Checking wizard port configuration"
    if grep -A20 "wizard:" docker-compose.yml | grep -q "WIZARD_PORT"; then
        print_pass "Wizard port environment variable configured"
    else
        print_fail "Wizard port not configured"
        return 1
    fi
    
    print_test "Checking Docker socket mount"
    if grep -A20 "wizard:" docker-compose.yml | grep -q "/var/run/docker.sock"; then
        print_pass "Docker socket mounted for container management"
    else
        print_fail "Docker socket not mounted"
        return 1
    fi
}

# Test 2: Check Dockerfile
test_dockerfile() {
    print_header "Test 2: Dockerfile Configuration"
    
    print_test "Checking if Dockerfile exists"
    if [[ -f "services/wizard/Dockerfile" ]]; then
        print_pass "Dockerfile found"
    else
        print_fail "Dockerfile not found"
        return 1
    fi
    
    print_test "Checking for Docker CLI installation"
    if grep -q "docker-cli" services/wizard/Dockerfile; then
        print_pass "Docker CLI included in image"
    else
        print_fail "Docker CLI not included"
        return 1
    fi
    
    print_test "Checking for health check"
    if grep -q "HEALTHCHECK" services/wizard/Dockerfile; then
        print_pass "Health check configured"
    else
        print_warning "Health check not configured"
    fi
    
    print_test "Checking for frontend files copy"
    if grep -q "frontend/public" services/wizard/Dockerfile; then
        print_pass "Frontend files included in image"
    else
        print_fail "Frontend files not included"
        return 1
    fi
}

# Test 3: Check wizard management script
test_wizard_script() {
    print_header "Test 3: Wizard Management Script"
    
    print_test "Checking if wizard.sh exists"
    if [[ -f "scripts/wizard.sh" ]]; then
        print_pass "wizard.sh found"
    else
        print_fail "wizard.sh not found"
        return 1
    fi
    
    print_test "Checking if wizard.sh is executable"
    if [[ -x "scripts/wizard.sh" ]]; then
        print_pass "wizard.sh is executable"
    else
        print_fail "wizard.sh is not executable"
        return 1
    fi
    
    print_test "Checking wizard.sh commands"
    local commands=("start" "reconfigure" "stop" "status" "logs")
    for cmd in "${commands[@]}"; do
        if grep -q "^[[:space:]]*$cmd)" scripts/wizard.sh; then
            print_pass "Command '$cmd' implemented"
        else
            print_fail "Command '$cmd' not found"
        fi
    done
}

# Test 4: Build wizard image
test_build_wizard() {
    print_header "Test 4: Build Wizard Image"
    
    print_test "Building wizard Docker image"
    if docker-compose --profile wizard build wizard 2>&1 | tee /tmp/wizard-build.log; then
        print_pass "Wizard image built successfully"
    else
        print_fail "Failed to build wizard image"
        print_info "Build log:"
        cat /tmp/wizard-build.log | tail -20
        return 1
    fi
    
    print_test "Checking if image was created"
    if docker images | grep -q "wizard"; then
        print_pass "Wizard image exists"
    else
        print_fail "Wizard image not found"
        return 1
    fi
}

# Test 5: Start wizard service
test_start_wizard() {
    print_header "Test 5: Start Wizard Service"
    
    print_test "Starting wizard service"
    if docker-compose --profile wizard up -d wizard; then
        print_pass "Wizard service started"
    else
        print_fail "Failed to start wizard service"
        return 1
    fi
    
    print_test "Waiting for wizard to be ready"
    local max_attempts=30
    local attempt=0
    while [[ $attempt -lt $max_attempts ]]; do
        if curl -s -f "$WIZARD_URL/api/health" > /dev/null 2>&1; then
            print_pass "Wizard is responding (attempt $((attempt + 1)))"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 1
    done
    
    print_fail "Wizard did not become ready within $max_attempts seconds"
    print_info "Container logs:"
    docker logs kaspa-wizard 2>&1 | tail -20
    return 1
}

# Test 6: Test API endpoints
test_api_endpoints() {
    print_header "Test 6: API Endpoints"
    
    print_test "Testing /api/health endpoint"
    local response=$(curl -s "$WIZARD_URL/api/health")
    if echo "$response" | grep -q "ok"; then
        print_pass "Health endpoint responding correctly"
    else
        print_fail "Health endpoint not responding correctly"
    fi
    
    print_test "Testing /api/system-check endpoint"
    if curl -s -f "$WIZARD_URL/api/system-check" > /dev/null 2>&1; then
        print_pass "System check endpoint accessible"
    else
        print_warning "System check endpoint not accessible"
    fi
    
    print_test "Testing /api/profiles endpoint"
    if curl -s -f "$WIZARD_URL/api/profiles" > /dev/null 2>&1; then
        print_pass "Profiles endpoint accessible"
    else
        print_warning "Profiles endpoint not accessible"
    fi
    
    print_test "Testing /api/config/password endpoint"
    local password=$(curl -s "$WIZARD_URL/api/config/password" | grep -o '"password":"[^"]*"' | cut -d'"' -f4)
    if [[ -n "$password" && ${#password} -ge 16 ]]; then
        print_pass "Password generation endpoint working (length: ${#password})"
    else
        print_warning "Password generation endpoint not working correctly"
    fi
}

# Test 7: Test frontend serving
test_frontend_serving() {
    print_header "Test 7: Frontend Serving"
    
    print_test "Testing root URL"
    if curl -s -f "$WIZARD_URL/" > /dev/null 2>&1; then
        print_pass "Frontend root accessible"
    else
        print_fail "Frontend root not accessible"
        return 1
    fi
    
    print_test "Testing CSS file"
    if curl -s -f "$WIZARD_URL/styles/wizard.css" > /dev/null 2>&1; then
        print_pass "CSS file accessible"
    else
        print_fail "CSS file not accessible"
    fi
    
    print_test "Testing JavaScript file"
    if curl -s -f "$WIZARD_URL/scripts/wizard.js" > /dev/null 2>&1; then
        print_pass "JavaScript file accessible"
    else
        print_fail "JavaScript file not accessible"
    fi
    
    print_test "Checking for Socket.IO client"
    local html=$(curl -s "$WIZARD_URL/")
    if echo "$html" | grep -q "socket.io"; then
        print_pass "Socket.IO client included"
    else
        print_fail "Socket.IO client not included"
    fi
}

# Test 8: Test Docker socket access
test_docker_access() {
    print_header "Test 8: Docker Socket Access"
    
    print_test "Checking if wizard can access Docker"
    if docker exec kaspa-wizard docker ps > /dev/null 2>&1; then
        print_pass "Wizard can access Docker socket"
    else
        print_fail "Wizard cannot access Docker socket"
        return 1
    fi
    
    print_test "Checking if wizard can list images"
    if docker exec kaspa-wizard docker images > /dev/null 2>&1; then
        print_pass "Wizard can list Docker images"
    else
        print_fail "Wizard cannot list Docker images"
    fi
}

# Test 9: Test wizard script commands
test_wizard_commands() {
    print_header "Test 9: Wizard Script Commands"
    
    print_test "Testing wizard.sh status command"
    if ./scripts/wizard.sh status > /dev/null 2>&1; then
        print_pass "Status command works"
    else
        print_fail "Status command failed"
    fi
    
    print_test "Testing wizard.sh stop command"
    if ./scripts/wizard.sh stop > /dev/null 2>&1; then
        print_pass "Stop command works"
    else
        print_fail "Stop command failed"
    fi
    
    print_test "Verifying wizard stopped"
    sleep 2
    if ! docker ps | grep -q "kaspa-wizard"; then
        print_pass "Wizard stopped successfully"
    else
        print_fail "Wizard still running after stop"
    fi
}

# Test 10: Test reconfiguration mode
test_reconfigure_mode() {
    print_header "Test 10: Reconfiguration Mode"
    
    # Create a dummy .env file
    print_test "Creating test .env file"
    echo "# Test configuration" > .env.test
    mv .env .env.backup 2>/dev/null || true
    mv .env.test .env
    
    print_test "Starting wizard in reconfigure mode"
    export WIZARD_MODE="reconfigure"
    if docker-compose --profile wizard up -d wizard; then
        print_pass "Wizard started in reconfigure mode"
    else
        print_fail "Failed to start wizard in reconfigure mode"
        mv .env.backup .env 2>/dev/null || true
        return 1
    fi
    
    # Wait for wizard
    sleep 5
    
    print_test "Checking wizard mode"
    if docker exec kaspa-wizard env | grep -q "WIZARD_MODE=reconfigure"; then
        print_pass "Wizard mode set correctly"
    else
        print_warning "Wizard mode not set correctly"
    fi
    
    # Cleanup
    docker-compose --profile wizard down wizard
    mv .env.backup .env 2>/dev/null || rm .env
}

# Generate summary report
generate_summary() {
    print_header "Test Summary"
    
    local total_tests=$((PASSED_TESTS + FAILED_TESTS))
    
    echo -e "Total Tests: $total_tests"
    echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
    echo -e "${RED}Failed: $FAILED_TESTS${NC}"
    
    if [[ $FAILED_TESTS -eq 0 ]]; then
        echo -e "\n${GREEN}✓ All tests passed!${NC}"
        echo -e "\n${BLUE}Wizard Integration Complete${NC}"
        echo -e "The wizard is ready for use:"
        echo -e "  - Start: ${YELLOW}./scripts/wizard.sh start${NC}"
        echo -e "  - Reconfigure: ${YELLOW}./scripts/wizard.sh reconfigure${NC}"
        echo -e "  - Status: ${YELLOW}./scripts/wizard.sh status${NC}"
        echo -e "  - Stop: ${YELLOW}./scripts/wizard.sh stop${NC}"
        return 0
    else
        echo -e "\n${RED}✗ Some tests failed${NC}"
        echo -e "\n${YELLOW}Failed Tests:${NC}"
        for result in "${TEST_RESULTS[@]}"; do
            if [[ $result == FAIL* ]]; then
                echo -e "  - ${result#FAIL: }"
            fi
        done
        return 1
    fi
}

# Main execution
main() {
    print_header "Kaspa Wizard Integration Test Suite"
    print_info "Testing wizard Docker service and integration"
    
    # Run tests
    test_docker_compose_config || true
    test_dockerfile || true
    test_wizard_script || true
    test_build_wizard || true
    test_start_wizard || true
    test_api_endpoints || true
    test_frontend_serving || true
    test_docker_access || true
    test_wizard_commands || true
    test_reconfigure_mode || true
    
    # Generate summary
    generate_summary
}

# Run main function
main
