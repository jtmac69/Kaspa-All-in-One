#!/bin/bash

# Kaspa All-in-One Management Script
# Provides easy management commands for the entire stack

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.yml"
PROJECT_NAME="kaspa-aio"

# Logging functions
log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Show usage information
show_usage() {
    echo "Kaspa All-in-One Management Script"
    echo ""
    echo "Usage: $0 <command> [options] [profiles...]"
    echo ""
    echo "Commands:"
    echo "  start [service]     Start services (with optional profiles)"
    echo "  stop [service]      Stop services (with optional profiles)"
    echo "  restart [service]   Restart services (with optional profiles)"
    echo "  status [profiles]   Show status of services"
    echo "  logs [service]      Show logs for services"
    echo "  update [profiles]   Update services to latest versions"
    echo "  backup              Create backup of all data"
    echo "  restore <file>      Restore from backup file"
    echo "  health              Run comprehensive health check"
    echo "  clean               Clean up unused containers and volumes"
    echo "  reset               Reset entire stack (WARNING: destroys data)"
    echo "  profiles            List available profiles and their services"
    echo ""
    echo "Available Profiles:"
    echo "  prod                Production applications (Kasia, K Social)"
    echo "  explorer            Indexing services (Kasia, K Social, Simply Kaspa indexers)"
    echo "  archive             Long-term data storage and archival"
    echo "  development         Development tools (Portainer, pgAdmin)"
    echo "  mining              Mining stratum bridge"
    echo ""
    echo "Options:"
    echo "  -f, --follow        Follow log output (for logs command)"
    echo "  -d, --detach        Run in background (for start command)"
    echo "  -v, --verbose       Verbose output"
    echo "  -p, --profile       Specify profile(s) to use"
    echo "  -h, --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start                           # Start core services only"
    echo "  $0 start -p prod                   # Start core + production services"
    echo "  $0 start -p prod -p explorer       # Start core + prod + explorer"
    echo "  $0 start kaspa-node                # Start only Kaspa node"
    echo "  $0 status -p explorer              # Show status of explorer services"
    echo "  $0 logs -f kasia-indexer           # Follow Kasia indexer logs"
    echo "  $0 health                          # Run health check"
    echo "  $0 profiles                        # List all profiles and services"
}

# Check if Docker and Docker Compose are available
check_dependencies() {
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed or not in PATH"
    fi
    
    if ! docker compose version &> /dev/null; then
        error "Docker Compose is not available"
    fi
}

# Start services
start_services() {
    local service=$1
    local detach_flag=""
    local profile_flags=""
    
    if [[ $DETACH == true ]]; then
        detach_flag="-d"
    fi
    
    # Build profile flags
    for profile in "${PROFILES[@]}"; do
        profile_flags="$profile_flags --profile $profile"
    done
    
    if [[ -n $service ]]; then
        log "Starting service: $service"
        if [[ -n $profile_flags ]]; then
            log "Using profiles: ${PROFILES[*]}"
        fi
        docker compose $profile_flags up $detach_flag $service
    else
        if [[ ${#PROFILES[@]} -gt 0 ]]; then
            log "Starting services with profiles: ${PROFILES[*]}"
            docker compose $profile_flags up $detach_flag
        else
            log "Starting core services only..."
            docker compose up $detach_flag
        fi
    fi
}

# Stop services
stop_services() {
    local service=$1
    local profile_flags=""
    
    # Build profile flags
    for profile in "${PROFILES[@]}"; do
        profile_flags="$profile_flags --profile $profile"
    done
    
    if [[ -n $service ]]; then
        log "Stopping service: $service"
        docker compose $profile_flags stop $service
    else
        if [[ ${#PROFILES[@]} -gt 0 ]]; then
            log "Stopping services with profiles: ${PROFILES[*]}"
            docker compose $profile_flags down
        else
            log "Stopping all services..."
            docker compose down
        fi
    fi
}

# Restart services
restart_services() {
    local service=$1
    
    if [[ -n $service ]]; then
        log "Restarting service: $service"
        docker compose restart $service
    else
        log "Restarting all services..."
        docker compose restart
    fi
}

# Show service status
show_status() {
    local profile_flags=""
    
    # Build profile flags
    for profile in "${PROFILES[@]}"; do
        profile_flags="$profile_flags --profile $profile"
    done
    
    if [[ ${#PROFILES[@]} -gt 0 ]]; then
        log "Service Status (Profiles: ${PROFILES[*]}):"
    else
        log "Service Status (Core Services):"
    fi
    
    docker compose $profile_flags ps
    echo ""
    
    log "Resource Usage:"
    local containers=$(docker compose $profile_flags ps -q)
    if [[ -n $containers ]]; then
        docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}" $containers
    else
        echo "No containers running"
    fi
}

# Show logs
show_logs() {
    local service=$1
    local follow_flag=""
    
    if [[ $FOLLOW == true ]]; then
        follow_flag="-f"
    fi
    
    if [[ -n $service ]]; then
        log "Showing logs for service: $service"
        docker compose logs $follow_flag $service
    else
        log "Showing logs for all services..."
        docker compose logs $follow_flag
    fi
}

# Update services
update_services() {
    log "Updating all services to latest versions..."
    
    # Pull latest images
    docker compose pull
    
    # Restart services with new images
    docker compose up -d
    
    # Clean up old images
    docker image prune -f
    
    log "Update completed successfully"
}

# Create backup
create_backup() {
    local backup_file="kaspa-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
    
    log "Creating backup: $backup_file"
    
    # Stop services temporarily
    docker compose stop
    
    # Create backup of volumes
    docker run --rm \
        -v kaspa-aio_kaspa-data:/data/kaspa-data:ro \
        -v kaspa-aio_kasia-db-data:/data/kasia-db-data:ro \
        -v kaspa-aio_k-social-db-data:/data/k-social-db-data:ro \
        -v $(pwd):/backup \
        alpine:latest \
        tar czf /backup/$backup_file -C /data .
    
    # Restart services
    docker compose start
    
    log "Backup created: $backup_file"
}

# Restore from backup
restore_backup() {
    local backup_file=$1
    
    if [[ ! -f $backup_file ]]; then
        error "Backup file not found: $backup_file"
    fi
    
    warn "This will overwrite all existing data. Are you sure? (y/N)"
    read -r response
    if [[ ! $response =~ ^[Yy]$ ]]; then
        log "Restore cancelled"
        return
    fi
    
    log "Restoring from backup: $backup_file"
    
    # Stop services
    docker compose down
    
    # Remove existing volumes
    docker volume rm kaspa-aio_kaspa-data kaspa-aio_kasia-db-data kaspa-aio_k-social-db-data 2>/dev/null || true
    
    # Restore from backup
    docker run --rm \
        -v kaspa-aio_kaspa-data:/data/kaspa-data \
        -v kaspa-aio_kasia-db-data:/data/kasia-db-data \
        -v kaspa-aio_k-social-db-data:/data/k-social-db-data \
        -v $(pwd):/backup \
        alpine:latest \
        tar xzf /backup/$backup_file -C /data
    
    # Start services
    docker compose up -d
    
    log "Restore completed successfully"
}

# Run health check
run_health_check() {
    if [[ -f "scripts/health-check.sh" ]]; then
        log "Running comprehensive health check..."
        ./scripts/health-check.sh $([[ $VERBOSE == true ]] && echo "-v")
    else
        warn "Health check script not found, running basic check..."
        docker compose ps
    fi
}

# Clean up unused resources
clean_resources() {
    log "Cleaning up unused Docker resources..."
    
    # Remove stopped containers
    docker container prune -f
    
    # Remove unused images
    docker image prune -f
    
    # Remove unused volumes (be careful with this)
    warn "Remove unused volumes? This may delete data! (y/N)"
    read -r response
    if [[ $response =~ ^[Yy]$ ]]; then
        docker volume prune -f
    fi
    
    # Remove unused networks
    docker network prune -f
    
    log "Cleanup completed"
}

# Reset entire stack
reset_stack() {
    warn "This will completely reset the stack and DELETE ALL DATA!"
    warn "Are you absolutely sure? Type 'RESET' to confirm:"
    read -r response
    
    if [[ $response != "RESET" ]]; then
        log "Reset cancelled"
        return
    fi
    
    log "Resetting entire stack..."
    
    # Stop and remove everything
    docker compose down -v --remove-orphans
    
    # Remove all project-related containers, volumes, and networks
    docker system prune -a -f --volumes
    
    log "Stack reset completed"
}

# Parse command line arguments
FOLLOW=false
DETACH=false
VERBOSE=false
PROFILES=()

while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--follow)
            FOLLOW=true
            shift
            ;;
        -d|--detach)
            DETACH=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -p|--profile)
            PROFILES+=("$2")
            shift 2
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        start|stop|restart|status|logs|update|backup|restore|health|clean|reset|profiles)
            COMMAND=$1
            shift
            break
            ;;
        *)
            error "Unknown option: $1"
            ;;
    esac
done

# Check if command was provided
if [[ -z $COMMAND ]]; then
    show_usage
    exit 1
fi

# Check dependencies
check_dependencies

# Show available profiles and their services
show_profiles() {
    log "Available Deployment Profiles:"
    echo ""
    
    echo -e "${BLUE}Core Infrastructure (Always Active):${NC}"
    echo "  - kaspa-node      : Kaspa blockchain node"
    echo "  - dashboard       : Web management interface"
    echo "  - nginx           : Reverse proxy and load balancer"
    echo ""
    
    echo -e "${BLUE}Profile: prod (Production Applications):${NC}"
    echo "  - kasia-app       : Decentralized messaging application"
    echo "  - k-social        : Social media platform"
    echo ""
    
    echo -e "${BLUE}Profile: explorer (Data Indexing):${NC}"
    echo "  - indexer-db      : Shared PostgreSQL database"
    echo "  - kasia-indexer   : Message indexing service"
    echo "  - k-indexer       : Social content indexing"
    echo "  - simply-kaspa-indexer : General blockchain indexing"
    echo ""
    
    echo -e "${BLUE}Profile: archive (Long-term Storage):${NC}"
    echo "  - archive-db      : Archive PostgreSQL database"
    echo "  - archive-indexer : Historical data preservation"
    echo ""
    
    echo -e "${BLUE}Profile: development (Development Tools):${NC}"
    echo "  - portainer       : Container management interface"
    echo "  - pgadmin         : Database administration tool"
    echo ""
    
    echo -e "${BLUE}Profile: mining (Mining Operations):${NC}"
    echo "  - kaspa-stratum   : Solo mining stratum bridge"
    echo ""
    
    echo -e "${GREEN}Usage Examples:${NC}"
    echo "  ./scripts/manage.sh start -p prod"
    echo "  ./scripts/manage.sh start -p prod -p explorer"
    echo "  ./scripts/manage.sh status -p explorer"
    echo "  ./scripts/manage.sh logs -p development"
}

# Execute command
case $COMMAND in
    start)
        start_services $1
        ;;
    stop)
        stop_services $1
        ;;
    restart)
        restart_services $1
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs $1
        ;;
    update)
        update_services
        ;;
    backup)
        create_backup
        ;;
    restore)
        restore_backup $1
        ;;
    health)
        run_health_check
        ;;
    clean)
        clean_resources
        ;;
    reset)
        reset_stack
        ;;
    profiles)
        show_profiles
        ;;
    *)
        error "Unknown command: $COMMAND"
        ;;
esac