#!/bin/bash

# Comprehensive Test Cleanup Script
# Cleans up all test containers, volumes, and networks created by test scripts

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
    echo -e "\n${BLUE}🧹 $1${NC}"
    echo "========================================"
}

# Configuration
CLEANUP_VOLUMES=false
CLEANUP_IMAGES=false
CLEANUP_NETWORKS=true
DRY_RUN=false
FORCE=false

# Function to show usage
show_usage() {
    echo "Comprehensive Test Cleanup Script"
    echo
    echo "Usage: $0 [OPTIONS]"
    echo
    echo "Options:"
    echo "  -h, --help         Show this help message"
    echo "  -v, --volumes      Remove data volumes (WARNING: destroys data)"
    echo "  -i, --images       Remove unused Docker images"
    echo "  -n, --no-networks  Skip network cleanup"
    echo "  -d, --dry-run      Show what would be cleaned up without doing it"
    echo "  -f, --force        Force cleanup without confirmation prompts"
    echo "  -a, --all          Clean up everything (volumes, images, networks)"
    echo
    echo "Examples:"
    echo "  $0                 # Basic cleanup (containers only)"
    echo "  $0 -v              # Cleanup including volumes"
    echo "  $0 -a              # Full cleanup (everything)"
    echo "  $0 -d              # Dry run to see what would be cleaned"
    echo
}

# Function to confirm destructive actions
confirm_action() {
    local message=$1
    if [ "$FORCE" = true ]; then
        return 0
    fi
    
    echo -e "${YELLOW}⚠️  $message${NC}"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        return 0
    else
        return 1
    fi
}

# Function to execute or show command
execute_or_show() {
    local command=$1
    local description=$2
    
    if [ "$DRY_RUN" = true ]; then
        echo -e "${BLUE}[DRY RUN]${NC} $description"
        echo "  Command: $command"
    else
        log_info "$description"
        eval "$command" 2>/dev/null || true
    fi
}

# Function to cleanup test containers
cleanup_test_containers() {
    log_header "Cleaning Up Test Containers"
    
    # List of known test containers
    local test_containers=(
        "kasia-app-test"
        "kasia-indexer-test" 
        "kaspa-node-test"
        "kaspa-dashboard-test"
        "kaspa-nginx-test"
        "timescaledb-test"
        "indexer-db-test"
        "k-social-test"
        "k-indexer-test"
        "simply-kaspa-indexer-test"
        "archive-indexer-test"
        "portainer-test"
        "pgadmin-test"
        "e2e-test"
        "build-test"
        "load-test"
    )
    
    local found_containers=()
    
    # Find existing test containers
    for container in "${test_containers[@]}"; do
        if docker ps -a --format "{{.Names}}" | grep -q "^${container}$"; then
            found_containers+=("$container")
        fi
    done
    
    if [ ${#found_containers[@]} -eq 0 ]; then
        log_info "No test containers found to clean up"
        return 0
    fi
    
    log_info "Found ${#found_containers[@]} test containers to clean up"
    
    for container in "${found_containers[@]}"; do
        execute_or_show "docker stop $container && docker rm $container" "Removing container: $container"
    done
    
    # Clean up test artifacts
    log_info "Cleaning up test artifacts..."
    rm -f /tmp/build-*.log 2>/dev/null || true
    rm -f /tmp/load-*.txt /tmp/load-*.txt.status 2>/dev/null || true
    rm -f /tmp/spike-*.txt /tmp/spike-*.txt.status 2>/dev/null || true
    rm -f /tmp/sustained-load.txt 2>/dev/null || true
    rm -f /tmp/resource-stats.txt 2>/dev/null || true
    
    log_success "Test containers cleanup completed"
}

# Function to cleanup compose services
cleanup_compose_services() {
    log_header "Cleaning Up Docker Compose Services"
    
    if [ ! -f "docker-compose.yml" ]; then
        log_warning "docker-compose.yml not found, skipping compose cleanup"
        return 0
    fi
    
    # Check if any compose services are running
    local running_services=$(docker-compose ps --services --filter "status=running" 2>/dev/null || echo "")
    
    if [ -z "$running_services" ]; then
        log_info "No running compose services found"
        return 0
    fi
    
    log_info "Stopping all compose services..."
    execute_or_show "docker-compose down" "Stopping Docker Compose services"
    
    log_success "Compose services cleanup completed"
}

# Function to cleanup volumes
cleanup_volumes() {
    log_header "Cleaning Up Data Volumes"
    
    if [ "$CLEANUP_VOLUMES" != true ]; then
        log_info "Volume cleanup disabled (use -v to enable)"
        return 0
    fi
    
    if ! confirm_action "This will permanently delete all data volumes. All indexed data and configurations will be lost!"; then
        log_info "Volume cleanup cancelled"
        return 0
    fi
    
    # List of known volumes
    local volumes=(
        "all-in-one_kaspa-data"
        "all-in-one_kasia-indexer-data"
        "all-in-one_indexer-db-data"
        "all-in-one_archive-db-data"
        "all-in-one_portainer-data"
        "all-in-one_pgadmin-data"
    )
    
    local found_volumes=()
    
    # Find existing volumes
    for volume in "${volumes[@]}"; do
        if docker volume ls --format "{{.Name}}" | grep -q "^${volume}$"; then
            found_volumes+=("$volume")
        fi
    done
    
    if [ ${#found_volumes[@]} -eq 0 ]; then
        log_info "No project volumes found to clean up"
        return 0
    fi
    
    log_warning "Found ${#found_volumes[@]} volumes to remove"
    
    for volume in "${found_volumes[@]}"; do
        execute_or_show "docker volume rm $volume" "Removing volume: $volume"
    done
    
    log_success "Volume cleanup completed"
}

# Function to cleanup networks
cleanup_networks() {
    log_header "Cleaning Up Networks"
    
    if [ "$CLEANUP_NETWORKS" != true ]; then
        log_info "Network cleanup disabled"
        return 0
    fi
    
    # List of known networks
    local networks=(
        "all-in-one_kaspa-network"
        "kaspa-aio_kaspa-network"
    )
    
    local found_networks=()
    
    # Find existing networks
    for network in "${networks[@]}"; do
        if docker network ls --format "{{.Name}}" | grep -q "^${network}$"; then
            found_networks+=("$network")
        fi
    done
    
    if [ ${#found_networks[@]} -eq 0 ]; then
        log_info "No project networks found to clean up"
        return 0
    fi
    
    log_info "Found ${#found_networks[@]} networks to remove"
    
    for network in "${found_networks[@]}"; do
        execute_or_show "docker network rm $network" "Removing network: $network"
    done
    
    log_success "Network cleanup completed"
}

# Function to cleanup unused images
cleanup_images() {
    log_header "Cleaning Up Unused Images"
    
    if [ "$CLEANUP_IMAGES" != true ]; then
        log_info "Image cleanup disabled (use -i to enable)"
        return 0
    fi
    
    if ! confirm_action "This will remove unused Docker images to free up disk space."; then
        log_info "Image cleanup cancelled"
        return 0
    fi
    
    execute_or_show "docker image prune -f" "Removing unused images"
    
    # Also clean up build cache
    execute_or_show "docker builder prune -f" "Removing build cache"
    
    log_success "Image cleanup completed"
}

# Function to show system status
show_system_status() {
    log_header "Docker System Status"
    
    echo "Container Status:"
    docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(kaspa|kasia|k-social|indexer)" || echo "No relevant containers found"
    
    echo
    echo "Volume Usage:"
    docker system df -v | grep -E "(kaspa|kasia|indexer)" || echo "No relevant volumes found"
    
    echo
    echo "Network Status:"
    docker network ls | grep -E "(kaspa|kasia)" || echo "No relevant networks found"
}

# Function to run all cleanup tasks
run_full_cleanup() {
    log_header "Running Full Cleanup"
    
    cleanup_test_containers
    cleanup_compose_services
    cleanup_volumes
    cleanup_networks
    cleanup_images
    
    log_success "Full cleanup completed!"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_usage
            exit 0
            ;;
        -v|--volumes)
            CLEANUP_VOLUMES=true
            shift
            ;;
        -i|--images)
            CLEANUP_IMAGES=true
            shift
            ;;
        -n|--no-networks)
            CLEANUP_NETWORKS=false
            shift
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        -a|--all)
            CLEANUP_VOLUMES=true
            CLEANUP_IMAGES=true
            CLEANUP_NETWORKS=true
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
echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                 Kaspa All-in-One Test Cleanup                ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

if [ "$DRY_RUN" = true ]; then
    log_info "DRY RUN MODE - No actual changes will be made"
    echo
fi

# Check Docker availability
if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed or not in PATH"
    exit 1
fi

if ! docker info &> /dev/null; then
    log_error "Docker is not running or not accessible"
    exit 1
fi

# Show current status
show_system_status

# Run cleanup tasks
cleanup_test_containers
cleanup_compose_services

if [ "$CLEANUP_VOLUMES" = true ] || [ "$CLEANUP_IMAGES" = true ] || [ "$CLEANUP_NETWORKS" = true ]; then
    cleanup_volumes
    cleanup_networks
    cleanup_images
fi

# Show final status
echo
show_system_status

echo
if [ "$DRY_RUN" = true ]; then
    log_info "Dry run completed. Use without -d to actually perform cleanup."
else
    log_success "Cleanup completed successfully!"
fi

echo
log_info "To run individual test cleanups:"
echo "  ./test-kasia-indexer.sh --cleanup-only"
echo "  ./test-kasia-app.sh --cleanup-only"
echo "  ./test-service-dependencies.sh --cleanup-only"