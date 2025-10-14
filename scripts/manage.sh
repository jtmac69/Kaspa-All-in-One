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
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  start [service]     Start all services or specific service"
    echo "  stop [service]      Stop all services or specific service"
    echo "  restart [service]   Restart all services or specific service"
    echo "  status              Show status of all services"
    echo "  logs [service]      Show logs for all services or specific service"
    echo "  update              Update all services to latest versions"
    echo "  backup              Create backup of all data"
    echo "  restore <file>      Restore from backup file"
    echo "  health              Run comprehensive health check"
    echo "  clean               Clean up unused containers and volumes"
    echo "  reset               Reset entire stack (WARNING: destroys data)"
    echo ""
    echo "Options:"
    echo "  -f, --follow        Follow log output (for logs command)"
    echo "  -d, --detach        Run in background (for start command)"
    echo "  -v, --verbose       Verbose output"
    echo "  -h, --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start                    # Start all services"
    echo "  $0 start kaspa-node         # Start only Kaspa node"
    echo "  $0 logs -f                  # Follow all logs"
    echo "  $0 logs kaspa-node          # Show Kaspa node logs"
    echo "  $0 health                   # Run health check"
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
    
    if [[ $DETACH == true ]]; then
        detach_flag="-d"
    fi
    
    if [[ -n $service ]]; then
        log "Starting service: $service"
        docker compose up $detach_flag $service
    else
        log "Starting all services..."
        docker compose up $detach_flag
    fi
}

# Stop services
stop_services() {
    local service=$1
    
    if [[ -n $service ]]; then
        log "Stopping service: $service"
        docker compose stop $service
    else
        log "Stopping all services..."
        docker compose down
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
    log "Service Status:"
    docker compose ps
    echo ""
    
    log "Resource Usage:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
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
        -h|--help)
            show_usage
            exit 0
            ;;
        start|stop|restart|status|logs|update|backup|restore|health|clean|reset)
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
    *)
        error "Unknown command: $COMMAND"
        ;;
esac