#!/bin/bash
# Kaspa Stratum Bridge Build Script
# Supports flexible build configurations for mining operations

set -e

# Default values
VERSION=${STRATUM_VERSION:-master}
MODE=${1:-docker}
TAG=${2:-kaspa-stratum}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_debug() {
    echo -e "${BLUE}[DEBUG]${NC} $1"
}

# Display usage information
usage() {
    cat << EOF
Usage: $0 [MODE] [TAG]

Build modes:
  docker          Build with current STRATUM_VERSION (default: master)
  latest          Build with latest master branch
  version <ver>   Build with specific version/branch
  dev             Build with development optimizations
  prod            Build with production optimizations

Examples:
  $0                          # Build with default settings
  $0 latest                   # Build with latest master
  $0 version v1.0.0          # Build specific version
  $0 prod kaspa-stratum-prod # Production build with custom tag

Environment Variables:
  STRATUM_VERSION            Version/branch to build (default: master)
  DOCKER_BUILDKIT           Enable BuildKit (recommended: 1)
EOF
}

# Validate Docker is available
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi
}

# Build function
build_image() {
    local version=$1
    local tag=$2
    
    log_info "Building Kaspa Stratum Bridge with version: $version"
    log_info "Docker tag: $tag"
    
    # Enable BuildKit for better performance
    export DOCKER_BUILDKIT=1
    
    # Prepare build arguments
    local build_args="--build-arg STRATUM_VERSION=$version"
    build_args="$build_args --build-arg BUILDKIT_INLINE_CACHE=1"
    
    # Add labels for better image management
    build_args="$build_args --label kaspa-stratum.version=$version"
    build_args="$build_args --label kaspa-stratum.build-date=$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
    build_args="$build_args --label kaspa-stratum.repository=aglov413/kaspa-stratum-bridge"
    
    # Build the image
    log_info "Starting Docker build..."
    if docker build $build_args -t "$tag" .; then
        log_info "Build completed successfully!"
        log_info "Image tagged as: $tag"
        
        # Display image information
        docker images "$tag" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
        
        # Display image labels
        log_debug "Image labels:"
        docker inspect "$tag" --format '{{range $k, $v := .Config.Labels}}{{$k}}: {{$v}}{{"\n"}}{{end}}' | grep kaspa-stratum
        
    else
        log_error "Build failed!"
        exit 1
    fi
}

# Validate build
validate_build() {
    local tag=$1
    
    log_info "Validating build..."
    
    # Check if image exists
    if ! docker images "$tag" --format "{{.Repository}}" | grep -q "^${tag%:*}$"; then
        log_error "Image $tag not found after build"
        return 1
    fi
    
    # Test container startup (quick test)
    log_info "Testing container startup..."
    local container_id
    container_id=$(docker run -d --rm \
        -e KASPA_RPC_SERVER="kaspa-node:16111" \
        -p 0:5555 "$tag" || echo "")
    
    if [ -n "$container_id" ]; then
        sleep 5
        if docker ps | grep -q "$container_id"; then
            log_info "Container started successfully"
            docker stop "$container_id" > /dev/null 2>&1 || true
        else
            log_warn "Container may have failed to start (this is expected without Kaspa node)"
            docker logs "$container_id" 2>/dev/null | tail -10 || true
        fi
    else
        log_warn "Failed to start test container (this may be expected without Kaspa node)"
    fi
    
    log_info "Build validation completed!"
}

# Performance benchmark
run_performance_test() {
    local tag=$1
    
    log_info "Running performance benchmark..."
    
    # Check image size
    local image_size
    image_size=$(docker images "$tag" --format "{{.Size}}")
    log_info "Image size: $image_size"
    
    # Measure startup time
    local start_time=$(date +%s)
    local container_id
    container_id=$(docker run -d --rm \
        -e KASPA_RPC_SERVER="kaspa-node:16111" \
        "$tag" echo "startup test" 2>/dev/null || echo "")
    
    if [ -n "$container_id" ]; then
        docker wait "$container_id" > /dev/null 2>&1 || true
        local end_time=$(date +%s)
        local startup_time=$((end_time - start_time))
        log_info "Container startup time: ${startup_time}s"
    fi
}

# Main execution
main() {
    # Check for help flag
    if [[ "$1" == "-h" || "$1" == "--help" ]]; then
        usage
        exit 0
    fi
    
    # Change to script directory
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    cd "$SCRIPT_DIR" || exit 1
    
    # Validate prerequisites
    check_docker
    
    # Parse mode and execute
    case $MODE in
        "docker")
            build_image "$VERSION" "$TAG"
            ;;
        "latest")
            build_image "master" "$TAG"
            ;;
        "version")
            if [ -z "$2" ]; then
                log_error "Version not specified for 'version' mode"
                usage
                exit 1
            fi
            build_image "$2" "$TAG"
            ;;
        "dev")
            log_info "Development build mode"
            build_image "$VERSION" "${TAG}-dev"
            TAG="${TAG}-dev"
            ;;
        "prod")
            log_info "Production build mode"
            build_image "$VERSION" "${TAG}-prod"
            TAG="${TAG}-prod"
            ;;
        *)
            log_error "Unknown build mode: $MODE"
            usage
            exit 1
            ;;
    esac
    
    # Validate the build
    validate_build "$TAG"
    
    # Run performance test for production builds
    if [[ "$MODE" == "prod" ]]; then
        run_performance_test "$TAG"
    fi
    
    log_info "Kaspa Stratum Bridge build process completed successfully!"
    log_info "You can now run the stratum bridge with: docker run -d -p 5555:5555 $TAG"
}

# Execute main function
main "$@"
