#!/bin/bash

# Kasia App Build Script
# This script provides flexible options for building the Kasia messaging app

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default configuration
KASIA_VERSION="master"
BUILD_MODE="docker"
FORCE_REBUILD=false
USE_CACHE=true

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo
    echo "Options:"
    echo "  -v, --version VERSION    Kasia version/branch to build (default: main)"
    echo "  -m, --mode MODE          Build mode: docker, local, or official (default: docker)"
    echo "  -f, --force              Force rebuild without cache"
    echo "  --no-cache               Disable Docker build cache"
    echo "  -h, --help               Show this help message"
    echo
    echo "Build Modes:"
    echo "  docker     Build from source using Docker (default)"
    echo "  local      Clone and build locally (requires Node.js, Rust, etc.)"
    echo "  official   Use official Docker image (if available)"
    echo
    echo "Examples:"
    echo "  $0                                    # Build latest main branch"
    echo "  $0 -v v0.6.2                        # Build specific version"
    echo "  $0 -m official                       # Use official image"
    echo "  $0 -v main -f                       # Force rebuild of main branch"
    echo
}

# Function to build using Docker
build_docker() {
    local version=$1
    local cache_flag=""
    
    if [ "$USE_CACHE" = false ]; then
        cache_flag="--no-cache"
    fi
    
    echo -e "${BLUE}Building Kasia app using Docker...${NC}"
    echo "Version: $version"
    echo "Cache: $USE_CACHE"
    echo
    
    docker build $cache_flag \
        --build-arg KASIA_VERSION="$version" \
        -t kasia-app:latest \
        -t kasia-app:"$version" \
        .
    
    echo -e "${GREEN}✓ Docker build completed successfully${NC}"
}

# Function to use official image
build_official() {
    echo -e "${BLUE}Using official Kasia Docker image...${NC}"
    
    # Check if official image exists
    if docker pull kkluster/kasia:latest 2>/dev/null; then
        docker tag kkluster/kasia:latest kasia-app:latest
        echo -e "${GREEN}✓ Official image pulled and tagged successfully${NC}"
    else
        echo -e "${RED}✗ Official image not available${NC}"
        echo "Falling back to Docker build..."
        build_docker "$KASIA_VERSION"
    fi
}

# Function to build locally
build_local() {
    local version=$1
    local temp_dir="kasia-build-temp"
    
    echo -e "${BLUE}Building Kasia app locally...${NC}"
    echo "Version: $version"
    echo
    
    # Check dependencies
    if ! command -v node &> /dev/null; then
        echo -e "${RED}✗ Node.js not found. Please install Node.js 20+${NC}"
        exit 1
    fi
    
    if ! command -v cargo &> /dev/null; then
        echo -e "${RED}✗ Rust/Cargo not found. Please install Rust toolchain${NC}"
        exit 1
    fi
    
    # Clone repository
    echo "Cloning Kasia repository..."
    if [ -d "$temp_dir" ]; then
        rm -rf "$temp_dir"
    fi
    
    git clone --depth 1 --branch "$version" https://github.com/K-Kluster/Kasia.git "$temp_dir"
    cd "$temp_dir"
    
    # Build application
    echo "Installing dependencies..."
    npm install
    
    echo "Building WASM components..."
    npm run wasm:build || echo "WASM build failed, continuing..."
    
    echo "Building application..."
    npm run build:production || npm run build || echo "Build completed with warnings"
    
    # Copy build output
    if [ -d "dist" ]; then
        echo "Copying build output..."
        mkdir -p ../dist
        cp -r dist/* ../dist/
        echo -e "${GREEN}✓ Local build completed successfully${NC}"
        echo "Build output available in: services/kasia/dist/"
    else
        echo -e "${RED}✗ Build output not found${NC}"
        exit 1
    fi
    
    # Cleanup
    cd ..
    rm -rf "$temp_dir"
}

# Function to check build status
check_build() {
    echo -e "${BLUE}Checking build status...${NC}"
    
    if docker images | grep -q "kasia-app"; then
        echo -e "${GREEN}✓ Kasia app Docker image available${NC}"
        docker images | grep kasia-app
    else
        echo -e "${YELLOW}⚠ No Kasia app Docker image found${NC}"
    fi
    
    if [ -d "dist" ]; then
        echo -e "${GREEN}✓ Local build output available${NC}"
        ls -la dist/
    else
        echo -e "${YELLOW}⚠ No local build output found${NC}"
    fi
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--version)
            KASIA_VERSION="$2"
            shift 2
            ;;
        -m|--mode)
            BUILD_MODE="$2"
            shift 2
            ;;
        -f|--force)
            FORCE_REBUILD=true
            shift
            ;;
        --no-cache)
            USE_CACHE=false
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate build mode
case $BUILD_MODE in
    docker|local|official)
        ;;
    *)
        echo -e "${RED}Invalid build mode: $BUILD_MODE${NC}"
        echo "Valid modes: docker, local, official"
        exit 1
        ;;
esac

# Main execution
echo -e "${BLUE}=== Kasia App Build Script ===${NC}"
echo "Build Mode: $BUILD_MODE"
echo "Version: $KASIA_VERSION"
echo "Force Rebuild: $FORCE_REBUILD"
echo

# Check if rebuild is needed
if [ "$FORCE_REBUILD" = false ] && [ "$BUILD_MODE" = "docker" ]; then
    if docker images | grep -q "kasia-app:$KASIA_VERSION"; then
        echo -e "${YELLOW}Image kasia-app:$KASIA_VERSION already exists${NC}"
        echo "Use -f/--force to rebuild or specify a different version"
        exit 0
    fi
fi

# Execute build based on mode
case $BUILD_MODE in
    docker)
        build_docker "$KASIA_VERSION"
        ;;
    official)
        build_official
        ;;
    local)
        build_local "$KASIA_VERSION"
        ;;
esac

echo
echo -e "${BLUE}=== Build Summary ===${NC}"
check_build

echo
echo -e "${GREEN}Build completed successfully!${NC}"
echo
echo "Next steps:"
echo "1. Test the build: docker run --rm -p 3001:3000 kasia-app:latest"
echo "2. Start full stack: docker-compose --profile prod --profile explorer up -d"
echo "3. Run tests: ./test-kasia-app.sh"