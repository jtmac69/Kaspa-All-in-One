#!/bin/bash

# Kaspa Dashboard Host-Based Installation Script
# This script installs the Management Dashboard as a host-based service

set -e  # Exit on any error

# Configuration
DASHBOARD_USER="kaspa-dashboard"
DASHBOARD_HOME="/opt/kaspa-dashboard"
SERVICE_NAME="kaspa-dashboard"
NODE_MIN_VERSION="16"
DASHBOARD_PORT="8080"

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

# Check system requirements
check_system() {
    log_info "Checking system requirements..."
    
    # Check OS
    if [[ ! -f /etc/os-release ]]; then
        log_error "Cannot determine operating system"
        exit 1
    fi
    
    source /etc/os-release
    log_info "Detected OS: $PRETTY_NAME"
    
    # Check systemd
    if ! command -v systemctl &> /dev/null; then
        log_error "systemd is required but not found"
        exit 1
    fi
    
    log_success "System requirements check passed"
}

# Check and install Node.js
install_nodejs() {
    log_info "Checking Node.js installation..."
    
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version | sed 's/v//')
        NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1)
        
        if [[ $NODE_MAJOR -ge $NODE_MIN_VERSION ]]; then
            log_success "Node.js $NODE_VERSION is already installed"
            return 0
        else
            log_warning "Node.js $NODE_VERSION is too old (minimum: $NODE_MIN_VERSION)"
        fi
    else
        log_info "Node.js not found, installing..."
    fi
    
    # Install Node.js using NodeSource repository
    log_info "Installing Node.js $NODE_MIN_VERSION LTS..."
    
    # Detect package manager
    if command -v apt-get &> /dev/null; then
        # Ubuntu/Debian
        curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
        apt-get install -y nodejs
    elif command -v yum &> /dev/null; then
        # RHEL/CentOS/Fedora
        curl -fsSL https://rpm.nodesource.com/setup_lts.x | bash -
        yum install -y nodejs npm
    elif command -v dnf &> /dev/null; then
        # Fedora (newer)
        curl -fsSL https://rpm.nodesource.com/setup_lts.x | bash -
        dnf install -y nodejs npm
    elif command -v pacman &> /dev/null; then
        # Arch Linux
        pacman -S --noconfirm nodejs npm
    else
        log_error "Unsupported package manager. Please install Node.js $NODE_MIN_VERSION+ manually"
        exit 1
    fi
    
    # Verify installation
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        log_success "Node.js $NODE_VERSION installed successfully"
    else
        log_error "Node.js installation failed"
        exit 1
    fi
    
    # Verify npm
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        log_success "npm $NPM_VERSION is available"
    else
        log_error "npm not found after Node.js installation"
        exit 1
    fi
}

# Create dashboard user
create_user() {
    log_info "Creating dashboard user..."
    
    if id "$DASHBOARD_USER" &>/dev/null; then
        log_info "User $DASHBOARD_USER already exists"
    else
        useradd --system --home-dir "$DASHBOARD_HOME" --create-home --shell /bin/bash "$DASHBOARD_USER"
        log_success "Created user $DASHBOARD_USER"
    fi
    
    # Add user to docker group if it exists
    if getent group docker > /dev/null 2>&1; then
        usermod -aG docker "$DASHBOARD_USER"
        log_success "Added $DASHBOARD_USER to docker group"
    else
        log_warning "Docker group not found - dashboard may not be able to manage containers"
    fi
}

# Install dashboard files
install_dashboard() {
    log_info "Installing dashboard files..."
    
    # Create directory structure
    mkdir -p "$DASHBOARD_HOME"
    mkdir -p "$DASHBOARD_HOME/logs"
    mkdir -p "$DASHBOARD_HOME/backups"
    
    # Copy dashboard files
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    
    # Copy all dashboard files except node_modules
    rsync -av --exclude='node_modules' --exclude='*.log' --exclude='.git' \
          "$SCRIPT_DIR/" "$DASHBOARD_HOME/"
    
    # Set ownership
    chown -R "$DASHBOARD_USER:$DASHBOARD_USER" "$DASHBOARD_HOME"
    
    log_success "Dashboard files installed to $DASHBOARD_HOME"
}

# Install npm dependencies
install_dependencies() {
    log_info "Installing npm dependencies..."
    
    cd "$DASHBOARD_HOME"
    
    # Install dependencies as dashboard user
    sudo -u "$DASHBOARD_USER" npm ci --only=production
    
    log_success "npm dependencies installed"
}

# Create systemd service
create_systemd_service() {
    log_info "Creating systemd service..."
    
    # Copy the service file from the dashboard directory
    if [[ -f "$DASHBOARD_HOME/kaspa-dashboard.service" ]]; then
        cp "$DASHBOARD_HOME/kaspa-dashboard.service" "/etc/systemd/system/${SERVICE_NAME}.service"
        log_info "Using provided systemd service file"
    else
        # Fallback to creating the service file inline
        log_warning "Service file not found, creating basic service configuration"
        cat > "/etc/systemd/system/${SERVICE_NAME}.service" << EOF
[Unit]
Description=Kaspa Management Dashboard
Documentation=https://github.com/kaspa-community/kaspa-aio
After=network-online.target docker.service
Wants=network-online.target
Requires=network.target

[Service]
Type=simple
User=$DASHBOARD_USER
Group=$DASHBOARD_USER
WorkingDirectory=$DASHBOARD_HOME
ExecStart=/usr/bin/node server.js
ExecStartPre=/bin/bash -c 'if [ ! -f $DASHBOARD_HOME/.env ]; then echo "ERROR: .env file not found"; exit 1; fi'

# Restart configuration
Restart=always
RestartSec=10
StartLimitInterval=300
StartLimitBurst=5
TimeoutStopSec=30

# Logging configuration
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$SERVICE_NAME
SyslogFacility=daemon

# Environment variables
Environment=NODE_ENV=production
Environment=PORT=$DASHBOARD_PORT
Environment=KASPA_NODE_URL=http://localhost:16111
EnvironmentFile=-$DASHBOARD_HOME/.env

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ProtectKernelTunables=true
ProtectControlGroups=true
RestrictRealtime=true
ReadWritePaths=$DASHBOARD_HOME
ReadWritePaths=$DASHBOARD_HOME/logs
ReadWritePaths=$DASHBOARD_HOME/backups
CapabilityBoundingSet=CAP_NET_BIND_SERVICE

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096
MemoryMax=512M
CPUQuota=50%

[Install]
WantedBy=multi-user.target
Alias=dashboard.service
EOF
    fi

    # Reload systemd
    systemctl daemon-reload
    
    log_success "Systemd service created"
}

# Create environment configuration
create_environment() {
    log_info "Creating environment configuration..."
    
    ENV_FILE="$DASHBOARD_HOME/.env"
    
    if [[ ! -f "$ENV_FILE" ]]; then
        # Use template if available, otherwise create basic config
        if [[ -f "$DASHBOARD_HOME/.env.template" ]]; then
            log_info "Using environment template"
            # Create .env from template with basic values filled in
            sed -e "s/^# PORT=8080/PORT=$DASHBOARD_PORT/" \
                -e "s/^# NODE_ENV=production/NODE_ENV=production/" \
                -e "s|^# KASPA_NODE_URL=http://localhost:16111|KASPA_NODE_URL=http://localhost:16111|" \
                -e "s|^# LOG_FILE=/opt/kaspa-dashboard/logs/dashboard.log|LOG_FILE=$DASHBOARD_HOME/logs/dashboard.log|" \
                -e "s|^# BACKUP_DIR=/opt/kaspa-dashboard/backups|BACKUP_DIR=$DASHBOARD_HOME/backups|" \
                "$DASHBOARD_HOME/.env.template" > "$ENV_FILE"
        else
            log_warning "Template not found, creating basic configuration"
            cat > "$ENV_FILE" << EOF
# Kaspa Dashboard Configuration
NODE_ENV=production
PORT=$DASHBOARD_PORT
KASPA_NODE_URL=http://localhost:16111

# Security settings
CORS_ORIGIN=http://localhost:3000,http://localhost:$DASHBOARD_PORT
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE=$DASHBOARD_HOME/logs/dashboard.log

# SSL/TLS (optional)
# SSL_CERT_PATH=/path/to/cert.pem
# SSL_KEY_PATH=/path/to/key.pem
# FORCE_HTTPS=false

# WebSocket settings
WS_HEARTBEAT_INTERVAL=30000
WS_MAX_CONNECTIONS=100

# Cache settings
CACHE_TTL=30000
MAX_CACHE_SIZE=100

# Performance settings
MAX_CONCURRENT_REQUESTS=10
REQUEST_TIMEOUT=30000

# Monitoring settings
RESOURCE_MONITOR_INTERVAL=5000
SERVICE_MONITOR_INTERVAL=5000
CPU_WARNING_THRESHOLD=80
CPU_CRITICAL_THRESHOLD=90
MEMORY_WARNING_THRESHOLD=85
MEMORY_CRITICAL_THRESHOLD=90
AUTO_RESOURCE_MONITORING=true

# Backup settings
BACKUP_DIR=$DASHBOARD_HOME/backups
MAX_BACKUP_FILES=10

# Wizard integration
WIZARD_URL=http://localhost:3000
WIZARD_INTEGRATION_ENABLED=true
EOF
        fi
        
        chown "$DASHBOARD_USER:$DASHBOARD_USER" "$ENV_FILE"
        chmod 600 "$ENV_FILE"
        
        log_success "Environment configuration created"
    else
        log_info "Environment configuration already exists"
    fi
}

# Create log rotation
setup_log_rotation() {
    log_info "Setting up log rotation..."
    
    cat > "/etc/logrotate.d/$SERVICE_NAME" << EOF
$DASHBOARD_HOME/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 644 $DASHBOARD_USER $DASHBOARD_USER
    postrotate
        systemctl reload $SERVICE_NAME > /dev/null 2>&1 || true
    endscript
}
EOF

    log_success "Log rotation configured"
}

# Enable and start service
start_service() {
    log_info "Enabling and starting dashboard service..."
    
    # Enable service
    systemctl enable "$SERVICE_NAME"
    
    # Start service
    systemctl start "$SERVICE_NAME"
    
    # Wait a moment for service to start
    sleep 3
    
    log_success "Dashboard service enabled and started"
}

# Verify installation
verify_installation() {
    log_info "Verifying installation..."
    
    # Check service status
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        log_success "Dashboard service is running"
    else
        log_error "Dashboard service is not running"
        log_info "Service status:"
        systemctl status "$SERVICE_NAME" --no-pager
        return 1
    fi
    
    # Check if port is listening
    if ss -tlnp | grep -q ":$DASHBOARD_PORT "; then
        log_success "Dashboard is listening on port $DASHBOARD_PORT"
    else
        log_error "Dashboard is not listening on port $DASHBOARD_PORT"
        return 1
    fi
    
    # Test HTTP endpoint
    if command -v curl &> /dev/null; then
        if curl -s -f "http://localhost:$DASHBOARD_PORT/health" > /dev/null; then
            log_success "Dashboard health check passed"
        else
            log_warning "Dashboard health check failed (may be starting up)"
        fi
    fi
    
    return 0
}

# Create service management scripts
create_management_scripts() {
    log_info "Creating service management scripts..."
    
    # Create scripts directory
    mkdir -p "$DASHBOARD_HOME/scripts"
    
    # Health check script
    cat > "$DASHBOARD_HOME/scripts/health-check.sh" << 'EOF'
#!/bin/bash
# Kaspa Dashboard Health Check Script

SERVICE_NAME="kaspa-dashboard"
DASHBOARD_PORT="${PORT:-8080}"

# Check if service is running
if ! systemctl is-active --quiet "$SERVICE_NAME"; then
    echo "ERROR: Service $SERVICE_NAME is not running"
    exit 1
fi

# Check if port is listening
if ! ss -tlnp | grep -q ":$DASHBOARD_PORT "; then
    echo "ERROR: Dashboard is not listening on port $DASHBOARD_PORT"
    exit 1
fi

# Check HTTP endpoint
if command -v curl &> /dev/null; then
    if ! curl -sf "http://localhost:$DASHBOARD_PORT/health" > /dev/null; then
        echo "ERROR: Health endpoint check failed"
        exit 1
    fi
else
    echo "WARNING: curl not available, skipping HTTP health check"
fi

echo "SUCCESS: Dashboard service is healthy"
exit 0
EOF

    # Service control script
    cat > "$DASHBOARD_HOME/scripts/service-control.sh" << 'EOF'
#!/bin/bash
# Kaspa Dashboard Service Control Script

SERVICE_NAME="kaspa-dashboard"

usage() {
    echo "Usage: $0 {start|stop|restart|status|logs|health}"
    echo
    echo "Commands:"
    echo "  start    - Start the dashboard service"
    echo "  stop     - Stop the dashboard service"
    echo "  restart  - Restart the dashboard service"
    echo "  status   - Show service status"
    echo "  logs     - Show recent logs"
    echo "  health   - Run health check"
    exit 1
}

case "${1:-}" in
    start)
        echo "Starting $SERVICE_NAME..."
        sudo systemctl start "$SERVICE_NAME"
        ;;
    stop)
        echo "Stopping $SERVICE_NAME..."
        sudo systemctl stop "$SERVICE_NAME"
        ;;
    restart)
        echo "Restarting $SERVICE_NAME..."
        sudo systemctl restart "$SERVICE_NAME"
        ;;
    status)
        sudo systemctl status "$SERVICE_NAME"
        ;;
    logs)
        sudo journalctl -u "$SERVICE_NAME" -n 50 --no-pager
        ;;
    health)
        /opt/kaspa-dashboard/scripts/health-check.sh
        ;;
    *)
        usage
        ;;
esac
EOF

    # Log viewer script
    cat > "$DASHBOARD_HOME/scripts/view-logs.sh" << 'EOF'
#!/bin/bash
# Kaspa Dashboard Log Viewer Script

SERVICE_NAME="kaspa-dashboard"

usage() {
    echo "Usage: $0 [OPTIONS]"
    echo
    echo "Options:"
    echo "  -f, --follow     Follow logs in real-time"
    echo "  -n, --lines N    Show last N lines (default: 100)"
    echo "  -s, --since TIME Show logs since TIME (e.g., '1 hour ago')"
    echo "  -e, --errors     Show only errors and warnings"
    echo "  -h, --help       Show this help"
    echo
    echo "Examples:"
    echo "  $0 -f                    # Follow logs"
    echo "  $0 -n 200               # Show last 200 lines"
    echo "  $0 -s '1 hour ago'      # Show logs from last hour"
    echo "  $0 -e                   # Show only errors"
    exit 1
}

FOLLOW=false
LINES=100
SINCE=""
ERRORS_ONLY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--follow)
            FOLLOW=true
            shift
            ;;
        -n|--lines)
            LINES="$2"
            shift 2
            ;;
        -s|--since)
            SINCE="$2"
            shift 2
            ;;
        -e|--errors)
            ERRORS_ONLY=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            echo "Unknown option: $1"
            usage
            ;;
    esac
done

# Build journalctl command
CMD="sudo journalctl -u $SERVICE_NAME"

if [[ "$FOLLOW" == "true" ]]; then
    CMD="$CMD -f"
else
    CMD="$CMD -n $LINES"
fi

if [[ -n "$SINCE" ]]; then
    CMD="$CMD --since '$SINCE'"
fi

if [[ "$ERRORS_ONLY" == "true" ]]; then
    CMD="$CMD -p warning"
fi

# Execute command
eval "$CMD"
EOF

    # Make scripts executable
    chmod +x "$DASHBOARD_HOME/scripts/"*.sh
    chown -R "$DASHBOARD_USER:$DASHBOARD_USER" "$DASHBOARD_HOME/scripts"
    
    log_success "Service management scripts created"
}

# Setup management scripts
setup_management_scripts() {
    log_info "Setting up management scripts..."
    
    # Ensure scripts directory exists and has correct permissions
    mkdir -p "$DASHBOARD_HOME/scripts"
    chown "$DASHBOARD_USER:$DASHBOARD_USER" "$DASHBOARD_HOME/scripts"
    
    # Make sure all scripts are executable and have correct ownership
    if [[ -d "$DASHBOARD_HOME/scripts" ]]; then
        chmod +x "$DASHBOARD_HOME/scripts/"*.sh 2>/dev/null || true
        chown "$DASHBOARD_USER:$DASHBOARD_USER" "$DASHBOARD_HOME/scripts/"*.sh 2>/dev/null || true
    fi
    
    # Create convenience symlinks in dashboard home
    if [[ -f "$DASHBOARD_HOME/scripts/uninstall.sh" ]]; then
        ln -sf "scripts/uninstall.sh" "$DASHBOARD_HOME/uninstall.sh" 2>/dev/null || true
        log_success "Uninstall script available at $DASHBOARD_HOME/uninstall.sh"
    fi
    
    if [[ -f "$DASHBOARD_HOME/scripts/update.sh" ]]; then
        ln -sf "scripts/update.sh" "$DASHBOARD_HOME/update.sh" 2>/dev/null || true
        log_success "Update script available at $DASHBOARD_HOME/update.sh"
    fi
    
    log_success "Management scripts configured"
}

# Print installation summary
print_summary() {
    echo
    echo "=============================================="
    echo "  Kaspa Dashboard Installation Complete"
    echo "=============================================="
    echo
    echo "Dashboard Details:"
    echo "  Service Name: $SERVICE_NAME"
    echo "  User: $DASHBOARD_USER"
    echo "  Home Directory: $DASHBOARD_HOME"
    echo "  Port: $DASHBOARD_PORT"
    echo "  URL: http://localhost:$DASHBOARD_PORT"
    echo
    echo "Service Management:"
    echo "  Start:   sudo systemctl start $SERVICE_NAME"
    echo "  Stop:    sudo systemctl stop $SERVICE_NAME"
    echo "  Restart: sudo systemctl restart $SERVICE_NAME"
    echo "  Status:  sudo systemctl status $SERVICE_NAME"
    echo "  Logs:    sudo journalctl -u $SERVICE_NAME -f"
    echo
    echo "Management Scripts:"
    echo "  Service Control: $DASHBOARD_HOME/scripts/service-control.sh"
    echo "  Health Check:    $DASHBOARD_HOME/scripts/health-check.sh"
    echo "  Log Viewer:      $DASHBOARD_HOME/scripts/view-logs.sh"
    echo "  Update:          $DASHBOARD_HOME/update.sh (or sudo $0 --update)"
    echo "  Uninstall:       $DASHBOARD_HOME/uninstall.sh (or sudo $0 --uninstall)"
    echo
    echo "Configuration:"
    echo "  Environment: $DASHBOARD_HOME/.env"
    echo "  Template:    $DASHBOARD_HOME/.env.template"
    echo "  Service:     /etc/systemd/system/$SERVICE_NAME.service"
    echo "  Logs:        $DASHBOARD_HOME/logs/ (and journald)"
    echo "  Update:      $DASHBOARD_HOME/update.sh"
    echo "  Uninstall:   $DASHBOARD_HOME/uninstall.sh"
    echo
    echo "Documentation:"
    echo "  Service Management: $DASHBOARD_HOME/SERVICE_MANAGEMENT.md"
    echo "  Deployment Guide:   $DASHBOARD_HOME/DEPLOYMENT.md"
    echo
    echo "Next Steps:"
    echo "  1. Review and customize $DASHBOARD_HOME/.env if needed"
    echo "  2. Ensure Docker is running and accessible to $DASHBOARD_USER"
    echo "  3. Access the dashboard at http://localhost:$DASHBOARD_PORT"
    echo "  4. Check service health: $DASHBOARD_HOME/scripts/health-check.sh"
    echo "  5. View logs: $DASHBOARD_HOME/scripts/view-logs.sh -f"
    echo
    echo "Systemd Service Features:"
    echo "  ✓ Auto-restart on failure"
    echo "  ✓ Resource limits (512MB RAM, 50% CPU)"
    echo "  ✓ Security hardening enabled"
    echo "  ✓ Logging to systemd journal"
    echo "  ✓ Environment file support"
    echo "  ✓ Dependency management"
    echo
}

# Main installation function
main() {
    echo "=============================================="
    echo "  Kaspa Dashboard Host-Based Installation"
    echo "=============================================="
    echo
    
    check_root
    check_system
    install_nodejs
    create_user
    install_dashboard
    install_dependencies
    create_environment
    create_systemd_service
    setup_log_rotation
    create_management_scripts
    setup_management_scripts
    start_service
    
    if verify_installation; then
        print_summary
        log_success "Installation completed successfully!"
        exit 0
    else
        log_error "Installation verification failed"
        log_info "Check the service logs: sudo journalctl -u $SERVICE_NAME"
        exit 1
    fi
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Kaspa Dashboard Installation Script"
        echo
        echo "Usage: $0 [options]"
        echo
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --uninstall    Uninstall the dashboard"
        echo "  --update       Update the dashboard to latest version"
        echo
        echo "This script installs the Kaspa Management Dashboard as a host-based service."
        echo "It will install Node.js if needed, create a system user, install dependencies,"
        echo "create a systemd service, and start the dashboard."
        echo
        exit 0
        ;;
    --uninstall)
        # Try comprehensive uninstall script first, then fallback to simple one
        if [[ -f "/opt/kaspa-dashboard/scripts/uninstall.sh" ]]; then
            bash "/opt/kaspa-dashboard/scripts/uninstall.sh"
        elif [[ -f "/opt/kaspa-dashboard/uninstall.sh" ]]; then
            bash "/opt/kaspa-dashboard/uninstall.sh"
        else
            log_error "Uninstall script not found. Dashboard may not be installed."
            exit 1
        fi
        exit 0
        ;;
    --update)
        # Run update script if available
        if [[ -f "/opt/kaspa-dashboard/scripts/update.sh" ]]; then
            bash "/opt/kaspa-dashboard/scripts/update.sh" "${@:2}"
        elif [[ -f "/opt/kaspa-dashboard/update.sh" ]]; then
            bash "/opt/kaspa-dashboard/update.sh" "${@:2}"
        else
            log_error "Update script not found. Dashboard may not be installed."
            exit 1
        fi
        exit 0
        ;;
    "")
        # No arguments, proceed with installation
        main
        ;;
    *)
        log_error "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac