#!/bin/bash

# Kaspa All-in-One Installer
# Compatible with Ubuntu Desktop and Omarchy

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
INSTALL_DIR="/opt/kaspa-aio"
SERVICE_USER="kaspa"
COMPOSE_VERSION="2.21.0"

# Logging
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

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root. Please run as a regular user with sudo privileges."
    fi
}

# Detect OS
detect_os() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$NAME
        VERSION=$VERSION_ID
    else
        error "Cannot detect operating system"
    fi
    
    log "Detected OS: $OS $VERSION"
    
    # Check if supported
    case $OS in
        "Ubuntu"*)
            if [[ $(echo "$VERSION >= 22.04" | bc -l) -eq 0 ]]; then
                error "Ubuntu 22.04 or later required"
            fi
            ;;
        "Omarchy"*)
            log "Omarchy detected - proceeding with installation"
            ;;
        *)
            warn "Unsupported OS detected. Proceeding anyway..."
            ;;
    esac
}

# Check system requirements
check_requirements() {
    log "Checking system requirements..."
    
    # Check RAM
    RAM_GB=$(free -g | awk '/^Mem:/{print $2}')
    if [[ $RAM_GB -lt 16 ]]; then
        warn "Recommended RAM is 32GB, detected ${RAM_GB}GB"
    else
        log "RAM check passed: ${RAM_GB}GB"
    fi
    
    # Check disk space
    DISK_GB=$(df -BG / | awk 'NR==2{print $4}' | sed 's/G//')
    if [[ $DISK_GB -lt 100 ]]; then
        error "At least 100GB free disk space required, found ${DISK_GB}GB"
    else
        log "Disk space check passed: ${DISK_GB}GB available"
    fi
    
    # Check network connectivity
    if ! ping -c 1 google.com &> /dev/null; then
        error "Internet connectivity required for installation"
    fi
    log "Network connectivity check passed"
}

# Install Docker if not present
install_docker() {
    if command -v docker &> /dev/null; then
        log "Docker already installed: $(docker --version)"
        return
    fi
    
    log "Installing Docker..."
    
    # Update package index
    sudo apt-get update
    
    # Install prerequisites
    sudo apt-get install -y \
        ca-certificates \
        curl \
        gnupg \
        lsb-release
    
    # Add Docker GPG key
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    
    # Add Docker repository
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
        $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Add user to docker group
    sudo usermod -aG docker $USER
    
    # Start and enable Docker
    sudo systemctl start docker
    sudo systemctl enable docker
    
    log "Docker installed successfully"
}

# Interactive configuration
configure_services() {
    log "Configuring services..."
    
    echo
    echo -e "${BLUE}=== Kaspa All-in-One Configuration ===${NC}"
    echo
    
    # Mining configuration
    read -p "Enable Kaspa mining stratum? (y/N): " ENABLE_MINING
    ENABLE_MINING=${ENABLE_MINING:-n}
    
    if [[ $ENABLE_MINING =~ ^[Yy]$ ]]; then
        read -p "Enter mining pool address (default: solo): " MINING_ADDRESS
        MINING_ADDRESS=${MINING_ADDRESS:-solo}
        echo "ENABLE_MINING=true" >> .env
        echo "MINING_ADDRESS=$MINING_ADDRESS" >> .env
    else
        echo "ENABLE_MINING=false" >> .env
    fi
    
    # Network configuration
    read -p "Make Kaspa node publicly accessible? (Y/n): " PUBLIC_NODE
    PUBLIC_NODE=${PUBLIC_NODE:-y}
    
    if [[ $PUBLIC_NODE =~ ^[Yy]$ ]]; then
        echo "PUBLIC_NODE=true" >> .env
        echo "ENABLE_PUBLIC_ACCESS=true" >> .env
        
        echo
        echo -e "${YELLOW}Public Node Configuration:${NC}"
        echo "Your node will accept connections from other Kaspa nodes."
        echo "This helps strengthen the Kaspa network!"
        echo
        echo "IMPORTANT: You'll need to configure port forwarding on your router:"
        echo "- Forward external port 16110 to this device's port 16110"
        echo "- Protocol: TCP"
        echo
        read -p "Have you configured port forwarding? (y/N): " PORT_FORWARDING
        
        if [[ ! $PORT_FORWARDING =~ ^[Yy]$ ]]; then
            echo
            echo -e "${YELLOW}Port Forwarding Setup Required:${NC}"
            echo "1. Access your router's admin panel (usually http://192.168.1.1)"
            echo "2. Find 'Port Forwarding' or 'Virtual Server' settings"
            echo "3. Forward external port 16110 to internal port 16110"
            echo "4. Set the internal IP to this device's IP address"
            echo
            echo "After installation, run: ./test-kaspa-node.sh to verify setup"
            echo "See docs/public-node-setup.md for detailed instructions"
        fi
        
        # Custom P2P port option
        read -p "Use custom P2P port? (default 16110): " CUSTOM_P2P_PORT
        if [[ -n $CUSTOM_P2P_PORT && $CUSTOM_P2P_PORT != "16110" ]]; then
            echo "KASPA_NODE_P2P_PORT=$CUSTOM_P2P_PORT" >> .env
            echo
            echo -e "${YELLOW}Custom Port Configuration:${NC}"
            echo "Remember to forward port $CUSTOM_P2P_PORT instead of 16110"
        else
            echo "KASPA_NODE_P2P_PORT=16110" >> .env
        fi
    else
        echo "PUBLIC_NODE=false" >> .env
        echo "ENABLE_PUBLIC_ACCESS=false" >> .env
        echo "KASPA_NODE_P2P_PORT=16110" >> .env
        echo
        echo -e "${BLUE}Private Node Configuration:${NC}"
        echo "Your node will only make outgoing connections."
        echo "No port forwarding required."
    fi
    
    # RPC port (always local only)
    echo "KASPA_NODE_RPC_PORT=16111" >> .env
    
    # Dashboard configuration
    read -p "Set dashboard admin password (default: admin): " ADMIN_PASSWORD
    ADMIN_PASSWORD=${ADMIN_PASSWORD:-admin}
    echo "ADMIN_PASSWORD=$ADMIN_PASSWORD" >> .env
    
    log "Configuration saved to .env file"
}

# Clone repositories and build services
setup_services() {
    log "Setting up services..."
    
    # Create services directory
    mkdir -p services
    
    # Clone Kaspa Stratum Bridge
    if [[ ! -d "services/kaspa-stratum" ]]; then
        log "Cloning Kaspa Stratum Bridge..."
        git clone https://github.com/aglov413/kaspa-stratum-bridge.git services/kaspa-stratum
    fi
    
    # Clone Kasia
    if [[ ! -d "services/kasia" ]]; then
        log "Cloning Kasia Messaging App..."
        git clone https://github.com/K-Kluster/Kasia.git services/kasia
    fi
    
    # Clone Kasia Indexer
    if [[ ! -d "services/kasia-indexer" ]]; then
        log "Cloning Kasia Indexer..."
        git clone https://github.com/K-Kluster/kasia-indexer.git services/kasia-indexer
    fi
    
    # Clone K Social
    if [[ ! -d "services/k-social" ]]; then
        log "Cloning K Social..."
        git clone https://github.com/thesheepcat/K.git services/k-social
    fi
    
    # Clone K Indexer
    if [[ ! -d "services/k-indexer" ]]; then
        log "Cloning K Social Indexer..."
        git clone https://github.com/thesheepcat/K-indexer.git services/k-indexer
    fi
}

# Create systemd service
create_systemd_service() {
    log "Creating systemd service..."
    
    sudo tee /etc/systemd/system/kaspa-aio.service > /dev/null <<EOF
[Unit]
Description=Kaspa All-in-One Services
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$INSTALL_DIR
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=0
User=$USER

[Install]
WantedBy=multi-user.target
EOF
    
    sudo systemctl daemon-reload
    sudo systemctl enable kaspa-aio.service
    
    log "Systemd service created and enabled"
}

# Main installation function
main() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    Kaspa All-in-One Installer                ║"
    echo "║                                                              ║"
    echo "║  This installer will set up a complete Kaspa ecosystem      ║"
    echo "║  including node, mining, messaging, and social features     ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo
    
    read -p "Continue with installation? (Y/n): " CONTINUE
    CONTINUE=${CONTINUE:-y}
    
    if [[ ! $CONTINUE =~ ^[Yy]$ ]]; then
        log "Installation cancelled"
        exit 0
    fi
    
    check_root
    detect_os
    check_requirements
    install_docker
    configure_services
    setup_services
    create_systemd_service
    
    echo
    log "Installation completed successfully!"
    echo
    echo -e "${GREEN}Next steps:${NC}"
    echo "1. Reboot your system to apply Docker group changes"
    echo "2. Start services: sudo systemctl start kaspa-aio"
    echo "3. Access dashboard: http://localhost:8080"
    echo "4. Check status: docker compose ps"
    echo
    echo -e "${YELLOW}Note: You may need to log out and back in for Docker permissions to take effect${NC}"
}

# Run main function
main "$@"