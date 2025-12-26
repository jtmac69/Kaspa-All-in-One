#!/bin/bash

# Deployment Integration Tests for Kaspa Management Dashboard
# 
# These tests perform real deployment operations in a controlled environment
# to validate the complete deployment workflow.
#
# WARNING: These tests make actual system changes and should only be run
# in a test environment or with proper backups.

set -e

# Configuration
TEST_USER="kaspa-dashboard-test"
TEST_HOME="/tmp/kaspa-dashboard-test"
TEST_SERVICE="kaspa-dashboard-test"
TEST_PORT="8888"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DASHBOARD_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[TEST INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[TEST SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[TEST WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[TEST ERROR]${NC} $1"
}

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

# Test result functions
test_passed() {
    ((TESTS_PASSED++))
    log_success "$1"
}

test_failed() {
    ((TESTS_FAILED++))
    FAILED_TESTS+=("$1")
    log_error "$1"
}

# Cleanup function
cleanup() {
    log_info "Cleaning up test environment..."
    
    # Stop and remove test service
    if systemctl is-active --quiet "$TEST_SERVICE" 2>/dev/null; then
        sudo systemctl stop "$TEST_SERVICE" || true
    fi
    
    if systemctl is-enabled --quiet "$TEST_SERVICE" 2>/dev/null; then
        sudo systemctl disable "$TEST_SERVICE" || true
    fi
    
    # Remove service file
    sudo rm -f "/etc/systemd/system/${TEST_SERVICE}.service"
    sudo systemctl daemon-reload
    
    # Remove test user and home directory
    if id "$TEST_USER" &>/dev/null; then
        sudo userdel "$TEST_USER" || true
    fi
    
    sudo rm -rf "$TEST_HOME"
    
    log_info "Cleanup completed"
}

# Set up cleanup trap
trap cleanup EXIT

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This test script must be run as root (use sudo)"
        exit 1
    fi
}

# Test 1: System Requirements Check
test_system_requirements() {
    log_info "Testing system requirements check..."
    
    local requirements_met=true
    
    # Check systemd
    if ! command -v systemctl &> /dev/null; then
        log_error "systemd not found"
        requirements_met=false
    fi
    
    # Check curl
    if ! command -v curl &> /dev/null; then
        log_error "curl not found"
        requirements_met=false
    fi
    
    # Check OS release file
    if [[ ! -f /etc/os-release ]]; then
        log_error "/etc/os-release not found"
        requirements_met=false
    fi
    
    if $requirements_met; then
        test_passed "System requirements check"
    else
        test_failed "System requirements check"
    fi
}

# Test 2: Node.js Installation Check
test_nodejs_installation() {
    log_info "Testing Node.js installation..."
    
    if command -v node &> /dev/null; then
        local node_version=$(node --version | sed 's/v//')
        local node_major=$(echo $node_version | cut -d. -f1)
        
        if [[ $node_major -ge 16 ]]; then
            test_passed "Node.js installation (version $node_version)"
        else
            test_failed "Node.js version too old ($node_version, need 16+)"
        fi
    else
        test_failed "Node.js not installed"
    fi
    
    if command -v npm &> /dev/null; then
        local npm_version=$(npm --version)
        test_passed "npm installation (version $npm_version)"
    else
        test_failed "npm not installed"
    fi
}

# Test 3: User and Directory Creation
test_user_creation() {
    log_info "Testing user and directory creation..."
    
    # Create test user
    if useradd --system --home-dir "$TEST_HOME" --create-home --shell /bin/bash "$TEST_USER"; then
        test_passed "Test user creation"
    else
        test_failed "Test user creation"
        return 1
    fi
    
    # Check home directory
    if [[ -d "$TEST_HOME" ]]; then
        test_passed "Home directory creation"
    else
        test_failed "Home directory creation"
    fi
    
    # Create additional directories
    local directories=("$TEST_HOME/logs" "$TEST_HOME/backups")
    for dir in "${directories[@]}"; do
        if mkdir -p "$dir"; then
            test_passed "Directory creation: $dir"
        else
            test_failed "Directory creation: $dir"
        fi
    done
    
    # Set ownership
    if chown -R "$TEST_USER:$TEST_USER" "$TEST_HOME"; then
        test_passed "Directory ownership"
    else
        test_failed "Directory ownership"
    fi
}

# Test 4: Dashboard Files Installation
test_dashboard_installation() {
    log_info "Testing dashboard files installation..."
    
    # Copy dashboard files
    if rsync -av --exclude='node_modules' --exclude='*.log' --exclude='.git' \
              "$DASHBOARD_DIR/" "$TEST_HOME/"; then
        test_passed "Dashboard files copy"
    else
        test_failed "Dashboard files copy"
        return 1
    fi
    
    # Check required files
    local required_files=("package.json" "server.js" "lib" "public")
    for file in "${required_files[@]}"; do
        if [[ -e "$TEST_HOME/$file" ]]; then
            test_passed "Required file exists: $file"
        else
            test_failed "Required file missing: $file"
        fi
    done
    
    # Set ownership
    chown -R "$TEST_USER:$TEST_USER" "$TEST_HOME"
}

# Test 5: NPM Dependencies Installation
test_npm_dependencies() {
    log_info "Testing npm dependencies installation..."
    
    cd "$TEST_HOME"
    
    # Install dependencies as test user
    if sudo -u "$TEST_USER" npm ci --only=production; then
        test_passed "npm dependencies installation"
    else
        test_failed "npm dependencies installation"
        return 1
    fi
    
    # Check node_modules directory
    if [[ -d "$TEST_HOME/node_modules" ]]; then
        test_passed "node_modules directory created"
    else
        test_failed "node_modules directory missing"
    fi
    
    # Check for key dependencies
    local key_deps=("express" "axios" "ws")
    for dep in "${key_deps[@]}"; do
        if [[ -d "$TEST_HOME/node_modules/$dep" ]]; then
            test_passed "Dependency installed: $dep"
        else
            test_failed "Dependency missing: $dep"
        fi
    done
}

# Test 6: Environment Configuration
test_environment_configuration() {
    log_info "Testing environment configuration..."
    
    # Create test .env file
    cat > "$TEST_HOME/.env" << EOF
NODE_ENV=production
PORT=$TEST_PORT
KASPA_NODE_URL=http://localhost:16111
LOG_LEVEL=info
CORS_ORIGIN=http://localhost:3000,http://localhost:$TEST_PORT
AUTO_RESOURCE_MONITORING=false
CPU_WARNING_THRESHOLD=80
MEMORY_WARNING_THRESHOLD=85
EOF

    if [[ -f "$TEST_HOME/.env" ]]; then
        test_passed "Environment file creation"
    else
        test_failed "Environment file creation"
        return 1
    fi
    
    # Set proper permissions
    chown "$TEST_USER:$TEST_USER" "$TEST_HOME/.env"
    chmod 600 "$TEST_HOME/.env"
    
    # Validate environment file content
    if grep -q "NODE_ENV=production" "$TEST_HOME/.env"; then
        test_passed "Environment file content validation"
    else
        test_failed "Environment file content validation"
    fi
}

# Test 7: Systemd Service Creation
test_systemd_service() {
    log_info "Testing systemd service creation..."
    
    # Create test service file
    cat > "/etc/systemd/system/${TEST_SERVICE}.service" << EOF
[Unit]
Description=Kaspa Management Dashboard Test
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$TEST_USER
Group=$TEST_USER
WorkingDirectory=$TEST_HOME
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=$TEST_PORT
EnvironmentFile=-$TEST_HOME/.env
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$TEST_SERVICE

[Install]
WantedBy=multi-user.target
EOF

    if [[ -f "/etc/systemd/system/${TEST_SERVICE}.service" ]]; then
        test_passed "Systemd service file creation"
    else
        test_failed "Systemd service file creation"
        return 1
    fi
    
    # Reload systemd
    if systemctl daemon-reload; then
        test_passed "Systemd daemon reload"
    else
        test_failed "Systemd daemon reload"
    fi
}

# Test 8: Service Management
test_service_management() {
    log_info "Testing service management..."
    
    # Enable service
    if systemctl enable "$TEST_SERVICE"; then
        test_passed "Service enable"
    else
        test_failed "Service enable"
    fi
    
    # Start service
    if systemctl start "$TEST_SERVICE"; then
        test_passed "Service start"
    else
        test_failed "Service start"
        return 1
    fi
    
    # Wait for service to start
    sleep 5
    
    # Check service status
    if systemctl is-active --quiet "$TEST_SERVICE"; then
        test_passed "Service is active"
    else
        test_failed "Service is not active"
        # Show logs for debugging
        log_info "Service logs:"
        journalctl -u "$TEST_SERVICE" -n 20 --no-pager
    fi
    
    # Check if port is listening
    if ss -tlnp | grep -q ":$TEST_PORT "; then
        test_passed "Service listening on port $TEST_PORT"
    else
        test_failed "Service not listening on port $TEST_PORT"
    fi
}

# Test 9: Health Check
test_health_check() {
    log_info "Testing health check..."
    
    # Wait a bit more for service to be fully ready
    sleep 3
    
    # Test health endpoint
    if curl -sf "http://localhost:$TEST_PORT/health" > /dev/null; then
        test_passed "Health endpoint accessible"
    else
        test_failed "Health endpoint not accessible"
    fi
    
    # Test basic API endpoint
    if curl -sf "http://localhost:$TEST_PORT/api/status" > /dev/null; then
        test_passed "API endpoint accessible"
    else
        test_warning "API endpoint not accessible (may be expected if Kaspa node not running)"
    fi
}

# Test 10: Service Recovery
test_service_recovery() {
    log_info "Testing service recovery..."
    
    # Get service PID
    local service_pid=$(systemctl show --property MainPID --value "$TEST_SERVICE")
    
    if [[ "$service_pid" != "0" ]]; then
        # Kill the service process
        if kill -9 "$service_pid"; then
            test_passed "Service process killed"
        else
            test_failed "Failed to kill service process"
            return 1
        fi
        
        # Wait for systemd to restart it
        sleep 15
        
        # Check if service is running again
        if systemctl is-active --quiet "$TEST_SERVICE"; then
            test_passed "Service auto-restart after failure"
        else
            test_failed "Service did not auto-restart after failure"
        fi
    else
        test_failed "Could not get service PID"
    fi
}

# Test 11: Environment Variable Handling
test_environment_variables() {
    log_info "Testing environment variable handling..."
    
    # Stop service
    systemctl stop "$TEST_SERVICE"
    
    # Modify environment file
    echo "TEST_VARIABLE=test_value" >> "$TEST_HOME/.env"
    
    # Start service
    systemctl start "$TEST_SERVICE"
    sleep 5
    
    # Check if service started with new environment
    if systemctl is-active --quiet "$TEST_SERVICE"; then
        test_passed "Service restart with modified environment"
    else
        test_failed "Service failed to start with modified environment"
    fi
    
    # Test invalid environment variable
    systemctl stop "$TEST_SERVICE"
    echo "PORT=invalid_port" >> "$TEST_HOME/.env"
    
    # Try to start service (should fail)
    if ! systemctl start "$TEST_SERVICE" 2>/dev/null; then
        test_passed "Service correctly fails with invalid environment"
    else
        test_failed "Service should fail with invalid environment"
        systemctl stop "$TEST_SERVICE"
    fi
    
    # Restore valid environment
    sed -i '/PORT=invalid_port/d' "$TEST_HOME/.env"
    systemctl start "$TEST_SERVICE"
    sleep 5
}

# Test 12: Dashboard Availability Without Docker
test_dashboard_without_docker() {
    log_info "Testing dashboard availability without Docker..."
    
    # Check if Docker is running
    local docker_running=false
    if systemctl is-active --quiet docker 2>/dev/null; then
        docker_running=true
        log_info "Docker is running, stopping it for test..."
        systemctl stop docker
    fi
    
    # Restart dashboard service
    systemctl restart "$TEST_SERVICE"
    sleep 5
    
    # Check if dashboard is still accessible
    if systemctl is-active --quiet "$TEST_SERVICE"; then
        test_passed "Dashboard runs without Docker"
    else
        test_failed "Dashboard fails without Docker"
    fi
    
    # Check health endpoint
    if curl -sf "http://localhost:$TEST_PORT/health" > /dev/null; then
        test_passed "Dashboard health check without Docker"
    else
        test_failed "Dashboard health check fails without Docker"
    fi
    
    # Restart Docker if it was running
    if $docker_running; then
        log_info "Restarting Docker..."
        systemctl start docker
    fi
}

# Test 13: Log Rotation and Management
test_log_management() {
    log_info "Testing log management..."
    
    # Check if logs are being written
    if journalctl -u "$TEST_SERVICE" -n 1 --no-pager | grep -q "$TEST_SERVICE"; then
        test_passed "Service logs to journald"
    else
        test_failed "Service not logging to journald"
    fi
    
    # Create test log file
    local log_file="$TEST_HOME/logs/dashboard.log"
    mkdir -p "$TEST_HOME/logs"
    echo "Test log entry" > "$log_file"
    chown "$TEST_USER:$TEST_USER" "$log_file"
    
    if [[ -f "$log_file" ]]; then
        test_passed "Log file creation"
    else
        test_failed "Log file creation"
    fi
}

# Test 14: Backup and Configuration Management
test_backup_management() {
    log_info "Testing backup and configuration management..."
    
    # Create test backup directory
    mkdir -p "$TEST_HOME/backups"
    chown "$TEST_USER:$TEST_USER" "$TEST_HOME/backups"
    
    # Create a test backup
    local backup_file="$TEST_HOME/backups/test-backup-$(date +%Y%m%d_%H%M%S).tar.gz"
    if tar -czf "$backup_file" -C "$TEST_HOME" .env package.json; then
        test_passed "Backup creation"
    else
        test_failed "Backup creation"
    fi
    
    # Check backup file
    if [[ -f "$backup_file" ]]; then
        test_passed "Backup file exists"
    else
        test_failed "Backup file missing"
    fi
}

# Main test execution
main() {
    echo "=============================================="
    echo "  Kaspa Dashboard Deployment Integration Tests"
    echo "=============================================="
    echo
    
    check_root
    
    log_info "Starting deployment integration tests..."
    log_info "Test user: $TEST_USER"
    log_info "Test home: $TEST_HOME"
    log_info "Test service: $TEST_SERVICE"
    log_info "Test port: $TEST_PORT"
    echo
    
    # Run all tests
    test_system_requirements
    test_nodejs_installation
    test_user_creation
    test_dashboard_installation
    test_npm_dependencies
    test_environment_configuration
    test_systemd_service
    test_service_management
    test_health_check
    test_service_recovery
    test_environment_variables
    test_dashboard_without_docker
    test_log_management
    test_backup_management
    
    # Print results
    echo
    echo "=============================================="
    echo "  Test Results"
    echo "=============================================="
    echo "Passed: $TESTS_PASSED"
    echo "Failed: $TESTS_FAILED"
    echo "Total:  $((TESTS_PASSED + TESTS_FAILED))"
    echo
    
    if [[ $TESTS_FAILED -eq 0 ]]; then
        log_success "All deployment tests passed!"
        exit 0
    else
        log_error "$TESTS_FAILED test(s) failed:"
        for test in "${FAILED_TESTS[@]}"; do
            echo "  - $test"
        done
        exit 1
    fi
}

# Execute if run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi