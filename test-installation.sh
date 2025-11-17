#!/bin/bash

# Kaspa All-in-One Installation Verification Testing Suite
# Tests the install.sh script and validates system setup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
TEST_ENV_FILE=".env.test"
BACKUP_ENV_FILE=".env.backup"
MIN_RAM_GB=4
MIN_DISK_GB=50
REQUIRED_PORTS=(16110 16111 8080)
TIMEOUT=10
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

# Test Docker availability
test_docker_availability() {
    header "Testing Docker Availability"
    
    log "Checking if Docker is installed..."
    if command -v docker &> /dev/null; then
        local docker_version=$(docker --version 2>/dev/null || echo "unknown")
        add_test_result "Docker Installation" "PASS" "Docker is installed: $docker_version"
    else
        add_test_result "Docker Installation" "FAIL" "Docker is not installed"
        return 1
    fi
    
    log "Checking if Docker daemon is running..."
    if docker info &> /dev/null; then
        add_test_result "Docker Daemon" "PASS" "Docker daemon is running"
    else
        add_test_result "Docker Daemon" "FAIL" "Docker daemon is not running"
        return 1
    fi
    
    log "Checking Docker permissions..."
    if docker ps &> /dev/null; then
        add_test_result "Docker Permissions" "PASS" "User has Docker permissions"
    else
        add_test_result "Docker Permissions" "WARN" "User may need to be added to docker group"
    fi
    
    return 0
}

# Test Docker Compose availability
test_docker_compose_availability() {
    header "Testing Docker Compose Availability"
    
    log "Checking if Docker Compose is installed..."
    if docker compose version &> /dev/null; then
        local compose_version=$(docker compose version 2>/dev/null || echo "unknown")
        add_test_result "Docker Compose Installation" "PASS" "Docker Compose is installed: $compose_version"
        return 0
    elif command -v docker-compose &> /dev/null; then
        local compose_version=$(docker-compose --version 2>/dev/null || echo "unknown")
        add_test_result "Docker Compose Installation" "PASS" "Docker Compose (standalone) is installed: $compose_version"
        return 0
    else
        add_test_result "Docker Compose Installation" "FAIL" "Docker Compose is not installed"
        return 1
    fi
}

# Test system requirements
test_system_requirements() {
    header "Testing System Requirements"
    
    # Check RAM (cross-platform)
    log "Checking system RAM..."
    local ram_gb=0
    if command -v free &> /dev/null; then
        ram_gb=$(free -g | awk '/^Mem:/{print $2}')
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        local ram_bytes=$(sysctl -n hw.memsize)
        ram_gb=$((ram_bytes / 1024 / 1024 / 1024))
    fi
    
    if [ "$ram_gb" -ge "$MIN_RAM_GB" ]; then
        add_test_result "RAM Check" "PASS" "System has ${ram_gb}GB RAM (minimum: ${MIN_RAM_GB}GB)"
    else
        add_test_result "RAM Check" "WARN" "System has ${ram_gb}GB RAM (recommended: ${MIN_RAM_GB}GB+)"
    fi
    
    # Check disk space (cross-platform)
    log "Checking available disk space..."
    local disk_gb=0
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        disk_gb=$(df -g / | awk 'NR==2{print $4}')
    else
        # Linux
        disk_gb=$(df -BG / | awk 'NR==2{print $4}' | sed 's/G//')
    fi
    
    if [ "$disk_gb" -ge "$MIN_DISK_GB" ]; then
        add_test_result "Disk Space Check" "PASS" "System has ${disk_gb}GB available (minimum: ${MIN_DISK_GB}GB)"
    else
        add_test_result "Disk Space Check" "FAIL" "System has ${disk_gb}GB available (minimum: ${MIN_DISK_GB}GB required)"
    fi
    
    # Check CPU cores (cross-platform)
    log "Checking CPU cores..."
    local cpu_cores=0
    if command -v nproc &> /dev/null; then
        cpu_cores=$(nproc)
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        cpu_cores=$(sysctl -n hw.ncpu)
    fi
    
    if [ "$cpu_cores" -ge 2 ]; then
        add_test_result "CPU Check" "PASS" "System has ${cpu_cores} CPU cores"
    else
        add_test_result "CPU Check" "WARN" "System has ${cpu_cores} CPU core(s) (recommended: 2+)"
    fi
    
    # Check network connectivity
    log "Checking network connectivity..."
    if ping -c 1 -W 5 google.com &> /dev/null || ping -c 1 -W 5 8.8.8.8 &> /dev/null; then
        add_test_result "Network Connectivity" "PASS" "Internet connectivity is available"
    else
        add_test_result "Network Connectivity" "FAIL" "No internet connectivity detected"
    fi
}

# Test port availability
test_port_availability() {
    header "Testing Port Availability"
    
    for port in "${REQUIRED_PORTS[@]}"; do
        log "Checking if port $port is available..."
        if ! nc -z localhost $port 2>/dev/null && ! lsof -i :$port &>/dev/null; then
            add_test_result "Port $port Availability" "PASS" "Port $port is available"
        else
            add_test_result "Port $port Availability" "WARN" "Port $port is already in use"
        fi
    done
}

# Test environment file creation
test_env_file_creation() {
    header "Testing Environment File Creation"
    
    # Backup existing .env if present
    if [ -f ".env" ]; then
        log "Backing up existing .env file..."
        cp .env "$BACKUP_ENV_FILE"
        add_test_result "Env Backup" "PASS" "Existing .env file backed up"
    fi
    
    # Create test environment file
    log "Creating test environment file..."
    cat > "$TEST_ENV_FILE" <<EOF
# Test Environment Configuration
KASPA_NODE_P2P_PORT=16110
KASPA_NODE_RPC_PORT=16111
DASHBOARD_PORT=8080
PUBLIC_NODE=false
ENABLE_PUBLIC_ACCESS=false
ENABLE_MINING=false
ADMIN_PASSWORD=test_password
EOF
    
    if [ -f "$TEST_ENV_FILE" ]; then
        add_test_result "Env File Creation" "PASS" "Test environment file created successfully"
    else
        add_test_result "Env File Creation" "FAIL" "Failed to create test environment file"
        return 1
    fi
    
    # Validate environment file content
    log "Validating environment file content..."
    local required_vars=("KASPA_NODE_P2P_PORT" "KASPA_NODE_RPC_PORT" "DASHBOARD_PORT")
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}=" "$TEST_ENV_FILE"; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -eq 0 ]; then
        add_test_result "Env File Validation" "PASS" "All required variables present"
    else
        add_test_result "Env File Validation" "FAIL" "Missing variables: ${missing_vars[*]}"
        return 1
    fi
    
    return 0
}

# Test Docker Compose file validation
test_docker_compose_validation() {
    header "Testing Docker Compose Configuration"
    
    log "Checking if docker-compose.yml exists..."
    if [ ! -f "docker-compose.yml" ]; then
        add_test_result "Compose File Existence" "FAIL" "docker-compose.yml not found"
        return 1
    fi
    add_test_result "Compose File Existence" "PASS" "docker-compose.yml found"
    
    log "Validating docker-compose.yml syntax..."
    if docker compose config &> /dev/null; then
        add_test_result "Compose File Syntax" "PASS" "docker-compose.yml syntax is valid"
    else
        add_test_result "Compose File Syntax" "FAIL" "docker-compose.yml has syntax errors"
        return 1
    fi
    
    log "Checking for required services..."
    local required_services=("kaspa-node" "dashboard")
    local missing_services=()
    
    for service in "${required_services[@]}"; do
        if ! docker compose config --services 2>/dev/null | grep -q "^${service}$"; then
            missing_services+=("$service")
        fi
    done
    
    if [ ${#missing_services[@]} -eq 0 ]; then
        add_test_result "Required Services" "PASS" "All required services defined"
    else
        add_test_result "Required Services" "FAIL" "Missing services: ${missing_services[*]}"
        return 1
    fi
    
    return 0
}

# Test profile system
test_profile_system() {
    header "Testing Profile System"
    
    log "Checking available profiles..."
    local profiles=$(docker compose config --profiles 2>/dev/null || echo "")
    
    if [ -n "$profiles" ]; then
        add_test_result "Profile System" "PASS" "Profile system is configured"
        log "Available profiles: $profiles"
    else
        add_test_result "Profile System" "WARN" "No profiles detected (may be using default)"
    fi
    
    # Test core profile services
    log "Validating core profile services..."
    local core_services=("kaspa-node" "dashboard")
    local found_services=0
    
    for service in "${core_services[@]}"; do
        if docker compose config --services 2>/dev/null | grep -q "^${service}$"; then
            ((found_services++))
        fi
    done
    
    if [ $found_services -eq ${#core_services[@]} ]; then
        add_test_result "Core Profile Services" "PASS" "All core services present"
    else
        add_test_result "Core Profile Services" "WARN" "Some core services may be missing"
    fi
}

# Test service startup capability
test_service_startup() {
    header "Testing Service Startup Capability"
    
    log "Testing if services can be started (dry-run)..."
    
    # Use --dry-run if available, otherwise just validate config
    if docker compose up --dry-run &> /dev/null 2>&1; then
        add_test_result "Service Startup Test" "PASS" "Services can be started (dry-run successful)"
    elif docker compose config &> /dev/null; then
        add_test_result "Service Startup Test" "PASS" "Service configuration is valid"
    else
        add_test_result "Service Startup Test" "FAIL" "Service startup validation failed"
        return 1
    fi
    
    return 0
}

# Test install script existence and permissions
test_install_script() {
    header "Testing Install Script"
    
    log "Checking if install.sh exists..."
    if [ -f "install.sh" ]; then
        add_test_result "Install Script Existence" "PASS" "install.sh found"
    else
        add_test_result "Install Script Existence" "FAIL" "install.sh not found"
        return 1
    fi
    
    log "Checking install.sh permissions..."
    if [ -x "install.sh" ]; then
        add_test_result "Install Script Permissions" "PASS" "install.sh is executable"
    else
        add_test_result "Install Script Permissions" "WARN" "install.sh is not executable (chmod +x install.sh)"
    fi
    
    log "Validating install.sh syntax..."
    if bash -n install.sh 2>/dev/null; then
        add_test_result "Install Script Syntax" "PASS" "install.sh syntax is valid"
    else
        add_test_result "Install Script Syntax" "FAIL" "install.sh has syntax errors"
        return 1
    fi
    
    return 0
}

# Test management scripts
test_management_scripts() {
    header "Testing Management Scripts"
    
    local scripts=("scripts/manage.sh" "scripts/health-check.sh")
    
    for script in "${scripts[@]}"; do
        log "Checking $script..."
        if [ -f "$script" ]; then
            add_test_result "$(basename $script) Existence" "PASS" "$script found"
            
            if [ -x "$script" ]; then
                add_test_result "$(basename $script) Permissions" "PASS" "$script is executable"
            else
                add_test_result "$(basename $script) Permissions" "WARN" "$script is not executable"
            fi
            
            if bash -n "$script" 2>/dev/null; then
                add_test_result "$(basename $script) Syntax" "PASS" "$script syntax is valid"
            else
                add_test_result "$(basename $script) Syntax" "FAIL" "$script has syntax errors"
            fi
        else
            add_test_result "$(basename $script) Existence" "FAIL" "$script not found"
        fi
    done
}

# Test documentation availability
test_documentation() {
    header "Testing Documentation Availability"
    
    local docs=("README.md" "CONTRIBUTING.md" "docs/deployment-profiles.md" "docs/troubleshooting.md")
    local found_docs=0
    
    for doc in "${docs[@]}"; do
        if [ -f "$doc" ]; then
            ((found_docs++))
        fi
    done
    
    if [ $found_docs -eq ${#docs[@]} ]; then
        add_test_result "Documentation" "PASS" "All key documentation files present"
    elif [ $found_docs -gt 0 ]; then
        add_test_result "Documentation" "WARN" "Some documentation files missing ($found_docs/${#docs[@]} found)"
    else
        add_test_result "Documentation" "FAIL" "No documentation files found"
    fi
}

# Test directory structure
test_directory_structure() {
    header "Testing Directory Structure"
    
    local required_dirs=("services" "config" "scripts" "docs")
    local missing_dirs=()
    
    for dir in "${required_dirs[@]}"; do
        if [ ! -d "$dir" ]; then
            missing_dirs+=("$dir")
        fi
    done
    
    if [ ${#missing_dirs[@]} -eq 0 ]; then
        add_test_result "Directory Structure" "PASS" "All required directories present"
    else
        add_test_result "Directory Structure" "FAIL" "Missing directories: ${missing_dirs[*]}"
    fi
}

# Test resource monitoring capability
test_resource_monitoring() {
    header "Testing Resource Monitoring Capability"
    
    log "Checking if system monitoring tools are available..."
    
    local tools=("free" "df" "nproc" "lsof" "nc")
    local missing_tools=()
    
    for tool in "${tools[@]}"; do
        if ! command -v $tool &> /dev/null; then
            missing_tools+=("$tool")
        fi
    done
    
    if [ ${#missing_tools[@]} -eq 0 ]; then
        add_test_result "Monitoring Tools" "PASS" "All monitoring tools available"
    else
        add_test_result "Monitoring Tools" "WARN" "Some tools missing: ${missing_tools[*]}"
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
        if [ $warnings -gt 0 ]; then
            warn "Note: $warnings warnings detected - review recommendations below"
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
    
    echo "System Preparation:"
    echo "  • Ensure Docker and Docker Compose are installed and running"
    echo "  • Add your user to the docker group: sudo usermod -aG docker \$USER"
    echo "  • Verify minimum system requirements: 4GB RAM, 50GB disk space"
    echo "  • Check that required ports are available: ${REQUIRED_PORTS[*]}"
    echo ""
    
    echo "Installation:"
    echo "  • Run install.sh to set up the system"
    echo "  • Follow the interactive prompts for configuration"
    echo "  • Review generated .env file for custom settings"
    echo "  • Use docker compose up -d to start services"
    echo ""
    
    echo "Post-Installation Verification:"
    echo "  • Run ./test-kaspa-node.sh to verify node setup"
    echo "  • Run ./test-dashboard.sh to verify dashboard functionality"
    echo "  • Check service status: docker compose ps"
    echo "  • View logs: docker compose logs -f"
    echo ""
    
    echo "Management:"
    echo "  • Use scripts/manage.sh for service management"
    echo "  • Use scripts/health-check.sh for system monitoring"
    echo "  • Review docs/troubleshooting.md for common issues"
    echo "  • Check docs/deployment-profiles.md for profile options"
    echo ""
}

# Cleanup function
cleanup() {
    log "Cleaning up test artifacts..."
    
    # Remove test environment file
    if [ -f "$TEST_ENV_FILE" ]; then
        rm -f "$TEST_ENV_FILE"
        log "Removed test environment file"
    fi
    
    # Restore backup if it exists
    if [ -f "$BACKUP_ENV_FILE" ]; then
        if [ -f ".env" ]; then
            log "Restoring original .env file..."
            mv "$BACKUP_ENV_FILE" .env
        else
            rm -f "$BACKUP_ENV_FILE"
        fi
    fi
}

# Main test execution
main() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║        Kaspa All-in-One Installation Verification           ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    
    # Run all tests
    test_docker_availability || true
    test_docker_compose_availability || true
    test_system_requirements || true
    test_port_availability || true
    test_env_file_creation || true
    test_docker_compose_validation || true
    test_profile_system || true
    test_service_startup || true
    test_install_script || true
    test_management_scripts || true
    test_documentation || true
    test_directory_structure || true
    test_resource_monitoring || true
    
    # Display results
    display_test_summary
    local test_exit_code=$?
    
    show_recommendations
    
    return $test_exit_code
}

# Set trap for cleanup
trap cleanup EXIT

# Run main function
main "$@"
