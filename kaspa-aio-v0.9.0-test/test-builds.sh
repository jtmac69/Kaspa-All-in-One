#!/bin/bash

# Build Verification and Version Compatibility Testing Script
# Tests Docker image builds, version compatibility, and build-time integration

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
BUILD_TIMEOUT=600
PARALLEL_BUILDS=false

# Build results tracking
declare -A BUILD_RESULTS
declare -A BUILD_TIMES
declare -A IMAGE_SIZES

# Services that require building
BUILD_SERVICES=(
    "dashboard"
    "kasia-app"
    "k-social"
    "k-indexer"
    "simply-kaspa-indexer"
    "archive-indexer"
    "kaspa-stratum"
)

# Function to measure build time
measure_build_time() {
    local service=$1
    local start_time=$(date +%s)
    
    log_info "Building $service..."
    
    if timeout $BUILD_TIMEOUT docker compose build --no-cache "$service" 2>&1 | tee "/tmp/build-${service}.log"; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        BUILD_TIMES[$service]=$duration
        BUILD_RESULTS[$service]="PASS"
        
        log_success "$service built successfully in ${duration}s"
        return 0
    else
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        BUILD_TIMES[$service]=$duration
        BUILD_RESULTS[$service]="FAIL"
        
        log_error "$service build failed after ${duration}s"
        log_error "Build log saved to /tmp/build-${service}.log"
        return 1
    fi
}

# Function to get image size
get_image_size() {
    local service=$1
    local image_name=$(docker compose config | grep -A 5 "^  ${service}:" | grep "image:" | awk '{print $2}')
    
    if [ -z "$image_name" ]; then
        # For built images, construct the name
        image_name="kaspa-aio-${service}:latest"
    fi
    
    local size=$(docker images --format "{{.Size}}" "$image_name" 2>/dev/null | head -1)
    
    if [ -n "$size" ]; then
        IMAGE_SIZES[$service]=$size
        log_info "$service image size: $size"
    else
        log_warning "Could not determine image size for $service"
        IMAGE_SIZES[$service]="unknown"
    fi
}

# Function to test build with different versions
test_version_compatibility() {
    local service=$1
    local version_var=$2
    local versions=("${@:3}")
    
    log_header "Testing Version Compatibility: $service"
    
    for version in "${versions[@]}"; do
        log_info "Testing $service with version: $version"
        
        export "$version_var=$version"
        
        if timeout $BUILD_TIMEOUT docker compose build --no-cache "$service" > /dev/null 2>&1; then
            log_success "$service builds successfully with $version_var=$version"
        else
            log_error "$service failed to build with $version_var=$version"
            return 1
        fi
    done
    
    log_success "Version compatibility test passed for $service"
    return 0
}

# Function to test all service builds
test_all_builds() {
    log_header "Testing All Service Builds"
    
    local failed_builds=0
    
    for service in "${BUILD_SERVICES[@]}"; do
        if ! measure_build_time "$service"; then
            ((failed_builds++))
        fi
        
        if [ "${BUILD_RESULTS[$service]}" = "PASS" ]; then
            get_image_size "$service"
        fi
        
        echo ""
    done
    
    if [ $failed_builds -eq 0 ]; then
        log_success "All service builds completed successfully"
        return 0
    else
        log_error "$failed_builds service build(s) failed"
        return 1
    fi
}

# Function to test parallel builds
test_parallel_builds() {
    log_header "Testing Parallel Builds"
    
    log_info "Building all services in parallel..."
    local start_time=$(date +%s)
    
    if timeout $((BUILD_TIMEOUT * 2)) docker compose build --parallel 2>&1 | tee "/tmp/build-parallel.log"; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        log_success "Parallel build completed in ${duration}s"
        log_info "Parallel build log saved to /tmp/build-parallel.log"
        return 0
    else
        log_error "Parallel build failed"
        return 1
    fi
}

# Function to test build cache effectiveness
test_build_cache() {
    log_header "Testing Build Cache Effectiveness"
    
    local service="dashboard"
    
    # First build (no cache)
    log_info "First build (no cache)..."
    docker compose build --no-cache "$service" > /dev/null 2>&1
    local first_build_time=${BUILD_TIMES[$service]:-0}
    
    # Second build (with cache)
    log_info "Second build (with cache)..."
    local start_time=$(date +%s)
    docker compose build "$service" > /dev/null 2>&1
    local end_time=$(date +%s)
    local cached_build_time=$((end_time - start_time))
    
    log_info "First build time: ${first_build_time}s"
    log_info "Cached build time: ${cached_build_time}s"
    
    if [ $cached_build_time -lt $first_build_time ]; then
        local improvement=$((100 - (cached_build_time * 100 / first_build_time)))
        log_success "Build cache is effective (${improvement}% faster)"
        return 0
    else
        log_warning "Build cache may not be working optimally"
        return 1
    fi
}

# Function to test multi-stage build optimization
test_multistage_builds() {
    log_header "Testing Multi-Stage Build Optimization"
    
    # Check if services use multi-stage builds
    local services_with_multistage=()
    
    for service in "${BUILD_SERVICES[@]}"; do
        local dockerfile=$(docker compose config | grep -A 10 "^  ${service}:" | grep "dockerfile:" | awk '{print $2}')
        
        if [ -z "$dockerfile" ]; then
            dockerfile="./services/${service}/Dockerfile"
        fi
        
        if [ -f "$dockerfile" ]; then
            if grep -q "^FROM.*AS" "$dockerfile"; then
                services_with_multistage+=("$service")
                log_info "$service uses multi-stage build"
            fi
        fi
    done
    
    if [ ${#services_with_multistage[@]} -gt 0 ]; then
        log_success "${#services_with_multistage[@]} service(s) use multi-stage builds"
        return 0
    else
        log_warning "No services use multi-stage builds"
        return 1
    fi
}

# Function to test external repository integration
test_external_repo_integration() {
    log_header "Testing External Repository Integration"
    
    # Test services that clone external repos during build
    local external_services=("kasia-app" "k-social" "k-indexer" "simply-kaspa-indexer" "kaspa-stratum")
    
    for service in "${external_services[@]}"; do
        log_info "Testing external repo integration for $service..."
        
        # Check if Dockerfile contains git clone
        local dockerfile="./services/${service}/Dockerfile"
        
        if [ -f "$dockerfile" ]; then
            if grep -q "git clone" "$dockerfile"; then
                log_success "$service integrates external repository"
            else
                log_warning "$service may not integrate external repository"
            fi
        else
            log_warning "Dockerfile not found for $service"
        fi
    done
    
    log_success "External repository integration test completed"
    return 0
}

# Function to test build arguments
test_build_arguments() {
    log_header "Testing Build Arguments"
    
    # Test K-Social with different versions
    log_info "Testing K-Social with custom version..."
    if K_SOCIAL_VERSION="main" docker compose build k-social > /dev/null 2>&1; then
        log_success "K-Social builds with custom K_SOCIAL_VERSION"
    else
        log_error "K-Social failed to build with custom version"
        return 1
    fi
    
    # Test Simply Kaspa with different versions
    log_info "Testing Simply Kaspa with custom version..."
    if SIMPLY_KASPA_VERSION="main" docker compose build simply-kaspa-indexer > /dev/null 2>&1; then
        log_success "Simply Kaspa builds with custom SIMPLY_KASPA_VERSION"
    else
        log_error "Simply Kaspa failed to build with custom version"
        return 1
    fi
    
    log_success "Build arguments test completed"
    return 0
}

# Function to test image layer optimization
test_image_layers() {
    log_header "Testing Image Layer Optimization"
    
    for service in "${BUILD_SERVICES[@]}"; do
        if [ "${BUILD_RESULTS[$service]}" != "PASS" ]; then
            continue
        fi
        
        local image_name="kaspa-aio-${service}:latest"
        local layer_count=$(docker history "$image_name" 2>/dev/null | wc -l)
        
        if [ $layer_count -gt 0 ]; then
            log_info "$service has $layer_count layers"
            
            if [ $layer_count -gt 50 ]; then
                log_warning "$service has many layers ($layer_count) - consider optimization"
            else
                log_success "$service has reasonable layer count ($layer_count)"
            fi
        fi
    done
    
    return 0
}

# Function to test image security
test_image_security() {
    log_header "Testing Image Security"
    
    # Check if images run as non-root
    for service in "${BUILD_SERVICES[@]}"; do
        if [ "${BUILD_RESULTS[$service]}" != "PASS" ]; then
            continue
        fi
        
        local image_name="kaspa-aio-${service}:latest"
        local user=$(docker inspect "$image_name" --format='{{.Config.User}}' 2>/dev/null)
        
        if [ -n "$user" ] && [ "$user" != "root" ] && [ "$user" != "0" ]; then
            log_success "$service runs as non-root user ($user)"
        else
            log_warning "$service may run as root user"
        fi
    done
    
    return 0
}

# Function to test build reproducibility
test_build_reproducibility() {
    log_header "Testing Build Reproducibility"
    
    local service="dashboard"
    
    log_info "Building $service twice to test reproducibility..."
    
    # First build
    docker compose build --no-cache "$service" > /dev/null 2>&1
    local image1_id=$(docker images --format "{{.ID}}" "kaspa-aio-${service}:latest" | head -1)
    
    # Second build
    docker compose build --no-cache "$service" > /dev/null 2>&1
    local image2_id=$(docker images --format "{{.ID}}" "kaspa-aio-${service}:latest" | head -1)
    
    if [ "$image1_id" = "$image2_id" ]; then
        log_success "Builds are reproducible (same image ID)"
        return 0
    else
        log_warning "Builds may not be fully reproducible (different image IDs)"
        log_info "This is normal if timestamps or dynamic content are included"
        return 0
    fi
}

# Function to show build results
show_build_results() {
    log_header "Build Test Results"
    
    echo ""
    echo "Build Results:"
    echo "=============="
    for service in "${BUILD_SERVICES[@]}"; do
        result=${BUILD_RESULTS[$service]:-"SKIP"}
        time=${BUILD_TIMES[$service]:-"N/A"}
        size=${IMAGE_SIZES[$service]:-"N/A"}
        
        case $result in
            PASS)
                echo -e "  ${GREEN}✅${NC} $service: PASSED (${time}s, ${size})"
                ;;
            FAIL)
                echo -e "  ${RED}❌${NC} $service: FAILED (${time}s)"
                ;;
            SKIP)
                echo -e "  ${BLUE}⏭️${NC} $service: SKIPPED"
                ;;
        esac
    done
    
    echo ""
    
    # Calculate statistics
    local total_services=${#BUILD_SERVICES[@]}
    local passed_builds=0
    local failed_builds=0
    local total_time=0
    
    for service in "${BUILD_SERVICES[@]}"; do
        result=${BUILD_RESULTS[$service]:-"SKIP"}
        if [ "$result" = "PASS" ]; then
            ((passed_builds++))
            time=${BUILD_TIMES[$service]:-0}
            total_time=$((total_time + time))
        elif [ "$result" = "FAIL" ]; then
            ((failed_builds++))
        fi
    done
    
    echo "Summary:"
    echo "========"
    echo "  Total Services: $total_services"
    echo "  Passed: $passed_builds"
    echo "  Failed: $failed_builds"
    echo "  Total Build Time: ${total_time}s"
    
    if [ $passed_builds -gt 0 ]; then
        local avg_time=$((total_time / passed_builds))
        echo "  Average Build Time: ${avg_time}s"
    fi
    
    if [ $failed_builds -eq 0 ]; then
        log_success "All builds passed! 🎉"
        return 0
    else
        log_error "$failed_builds build(s) failed"
        return 1
    fi
}

# Cleanup functions
cleanup_build_artifacts() {
    log_info "Cleaning up build artifacts..."
    
    # Remove build logs
    rm -f /tmp/build-*.log
    
    # Optionally remove built images
    if [ "$CLEANUP_IMAGES" = true ]; then
        log_warning "Removing built images..."
        for service in "${BUILD_SERVICES[@]}"; do
            docker rmi "kaspa-aio-${service}:latest" 2>/dev/null || true
        done
    fi
    
    # Clean build cache
    if [ "$CLEANUP_CACHE" = true ]; then
        log_warning "Removing build cache..."
        docker builder prune -f
    fi
    
    log_success "Cleanup completed"
}

cleanup_on_exit() {
    local exit_code=$?
    if [ "$ENABLE_CLEANUP" = true ]; then
        cleanup_build_artifacts
    fi
    exit $exit_code
}

# Function to show usage
show_usage() {
    echo "Build Verification and Version Compatibility Testing Script"
    echo
    echo "Usage: $0 [OPTIONS]"
    echo
    echo "Options:"
    echo "  -h, --help            Show this help message"
    echo "  --service SERVICE     Test specific service only"
    echo "  --parallel            Test parallel builds"
    echo "  --skip-cache          Skip build cache test"
    echo "  --skip-security       Skip security tests"
    echo "  --cleanup-images      Remove built images after testing"
    echo "  --cleanup-cache       Remove build cache after testing"
    echo "  --no-cleanup          Skip cleanup on exit"
    echo
    echo "Examples:"
    echo "  $0                    # Run all build tests"
    echo "  $0 --service dashboard # Test dashboard build only"
    echo "  $0 --parallel         # Test parallel builds"
    echo
}

# Parse command line arguments
SPECIFIC_SERVICE=""
SKIP_CACHE=false
SKIP_SECURITY=false
ENABLE_CLEANUP=true
CLEANUP_IMAGES=false
CLEANUP_CACHE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_usage
            exit 0
            ;;
        --service)
            SPECIFIC_SERVICE=$2
            shift 2
            ;;
        --parallel)
            PARALLEL_BUILDS=true
            shift
            ;;
        --skip-cache)
            SKIP_CACHE=true
            shift
            ;;
        --skip-security)
            SKIP_SECURITY=true
            shift
            ;;
        --cleanup-images)
            CLEANUP_IMAGES=true
            shift
            ;;
        --cleanup-cache)
            CLEANUP_CACHE=true
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
    echo "║         Kaspa All-in-One Build Verification Suite           ║"
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
    if [ -n "$SPECIFIC_SERVICE" ]; then
        log_info "Testing specific service: $SPECIFIC_SERVICE"
        measure_build_time "$SPECIFIC_SERVICE"
        get_image_size "$SPECIFIC_SERVICE"
    elif [ "$PARALLEL_BUILDS" = true ]; then
        test_parallel_builds
    else
        log_info "Running comprehensive build tests..."
        
        test_all_builds || log_warning "Some builds failed"
        
        if [ "$SKIP_CACHE" != true ]; then
            test_build_cache || log_warning "Build cache test had issues"
        fi
        
        test_multistage_builds || log_warning "Multi-stage build test had issues"
        test_external_repo_integration || log_warning "External repo integration test had issues"
        test_build_arguments || log_warning "Build arguments test had issues"
        test_image_layers || log_warning "Image layer test had issues"
        
        if [ "$SKIP_SECURITY" != true ]; then
            test_image_security || log_warning "Security test had issues"
        fi
        
        test_build_reproducibility || log_warning "Reproducibility test had issues"
    fi
    
    # Show results
    show_build_results
}

# Run main function
main
