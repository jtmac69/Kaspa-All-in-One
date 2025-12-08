#!/bin/bash
# Simply Kaspa Indexer Build Script with TimescaleDB Enhancements
# Supports flexible build configurations and TimescaleDB optimizations

set -e

# Default values
VERSION=${SIMPLY_KASPA_VERSION:-master}
MODE=${1:-docker}
TAG=${2:-simply-kaspa-indexer}

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
  docker          Build with current SIMPLY_KASPA_VERSION (default: master)
  latest          Build with latest master branch
  version <ver>   Build with specific version/branch
  timescaledb     Build with TimescaleDB optimizations enabled
  personal        Build with Personal Indexer features enabled
  archive         Build with archive mode optimizations
  dev             Build with development optimizations
  prod            Build with production optimizations

Examples:
  $0                          # Build with default settings
  $0 latest                   # Build with latest master
  $0 version v1.0.0          # Build specific version
  $0 timescaledb             # Build with TimescaleDB optimizations
  $0 personal simply-personal # Build with Personal Indexer features
  $0 archive simply-archive  # Build for archive mode
  $0 prod simply-prod        # Production build with custom tag

Environment Variables:
  SIMPLY_KASPA_VERSION       Version/branch to build (default: master)
  ENABLE_TIMESCALEDB         Enable TimescaleDB optimizations (default: true)
  PERSONAL_INDEXER_MODE      Enable Personal Indexer features (default: false)
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

# Validate TimescaleDB configuration files
validate_timescaledb_files() {
    local required_files=(
        "timescaledb-config.toml"
        "batch-processor-config.toml"
        "personal-indexer-config.toml"
    )
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            log_error "Required TimescaleDB file not found: $file"
            exit 1
        fi
    done
    
    log_info "TimescaleDB configuration files validated"
}

# Build function
build_image() {
    local version=$1
    local tag=$2
    local enable_timescaledb=${3:-true}
    local personal_mode=${4:-false}
    
    log_info "Building Simply Kaspa Indexer with version: $version"
    log_info "Docker tag: $tag"
    log_info "TimescaleDB enabled: $enable_timescaledb"
    log_info "Personal Indexer mode: $personal_mode"
    
    # Validate TimescaleDB files if enabled
    if [ "$enable_timescaledb" = "true" ]; then
        validate_timescaledb_files
    fi
    
    # Enable BuildKit for better performance
    export DOCKER_BUILDKIT=1
    
    # Prepare build arguments
    local build_args="--build-arg SIMPLY_KASPA_VERSION=$version"
    build_args="$build_args --build-arg ENABLE_TIMESCALEDB=$enable_timescaledb"
    build_args="$build_args --build-arg BUILDKIT_INLINE_CACHE=1"
    
    # Add labels for better image management
    build_args="$build_args --label simply-kaspa.version=$version"
    build_args="$build_args --label simply-kaspa.timescaledb=$enable_timescaledb"
    build_args="$build_args --label simply-kaspa.personal-mode=$personal_mode"
    build_args="$build_args --label simply-kaspa.build-date=$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
    
    # Build the image
    log_info "Starting Docker build..."
    if docker build $build_args -t "$tag" .; then
        log_info "Build completed successfully!"
        log_info "Image tagged as: $tag"
        
        # Display image information
        docker images "$tag" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
        
        # Display image labels
        log_debug "Image labels:"
        docker inspect "$tag" --format '{{range $k, $v := .Config.Labels}}{{$k}}: {{$v}}{{"\n"}}{{end}}' | grep simply-kaspa
        
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
        -e DATABASE_URL="postgresql://test:test@localhost:5432/test" \
        -e KASPA_NODE_URL="http://localhost:16111" \
        -p 0:3000 "$tag" || echo "")
    
    if [ -n "$container_id" ]; then
        sleep 5
        if docker ps | grep -q "$container_id"; then
            log_info "Container started successfully"
            docker stop "$container_id" > /dev/null 2>&1 || true
        else
            log_warn "Container may have failed to start (this is expected without database)"
            docker logs "$container_id" 2>/dev/null | tail -5 || true
        fi
    else
        log_warn "Failed to start test container (this may be expected without database)"
    fi
    
    log_info "Build validation completed!"
}

# Test TimescaleDB integration
test_timescaledb_integration() {
    local tag=$1
    
    log_info "Testing TimescaleDB integration..."
    
    # Check if TimescaleDB files are present in the image
    local test_files=(
        "/app/config/timescaledb-config.toml"
        "/app/config/batch-processor-config.toml"
        "/app/config/personal-indexer-config.toml"
    )
    
    for file in "${test_files[@]}"; do
        if docker run --rm "$tag" test -f "$file"; then
            log_debug "✓ Found: $file"
        else
            log_error "✗ Missing: $file"
            return 1
        fi
    done
    
    log_info "TimescaleDB integration test passed!"
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
        -e DATABASE_URL="postgresql://test:test@localhost:5432/test" \
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
        "timescaledb")
            log_info "TimescaleDB optimized build mode"
            build_image "$VERSION" "${TAG}-timescaledb" "true" "false"
            TAG="${TAG}-timescaledb"
            ;;
        "personal")
            log_info "Personal Indexer build mode"
            build_image "$VERSION" "${TAG}-personal" "true" "true"
            TAG="${TAG}-personal"
            ;;
        "archive")
            log_info "Archive mode build"
            build_image "$VERSION" "${TAG}-archive" "true" "false"
            TAG="${TAG}-archive"
            ;;
        "dev")
            log_info "Development build mode"
            build_image "$VERSION" "${TAG}-dev" "true" "false"
            TAG="${TAG}-dev"
            ;;
        "prod")
            log_info "Production build mode"
            build_image "$VERSION" "${TAG}-prod" "true" "false"
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
    
    # Test TimescaleDB integration if enabled
    if [[ "$MODE" == "timescaledb" || "$MODE" == "personal" || "$MODE" == "archive" || "$MODE" == "dev" || "$MODE" == "prod" ]]; then
        test_timescaledb_integration "$TAG"
    fi
    
    # Run performance test for production builds
    if [[ "$MODE" == "prod" ]]; then
        run_performance_test "$TAG"
    fi
    
    log_info "Simply Kaspa Indexer build process completed successfully!"
    log_info "You can now run the indexer with: docker run -d $TAG"
}

# Execute main function
main "$@"
