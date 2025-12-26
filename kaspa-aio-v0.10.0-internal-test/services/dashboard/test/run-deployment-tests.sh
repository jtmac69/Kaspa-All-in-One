#!/bin/bash

# Comprehensive Deployment Test Runner for Kaspa Management Dashboard
# 
# This script runs all deployment-related tests including:
# - Unit tests for deployment logic
# - Integration tests for real deployment
# - Nginx configuration validation
# - Environment variable testing
# - Service recovery testing

# Note: Not using 'set -e' to allow graceful error handling

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DASHBOARD_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# Test categories
declare -A TEST_RESULTS

# Usage information
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo
    echo "Options:"
    echo "  --unit-only        Run only unit tests (no system changes)"
    echo "  --integration-only Run only integration tests (requires root)"
    echo "  --skip-integration Skip integration tests"
    echo "  --verbose          Enable verbose output"
    echo "  --help, -h         Show this help message"
    echo
    echo "Test Categories:"
    echo "  1. Unit Tests           - Mock-based deployment logic tests"
    echo "  2. Nginx Configuration  - Configuration validation tests"
    echo "  3. Environment Variables - Environment handling tests"
    echo "  4. Integration Tests    - Real deployment tests (requires root)"
    echo
    echo "Examples:"
    echo "  $0                     # Run all tests"
    echo "  $0 --unit-only         # Run only unit tests"
    echo "  sudo $0 --integration-only  # Run only integration tests"
    echo
}

# Check dependencies
check_dependencies() {
    log_info "Checking test dependencies..."
    
    local missing_deps=()
    
    # Check Node.js and npm
    if ! command -v node &> /dev/null; then
        missing_deps+=("node")
    fi
    
    if ! command -v npm &> /dev/null; then
        missing_deps+=("npm")
    fi
    
    # Check Jest (should be in node_modules)
    if [[ ! -f "$DASHBOARD_DIR/node_modules/.bin/jest" ]]; then
        log_warning "Jest not found in node_modules, attempting to install..."
        cd "$DASHBOARD_DIR"
        npm install
    fi
    
    # Check for integration test dependencies
    if [[ "$RUN_INTEGRATION" == "true" ]]; then
        if ! command -v systemctl &> /dev/null; then
            missing_deps+=("systemctl")
        fi
        
        if ! command -v curl &> /dev/null; then
            missing_deps+=("curl")
        fi
        
        if [[ $EUID -ne 0 ]]; then
            log_error "Integration tests require root privileges (use sudo)"
            exit 1
        fi
    fi
    
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        log_error "Missing dependencies: ${missing_deps[*]}"
        log_info "Please install the missing dependencies and try again"
        exit 1
    fi
    
    log_success "All dependencies available"
}

# Run unit tests
run_unit_tests() {
    log_info "Running unit tests..."
    
    cd "$DASHBOARD_DIR"
    
    local test_files=(
        "test/deployment.test.js"
        "test/nginx-configuration.test.js"
        "test/docker-availability.test.js"
    )
    
    local unit_passed=0
    local unit_failed=0
    
    for test_file in "${test_files[@]}"; do
        if [[ -f "$test_file" ]]; then
            log_info "Running $test_file..."
            
            if [[ "$VERBOSE" == "true" ]]; then
                npm test -- "$test_file" --verbose
            else
                npm test -- "$test_file" --silent
            fi
            
            if [[ $? -eq 0 ]]; then
                ((unit_passed++))
                log_success "✓ $test_file"
            else
                ((unit_failed++))
                log_error "✗ $test_file"
            fi
        else
            log_warning "Test file not found: $test_file"
            ((SKIPPED_TESTS++))
        fi
    done
    
    TEST_RESULTS["unit"]="$unit_passed/$((unit_passed + unit_failed))"
    ((TOTAL_TESTS += unit_passed + unit_failed))
    ((PASSED_TESTS += unit_passed))
    ((FAILED_TESTS += unit_failed))
    
    if [[ $unit_failed -eq 0 ]]; then
        log_success "All unit tests passed ($unit_passed/$unit_passed)"
    else
        log_error "$unit_failed unit test(s) failed"
    fi
}

# Run Nginx configuration tests
run_nginx_tests() {
    log_info "Running Nginx configuration validation..."
    
    local nginx_config="$PROJECT_ROOT/config/nginx.conf"
    
    if [[ ! -f "$nginx_config" ]]; then
        log_error "Nginx configuration file not found: $nginx_config"
        ((FAILED_TESTS++))
        ((TOTAL_TESTS++))
        TEST_RESULTS["nginx"]="0/1"
        return 1
    fi
    
    # Basic syntax validation
    local syntax_errors=0
    
    # Check for required blocks
    if ! grep -q "events {" "$nginx_config"; then
        log_error "Missing events block in nginx.conf"
        ((syntax_errors++))
    fi
    
    if ! grep -q "http {" "$nginx_config"; then
        log_error "Missing http block in nginx.conf"
        ((syntax_errors++))
    fi
    
    if ! grep -q "server {" "$nginx_config"; then
        log_error "Missing server block in nginx.conf"
        ((syntax_errors++))
    fi
    
    # Check that dashboard is NOT proxied
    if grep -q "proxy_pass.*localhost:8080" "$nginx_config" || \
       grep -q "proxy_pass.*kaspa-dashboard" "$nginx_config"; then
        log_error "Dashboard should not be proxied (runs directly on host)"
        ((syntax_errors++))
    fi
    
    # Check that wizard is NOT proxied
    if grep -q "proxy_pass.*localhost:3000" "$nginx_config" || \
       grep -q "proxy_pass.*kaspa-wizard" "$nginx_config"; then
        log_error "Wizard should not be proxied (runs directly on host)"
        ((syntax_errors++))
    fi
    
    # Check for service selection page
    if ! grep -q "Kaspa All-in-One Services" "$nginx_config"; then
        log_error "Missing service selection page"
        ((syntax_errors++))
    fi
    
    # Check for Kaspa application proxies
    if ! grep -q "location /kasia/" "$nginx_config"; then
        log_error "Missing Kasia application proxy"
        ((syntax_errors++))
    fi
    
    if ! grep -q "location /social/" "$nginx_config"; then
        log_error "Missing K-Social application proxy"
        ((syntax_errors++))
    fi
    
    # Advanced nginx syntax check (if nginx is available)
    if command -v nginx &> /dev/null; then
        log_info "Testing nginx configuration syntax..."
        if nginx -t -c "$nginx_config" 2>/dev/null; then
            log_success "Nginx configuration syntax is valid"
        else
            log_error "Nginx configuration has syntax errors"
            ((syntax_errors++))
        fi
    else
        log_warning "nginx command not available, skipping syntax check"
    fi
    
    ((TOTAL_TESTS++))
    if [[ $syntax_errors -eq 0 ]]; then
        ((PASSED_TESTS++))
        TEST_RESULTS["nginx"]="1/1"
        log_success "Nginx configuration validation passed"
    else
        ((FAILED_TESTS++))
        TEST_RESULTS["nginx"]="0/1"
        log_error "Nginx configuration validation failed ($syntax_errors errors)"
    fi
}

# Run environment variable tests
run_environment_tests() {
    log_info "Running environment variable tests..."
    
    local env_template="$DASHBOARD_DIR/.env.template"
    local env_errors=0
    
    if [[ ! -f "$env_template" ]]; then
        log_error "Environment template not found: $env_template"
        ((env_errors++))
    else
        # Check for required variables in template
        local required_vars=("NODE_ENV" "PORT" "KASPA_NODE_URL")
        
        for var in "${required_vars[@]}"; do
            if ! grep -q "^$var=" "$env_template"; then
                log_error "Required variable $var not found in template"
                ((env_errors++))
            fi
        done
        
        # Check for security variables
        local security_vars=("CORS_ORIGIN" "RATE_LIMIT_MAX_REQUESTS")
        
        for var in "${security_vars[@]}"; do
            if ! grep -q "^$var=" "$env_template"; then
                log_warning "Security variable $var not found in template"
            fi
        done
        
        log_success "Environment template validation completed"
    fi
    
    # Test environment variable validation logic
    cd "$DASHBOARD_DIR"
    
    # Create a test script to validate environment variables
    cat > "/tmp/test-env-validation.js" << 'EOF'
const validateEnvironment = (env) => {
    const errors = [];
    
    // Required variables
    const required = ['NODE_ENV', 'PORT', 'KASPA_NODE_URL'];
    required.forEach(key => {
        if (!env[key]) {
            errors.push(`Missing required variable: ${key}`);
        }
    });
    
    // Validate PORT
    if (env.PORT && (isNaN(env.PORT) || env.PORT < 1024 || env.PORT > 65535)) {
        errors.push('PORT must be integer between 1024-65535');
    }
    
    // Validate URL
    if (env.KASPA_NODE_URL && !env.KASPA_NODE_URL.match(/^https?:\/\/.+/)) {
        errors.push('KASPA_NODE_URL must be valid HTTP/HTTPS URL');
    }
    
    return errors;
};

// Test cases
const testCases = [
    {
        name: 'Valid environment',
        env: {
            NODE_ENV: 'production',
            PORT: '8080',
            KASPA_NODE_URL: 'http://localhost:16111'
        },
        expectErrors: 0
    },
    {
        name: 'Missing required variables',
        env: {
            NODE_ENV: 'production'
        },
        expectErrors: 2
    },
    {
        name: 'Invalid PORT',
        env: {
            NODE_ENV: 'production',
            PORT: 'invalid',
            KASPA_NODE_URL: 'http://localhost:16111'
        },
        expectErrors: 1
    },
    {
        name: 'Invalid URL',
        env: {
            NODE_ENV: 'production',
            PORT: '8080',
            KASPA_NODE_URL: 'not-a-url'
        },
        expectErrors: 1
    }
];

let passed = 0;
let failed = 0;

testCases.forEach(testCase => {
    const errors = validateEnvironment(testCase.env);
    
    if (errors.length === testCase.expectErrors) {
        console.log(`✓ ${testCase.name}`);
        passed++;
    } else {
        console.log(`✗ ${testCase.name} (expected ${testCase.expectErrors} errors, got ${errors.length})`);
        failed++;
    }
});

console.log(`\nEnvironment validation tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
EOF

    if node "/tmp/test-env-validation.js"; then
        log_success "Environment validation logic tests passed"
    else
        log_error "Environment validation logic tests failed"
        ((env_errors++))
    fi
    
    rm -f "/tmp/test-env-validation.js"
    
    ((TOTAL_TESTS++))
    if [[ $env_errors -eq 0 ]]; then
        ((PASSED_TESTS++))
        TEST_RESULTS["environment"]="1/1"
        log_success "Environment variable tests passed"
    else
        ((FAILED_TESTS++))
        TEST_RESULTS["environment"]="0/1"
        log_error "Environment variable tests failed ($env_errors errors)"
    fi
}

# Run integration tests
run_integration_tests() {
    log_info "Running integration tests..."
    
    local integration_script="$SCRIPT_DIR/integration/deployment-integration.test.sh"
    
    if [[ ! -f "$integration_script" ]]; then
        log_error "Integration test script not found: $integration_script"
        ((FAILED_TESTS++))
        ((TOTAL_TESTS++))
        TEST_RESULTS["integration"]="0/1"
        return 1
    fi
    
    if [[ ! -x "$integration_script" ]]; then
        log_error "Integration test script is not executable"
        ((FAILED_TESTS++))
        ((TOTAL_TESTS++))
        TEST_RESULTS["integration"]="0/1"
        return 1
    fi
    
    log_info "Running deployment integration tests (this may take several minutes)..."
    
    if [[ "$VERBOSE" == "true" ]]; then
        bash "$integration_script"
    else
        bash "$integration_script" 2>&1 | grep -E "(SUCCESS|ERROR|INFO.*Testing|Test Results)"
    fi
    
    local integration_result=$?
    
    ((TOTAL_TESTS++))
    if [[ $integration_result -eq 0 ]]; then
        ((PASSED_TESTS++))
        TEST_RESULTS["integration"]="1/1"
        log_success "Integration tests passed"
    else
        ((FAILED_TESTS++))
        TEST_RESULTS["integration"]="0/1"
        log_error "Integration tests failed"
    fi
}

# Print test summary
print_summary() {
    echo
    echo "=============================================="
    echo "  Deployment Test Summary"
    echo "=============================================="
    echo
    
    echo "Test Categories:"
    for category in "${!TEST_RESULTS[@]}"; do
        echo "  $category: ${TEST_RESULTS[$category]}"
    done
    echo
    
    echo "Overall Results:"
    echo "  Total Tests: $TOTAL_TESTS"
    echo "  Passed: $PASSED_TESTS"
    echo "  Failed: $FAILED_TESTS"
    echo "  Skipped: $SKIPPED_TESTS"
    echo
    
    local success_rate=0
    if [[ $TOTAL_TESTS -gt 0 ]]; then
        success_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    fi
    
    echo "Success Rate: $success_rate%"
    echo
    
    if [[ $FAILED_TESTS -eq 0 ]]; then
        log_success "All deployment tests passed! 🎉"
        echo
        echo "The Kaspa Management Dashboard deployment is ready for production."
        echo
        echo "Next steps:"
        echo "  1. Review any warnings from the test output"
        echo "  2. Run the installation script: sudo ./install.sh"
        echo "  3. Verify the dashboard at http://localhost:8080"
        echo "  4. Check the service status: sudo systemctl status kaspa-dashboard"
        return 0
    else
        log_error "$FAILED_TESTS test(s) failed"
        echo
        echo "Please fix the failing tests before deploying to production."
        echo "Review the test output above for specific error details."
        return 1
    fi
}

# Main execution
main() {
    # Default options
    local RUN_UNIT=true
    local RUN_NGINX=true
    local RUN_ENVIRONMENT=true
    local RUN_INTEGRATION=true
    local VERBOSE=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --unit-only)
                RUN_INTEGRATION=false
                shift
                ;;
            --integration-only)
                RUN_UNIT=false
                RUN_NGINX=false
                RUN_ENVIRONMENT=false
                shift
                ;;
            --skip-integration)
                RUN_INTEGRATION=false
                shift
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            --help|-h)
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
    
    echo "=============================================="
    echo "  Kaspa Dashboard Deployment Test Suite"
    echo "=============================================="
    echo
    
    log_info "Starting deployment tests..."
    log_info "Dashboard directory: $DASHBOARD_DIR"
    log_info "Project root: $PROJECT_ROOT"
    echo
    
    # Export variables for use in functions
    export RUN_UNIT RUN_NGINX RUN_ENVIRONMENT RUN_INTEGRATION VERBOSE
    
    check_dependencies
    
    # Run test categories
    if [[ "$RUN_UNIT" == "true" ]]; then
        run_unit_tests
        echo
    fi
    
    if [[ "$RUN_NGINX" == "true" ]]; then
        run_nginx_tests
        echo
    fi
    
    if [[ "$RUN_ENVIRONMENT" == "true" ]]; then
        run_environment_tests
        echo
    fi
    
    if [[ "$RUN_INTEGRATION" == "true" ]]; then
        run_integration_tests
        echo
    fi
    
    print_summary
}

# Execute if run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi