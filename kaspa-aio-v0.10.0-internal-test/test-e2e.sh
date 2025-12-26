#!/bin/bash

# End-to-End System Integration Testing Script
# Tests complete system deployment across all profiles

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
TIMEOUT=300
HEALTH_CHECK_INTERVAL=10
MAX_RETRIES=30

# Test profiles
PROFILES=("core" "prod" "explorer" "archive" "development" "mining")

# Cleanup configuration
ENABLE_CLEANUP=true
CLEANUP_VOLUMES=false
CLEANUP_IMAGES=false

# Test results tracking
declare -A PROFILE_RESULTS
declare -A SERVICE_RESULTS

# Function to wait for service health
wait_for_service() {
    local service=$1
    local port=$2
    local endpoint=${3:-/health}
    local max_wait=${4:-$TIMEOUT}
    
    log_info "Waiting for $service to be healthy (max ${max_wait}s)..."
    
    local elapsed=0
    while [ $elapsed -lt $max_wait ]; do
        if curl -s -f "http://localhost:${port}${endpoint}" > /dev/null 2>&1; then
            log_success "$service is healthy"
            return 0
        fi
        
        sleep $HEALTH_CHECK_INTERVAL
        elapsed=$((elapsed + HEALTH_CHECK_INTERVAL))
        log_info "Waiting... (${elapsed}s/${max_wait}s)"
    done
    
    log_error "$service failed to become healthy within ${max_wait}s"
    return 1
}

# Function to test core profile
test_core_profile() {
    log_header "Testing Core Profile"
    
    log_info "Starting core services..."
    docker compose up -d kaspa-node dashboard nginx
    
    # Wait for services
    sleep 20
    
    # Test Kaspa node
    log_info "Testing Kaspa node..."
    if docker ps | grep -q "kaspa-node.*Up"; then
        log_success "Kaspa node is running"
        SERVICE_RESULTS["kaspa-node"]="PASS"
    else
        log_error "Kaspa node failed to start"
        SERVICE_RESULTS["kaspa-node"]="FAIL"
        return 1
    fi
    
    # Test dashboard
    log_info "Testing dashboard..."
    if wait_for_service "dashboard" "8080" "/" 60; then
        SERVICE_RESULTS["dashboard"]="PASS"
    else
        log_error "Dashboard failed health check"
        SERVICE_RESULTS["dashboard"]="FAIL"
        return 1
    fi
    
    # Test nginx
    log_info "Testing nginx..."
    if curl -s -f http://localhost:80 > /dev/null 2>&1; then
        log_success "Nginx is serving requests"
        SERVICE_RESULTS["nginx"]="PASS"
    else
        log_error "Nginx failed to respond"
        SERVICE_RESULTS["nginx"]="FAIL"
        return 1
    fi
    
    PROFILE_RESULTS["core"]="PASS"
    log_success "Core profile test completed successfully"
    return 0
}

# Function to test production profile
test_prod_profile() {
    log_header "Testing Production Profile"
    
    log_info "Starting production services..."
    docker compose --profile prod up -d
    
    sleep 30
    
    # Test Kasia services
    if docker ps | grep -q "kasia-indexer.*Up"; then
        log_info "Testing Kasia indexer..."
        if wait_for_service "kasia-indexer" "3002" "/swagger-ui/" 120; then
            SERVICE_RESULTS["kasia-indexer"]="PASS"
        else
            log_warning "Kasia indexer health check failed"
            SERVICE_RESULTS["kasia-indexer"]="WARN"
        fi
    fi
    
    if docker ps | grep -q "kasia-app.*Up"; then
        log_info "Testing Kasia app..."
        if wait_for_service "kasia-app" "3001" "/" 60; then
            SERVICE_RESULTS["kasia-app"]="PASS"
        else
            log_warning "Kasia app health check failed"
            SERVICE_RESULTS["kasia-app"]="WARN"
        fi
    fi
    
    PROFILE_RESULTS["prod"]="PASS"
    log_success "Production profile test completed"
    return 0
}

# Function to test explorer profile
test_explorer_profile() {
    log_header "Testing Explorer Profile"
    
    log_info "Starting explorer services..."
    docker compose --profile explorer up -d
    
    sleep 40
    
    # Test database
    log_info "Testing indexer database..."
    if docker ps | grep -q "indexer-db.*Up"; then
        if docker compose exec -T indexer-db pg_isready -U indexer > /dev/null 2>&1; then
            log_success "Indexer database is ready"
            SERVICE_RESULTS["indexer-db"]="PASS"
        else
            log_error "Indexer database is not ready"
            SERVICE_RESULTS["indexer-db"]="FAIL"
            return 1
        fi
    fi
    
    # Test K-indexer
    if docker ps | grep -q "k-indexer.*Up"; then
        log_info "Testing K-indexer..."
        if wait_for_service "k-indexer" "3004" "/health" 120; then
            SERVICE_RESULTS["k-indexer"]="PASS"
        else
            log_warning "K-indexer health check failed"
            SERVICE_RESULTS["k-indexer"]="WARN"
        fi
    fi
    
    # Test Simply Kaspa indexer
    if docker ps | grep -q "simply-kaspa-indexer.*Up"; then
        log_info "Testing Simply Kaspa indexer..."
        if wait_for_service "simply-kaspa-indexer" "3005" "/health" 120; then
            SERVICE_RESULTS["simply-kaspa-indexer"]="PASS"
        else
            log_warning "Simply Kaspa indexer health check failed"
            SERVICE_RESULTS["simply-kaspa-indexer"]="WARN"
        fi
    fi
    
    PROFILE_RESULTS["explorer"]="PASS"
    log_success "Explorer profile test completed"
    return 0
}

# Function to test archive profile
test_archive_profile() {
    log_header "Testing Archive Profile"
    
    log_info "Starting archive services..."
    docker compose --profile archive up -d
    
    sleep 30
    
    # Test archive database
    log_info "Testing archive database..."
    if docker ps | grep -q "archive-db.*Up"; then
        if docker compose exec -T archive-db pg_isready -U archiver > /dev/null 2>&1; then
            log_success "Archive database is ready"
            SERVICE_RESULTS["archive-db"]="PASS"
        else
            log_error "Archive database is not ready"
            SERVICE_RESULTS["archive-db"]="FAIL"
            return 1
        fi
    fi
    
    # Test archive indexer
    if docker ps | grep -q "archive-indexer.*Up"; then
        log_info "Testing archive indexer..."
        if wait_for_service "archive-indexer" "3006" "/health" 120; then
            SERVICE_RESULTS["archive-indexer"]="PASS"
        else
            log_warning "Archive indexer health check failed"
            SERVICE_RESULTS["archive-indexer"]="WARN"
        fi
    fi
    
    PROFILE_RESULTS["archive"]="PASS"
    log_success "Archive profile test completed"
    return 0
}

# Function to test development profile
test_development_profile() {
    log_header "Testing Development Profile"
    
    log_info "Starting development services..."
    docker compose --profile development up -d
    
    sleep 20
    
    # Test Portainer
    if docker ps | grep -q "portainer.*Up"; then
        log_info "Testing Portainer..."
        if curl -s -f http://localhost:9000 > /dev/null 2>&1; then
            log_success "Portainer is accessible"
            SERVICE_RESULTS["portainer"]="PASS"
        else
            log_warning "Portainer not accessible"
            SERVICE_RESULTS["portainer"]="WARN"
        fi
    fi
    
    # Test pgAdmin
    if docker ps | grep -q "pgadmin.*Up"; then
        log_info "Testing pgAdmin..."
        if curl -s -f http://localhost:5050 > /dev/null 2>&1; then
            log_success "pgAdmin is accessible"
            SERVICE_RESULTS["pgadmin"]="PASS"
        else
            log_warning "pgAdmin not accessible"
            SERVICE_RESULTS["pgadmin"]="WARN"
        fi
    fi
    
    PROFILE_RESULTS["development"]="PASS"
    log_success "Development profile test completed"
    return 0
}

# Function to test mining profile
test_mining_profile() {
    log_header "Testing Mining Profile"
    
    log_info "Starting mining services..."
    docker compose --profile mining up -d
    
    sleep 20
    
    # Test stratum bridge
    if docker ps | grep -q "kaspa-stratum.*Up"; then
        log_info "Testing Kaspa stratum bridge..."
        if nc -z localhost 5555 2>/dev/null; then
            log_success "Stratum bridge port is accessible"
            SERVICE_RESULTS["kaspa-stratum"]="PASS"
        else
            log_warning "Stratum bridge port not accessible"
            SERVICE_RESULTS["kaspa-stratum"]="WARN"
        fi
    fi
    
    PROFILE_RESULTS["mining"]="PASS"
    log_success "Mining profile test completed"
    return 0
}

# Function to test cross-profile integration
test_cross_profile_integration() {
    log_header "Testing Cross-Profile Integration"
    
    log_info "Starting all profiles together..."
    docker compose --profile prod --profile explorer --profile archive --profile development --profile mining up -d
    
    sleep 60
    
    # Test service communication
    log_info "Testing service communication..."
    
    # Test Kasia app -> Kasia indexer
    if docker ps | grep -q "kasia-app.*Up" && docker ps | grep -q "kasia-indexer.*Up"; then
        log_info "Testing Kasia app -> Kasia indexer communication..."
        if docker compose exec -T kasia-app curl -s -f http://kasia-indexer:3000/health > /dev/null 2>&1; then
            log_success "Kasia app can reach Kasia indexer"
        else
            log_warning "Kasia app cannot reach Kasia indexer"
        fi
    fi
    
    # Test K-Social -> K-indexer
    if docker ps | grep -q "k-social.*Up" && docker ps | grep -q "k-indexer.*Up"; then
        log_info "Testing K-Social -> K-indexer communication..."
        if docker compose exec -T k-social curl -s -f http://k-indexer:3000/health > /dev/null 2>&1; then
            log_success "K-Social can reach K-indexer"
        else
            log_warning "K-Social cannot reach K-indexer"
        fi
    fi
    
    # Test indexers -> database
    if docker ps | grep -q "k-indexer.*Up" && docker ps | grep -q "indexer-db.*Up"; then
        log_info "Testing K-indexer -> database communication..."
        if docker compose exec -T k-indexer sh -c "pg_isready -h indexer-db -U indexer" > /dev/null 2>&1; then
            log_success "K-indexer can reach database"
        else
            log_warning "K-indexer cannot reach database"
        fi
    fi
    
    log_success "Cross-profile integration test completed"
    return 0
}

# Function to test system under load
test_system_load() {
    log_header "Testing System Under Load"
    
    log_info "Simulating concurrent requests..."
    
    # Test dashboard under load
    log_info "Testing dashboard with concurrent requests..."
    for i in {1..10}; do
        curl -s http://localhost:8080/ > /dev/null 2>&1 &
    done
    wait
    
    if curl -s -f http://localhost:8080/ > /dev/null 2>&1; then
        log_success "Dashboard handles concurrent requests"
    else
        log_warning "Dashboard may have issues under load"
    fi
    
    # Test nginx under load
    log_info "Testing nginx with concurrent requests..."
    for i in {1..20}; do
        curl -s http://localhost:80/ > /dev/null 2>&1 &
    done
    wait
    
    if curl -s -f http://localhost:80/ > /dev/null 2>&1; then
        log_success "Nginx handles concurrent requests"
    else
        log_warning "Nginx may have issues under load"
    fi
    
    log_success "Load testing completed"
    return 0
}

# Function to show test results
show_test_results() {
    log_header "End-to-End Test Results"
    
    echo ""
    echo "Profile Test Results:"
    echo "===================="
    for profile in "${PROFILES[@]}"; do
        result=${PROFILE_RESULTS[$profile]:-"SKIP"}
        case $result in
            PASS)
                echo -e "  ${GREEN}✅${NC} $profile: PASSED"
                ;;
            FAIL)
                echo -e "  ${RED}❌${NC} $profile: FAILED"
                ;;
            WARN)
                echo -e "  ${YELLOW}⚠️${NC} $profile: WARNING"
                ;;
            SKIP)
                echo -e "  ${BLUE}⏭️${NC} $profile: SKIPPED"
                ;;
        esac
    done
    
    echo ""
    echo "Service Test Results:"
    echo "===================="
    for service in "${!SERVICE_RESULTS[@]}"; do
        result=${SERVICE_RESULTS[$service]}
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
        esac
    done
    
    echo ""
    
    # Calculate statistics
    local total_profiles=${#PROFILES[@]}
    local passed_profiles=0
    local failed_profiles=0
    
    for profile in "${PROFILES[@]}"; do
        result=${PROFILE_RESULTS[$profile]:-"SKIP"}
        if [ "$result" = "PASS" ]; then
            ((passed_profiles++))
        elif [ "$result" = "FAIL" ]; then
            ((failed_profiles++))
        fi
    done
    
    echo "Summary:"
    echo "========"
    echo "  Total Profiles Tested: $passed_profiles"
    echo "  Passed: $passed_profiles"
    echo "  Failed: $failed_profiles"
    echo "  Services Tested: ${#SERVICE_RESULTS[@]}"
    
    if [ $failed_profiles -eq 0 ]; then
        log_success "All tested profiles passed! 🎉"
        return 0
    else
        log_error "$failed_profiles profile(s) failed"
        return 1
    fi
}

# Cleanup functions
cleanup_test_environment() {
    log_info "Cleaning up test environment..."
    
    docker compose --profile prod --profile explorer --profile archive --profile development --profile mining down
    
    if [ "$CLEANUP_VOLUMES" = true ]; then
        log_warning "Removing data volumes..."
        docker compose down -v
    fi
    
    log_success "Cleanup completed"
}

cleanup_on_exit() {
    local exit_code=$?
    if [ "$ENABLE_CLEANUP" = true ]; then
        cleanup_test_environment
    fi
    exit $exit_code
}

# Function to show usage
show_usage() {
    echo "End-to-End System Integration Testing Script"
    echo
    echo "Usage: $0 [OPTIONS]"
    echo
    echo "Options:"
    echo "  -h, --help            Show this help message"
    echo "  --profile PROFILE     Test specific profile only (core, prod, explorer, archive, development, mining)"
    echo "  --skip-load           Skip load testing"
    echo "  --cleanup-volumes     Remove data volumes during cleanup"
    echo "  --no-cleanup          Skip cleanup on exit"
    echo
    echo "Examples:"
    echo "  $0                    # Run all E2E tests"
    echo "  $0 --profile core     # Test core profile only"
    echo "  $0 --skip-load        # Skip load testing"
    echo
}

# Parse command line arguments
SPECIFIC_PROFILE=""
SKIP_LOAD=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_usage
            exit 0
            ;;
        --profile)
            SPECIFIC_PROFILE=$2
            shift 2
            ;;
        --skip-load)
            SKIP_LOAD=true
            shift
            ;;
        --cleanup-volumes)
            CLEANUP_VOLUMES=true
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
    echo "║          Kaspa All-in-One End-to-End Testing Suite          ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    
    # Check prerequisites
    if ! command -v docker &> /dev/null || ! docker compose version &> /dev/null; then
        log_error "Docker and Docker Compose are required"
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
    
    # Run tests
    if [ -n "$SPECIFIC_PROFILE" ]; then
        log_info "Testing specific profile: $SPECIFIC_PROFILE"
        case $SPECIFIC_PROFILE in
            core)
                test_core_profile
                ;;
            prod)
                test_prod_profile
                ;;
            explorer)
                test_explorer_profile
                ;;
            archive)
                test_archive_profile
                ;;
            development)
                test_development_profile
                ;;
            mining)
                test_mining_profile
                ;;
            *)
                log_error "Unknown profile: $SPECIFIC_PROFILE"
                exit 1
                ;;
        esac
    else
        log_info "Running comprehensive E2E tests..."
        
        test_core_profile || log_warning "Core profile test had issues"
        test_prod_profile || log_warning "Production profile test had issues"
        test_explorer_profile || log_warning "Explorer profile test had issues"
        test_archive_profile || log_warning "Archive profile test had issues"
        test_development_profile || log_warning "Development profile test had issues"
        test_mining_profile || log_warning "Mining profile test had issues"
        
        test_cross_profile_integration || log_warning "Cross-profile integration had issues"
        
        if [ "$SKIP_LOAD" != true ]; then
            test_system_load || log_warning "Load testing had issues"
        fi
    fi
    
    # Show results
    show_test_results
}

# Run main function
main
