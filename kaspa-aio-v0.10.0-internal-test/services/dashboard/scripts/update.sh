#!/bin/bash

# Kaspa Dashboard Update Script
# This script updates the Management Dashboard to the latest version

set -e  # Exit on any error

# Configuration
SERVICE_NAME="kaspa-dashboard"
DASHBOARD_USER="kaspa-dashboard"
DASHBOARD_HOME="/opt/kaspa-dashboard"
BACKUP_DIR="$DASHBOARD_HOME/backups"
UPDATE_LOG="$DASHBOARD_HOME/logs/update.log"

# Default update source (can be overridden)
UPDATE_SOURCE="${UPDATE_SOURCE:-}"
UPDATE_BRANCH="${UPDATE_BRANCH:-main}"
UPDATE_REPO="${UPDATE_REPO:-https://github.com/kaspa-community/kaspa-aio.git}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO] $1" >> "$UPDATE_LOG" 2>/dev/null || true
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [SUCCESS] $1" >> "$UPDATE_LOG" 2>/dev/null || true
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [WARNING] $1" >> "$UPDATE_LOG" 2>/dev/null || true
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [ERROR] $1" >> "$UPDATE_LOG" 2>/dev/null || true
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if dashboard is installed
    if [[ ! -d "$DASHBOARD_HOME" ]]; then
        log_error "Dashboard not found at $DASHBOARD_HOME"
        log_error "Please install the dashboard first using install.sh"
        exit 1
    fi
    
    # Check if service exists
    if ! systemctl list-unit-files | grep -q "$SERVICE_NAME"; then
        log_error "Dashboard service not found"
        log_error "Please reinstall the dashboard using install.sh"
        exit 1
    fi
    
    # Check required tools
    local missing_tools=()
    
    if ! command -v git &> /dev/null && [[ -n "$UPDATE_REPO" ]]; then
        missing_tools+=("git")
    fi
    
    if ! command -v rsync &> /dev/null; then
        missing_tools+=("rsync")
    fi
    
    if ! command -v npm &> /dev/null; then
        missing_tools+=("npm")
    fi
    
    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        log_error "Please install them and try again"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Get current version information
get_current_version() {
    log_info "Getting current version information..."
    
    # Try to get version from package.json
    if [[ -f "$DASHBOARD_HOME/package.json" ]]; then
        CURRENT_VERSION=$(grep '"version"' "$DASHBOARD_HOME/package.json" | cut -d'"' -f4 2>/dev/null || echo "unknown")
    else
        CURRENT_VERSION="unknown"
    fi
    
    # Get last update timestamp
    if [[ -f "$DASHBOARD_HOME/.last_update" ]]; then
        LAST_UPDATE=$(cat "$DASHBOARD_HOME/.last_update")
    else
        LAST_UPDATE="never"
    fi
    
    log_info "Current version: $CURRENT_VERSION"
    log_info "Last update: $LAST_UPDATE"
}

# Create backup before update
create_backup() {
    log_info "Creating backup before update..."
    
    # Ensure backup directory exists
    mkdir -p "$BACKUP_DIR"
    
    # Create timestamped backup
    local backup_timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_name="dashboard_backup_${backup_timestamp}"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    mkdir -p "$backup_path"
    
    # Backup critical files
    log_info "Backing up configuration and data..."
    
    # Configuration files
    if [[ -f "$DASHBOARD_HOME/.env" ]]; then
        cp "$DASHBOARD_HOME/.env" "$backup_path/"
        log_info "Backed up .env configuration"
    fi
    
    if [[ -f "$DASHBOARD_HOME/package.json" ]]; then
        cp "$DASHBOARD_HOME/package.json" "$backup_path/"
    fi
    
    if [[ -f "$DASHBOARD_HOME/package-lock.json" ]]; then
        cp "$DASHBOARD_HOME/package-lock.json" "$backup_path/"
    fi
    
    # Logs (last 7 days)
    if [[ -d "$DASHBOARD_HOME/logs" ]]; then
        mkdir -p "$backup_path/logs"
        find "$DASHBOARD_HOME/logs" -name "*.log" -mtime -7 -exec cp {} "$backup_path/logs/" \; 2>/dev/null || true
        log_info "Backed up recent logs"
    fi
    
    # Custom configurations
    if [[ -d "$DASHBOARD_HOME/config" ]]; then
        cp -r "$DASHBOARD_HOME/config" "$backup_path/" 2>/dev/null || true
    fi
    
    # Create backup metadata
    cat > "$backup_path/backup_info.txt" << EOF
Backup created: $(date)
Dashboard version: $CURRENT_VERSION
Last update: $LAST_UPDATE
Backup type: Pre-update backup
System: $(uname -a)
EOF
    
    # Create compressed archive
    log_info "Creating compressed backup archive..."
    cd "$BACKUP_DIR"
    tar -czf "${backup_name}.tar.gz" "$backup_name"
    rm -rf "$backup_name"
    
    # Set ownership
    chown "$DASHBOARD_USER:$DASHBOARD_USER" "${backup_path}.tar.gz"
    
    # Clean up old backups (keep last 10)
    log_info "Cleaning up old backups..."
    ls -t "$BACKUP_DIR"/dashboard_backup_*.tar.gz 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true
    
    BACKUP_FILE="${backup_path}.tar.gz"
    log_success "Backup created: $BACKUP_FILE"
}

# Stop dashboard service
stop_dashboard() {
    log_info "Stopping dashboard service..."
    
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        systemctl stop "$SERVICE_NAME"
        
        # Wait for service to stop
        local timeout=30
        while systemctl is-active --quiet "$SERVICE_NAME" && [[ $timeout -gt 0 ]]; do
            sleep 1
            ((timeout--))
        done
        
        if systemctl is-active --quiet "$SERVICE_NAME"; then
            log_error "Failed to stop service within 30 seconds"
            return 1
        fi
        
        log_success "Dashboard service stopped"
    else
        log_info "Dashboard service was not running"
    fi
}

# Download and prepare update
prepare_update() {
    log_info "Preparing update..."
    
    local temp_dir="/tmp/kaspa-dashboard-update-$$"
    mkdir -p "$temp_dir"
    
    if [[ -n "$UPDATE_SOURCE" && -d "$UPDATE_SOURCE" ]]; then
        # Update from local directory
        log_info "Updating from local source: $UPDATE_SOURCE"
        
        if [[ ! -d "$UPDATE_SOURCE/services/dashboard" ]]; then
            log_error "Invalid update source: services/dashboard not found"
            rm -rf "$temp_dir"
            return 1
        fi
        
        cp -r "$UPDATE_SOURCE/services/dashboard"/* "$temp_dir/"
        
    elif [[ -n "$UPDATE_REPO" ]]; then
        # Update from Git repository
        log_info "Updating from Git repository: $UPDATE_REPO"
        log_info "Branch: $UPDATE_BRANCH"
        
        cd "$temp_dir"
        git clone --depth 1 --branch "$UPDATE_BRANCH" "$UPDATE_REPO" kaspa-aio
        
        if [[ ! -d "kaspa-aio/services/dashboard" ]]; then
            log_error "Invalid repository: services/dashboard not found"
            rm -rf "$temp_dir"
            return 1
        fi
        
        mv kaspa-aio/services/dashboard/* .
        rm -rf kaspa-aio
        
    else
        log_error "No update source specified"
        log_error "Set UPDATE_SOURCE (local path) or UPDATE_REPO (git repository)"
        rm -rf "$temp_dir"
        return 1
    fi
    
    UPDATE_TEMP_DIR="$temp_dir"
    log_success "Update prepared in $UPDATE_TEMP_DIR"
}

# Apply update
apply_update() {
    log_info "Applying update..."
    
    # Preserve critical files
    local preserve_files=(
        ".env"
        "logs"
        "backups"
        ".last_update"
    )
    
    local temp_preserve="/tmp/dashboard-preserve-$$"
    mkdir -p "$temp_preserve"
    
    for file in "${preserve_files[@]}"; do
        if [[ -e "$DASHBOARD_HOME/$file" ]]; then
            cp -r "$DASHBOARD_HOME/$file" "$temp_preserve/" 2>/dev/null || true
        fi
    done
    
    # Update files (exclude preserved files and node_modules)
    log_info "Updating dashboard files..."
    rsync -av \
        --exclude='.env' \
        --exclude='logs' \
        --exclude='backups' \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='*.log' \
        --exclude='.last_update' \
        "$UPDATE_TEMP_DIR/" "$DASHBOARD_HOME/"
    
    # Restore preserved files
    for file in "${preserve_files[@]}"; do
        if [[ -e "$temp_preserve/$file" ]]; then
            cp -r "$temp_preserve/$file" "$DASHBOARD_HOME/" 2>/dev/null || true
        fi
    done
    
    # Clean up
    rm -rf "$temp_preserve"
    rm -rf "$UPDATE_TEMP_DIR"
    
    # Set ownership
    chown -R "$DASHBOARD_USER:$DASHBOARD_USER" "$DASHBOARD_HOME"
    
    log_success "Files updated successfully"
}

# Update dependencies
update_dependencies() {
    log_info "Updating npm dependencies..."
    
    cd "$DASHBOARD_HOME"
    
    # Check if package.json changed
    if [[ -f "package.json" ]]; then
        # Update dependencies as dashboard user
        sudo -u "$DASHBOARD_USER" npm ci --only=production
        log_success "Dependencies updated"
    else
        log_warning "package.json not found, skipping dependency update"
    fi
}

# Update systemd service if needed
update_systemd_service() {
    log_info "Checking systemd service configuration..."
    
    local service_file="/etc/systemd/system/${SERVICE_NAME}.service"
    local new_service_file="$DASHBOARD_HOME/kaspa-dashboard.service"
    
    if [[ -f "$new_service_file" ]]; then
        # Compare service files
        if ! diff -q "$service_file" "$new_service_file" >/dev/null 2>&1; then
            log_info "Updating systemd service configuration..."
            cp "$new_service_file" "$service_file"
            systemctl daemon-reload
            log_success "Systemd service configuration updated"
        else
            log_info "Systemd service configuration unchanged"
        fi
    else
        log_info "No systemd service update available"
    fi
}

# Start dashboard service
start_dashboard() {
    log_info "Starting dashboard service..."
    
    systemctl start "$SERVICE_NAME"
    
    # Wait for service to start
    local timeout=30
    while ! systemctl is-active --quiet "$SERVICE_NAME" && [[ $timeout -gt 0 ]]; do
        sleep 1
        ((timeout--))
    done
    
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        log_success "Dashboard service started"
    else
        log_error "Failed to start service within 30 seconds"
        log_info "Check service status: systemctl status $SERVICE_NAME"
        return 1
    fi
}

# Verify update
verify_update() {
    log_info "Verifying update..."
    
    # Check service status
    if ! systemctl is-active --quiet "$SERVICE_NAME"; then
        log_error "Service is not running after update"
        return 1
    fi
    
    # Check if port is listening
    local dashboard_port=$(grep "^PORT=" "$DASHBOARD_HOME/.env" 2>/dev/null | cut -d'=' -f2 || echo "8080")
    
    if ! ss -tlnp | grep -q ":$dashboard_port "; then
        log_error "Dashboard is not listening on port $dashboard_port"
        return 1
    fi
    
    # Test health endpoint
    if command -v curl &> /dev/null; then
        local max_attempts=10
        local attempt=1
        
        while [[ $attempt -le $max_attempts ]]; do
            if curl -sf "http://localhost:$dashboard_port/health" >/dev/null 2>&1; then
                log_success "Health check passed"
                break
            fi
            
            if [[ $attempt -eq $max_attempts ]]; then
                log_warning "Health check failed after $max_attempts attempts"
                log_warning "Dashboard may still be starting up"
            else
                log_info "Health check attempt $attempt/$max_attempts failed, retrying..."
                sleep 2
            fi
            
            ((attempt++))
        done
    fi
    
    log_success "Update verification completed"
}

# Record update information
record_update() {
    log_info "Recording update information..."
    
    # Update timestamp
    echo "$(date)" > "$DASHBOARD_HOME/.last_update"
    
    # Get new version
    if [[ -f "$DASHBOARD_HOME/package.json" ]]; then
        NEW_VERSION=$(grep '"version"' "$DASHBOARD_HOME/package.json" | cut -d'"' -f4 2>/dev/null || echo "unknown")
    else
        NEW_VERSION="unknown"
    fi
    
    # Create update record
    local update_record="$DASHBOARD_HOME/logs/update_history.log"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Updated from $CURRENT_VERSION to $NEW_VERSION" >> "$update_record"
    
    chown "$DASHBOARD_USER:$DASHBOARD_USER" "$DASHBOARD_HOME/.last_update" "$update_record" 2>/dev/null || true
    
    log_success "Update information recorded"
}

# Rollback update (in case of failure)
rollback_update() {
    log_error "Update failed, attempting rollback..."
    
    if [[ -n "${BACKUP_FILE:-}" && -f "$BACKUP_FILE" ]]; then
        log_info "Restoring from backup: $BACKUP_FILE"
        
        # Stop service
        systemctl stop "$SERVICE_NAME" 2>/dev/null || true
        
        # Extract backup
        local restore_temp="/tmp/dashboard-restore-$$"
        mkdir -p "$restore_temp"
        
        cd "$restore_temp"
        tar -xzf "$BACKUP_FILE"
        
        # Find backup directory
        local backup_dir=$(find . -name "dashboard_backup_*" -type d | head -1)
        
        if [[ -n "$backup_dir" && -d "$backup_dir" ]]; then
            # Restore files
            cp -r "$backup_dir"/* "$DASHBOARD_HOME/"
            chown -R "$DASHBOARD_USER:$DASHBOARD_USER" "$DASHBOARD_HOME"
            
            # Restart service
            systemctl start "$SERVICE_NAME"
            
            log_success "Rollback completed"
        else
            log_error "Could not find backup data in archive"
        fi
        
        rm -rf "$restore_temp"
    else
        log_error "No backup available for rollback"
        log_error "Manual intervention may be required"
    fi
}

# Print update summary
print_summary() {
    echo
    echo "=============================================="
    echo "  Kaspa Dashboard Update Complete"
    echo "=============================================="
    echo
    echo "Update Details:"
    echo "  Previous Version: $CURRENT_VERSION"
    echo "  New Version: $NEW_VERSION"
    echo "  Update Time: $(date)"
    echo "  Backup Created: ${BACKUP_FILE:-none}"
    echo
    echo "Service Status:"
    echo "  Service: $SERVICE_NAME"
    echo "  Status: $(systemctl is-active "$SERVICE_NAME" 2>/dev/null || echo "unknown")"
    echo "  Port: $(grep "^PORT=" "$DASHBOARD_HOME/.env" 2>/dev/null | cut -d'=' -f2 || echo "8080")"
    echo
    echo "Next Steps:"
    echo "  1. Verify dashboard functionality at http://localhost:$(grep "^PORT=" "$DASHBOARD_HOME/.env" 2>/dev/null | cut -d'=' -f2 || echo "8080")"
    echo "  2. Check service logs: sudo journalctl -u $SERVICE_NAME -f"
    echo "  3. Review update log: $UPDATE_LOG"
    echo
    if [[ -n "${BACKUP_FILE:-}" ]]; then
        echo "Backup Information:"
        echo "  Backup File: $BACKUP_FILE"
        echo "  To rollback: Extract backup and restore manually if needed"
        echo
    fi
}

# Main update function
main() {
    echo "=============================================="
    echo "  Kaspa Dashboard Update"
    echo "=============================================="
    echo
    
    # Initialize log file
    mkdir -p "$(dirname "$UPDATE_LOG")"
    touch "$UPDATE_LOG"
    chown "$DASHBOARD_USER:$DASHBOARD_USER" "$UPDATE_LOG" 2>/dev/null || true
    
    log_info "Starting update process..."
    
    check_root
    check_prerequisites
    get_current_version
    
    # Create backup
    if [[ "${SKIP_BACKUP:-}" != "true" ]]; then
        create_backup
    else
        log_warning "Skipping backup (SKIP_BACKUP=true)"
    fi
    
    # Perform update
    if stop_dashboard && \
       prepare_update && \
       apply_update && \
       update_dependencies && \
       update_systemd_service && \
       start_dashboard && \
       verify_update; then
        
        record_update
        print_summary
        log_success "Update completed successfully!"
        exit 0
    else
        log_error "Update failed"
        
        if [[ "${NO_ROLLBACK:-}" != "true" ]]; then
            rollback_update
        fi
        
        exit 1
    fi
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Kaspa Dashboard Update Script"
        echo
        echo "Usage: $0 [options]"
        echo
        echo "Options:"
        echo "  --help, -h           Show this help message"
        echo "  --source PATH        Update from local directory"
        echo "  --repo URL           Update from Git repository"
        echo "  --branch BRANCH      Git branch to use (default: main)"
        echo "  --skip-backup        Skip creating backup before update"
        echo "  --no-rollback        Don't attempt rollback on failure"
        echo "  --check-only         Check for updates without applying"
        echo
        echo "Environment variables:"
        echo "  UPDATE_SOURCE=PATH   Local directory path"
        echo "  UPDATE_REPO=URL      Git repository URL"
        echo "  UPDATE_BRANCH=NAME   Git branch name"
        echo "  SKIP_BACKUP=true     Skip backup creation"
        echo "  NO_ROLLBACK=true     Disable automatic rollback"
        echo
        echo "Examples:"
        echo "  $0                                    # Update from default repository"
        echo "  $0 --source /path/to/kaspa-aio       # Update from local directory"
        echo "  $0 --repo https://github.com/user/kaspa-aio.git --branch develop"
        echo
        exit 0
        ;;
    --source)
        export UPDATE_SOURCE="$2"
        shift 2
        main
        ;;
    --repo)
        export UPDATE_REPO="$2"
        shift 2
        main
        ;;
    --branch)
        export UPDATE_BRANCH="$2"
        shift 2
        main
        ;;
    --skip-backup)
        export SKIP_BACKUP=true
        shift
        main
        ;;
    --no-rollback)
        export NO_ROLLBACK=true
        shift
        main
        ;;
    --check-only)
        log_info "Check-only mode not yet implemented"
        log_info "This feature will be added in a future update"
        exit 0
        ;;
    "")
        # No arguments, proceed with default update
        main
        ;;
    *)
        log_error "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac