#!/bin/bash

# Kaspa All-in-One Installation Wizard Manager
# Manages the web-based installation wizard lifecycle

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
WIZARD_PORT="${WIZARD_PORT:-3000}"
WIZARD_STATE_FILE=".wizard-state"
WIZARD_CONFIG_FILE=".wizard-config.json"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

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

info() {
    echo -e "${BLUE}[WIZARD]${NC} $1"
}

# Check if wizard has been run before
is_first_run() {
    if [[ -f "$PROJECT_ROOT/$WIZARD_STATE_FILE" ]]; then
        return 1  # Not first run
    else
        return 0  # First run
    fi
}

# Check if .env file exists
has_env_file() {
    if [[ -f "$PROJECT_ROOT/.env" ]]; then
        return 0  # Has .env
    else
        return 1  # No .env
    fi
}

# Generate security token for wizard
generate_security_token() {
    if command -v openssl &> /dev/null; then
        openssl rand -hex 32
    else
        # Fallback to /dev/urandom
        head -c 32 /dev/urandom | xxd -p -c 32
    fi
}

# Start wizard
start_wizard() {
    local mode="${1:-install}"
    
    cd "$PROJECT_ROOT"
    
    # Check if wizard is already running
    if docker ps --format '{{.Names}}' | grep -q "^kaspa-wizard$"; then
        warn "Wizard is already running"
        info "Access it at: http://localhost:$WIZARD_PORT"
        return 0
    fi
    
    # Generate security token if not exists
    if [[ ! -f "$PROJECT_ROOT/.wizard-token" ]]; then
        log "Generating security token..."
        generate_security_token > "$PROJECT_ROOT/.wizard-token"
        chmod 600 "$PROJECT_ROOT/.wizard-token"
    fi
    
    # Set environment variables for wizard
    export WIZARD_MODE="$mode"
    export WIZARD_SECURITY_TOKEN="$(cat $PROJECT_ROOT/.wizard-token)"
    export WIZARD_SESSION_SECRET="$(generate_security_token)"
    
    # Determine if this is first run
    if is_first_run; then
        export WIZARD_AUTO_START="true"
        info "Starting wizard in FIRST RUN mode..."
    else
        export WIZARD_AUTO_START="false"
        info "Starting wizard in $mode mode..."
    fi
    
    # Start wizard container
    log "Starting wizard container..."
    docker compose --profile wizard up -d wizard
    
    # Wait for wizard to be healthy
    log "Waiting for wizard to be ready..."
    local max_wait=30
    local waited=0
    while [[ $waited -lt $max_wait ]]; do
        if docker ps --format '{{.Names}}' --filter "name=kaspa-wizard" --filter "health=healthy" | grep -q "kaspa-wizard"; then
            break
        fi
        sleep 1
        waited=$((waited + 1))
    done
    
    if [[ $waited -ge $max_wait ]]; then
        warn "Wizard took longer than expected to start"
        warn "Check logs with: docker logs kaspa-wizard"
    fi
    
    echo
    log "Wizard started successfully!"
    echo
    info "╔══════════════════════════════════════════════════════════════╗"
    info "║          Kaspa All-in-One Installation Wizard               ║"
    info "╚══════════════════════════════════════════════════════════════╝"
    echo
    info "Access the wizard at: ${GREEN}http://localhost:$WIZARD_PORT${NC}"
    echo
    info "The wizard will guide you through:"
    info "  ✓ System requirements checking"
    info "  ✓ Profile selection (Core, Production, Explorer, etc.)"
    info "  ✓ Service configuration"
    info "  ✓ Real-time installation progress"
    echo
    info "To view wizard logs: ${BLUE}docker logs -f kaspa-wizard${NC}"
    info "To stop wizard: ${BLUE}./scripts/wizard.sh stop${NC}"
    echo
}

# Stop wizard
stop_wizard() {
    cd "$PROJECT_ROOT"
    
    if ! docker ps --format '{{.Names}}' | grep -q "^kaspa-wizard$"; then
        warn "Wizard is not running"
        return 0
    fi
    
    log "Stopping wizard..."
    docker compose --profile wizard down
    log "Wizard stopped"
}

# Restart wizard
restart_wizard() {
    local mode="${1:-install}"
    log "Restarting wizard..."
    stop_wizard
    sleep 2
    start_wizard "$mode"
}

# Show wizard status
status_wizard() {
    cd "$PROJECT_ROOT"
    
    echo
    info "╔══════════════════════════════════════════════════════════════╗"
    info "║              Wizard Status                                   ║"
    info "╚══════════════════════════════════════════════════════════════╝"
    echo
    
    if docker ps --format '{{.Names}}' | grep -q "^kaspa-wizard$"; then
        local health=$(docker inspect --format='{{.State.Health.Status}}' kaspa-wizard 2>/dev/null || echo "unknown")
        info "Status: ${GREEN}Running${NC}"
        info "Health: $health"
        info "URL: http://localhost:$WIZARD_PORT"
        
        # Check if first run
        if is_first_run; then
            info "Mode: ${YELLOW}First Run${NC}"
        else
            info "Mode: Reconfiguration"
        fi
    else
        info "Status: ${RED}Not Running${NC}"
    fi
    
    # Check for state files
    if [[ -f "$PROJECT_ROOT/$WIZARD_STATE_FILE" ]]; then
        info "Previous installation: ${GREEN}Yes${NC}"
        info "State file: $WIZARD_STATE_FILE"
    else
        info "Previous installation: ${YELLOW}No${NC}"
    fi
    
    if [[ -f "$PROJECT_ROOT/$WIZARD_CONFIG_FILE" ]]; then
        info "Saved configuration: ${GREEN}Yes${NC}"
    fi
    
    echo
}

# View wizard logs
logs_wizard() {
    cd "$PROJECT_ROOT"
    
    if ! docker ps --format '{{.Names}}' | grep -q "^kaspa-wizard$"; then
        error "Wizard is not running"
    fi
    
    docker logs -f kaspa-wizard
}

# Reset wizard state (for testing)
reset_wizard() {
    cd "$PROJECT_ROOT"
    
    warn "This will reset the wizard state and allow re-running first-time setup"
    read -p "Are you sure? (y/N): " confirm
    
    if [[ ! $confirm =~ ^[Yy]$ ]]; then
        log "Reset cancelled"
        return 0
    fi
    
    # Stop wizard if running
    if docker ps --format '{{.Names}}' | grep -q "^kaspa-wizard$"; then
        stop_wizard
    fi
    
    # Remove state files
    if [[ -f "$PROJECT_ROOT/$WIZARD_STATE_FILE" ]]; then
        rm "$PROJECT_ROOT/$WIZARD_STATE_FILE"
        log "Removed wizard state file"
    fi
    
    if [[ -f "$PROJECT_ROOT/$WIZARD_CONFIG_FILE" ]]; then
        rm "$PROJECT_ROOT/$WIZARD_CONFIG_FILE"
        log "Removed wizard config file"
    fi
    
    if [[ -f "$PROJECT_ROOT/.wizard-token" ]]; then
        rm "$PROJECT_ROOT/.wizard-token"
        log "Removed security token"
    fi
    
    log "Wizard state reset complete"
    info "You can now run the wizard as if it's the first time"
}

# Show usage
usage() {
    echo "Usage: $0 {start|stop|restart|status|logs|reset} [mode]"
    echo
    echo "Commands:"
    echo "  start [mode]   - Start the wizard (mode: install or reconfigure)"
    echo "  stop           - Stop the wizard"
    echo "  restart [mode] - Restart the wizard"
    echo "  status         - Show wizard status"
    echo "  logs           - View wizard logs (follow mode)"
    echo "  reset          - Reset wizard state (for testing)"
    echo
    echo "Modes:"
    echo "  install      - First-time installation (default)"
    echo "  reconfigure  - Modify existing configuration"
    echo
    echo "Examples:"
    echo "  $0 start                    # Start wizard in install mode"
    echo "  $0 start reconfigure        # Start wizard in reconfigure mode"
    echo "  $0 status                   # Check wizard status"
    echo "  $0 logs                     # View wizard logs"
    echo
}

# Main function
main() {
    local command="${1:-}"
    local mode="${2:-install}"
    
    case "$command" in
        start)
            start_wizard "$mode"
            ;;
        stop)
            stop_wizard
            ;;
        restart)
            restart_wizard "$mode"
            ;;
        status)
            status_wizard
            ;;
        logs)
            logs_wizard
            ;;
        reset)
            reset_wizard
            ;;
        *)
            usage
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
