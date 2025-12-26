#!/bin/bash

# Test script for the dashboard installation
# This script tests the installation script without actually installing

# set -e  # Don't exit on error for testing

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_SCRIPT="$SCRIPT_DIR/install.sh"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[TEST INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[TEST SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[TEST ERROR]${NC} $1"
}

# Test script existence and permissions
test_script_basics() {
    log_info "Testing script basics..."
    
    if [[ ! -f "$INSTALL_SCRIPT" ]]; then
        log_error "Install script not found: $INSTALL_SCRIPT"
        return 1
    fi
    
    if [[ ! -x "$INSTALL_SCRIPT" ]]; then
        log_error "Install script is not executable"
        return 1
    fi
    
    log_success "Script exists and is executable"
}

# Test script syntax
test_syntax() {
    log_info "Testing script syntax..."
    
    if bash -n "$INSTALL_SCRIPT"; then
        log_success "Script syntax is valid"
    else
        log_error "Script has syntax errors"
        return 1
    fi
}

# Test help functionality
test_help() {
    log_info "Testing help functionality..."
    
    if "$INSTALL_SCRIPT" --help > /dev/null 2>&1; then
        log_success "Help option works"
    else
        log_error "Help option failed"
        return 1
    fi
}

# Test required files exist
test_required_files() {
    log_info "Testing required files..."
    
    local required_files=(
        "package.json"
        "server.js"
        "lib"
        "public"
    )
    
    for file in "${required_files[@]}"; do
        if [[ ! -e "$SCRIPT_DIR/$file" ]]; then
            log_error "Required file/directory missing: $file"
            return 1
        fi
    done
    
    log_success "All required files present"
}

# Test package.json validity
test_package_json() {
    log_info "Testing package.json validity..."
    
    if command -v node &> /dev/null; then
        if node -e "JSON.parse(require('fs').readFileSync('$SCRIPT_DIR/package.json', 'utf8'))" 2>/dev/null; then
            log_success "package.json is valid JSON"
        else
            log_error "package.json is invalid JSON"
            return 1
        fi
    else
        log_info "Node.js not available, skipping package.json validation"
    fi
}

# Test systemd service template
test_systemd_template() {
    log_info "Testing systemd service template..."
    
    # Extract the systemd service template from the install script
    if grep -q "\\[Unit\\]" "$INSTALL_SCRIPT" && \
       grep -q "\\[Service\\]" "$INSTALL_SCRIPT" && \
       grep -q "\\[Install\\]" "$INSTALL_SCRIPT"; then
        log_success "Systemd service template found in script"
    else
        log_error "Systemd service template missing or incomplete"
        return 1
    fi
}

# Test environment template
test_env_template() {
    log_info "Testing environment template..."
    
    if grep -q "NODE_ENV=production" "$INSTALL_SCRIPT" && \
       grep -q "PORT=" "$INSTALL_SCRIPT" && \
       grep -q "KASPA_NODE_URL=" "$INSTALL_SCRIPT"; then
        log_success "Environment template found in script"
    else
        log_error "Environment template missing or incomplete"
        return 1
    fi
}

# Test function definitions
test_functions() {
    log_info "Testing function definitions..."
    
    local required_functions=(
        "check_root"
        "check_system"
        "install_nodejs"
        "create_user"
        "install_dashboard"
        "install_dependencies"
        "create_systemd_service"
        "start_service"
        "verify_installation"
    )
    
    for func in "${required_functions[@]}"; do
        if ! grep -q "^${func}()" "$INSTALL_SCRIPT"; then
            log_error "Required function missing: $func"
            return 1
        fi
    done
    
    log_success "All required functions found"
}

# Test error handling
test_error_handling() {
    log_info "Testing error handling..."
    
    if grep -q "set -e" "$INSTALL_SCRIPT"; then
        log_success "Error handling (set -e) enabled"
    else
        log_error "Error handling (set -e) not found"
        return 1
    fi
}

# Test logging functions
test_logging() {
    log_info "Testing logging functions..."
    
    local log_functions=(
        "log_info"
        "log_success"
        "log_warning"
        "log_error"
    )
    
    for func in "${log_functions[@]}"; do
        if ! grep -q "${func}()" "$INSTALL_SCRIPT"; then
            log_error "Logging function missing: $func"
            return 1
        fi
    done
    
    log_success "All logging functions found"
}

# Run all tests
run_tests() {
    echo "=============================================="
    echo "  Testing Kaspa Dashboard Installation Script"
    echo "=============================================="
    echo
    
    local tests=(
        "test_script_basics"
        "test_syntax"
        "test_help"
        "test_required_files"
        "test_package_json"
        "test_systemd_template"
        "test_env_template"
        "test_functions"
        "test_error_handling"
        "test_logging"
    )
    
    local passed=0
    local failed=0
    
    for test in "${tests[@]}"; do
        if $test; then
            ((passed++))
        else
            ((failed++))
        fi
        echo
    done
    
    echo "=============================================="
    echo "  Test Results"
    echo "=============================================="
    echo "Passed: $passed"
    echo "Failed: $failed"
    echo "Total:  $((passed + failed))"
    echo
    
    if [[ $failed -eq 0 ]]; then
        log_success "All tests passed! Installation script is ready."
        return 0
    else
        log_error "$failed test(s) failed. Please fix the issues before deployment."
        return 1
    fi
}

# Main execution
main() {
    run_tests
}

# Execute if run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi