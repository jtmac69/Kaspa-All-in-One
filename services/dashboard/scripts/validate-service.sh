#!/bin/bash

# Kaspa Dashboard Systemd Service Validation Script
# This script validates the systemd service configuration and reports any issues

set -e

# Configuration
SERVICE_NAME="kaspa-dashboard"
DASHBOARD_HOME="/opt/kaspa-dashboard"
DASHBOARD_USER="kaspa-dashboard"

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

# Check if running as root for some tests
check_permissions() {
    if [[ $EUID -eq 0 ]]; then
        CAN_CHECK_SYSTEM=true
    else
        CAN_CHECK_SYSTEM=false
        log_warning "Not running as root - some system checks will be skipped"
    fi
}

# Validate systemd service file
validate_service_file() {
    log_info "Validating systemd service file..."
    
    SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
    
    if [[ ! -f "$SERVICE_FILE" ]]; then
        log_error "Service file not found: $SERVICE_FILE"
        return 1
    fi
    
    log_success "Service file exists: $SERVICE_FILE"
    
    # Check service file syntax
    if systemctl cat "$SERVICE_NAME" >/dev/null 2>&1; then
        log_success "Service file syntax is valid"
    else
        log_error "Service file has syntax errors"
        return 1
    fi
    
    # Check for required sections
    if grep -q "^\[Unit\]" "$SERVICE_FILE" && \
       grep -q "^\[Service\]" "$SERVICE_FILE" && \
       grep -q "^\[Install\]" "$SERVICE_FILE"; then
        log_success "Service file has required sections"
    else
        log_error "Service file missing required sections"
        return 1
    fi
    
    # Check for required directives
    local required_directives=("ExecStart" "User" "WorkingDirectory")
    for directive in "${required_directives[@]}"; do
        if grep -q "^$directive=" "$SERVICE_FILE"; then
            log_success "Found required directive: $directive"
        else
            log_error "Missing required directive: $directive"
            return 1
        fi
    done
    
    return 0
}

# Validate service dependencies
validate_dependencies() {
    log_info "Validating service dependencies..."
    
    # Check if systemd can resolve dependencies
    if systemctl list-dependencies "$SERVICE_NAME" >/dev/null 2>&1; then
        log_success "Service dependencies are resolvable"
    else
        log_error "Service has dependency issues"
        return 1
    fi
    
    # Check specific dependencies
    local deps=("network.target")
    for dep in "${deps[@]}"; do
        if systemctl list-dependencies "$SERVICE_NAME" | grep -q "$dep"; then
            log_success "Dependency found: $dep"
        else
            log_warning "Optional dependency not found: $dep"
        fi
    done
    
    return 0
}

# Validate user and permissions
validate_user_permissions() {
    log_info "Validating user and permissions..."
    
    # Check if user exists
    if id "$DASHBOARD_USER" >/dev/null 2>&1; then
        log_success "User exists: $DASHBOARD_USER"
    else
        log_error "User does not exist: $DASHBOARD_USER"
        return 1
    fi
    
    # Check home directory
    if [[ -d "$DASHBOARD_HOME" ]]; then
        log_success "Home directory exists: $DASHBOARD_HOME"
    else
        log_error "Home directory does not exist: $DASHBOARD_HOME"
        return 1
    fi
    
    # Check ownership
    local owner=$(stat -c '%U' "$DASHBOARD_HOME" 2>/dev/null || echo "unknown")
    if [[ "$owner" == "$DASHBOARD_USER" ]]; then
        log_success "Home directory ownership is correct"
    else
        log_error "Home directory ownership is incorrect (owner: $owner, expected: $DASHBOARD_USER)"
        return 1
    fi
    
    # Check Docker group membership
    if groups "$DASHBOARD_USER" | grep -q docker; then
        log_success "User is in docker group"
    else
        log_warning "User is not in docker group - Docker management may not work"
    fi
    
    return 0
}

# Validate environment configuration
validate_environment() {
    log_info "Validating environment configuration..."
    
    ENV_FILE="$DASHBOARD_HOME/.env"
    
    if [[ -f "$ENV_FILE" ]]; then
        log_success "Environment file exists: $ENV_FILE"
    else
        log_error "Environment file does not exist: $ENV_FILE"
        return 1
    fi
    
    # Check file permissions
    local perms=$(stat -c '%a' "$ENV_FILE" 2>/dev/null || echo "000")
    if [[ "$perms" == "600" ]]; then
        log_success "Environment file permissions are secure (600)"
    else
        log_warning "Environment file permissions may be insecure ($perms, recommended: 600)"
    fi
    
    # Check for required variables
    local required_vars=("NODE_ENV" "PORT")
    for var in "${required_vars[@]}"; do
        if grep -q "^$var=" "$ENV_FILE"; then
            log_success "Found required environment variable: $var"
        else
            log_warning "Missing environment variable: $var"
        fi
    done
    
    # Validate environment file syntax
    if sudo -u "$DASHBOARD_USER" bash -c "set -a; source '$ENV_FILE'; set +a" 2>/dev/null; then
        log_success "Environment file syntax is valid"
    else
        log_error "Environment file has syntax errors"
        return 1
    fi
    
    return 0
}

# Validate Node.js installation
validate_nodejs() {
    log_info "Validating Node.js installation..."
    
    if command -v node >/dev/null 2>&1; then
        local node_version=$(node --version)
        log_success "Node.js is installed: $node_version"
        
        # Check version
        local major_version=$(echo "$node_version" | sed 's/v//' | cut -d. -f1)
        if [[ "$major_version" -ge 16 ]]; then
            log_success "Node.js version is supported (>= 16)"
        else
            log_error "Node.js version is too old (found: $major_version, required: >= 16)"
            return 1
        fi
    else
        log_error "Node.js is not installed or not in PATH"
        return 1
    fi
    
    # Check npm
    if command -v npm >/dev/null 2>&1; then
        local npm_version=$(npm --version)
        log_success "npm is available: $npm_version"
    else
        log_error "npm is not installed or not in PATH"
        return 1
    fi
    
    return 0
}

# Validate application files
validate_application() {
    log_info "Validating application files..."
    
    # Check main server file
    if [[ -f "$DASHBOARD_HOME/server.js" ]]; then
        log_success "Main server file exists: server.js"
    else
        log_error "Main server file not found: server.js"
        return 1
    fi
    
    # Check package.json
    if [[ -f "$DASHBOARD_HOME/package.json" ]]; then
        log_success "Package file exists: package.json"
    else
        log_error "Package file not found: package.json"
        return 1
    fi
    
    # Check node_modules
    if [[ -d "$DASHBOARD_HOME/node_modules" ]]; then
        log_success "Dependencies are installed: node_modules"
    else
        log_error "Dependencies not installed: node_modules directory missing"
        return 1
    fi
    
    # Check required directories
    local required_dirs=("logs" "public")
    for dir in "${required_dirs[@]}"; do
        if [[ -d "$DASHBOARD_HOME/$dir" ]]; then
            log_success "Required directory exists: $dir"
        else
            log_warning "Required directory missing: $dir"
        fi
    done
    
    return 0
}

# Validate service status
validate_service_status() {
    log_info "Validating service status..."
    
    # Check if service is loaded
    if systemctl is-enabled "$SERVICE_NAME" >/dev/null 2>&1; then
        log_success "Service is enabled for auto-start"
    else
        log_warning "Service is not enabled for auto-start"
    fi
    
    # Check if service is active
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        log_success "Service is currently running"
        
        # Check service health
        local port=$(grep "^PORT=" "$DASHBOARD_HOME/.env" 2>/dev/null | cut -d= -f2 || echo "8080")
        if command -v curl >/dev/null 2>&1; then
            if curl -sf "http://localhost:$port/health" >/dev/null 2>&1; then
                log_success "Service health check passed"
            else
                log_warning "Service health check failed"
            fi
        else
            log_info "curl not available, skipping health check"
        fi
    else
        log_warning "Service is not currently running"
    fi
    
    return 0
}

# Validate system resources
validate_resources() {
    log_info "Validating system resources..."
    
    # Check available memory
    local mem_total=$(free -m | awk '/^Mem:/ {print $2}')
    if [[ "$mem_total" -gt 512 ]]; then
        log_success "Sufficient memory available: ${mem_total}MB"
    else
        log_warning "Low memory available: ${mem_total}MB (recommended: > 512MB)"
    fi
    
    # Check disk space
    local disk_avail=$(df -m "$DASHBOARD_HOME" | awk 'NR==2 {print $4}')
    if [[ "$disk_avail" -gt 100 ]]; then
        log_success "Sufficient disk space available: ${disk_avail}MB"
    else
        log_warning "Low disk space available: ${disk_avail}MB (recommended: > 100MB)"
    fi
    
    return 0
}

# Validate Docker integration
validate_docker() {
    log_info "Validating Docker integration..."
    
    if command -v docker >/dev/null 2>&1; then
        log_success "Docker is installed"
        
        # Check if Docker daemon is running
        if docker info >/dev/null 2>&1; then
            log_success "Docker daemon is running"
        else
            log_warning "Docker daemon is not running or not accessible"
        fi
        
        # Check Docker socket permissions
        if [[ -S "/var/run/docker.sock" ]]; then
            log_success "Docker socket exists"
            
            local socket_group=$(stat -c '%G' /var/run/docker.sock 2>/dev/null || echo "unknown")
            if [[ "$socket_group" == "docker" ]]; then
                log_success "Docker socket has correct group ownership"
            else
                log_warning "Docker socket group ownership may be incorrect (found: $socket_group, expected: docker)"
            fi
        else
            log_error "Docker socket not found: /var/run/docker.sock"
            return 1
        fi
        
        # Test Docker access as dashboard user
        if sudo -u "$DASHBOARD_USER" docker ps >/dev/null 2>&1; then
            log_success "Dashboard user can access Docker"
        else
            log_warning "Dashboard user cannot access Docker - check group membership"
        fi
    else
        log_warning "Docker is not installed - container management will not work"
    fi
    
    return 0
}

# Generate validation report
generate_report() {
    echo
    echo "=============================================="
    echo "  Kaspa Dashboard Service Validation Report"
    echo "=============================================="
    echo
    echo "Validation completed at: $(date)"
    echo "Service: $SERVICE_NAME"
    echo "User: $DASHBOARD_USER"
    echo "Home: $DASHBOARD_HOME"
    echo
    
    if [[ $VALIDATION_ERRORS -eq 0 ]]; then
        log_success "All critical validations passed!"
        echo
        echo "Your Kaspa Dashboard service is properly configured."
        echo "You can start the service with: sudo systemctl start $SERVICE_NAME"
    else
        log_error "Found $VALIDATION_ERRORS critical issues that need to be resolved."
        echo
        echo "Please fix the errors above before starting the service."
    fi
    
    if [[ $VALIDATION_WARNINGS -gt 0 ]]; then
        echo
        log_warning "Found $VALIDATION_WARNINGS warnings - service may work but consider addressing these issues."
    fi
    
    echo
    echo "For more information, see:"
    echo "  - Service management: $DASHBOARD_HOME/SERVICE_MANAGEMENT.md"
    echo "  - Deployment guide: $DASHBOARD_HOME/DEPLOYMENT.md"
    echo "  - Service logs: sudo journalctl -u $SERVICE_NAME"
    echo
}

# Main validation function
main() {
    echo "=============================================="
    echo "  Kaspa Dashboard Service Validation"
    echo "=============================================="
    echo
    
    VALIDATION_ERRORS=0
    VALIDATION_WARNINGS=0
    
    check_permissions
    
    # Run all validations
    local validations=(
        "validate_service_file"
        "validate_dependencies"
        "validate_user_permissions"
        "validate_environment"
        "validate_nodejs"
        "validate_application"
        "validate_service_status"
        "validate_resources"
        "validate_docker"
    )
    
    for validation in "${validations[@]}"; do
        echo
        if ! $validation; then
            ((VALIDATION_ERRORS++))
        fi
    done
    
    generate_report
    
    if [[ $VALIDATION_ERRORS -eq 0 ]]; then
        exit 0
    else
        exit 1
    fi
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Kaspa Dashboard Service Validation Script"
        echo
        echo "Usage: $0 [options]"
        echo
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --quiet, -q    Suppress informational output"
        echo
        echo "This script validates the systemd service configuration for the"
        echo "Kaspa Management Dashboard and reports any issues found."
        echo
        exit 0
        ;;
    --quiet|-q)
        # Redirect info messages to /dev/null for quiet mode
        exec 3>&1
        log_info() { :; }
        main
        ;;
    "")
        # No arguments, run normal validation
        main
        ;;
    *)
        log_error "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac