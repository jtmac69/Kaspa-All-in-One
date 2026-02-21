#!/bin/bash

# Kaspa Wizard Update Script
# Updates the Installation Wizard to the latest version

set -e

# Configuration
SERVICE_NAME="kaspa-wizard"
WIZARD_USER="kaspa-wizard"
WIZARD_HOME="/opt/kaspa-wizard"
BACKUP_DIR="$WIZARD_HOME/backups"
UPDATE_LOG="$WIZARD_HOME/logs/update.log"

UPDATE_BRANCH="${UPDATE_BRANCH:-main}"
UPDATE_REPO="${UPDATE_REPO:-https://github.com/jtmac69/Kaspa-All-in-One.git}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC} $1";    echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO] $1"    >> "$UPDATE_LOG" 2>/dev/null || true; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; echo "$(date '+%Y-%m-%d %H:%M:%S') [SUCCESS] $1" >> "$UPDATE_LOG" 2>/dev/null || true; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; echo "$(date '+%Y-%m-%d %H:%M:%S') [WARNING] $1" >> "$UPDATE_LOG" 2>/dev/null || true; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1";    echo "$(date '+%Y-%m-%d %H:%M:%S') [ERROR] $1"   >> "$UPDATE_LOG" 2>/dev/null || true; }

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    if [[ ! -d "$WIZARD_HOME" ]]; then
        log_error "Wizard not found at $WIZARD_HOME"
        exit 1
    fi

    if ! systemctl list-unit-files | grep -q "$SERVICE_NAME"; then
        log_error "Wizard service ($SERVICE_NAME) not found"
        exit 1
    fi

    local missing=()
    command -v git &>/dev/null  || missing+=("git")
    command -v rsync &>/dev/null || missing+=("rsync")
    command -v npm &>/dev/null  || missing+=("npm")

    if [[ ${#missing[@]} -gt 0 ]]; then
        log_error "Missing required tools: ${missing[*]}"
        exit 1
    fi

    log_success "Prerequisites check passed"
}

get_current_version() {
    log_info "Getting current version..."
    CURRENT_VERSION=$(grep '"version"' "$WIZARD_HOME/backend/package.json" 2>/dev/null | cut -d'"' -f4 || echo "unknown")
    log_info "Current version: $CURRENT_VERSION"
}

create_backup() {
    log_info "Creating backup..."
    mkdir -p "$BACKUP_DIR"
    local ts backup_name backup_path
    ts=$(date +%Y%m%d_%H%M%S)
    backup_name="wizard_backup_${ts}"
    backup_path="$BACKUP_DIR/$backup_name"
    mkdir -p "$backup_path"

    [[ -f "$WIZARD_HOME/.env" ]]              && cp "$WIZARD_HOME/.env"              "$backup_path/"
    [[ -f "$WIZARD_HOME/backend/package.json" ]]      && cp "$WIZARD_HOME/backend/package.json"      "$backup_path/"
    [[ -f "$WIZARD_HOME/backend/package-lock.json" ]] && cp "$WIZARD_HOME/backend/package-lock.json" "$backup_path/"

    if [[ -d "$WIZARD_HOME/logs" ]]; then
        mkdir -p "$backup_path/logs"
        find "$WIZARD_HOME/logs" -name "*.log" -mtime -7 -exec cp {} "$backup_path/logs/" \; 2>/dev/null || true
    fi

    cd "$BACKUP_DIR"
    tar -czf "${backup_name}.tar.gz" "$backup_name"
    if ! tar -tzf "${backup_name}.tar.gz" > /dev/null 2>&1; then
        log_error "Backup archive is corrupt — aborting update to prevent unrecoverable state"
        rm -f "${backup_name}.tar.gz"
        rm -rf "$backup_path"
        return 1
    fi
    rm -rf "$backup_path"
    ls -t "$BACKUP_DIR"/wizard_backup_*.tar.gz 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true

    BACKUP_FILE="${BACKUP_DIR}/${backup_name}.tar.gz"
    log_success "Backup created: $BACKUP_FILE"
}

stop_wizard() {
    log_info "Stopping wizard service..."
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        systemctl stop "$SERVICE_NAME"
        local timeout=30
        while systemctl is-active --quiet "$SERVICE_NAME" && [[ $timeout -gt 0 ]]; do
            sleep 1; ((timeout--))
        done
        if systemctl is-active --quiet "$SERVICE_NAME"; then
            log_error "Wizard service did not stop within 30 seconds — aborting update"
            return 1
        fi
        log_success "Wizard service stopped"
    else
        log_info "Wizard service was not running"
    fi
}

prepare_update() {
    log_info "Preparing update from repository..."
    local temp_dir="/tmp/kaspa-wizard-update-$$"
    mkdir -p "$temp_dir"

    local update_src="${UPDATE_SOURCE:-}"
    if [[ -n "$update_src" && -d "$update_src" ]]; then
        if [[ ! -d "$update_src/services/wizard" ]]; then
            log_error "Invalid update source: services/wizard not found in $update_src"
            rm -rf "$temp_dir"
            return 1
        fi
        cp -r "$update_src/services/wizard"/* "$temp_dir/"
    else
        cd "$temp_dir"
        git clone --depth 1 --branch "$UPDATE_BRANCH" "$UPDATE_REPO" kaspa-aio
        mv kaspa-aio/services/wizard/* .
        rm -rf kaspa-aio
    fi

    UPDATE_TEMP_DIR="$temp_dir"
    log_success "Update prepared in $UPDATE_TEMP_DIR"
}

apply_update() {
    log_info "Applying update..."
    set +e
    rsync -av \
        --exclude='.env' \
        --exclude='logs' \
        --exclude='backups' \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='*.log' \
        "$UPDATE_TEMP_DIR/" "$WIZARD_HOME/"
    local rsync_rc=$?
    set -e
    if [[ $rsync_rc -ne 0 ]]; then
        log_error "rsync failed (exit $rsync_rc)"
        return 1
    fi
    chown -R "$WIZARD_USER:$WIZARD_USER" "$WIZARD_HOME"
    rm -rf "$UPDATE_TEMP_DIR"
    log_success "Files updated"
}

update_dependencies() {
    log_info "Updating npm dependencies..."
    cd "$WIZARD_HOME/backend"
    set +e
    sudo -u "$WIZARD_USER" npm ci --omit=dev
    local npm_rc=$?
    set -e
    if [[ $npm_rc -ne 0 ]]; then
        log_error "npm ci failed (exit $npm_rc)"
        return 1
    fi
    log_success "Dependencies updated"
}

start_wizard() {
    log_info "Starting wizard service..."
    systemctl start "$SERVICE_NAME"
    local timeout=30
    while ! systemctl is-active --quiet "$SERVICE_NAME" && [[ $timeout -gt 0 ]]; do
        sleep 1; ((timeout--))
    done
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        log_success "Wizard service started"
    else
        log_error "Failed to start wizard service"
        return 1
    fi
}

rollback_update() {
    log_error "Update failed — attempting rollback..."
    if [[ -n "${BACKUP_FILE:-}" && -f "$BACKUP_FILE" ]]; then
        systemctl stop "$SERVICE_NAME" 2>/dev/null || true
        local restore_tmp="/tmp/wizard-restore-$$"
        mkdir -p "$restore_tmp"
        cd "$restore_tmp"
        tar -xzf "$BACKUP_FILE" || { log_error "Rollback: failed to extract backup archive — manual intervention required"; rm -rf "$restore_tmp"; return 1; }
        local backup_dir
        backup_dir=$(find . -name "wizard_backup_*" -type d | head -1)
        if [[ -n "$backup_dir" ]]; then
            cp -r "$backup_dir"/* "$WIZARD_HOME/"
            chown -R "$WIZARD_USER:$WIZARD_USER" "$WIZARD_HOME"
            systemctl start "$SERVICE_NAME"
            if systemctl is-active --quiet "$SERVICE_NAME"; then
                log_success "Rollback completed"
            else
                log_error "Rollback: service failed to start after restore — manual intervention required"
            fi
        else
            log_error "No backup data found for rollback"
        fi
        rm -rf "$restore_tmp"
    else
        log_error "No backup available for rollback"
    fi
}

main() {
    echo "=============================================="
    echo "  Kaspa Wizard Update"
    echo "=============================================="

    mkdir -p "$(dirname "$UPDATE_LOG")"
    touch "$UPDATE_LOG"
    chown "$WIZARD_USER:$WIZARD_USER" "$UPDATE_LOG" 2>/dev/null || true

    check_root
    check_prerequisites
    get_current_version

    if [[ "${SKIP_BACKUP:-}" != "true" ]]; then
        create_backup
    fi

    if stop_wizard && prepare_update && apply_update && update_dependencies && start_wizard; then
        log_success "Wizard update completed successfully!"
        exit 0
    else
        log_error "Update failed"
        [[ "${NO_ROLLBACK:-}" != "true" ]] && rollback_update
        exit 1
    fi
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --help|-h)
            echo "Usage: $0 [--skip-backup] [--no-rollback] [--source PATH] [--branch BRANCH]"
            exit 0 ;;
        --source)  export UPDATE_SOURCE="$2"; shift 2 ;;
        --branch)  export UPDATE_BRANCH="$2"; shift 2 ;;
        --skip-backup) export SKIP_BACKUP=true; shift ;;
        --no-rollback) export NO_ROLLBACK=true; shift ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done
main
