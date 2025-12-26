#!/bin/bash

# Kaspa Dashboard Uninstall Script
# This script completely removes the Management Dashboard from the system

set -e  # Exit on any error

# Configuration
SERVICE_NAME="kaspa-dashboard"
DASHBOARD_USER="kaspa-dashboard"
DASHBOARD_HOME="/opt/kaspa-dashboard"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

# Confirm uninstallation
confirm_uninstall() {
    echo
    echo "=============================================="
    echo "  Kaspa Dashboard Uninstall Confirmation"
    echo "=============================================="
    echo
    echo "This will completely remove:"
    echo "  • Dashboard service ($SERVICE_NAME)"
    echo "  • Dashboard user ($DASHBOARD_USER)"
    echo "  • All dashboard files ($DASHBOARD_HOME)"
    echo "  • Systemd service configuration"
    echo "  • Log rotation configuration"
    echo "  • All logs and backups"
    echo
    echo -e "${YELLOW}WARNING: This action cannot be undone!${NC}"
    echo
    
    if [[ "${FORCE_UNINSTALL:-}" == "true" ]]; then
        log_info "Force uninstall enabled, proceeding without confirmation"
        return 0
    fi
    
    read -p "Are you sure you want to uninstall the dashboard? (yes/no): " -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log_info "Uninstall cancelled"
        exit 0
    fi
}

# Stop and disable service
stop_service() {
    log_info "Stopping and disabling dashboard service..."
    
    if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
        systemctl stop "$SERVICE_NAME"
        log_success "Service stopped"
    else
        log_info "Service was not running"
    fi
    
    if systemctl is-enabled --quiet "$SERVICE_NAME" 2>/dev/null; then
        systemctl disable "$SERVICE_NAME"
        log_success "Service disabled"
    else
        log_info "Service was not enabled"
    fi
}

# Remove systemd service file
remove_systemd_service() {
    log_info "Removing systemd service configuration..."
    
    SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
    
    if [[ -f "$SERVICE_FILE" ]]; then
        rm -f "$SERVICE_FILE"
        systemctl daemon-reload
        log_success "Systemd service configuration removed"
    else
        log_info "Systemd service file not found"
    fi
}

# Remove log rotation configuration
remove_log_rotation() {
    log_info "Removing log rotation configuration..."
    
    LOGROTATE_FILE="/etc/logrotate.d/$SERVICE_NAME"
    
    if [[ -f "$LOGROTATE_FILE" ]]; then
        rm -f "$LOGROTATE_FILE"
        log_success "Log rotation configuration removed"
    else
        log_info "Log rotation configuration not found"
    fi
}

# Create backup before removal (optional)
create_final_backup() {
    if [[ "${CREATE_BACKUP:-}" == "true" && -d "$DASHBOARD_HOME" ]]; then
        log_info "Creating final backup before removal..."
        
        BACKUP_DIR="/tmp/kaspa-dashboard-backup-$(date +%Y%m%d_%H%M%S)"
        mkdir -p "$BACKUP_DIR"
        
        # Backup configuration and logs
        if [[ -f "$DASHBOARD_HOME/.env" ]]; then
            cp "$DASHBOARD_HOME/.env" "$BACKUP_DIR/"
        fi
        
        if [[ -d "$DASHBOARD_HOME/logs" ]]; then
            cp -r "$DASHBOARD_HOME/logs" "$BACKUP_DIR/"
        fi
        
        if [[ -d "$DASHBOARD_HOME/backups" ]]; then
            cp -r "$DASHBOARD_HOME/backups" "$BACKUP_DIR/"
        fi
        
        # Create archive
        tar -czf "${BACKUP_DIR}.tar.gz" -C "$(dirname "$BACKUP_DIR")" "$(basename "$BACKUP_DIR")"
        rm -rf "$BACKUP_DIR"
        
        log_success "Final backup created: ${BACKUP_DIR}.tar.gz"
    fi
}

# Remove dashboard files
remove_dashboard_files() {
    log_info "Removing dashboard files..."
    
    if [[ -d "$DASHBOARD_HOME" ]]; then
        rm -rf "$DASHBOARD_HOME"
        log_success "Dashboard files removed"
    else
        log_info "Dashboard directory not found"
    fi
}

# Remove dashboard user
remove_dashboard_user() {
    log_info "Removing dashboard user..."
    
    if id "$DASHBOARD_USER" &>/dev/null; then
        # Remove user from docker group if it exists
        if getent group docker > /dev/null 2>&1; then
            gpasswd -d "$DASHBOARD_USER" docker 2>/dev/null || true
        fi
        
        # Remove user and home directory
        userdel -r "$DASHBOARD_USER" 2>/dev/null || userdel "$DASHBOARD_USER" 2>/dev/null || true
        log_success "Dashboard user removed"
    else
        log_info "Dashboard user not found"
    fi
}

# Clean up any remaining processes
cleanup_processes() {
    log_info "Cleaning up any remaining processes..."
    
    # Kill any remaining dashboard processes
    pkill -f "node.*server.js" 2>/dev/null || true
    pkill -u "$DASHBOARD_USER" 2>/dev/null || true
    
    log_success "Process cleanup completed"
}

# Remove Nginx configuration (if exists)
remove_nginx_config() {
    log_info "Checking for Nginx configuration..."
    
    # Check common Nginx configuration locations
    NGINX_CONFIGS=(
        "/etc/nginx/sites-available/kaspa-dashboard"
        "/etc/nginx/sites-enabled/kaspa-dashboard"
        "/etc/nginx/conf.d/kaspa-dashboard.conf"
    )
    
    for config in "${NGINX_CONFIGS[@]}"; do
        if [[ -f "$config" ]]; then
            rm -f "$config"
            log_success "Removed Nginx configuration: $config"
        fi
    done
    
    # Reload Nginx if it's running
    if systemctl is-active --quiet nginx 2>/dev/null; then
        systemctl reload nginx 2>/dev/null || log_warning "Failed to reload Nginx"
    fi
}

# Verify complete removal
verify_removal() {
    log_info "Verifying complete removal..."
    
    local issues=0
    
    # Check service
    if systemctl list-unit-files | grep -q "$SERVICE_NAME"; then
        log_warning "Systemd service still exists"
        ((issues++))
    fi
    
    # Check user
    if id "$DASHBOARD_USER" &>/dev/null; then
        log_warning "Dashboard user still exists"
        ((issues++))
    fi
    
    # Check files
    if [[ -d "$DASHBOARD_HOME" ]]; then
        log_warning "Dashboard directory still exists"
        ((issues++))
    fi
    
    # Check processes
    if pgrep -f "node.*server.js" >/dev/null 2>&1; then
        log_warning "Dashboard processes may still be running"
        ((issues++))
    fi
    
    if [[ $issues -eq 0 ]]; then
        log_success "Verification passed - dashboard completely removed"
        return 0
    else
        log_warning "Verification found $issues potential issues"
        return 1
    fi
}

# Print removal summary
print_summary() {
    echo
    echo "=============================================="
    echo "  Kaspa Dashboard Uninstall Complete"
    echo "=============================================="
    echo
    echo "Removed components:"
    echo "  ✓ Dashboard service ($SERVICE_NAME)"
    echo "  ✓ Dashboard user ($DASHBOARD_USER)"
    echo "  ✓ Dashboard files ($DASHBOARD_HOME)"
    echo "  ✓ Systemd service configuration"
    echo "  ✓ Log rotation configuration"
    echo "  ✓ Process cleanup"
    echo
    
    if [[ "${CREATE_BACKUP:-}" == "true" ]]; then
        echo "Final backup created in /tmp/"
        echo
    fi
    
    echo "The Kaspa Management Dashboard has been completely removed."
    echo "To reinstall, run the installation script again."
    echo
}

# Main uninstall function
main() {
    echo "=============================================="
    echo "  Kaspa Dashboard Uninstall"
    echo "=============================================="
    echo
    
    check_root
    confirm_uninstall
    
    log_info "Starting uninstall process..."
    
    create_final_backup
    stop_service
    cleanup_processes
    remove_systemd_service
    remove_log_rotation
    remove_nginx_config
    remove_dashboard_files
    remove_dashboard_user
    
    if verify_removal; then
        print_summary
        log_success "Uninstall completed successfully!"
        exit 0
    else
        log_warning "Uninstall completed with some issues"
        log_info "You may need to manually clean up remaining components"
        exit 1
    fi
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Kaspa Dashboard Uninstall Script"
        echo
        echo "Usage: $0 [options]"
        echo
        echo "Options:"
        echo "  --help, -h       Show this help message"
        echo "  --force          Skip confirmation prompt"
        echo "  --backup         Create backup before removal"
        echo "  --dry-run        Show what would be removed without doing it"
        echo
        echo "Environment variables:"
        echo "  FORCE_UNINSTALL=true    Skip confirmation (same as --force)"
        echo "  CREATE_BACKUP=true      Create backup (same as --backup)"
        echo
        echo "This script completely removes the Kaspa Management Dashboard"
        echo "including the service, user, files, and configuration."
        echo
        exit 0
        ;;
    --force)
        export FORCE_UNINSTALL=true
        main
        ;;
    --backup)
        export CREATE_BACKUP=true
        main
        ;;
    --dry-run)
        echo "Dry run mode - showing what would be removed:"
        echo
        echo "Would remove:"
        echo "  • Service: $SERVICE_NAME"
        echo "  • User: $DASHBOARD_USER"
        echo "  • Directory: $DASHBOARD_HOME"
        echo "  • Systemd service: /etc/systemd/system/${SERVICE_NAME}.service"
        echo "  • Log rotation: /etc/logrotate.d/$SERVICE_NAME"
        echo "  • Any remaining processes"
        echo
        echo "Use without --dry-run to perform actual removal"
        exit 0
        ;;
    "")
        # No arguments, proceed with interactive uninstall
        main
        ;;
    *)
        log_error "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac