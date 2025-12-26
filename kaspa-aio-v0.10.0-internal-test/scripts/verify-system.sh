#!/usr/bin/env bash

# Kaspa All-in-One System Verification Script
# Comprehensive system resource and port availability checker

set -e

# Check bash version for associative array support
if ((BASH_VERSINFO[0] < 4)); then
    # Fallback for older bash versions (macOS default)
    USE_LEGACY_MODE=true
else
    USE_LEGACY_MODE=false
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
MIN_RAM_GB=4
RECOMMENDED_RAM_GB=8
MIN_DISK_GB=50
RECOMMENDED_DISK_GB=200
MIN_CPU_CORES=2
RECOMMENDED_CPU_CORES=4

# Port configurations by profile
if [ "$USE_LEGACY_MODE" = false ]; then
    declare -A CORE_PORTS=(
        [16110]="Kaspa Node P2P"
        [16111]="Kaspa Node RPC"
        [8080]="Dashboard"
    )
    
    declare -A EXPLORER_PORTS=(
        [5432]="PostgreSQL/TimescaleDB"
    )
    
    declare -A PRODUCTION_PORTS=(
        [3000]="Kasia App"
        [3001]="K-Social App"
        [3002]="Kasia Indexer API"
        [3003]="K-Indexer API"
    )
    
    declare -A MINING_PORTS=(
        [5555]="Kaspa Stratum Bridge"
    )
    
    declare -A DEVELOPMENT_PORTS=(
        [9000]="Portainer"
        [5050]="pgAdmin"
    )
fi

# Legacy mode port definitions (for bash < 4)
get_port_description() {
    local port=$1
    case $port in
        16110) echo "Kaspa Node P2P" ;;
        16111) echo "Kaspa Node RPC" ;;
        8080) echo "Dashboard" ;;
        5432) echo "PostgreSQL/TimescaleDB" ;;
        3000) echo "Kasia App" ;;
        3001) echo "K-Social App" ;;
        3002) echo "Kasia Indexer API" ;;
        3003) echo "K-Indexer API" ;;
        5555) echo "Kaspa Stratum Bridge" ;;
        9000) echo "Portainer" ;;
        5050) echo "pgAdmin" ;;
        *) echo "Unknown Service" ;;
    esac
}

get_profile_ports() {
    local profile=$1
    case $profile in
        core) echo "16110 16111 8080" ;;
        explorer) echo "5432" ;;
        production) echo "3000 3001 3002 3003" ;;
        mining) echo "5555" ;;
        development) echo "9000 5050" ;;
        all) echo "16110 16111 8080 5432 3000 3001 3002 3003 5555 9000 5050" ;;
        *) echo "" ;;
    esac
}

# Logging functions
log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

header() {
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
    printf "${BLUE}║ %-60s ║${NC}\n" "$1"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Check RAM
check_ram() {
    header "RAM Check"
    
    local total_ram_gb=0
    local available_ram_gb=0
    local used_ram_gb=0
    local ram_percent=0
    
    if command -v free &> /dev/null; then
        # Linux
        total_ram_gb=$(free -g | awk '/^Mem:/{print $2}')
        available_ram_gb=$(free -g | awk '/^Mem:/{print $7}')
        used_ram_gb=$((total_ram_gb - available_ram_gb))
        ram_percent=$((used_ram_gb * 100 / total_ram_gb))
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        local ram_bytes=$(sysctl -n hw.memsize)
        total_ram_gb=$((ram_bytes / 1024 / 1024 / 1024))
        # Get memory pressure on macOS
        local mem_info=$(vm_stat | perl -ne '/page size of (\d+)/ and $size=$1; /Pages\s+([^:]+)[^\d]+(\d+)/ and printf("%-16s % 16.2f Mi\n", "$1:", $2 * $size / 1048576);')
        # Simplified: assume 20% is available for estimation
        available_ram_gb=$((total_ram_gb / 5))
        used_ram_gb=$((total_ram_gb - available_ram_gb))
        ram_percent=$((used_ram_gb * 100 / total_ram_gb))
    fi
    
    echo -e "${CYAN}Total RAM:${NC}     ${total_ram_gb}GB"
    echo -e "${CYAN}Used RAM:${NC}      ${used_ram_gb}GB (${ram_percent}%)"
    echo -e "${CYAN}Available RAM:${NC} ${available_ram_gb}GB"
    echo ""
    
    if [ "$total_ram_gb" -ge "$RECOMMENDED_RAM_GB" ]; then
        success "RAM: Excellent (${total_ram_gb}GB >= ${RECOMMENDED_RAM_GB}GB recommended)"
        return 0
    elif [ "$total_ram_gb" -ge "$MIN_RAM_GB" ]; then
        warn "RAM: Adequate (${total_ram_gb}GB >= ${MIN_RAM_GB}GB minimum, ${RECOMMENDED_RAM_GB}GB recommended)"
        return 0
    else
        error "RAM: Insufficient (${total_ram_gb}GB < ${MIN_RAM_GB}GB minimum required)"
        return 1
    fi
}

# Check disk space
check_disk() {
    header "Disk Space Check"
    
    local total_disk_gb=0
    local used_disk_gb=0
    local available_disk_gb=0
    local disk_percent=0
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        total_disk_gb=$(df -g / | awk 'NR==2{print $2}')
        used_disk_gb=$(df -g / | awk 'NR==2{print $3}')
        available_disk_gb=$(df -g / | awk 'NR==2{print $4}')
        disk_percent=$(df / | awk 'NR==2{print $5}' | sed 's/%//')
    else
        # Linux
        total_disk_gb=$(df -BG / | awk 'NR==2{print $2}' | sed 's/G//')
        used_disk_gb=$(df -BG / | awk 'NR==2{print $3}' | sed 's/G//')
        available_disk_gb=$(df -BG / | awk 'NR==2{print $4}' | sed 's/G//')
        disk_percent=$(df / | awk 'NR==2{print $5}' | sed 's/%//')
    fi
    
    echo -e "${CYAN}Total Disk:${NC}     ${total_disk_gb}GB"
    echo -e "${CYAN}Used Disk:${NC}      ${used_disk_gb}GB (${disk_percent}%)"
    echo -e "${CYAN}Available Disk:${NC} ${available_disk_gb}GB"
    echo ""
    
    # Check if SSD
    local disk_type="Unknown"
    if [ -f /sys/block/sda/queue/rotational ]; then
        local rotational=$(cat /sys/block/sda/queue/rotational)
        if [ "$rotational" = "0" ]; then
            disk_type="SSD"
        else
            disk_type="HDD"
        fi
        echo -e "${CYAN}Disk Type:${NC}      ${disk_type}"
        echo ""
    fi
    
    if [ "$available_disk_gb" -ge "$RECOMMENDED_DISK_GB" ]; then
        success "Disk Space: Excellent (${available_disk_gb}GB >= ${RECOMMENDED_DISK_GB}GB recommended)"
        return 0
    elif [ "$available_disk_gb" -ge "$MIN_DISK_GB" ]; then
        warn "Disk Space: Adequate (${available_disk_gb}GB >= ${MIN_DISK_GB}GB minimum, ${RECOMMENDED_DISK_GB}GB recommended)"
        return 0
    else
        error "Disk Space: Insufficient (${available_disk_gb}GB < ${MIN_DISK_GB}GB minimum required)"
        return 1
    fi
}

# Check CPU
check_cpu() {
    header "CPU Check"
    
    local cpu_cores=0
    local cpu_model="Unknown"
    local cpu_mhz="Unknown"
    
    if command -v nproc &> /dev/null; then
        cpu_cores=$(nproc)
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        cpu_cores=$(sysctl -n hw.ncpu)
    fi
    
    if command -v lscpu &> /dev/null; then
        cpu_model=$(lscpu | grep "Model name" | cut -d':' -f2 | xargs || echo "Unknown")
        cpu_mhz=$(lscpu | grep "CPU MHz" | cut -d':' -f2 | xargs || echo "Unknown")
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        cpu_model=$(sysctl -n machdep.cpu.brand_string)
        cpu_mhz=$(sysctl -n hw.cpufrequency | awk '{print $1/1000000}')
    fi
    
    echo -e "${CYAN}CPU Model:${NC}      ${cpu_model}"
    echo -e "${CYAN}CPU Cores:${NC}      ${cpu_cores}"
    echo -e "${CYAN}CPU Speed:${NC}      ${cpu_mhz} MHz"
    echo ""
    
    if [ "$cpu_cores" -ge "$RECOMMENDED_CPU_CORES" ]; then
        success "CPU: Excellent (${cpu_cores} cores >= ${RECOMMENDED_CPU_CORES} recommended)"
        return 0
    elif [ "$cpu_cores" -ge "$MIN_CPU_CORES" ]; then
        warn "CPU: Adequate (${cpu_cores} cores >= ${MIN_CPU_CORES} minimum, ${RECOMMENDED_CPU_CORES} recommended)"
        return 0
    else
        error "CPU: Insufficient (${cpu_cores} cores < ${MIN_CPU_CORES} minimum required)"
        return 1
    fi
}

# Check network connectivity
check_network() {
    header "Network Connectivity Check"
    
    log "Testing internet connectivity..."
    
    # Test multiple endpoints
    local endpoints=("google.com" "8.8.8.8" "cloudflare.com")
    local successful=0
    
    for endpoint in "${endpoints[@]}"; do
        if ping -c 1 -W 3 "$endpoint" &> /dev/null; then
            ((successful++))
            echo -e "${GREEN}✓${NC} Can reach $endpoint"
        else
            echo -e "${RED}✗${NC} Cannot reach $endpoint"
        fi
    done
    
    echo ""
    
    if [ $successful -ge 2 ]; then
        success "Network: Connected (${successful}/${#endpoints[@]} endpoints reachable)"
        
        # Test download speed (optional)
        log "Testing download capability..."
        if command -v curl &> /dev/null; then
            local start_time=$(date +%s)
            if curl -s -o /dev/null -w "%{speed_download}" https://speed.cloudflare.com/__down?bytes=1000000 > /tmp/speed_test 2>&1; then
                local end_time=$(date +%s)
                local speed=$(cat /tmp/speed_test)
                local speed_mbps=$(echo "scale=2; $speed / 125000" | bc 2>/dev/null || echo "N/A")
                echo -e "${CYAN}Download Speed:${NC} ~${speed_mbps} Mbps"
                rm -f /tmp/speed_test
            fi
        fi
        echo ""
        return 0
    elif [ $successful -ge 1 ]; then
        warn "Network: Limited connectivity (${successful}/${#endpoints[@]} endpoints reachable)"
        return 0
    else
        error "Network: No connectivity detected"
        return 1
    fi
}

# Check port availability
check_port() {
    local port=$1
    local description=$2
    
    if nc -z localhost $port 2>/dev/null; then
        echo -e "${RED}✗${NC} Port ${port} (${description}): ${RED}IN USE${NC}"
        
        # Try to identify what's using the port
        if command -v lsof &> /dev/null; then
            local process=$(lsof -i :$port -t 2>/dev/null | head -1)
            if [ -n "$process" ]; then
                local process_name=$(ps -p $process -o comm= 2>/dev/null || echo "unknown")
                echo "  └─ Used by: $process_name (PID: $process)"
            fi
        fi
        return 1
    else
        echo -e "${GREEN}✓${NC} Port ${port} (${description}): ${GREEN}AVAILABLE${NC}"
        return 0
    fi
}

# Check ports by profile
check_ports() {
    local profile=$1
    header "Port Availability Check - ${profile} Profile"
    
    local all_available=true
    local ports=$(get_profile_ports "$profile")
    
    if [ -z "$ports" ]; then
        error "Unknown profile: $profile"
        return 1
    fi
    
    for port in $ports; do
        local description=$(get_port_description "$port")
        check_port "$port" "$description" || all_available=false
    done
    
    echo ""
    if [ "$all_available" = true ]; then
        success "All ${profile} profile ports are available"
        return 0
    else
        warn "Some ${profile} profile ports are in use"
        return 1
    fi
}

# Check Docker
check_docker() {
    header "Docker Check"
    
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
        echo ""
        echo "Install Docker:"
        echo "  Ubuntu/Debian: curl -fsSL https://get.docker.com | sh"
        echo "  Or visit: https://docs.docker.com/engine/install/"
        return 1
    fi
    
    local docker_version=$(docker --version 2>/dev/null || echo "unknown")
    echo -e "${CYAN}Docker Version:${NC} ${docker_version}"
    
    if ! docker info &> /dev/null; then
        error "Docker daemon is not running"
        echo ""
        echo "Start Docker:"
        echo "  sudo systemctl start docker"
        return 1
    fi
    
    echo -e "${GREEN}✓${NC} Docker daemon is running"
    
    # Check Docker permissions
    if docker ps &> /dev/null; then
        echo -e "${GREEN}✓${NC} User has Docker permissions"
    else
        warn "User may need Docker permissions"
        echo ""
        echo "Add user to docker group:"
        echo "  sudo usermod -aG docker \$USER"
        echo "  Then log out and back in"
    fi
    
    # Check Docker Compose
    echo ""
    if docker compose version &> /dev/null; then
        local compose_version=$(docker compose version 2>/dev/null || echo "unknown")
        echo -e "${CYAN}Docker Compose:${NC} ${compose_version}"
        echo -e "${GREEN}✓${NC} Docker Compose is available"
    else
        error "Docker Compose is not available"
        echo ""
        echo "Docker Compose should be included with Docker Desktop"
        echo "Or install: https://docs.docker.com/compose/install/"
        return 1
    fi
    
    echo ""
    success "Docker environment is ready"
    return 0
}

# Check OS and kernel
check_os() {
    header "Operating System Check"
    
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        echo -e "${CYAN}OS Name:${NC}        ${NAME}"
        echo -e "${CYAN}OS Version:${NC}     ${VERSION}"
        echo -e "${CYAN}OS ID:${NC}          ${ID}"
    else
        echo -e "${YELLOW}Could not detect OS information${NC}"
    fi
    
    local kernel_version=$(uname -r)
    echo -e "${CYAN}Kernel Version:${NC} ${kernel_version}"
    
    local arch=$(uname -m)
    echo -e "${CYAN}Architecture:${NC}   ${arch}"
    
    echo ""
    
    # Check if supported
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        case "$ID" in
            ubuntu|debian)
                success "OS: Supported (${NAME})"
                return 0
                ;;
            *)
                warn "OS: Not officially tested (${NAME})"
                return 0
                ;;
        esac
    fi
    
    return 0
}

# Generate system report
generate_report() {
    header "System Verification Report"
    
    local report_file="system-verification-report.txt"
    
    {
        echo "Kaspa All-in-One System Verification Report"
        echo "Generated: $(date)"
        echo "=========================================="
        echo ""
        
        echo "Operating System:"
        if [ -f /etc/os-release ]; then
            . /etc/os-release
            echo "  Name: ${NAME}"
            echo "  Version: ${VERSION}"
        fi
        echo "  Kernel: $(uname -r)"
        echo "  Architecture: $(uname -m)"
        echo ""
        
        echo "Hardware Resources:"
        echo "  RAM: $(free -h | awk '/^Mem:/{print $2}') total, $(free -h | awk '/^Mem:/{print $7}') available"
        echo "  Disk: $(df -h / | awk 'NR==2{print $2}') total, $(df -h / | awk 'NR==2{print $4}') available"
        echo "  CPU: $(nproc) cores"
        echo ""
        
        echo "Docker:"
        echo "  Version: $(docker --version 2>/dev/null || echo 'Not installed')"
        echo "  Compose: $(docker compose version 2>/dev/null || echo 'Not available')"
        echo "  Status: $(docker info &>/dev/null && echo 'Running' || echo 'Not running')"
        echo ""
        
        echo "Port Availability (Core Profile):"
        local core_ports=$(get_profile_ports "core")
        for port in $core_ports; do
            local description=$(get_port_description "$port")
            if nc -z localhost $port 2>/dev/null; then
                echo "  Port $port ($description): IN USE"
            else
                echo "  Port $port ($description): AVAILABLE"
            fi
        done
        echo ""
        
    } > "$report_file"
    
    success "Report saved to: $report_file"
}

# Show usage
show_usage() {
    echo "Kaspa All-in-One System Verification Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help              Show this help message"
    echo "  -p, --profile PROFILE   Check ports for specific profile (core, explorer, production, mining, development, all)"
    echo "  -r, --report            Generate system verification report"
    echo "  -q, --quick             Quick check (skip detailed tests)"
    echo ""
    echo "Examples:"
    echo "  $0                      # Full system verification"
    echo "  $0 -p core              # Check core profile ports only"
    echo "  $0 -p all               # Check all ports"
    echo "  $0 -r                   # Generate report"
    echo "  $0 -q                   # Quick verification"
    echo ""
}

# Main function
main() {
    local profile="core"
    local generate_report_flag=false
    local quick_mode=false
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            -p|--profile)
                profile="$2"
                shift 2
                ;;
            -r|--report)
                generate_report_flag=true
                shift
                ;;
            -q|--quick)
                quick_mode=true
                shift
                ;;
            *)
                error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║          Kaspa All-in-One System Verification               ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    
    local all_passed=true
    
    # Run checks
    check_os || all_passed=false
    check_docker || all_passed=false
    
    if [ "$quick_mode" = false ]; then
        check_ram || all_passed=false
        check_disk || all_passed=false
        check_cpu || all_passed=false
        check_network || all_passed=false
    fi
    
    check_ports "$profile" || all_passed=false
    
    # Generate report if requested
    if [ "$generate_report_flag" = true ]; then
        generate_report
    fi
    
    # Final summary
    echo ""
    header "Verification Summary"
    
    if [ "$all_passed" = true ]; then
        success "System is ready for Kaspa All-in-One installation!"
        echo ""
        echo "Next steps:"
        echo "  1. Run ./install.sh to begin installation"
        echo "  2. Follow the interactive prompts"
        echo "  3. Use docker compose up -d to start services"
        return 0
    else
        warn "System has some issues that should be addressed"
        echo ""
        echo "Please review the warnings and errors above"
        echo "Some issues may not prevent installation but could affect performance"
        return 1
    fi
}

# Run main function
main "$@"
