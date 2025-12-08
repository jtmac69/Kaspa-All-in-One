#!/bin/bash
# K-Social App Build Script with Version Control
# Supports flexible build configurations for different deployment scenarios

set -e

# Default values
VERSION=${K_SOCIAL_VERSION:-master}
MODE=${1:-docker}
TAG=${2:-k-social-app}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Display usage information
usage() {
    cat << EOF
Usage: $0 [MODE] [TAG]

Build modes:
  docker          Build with current K_SOCIAL_VERSION (default: master)
  latest          Build with latest master branch
  version <ver>   Build with specific version/branch
  dev             Build with development optimizations
  prod            Build with production optimizations

Examples:
  $0                          # Build with default settings
  $0 latest                   # Build with latest master
  $0 version v1.2.3          # Build specific version
  $0 prod k-social-prod      # Production build with custom tag

Environment Variables:
  K_SOCIAL_VERSION           Version/branch to build (default: master)
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
    local build_args=""
    
    log_info "Building K-Social App with version: $version"
    log_info "Docker tag: $tag"
    
    # Enable BuildKit for better performance
    export DOCKER_BUILDKIT=1
    
    # Prepare build arguments
    build_args="--build-arg K_SOCIAL_VERSION=$version"
    
    # Add cache optimization
    build_args="$build_args --build-arg BUILDKIT_INLINE_CACHE=1"
    
    # Build the image
    log_info "Starting Docker build..."
    if docker build $build_args -t "$tag" .; then
        log_info "Build completed successfully!"
        log_info "Image tagged as: $tag"
        
        # Display image information
        docker images "$tag" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
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
    container_id=$(docker run -d --rm -p 0:3000 "$tag")
    
    if [ $? -eq 0 ]; then
        sleep 5
        if docker ps | grep -q "$container_id"; then
            log_info "Container started successfully"
            docker stop "$container_id" > /dev/null
        else
            log_error "Container failed to start properly"
            return 1
        fi
    else
        log_error "Failed to start test container"
        return 1
    fi
    
    log_info "Build validation completed successfully!"
}

# Main execution
main() {
    # Check for help flag
    if [[ "$1" == "-h" || "$1" == "--help" ]]; then
        usage
        exit 0
    fi
    
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
            ;;
        "prod")
            log_info "Production build mode"
            build_image "$VERSION" "${TAG}-prod"
            ;;
        *)
            log_error "Unknown build mode: $MODE"
            usage
            exit 1
            ;;
    esac
    
    # Validate the build
    validate_build "$TAG"
    
    log_info "K-Social App build process completed!"
}

# Execute main function
main "$@"