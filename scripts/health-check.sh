#!/bin/bash

# Kaspa All-in-One Health Check Script
# This script checks the health of all services and provides detailed status

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TIMEOUT=10
VERBOSE=false
JSON_OUTPUT=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -j|--json)
            JSON_OUTPUT=true
            shift
            ;;
        -t|--timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  -v, --verbose    Verbose output"
            echo "  -j, --json       JSON output format"
            echo "  -t, --timeout    Timeout in seconds (default: 10)"
            echo "  -h, --help       Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option $1"
            exit 1
            ;;
    esac
done

# Service definitions
declare -A SERVICES=(
    ["kaspa-node"]="http://localhost:16111"
    ["kaspa-dashboard"]="http://localhost:8080/health"
    ["kasia-app"]="http://localhost:3001/health"
    ["kasia-indexer"]="http://localhost:3002/health"
    ["k-social"]="http://localhost:3003/health"
    ["k-indexer"]="http://localhost:3004/health"
    ["nginx"]="http://localhost:80/health"
)

# Results storage
declare -A RESULTS
declare -A RESPONSE_TIMES
declare -A ERROR_MESSAGES

# Logging functions
log_info() {
    if [[ $JSON_OUTPUT == false ]]; then
        echo -e "${BLUE}[INFO]${NC} $1"
    fi
}

log_success() {
    if [[ $JSON_OUTPUT == false ]]; then
        echo -e "${GREEN}[OK]${NC} $1"
    fi
}

log_warning() {
    if [[ $JSON_OUTPUT == false ]]; then
        echo -e "${YELLOW}[WARN]${NC} $1"
    fi
}

log_error() {
    if [[ $JSON_OUTPUT == false ]]; then
        echo -e "${RED}[ERROR]${NC} $1"
    fi
}

# Check if service is running via Docker
check_docker_service() {
    local service_name=$1
    if docker ps --format "table {{.Names}}" | grep -q "^${service_name}$"; then
        return 0
    else
        return 1
    fi
}

# Check service health via HTTP
check_http_health() {
    local service_name=$1
    local url=$2
    local start_time=$(date +%s.%N)
    
    if [[ $service_name == "kaspa-node" ]]; then
        # Special handling for Kaspa node RPC
        local response=$(curl -s -m $TIMEOUT -X POST -H "Content-Type: application/json" \
            -d '{"method":"ping","params":{}}' "$url" 2>&1)
        local exit_code=$?
    else
        # Standard HTTP health check
        local response=$(curl -s -m $TIMEOUT "$url" 2>&1)
        local exit_code=$?
    fi
    
    local end_time=$(date +%s.%N)
    local response_time=$(echo "$end_time - $start_time" | bc -l 2>/dev/null || echo "0")
    
    RESPONSE_TIMES[$service_name]=$response_time
    
    if [[ $exit_code -eq 0 ]]; then
        if [[ $service_name == "kaspa-node" ]]; then
            # Check if response contains expected RPC structure
            if echo "$response" | grep -q '"result"'; then
                RESULTS[$service_name]="healthy"
                return 0
            else
                RESULTS[$service_name]="unhealthy"
                ERROR_MESSAGES[$service_name]="Invalid RPC response"
                return 1
            fi
        else
            # Check if response indicates health
            if echo "$response" | grep -qi "healthy\|ok\|running"; then
                RESULTS[$service_name]="healthy"
                return 0
            else
                RESULTS[$service_name]="unhealthy"
                ERROR_MESSAGES[$service_name]="Unhealthy response: $response"
                return 1
            fi
        fi
    else
        RESULTS[$service_name]="unreachable"
        ERROR_MESSAGES[$service_name]="Connection failed: $response"
        return 1
    fi
}

# Check system resources
check_system_resources() {
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
    local memory_usage=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
    local disk_usage=$(df -h / | awk 'NR==2{printf "%s", $5}' | sed 's/%//')
    
    SYSTEM_RESOURCES="{\"cpu\":$cpu_usage,\"memory\":$memory_usage,\"disk\":$disk_usage}"
}

# Main health check function
perform_health_checks() {
    log_info "Starting health checks for Kaspa All-in-One services..."
    
    local overall_status="healthy"
    local healthy_count=0
    local total_count=${#SERVICES[@]}
    
    for service_name in "${!SERVICES[@]}"; do
        local url=${SERVICES[$service_name]}
        
        if [[ $VERBOSE == true ]]; then
            log_info "Checking $service_name at $url..."
        fi
        
        # Check if Docker container is running
        if ! check_docker_service "$service_name"; then
            RESULTS[$service_name]="stopped"
            ERROR_MESSAGES[$service_name]="Docker container not running"
            log_error "$service_name: Container not running"
            overall_status="unhealthy"
            continue
        fi
        
        # Check HTTP health
        if check_http_health "$service_name" "$url"; then
            log_success "$service_name: Healthy (${RESPONSE_TIMES[$service_name]}s)"
            ((healthy_count++))
        else
            log_error "$service_name: ${RESULTS[$service_name]} - ${ERROR_MESSAGES[$service_name]}"
            overall_status="unhealthy"
        fi
    done
    
    # Check system resources
    check_system_resources
    
    # Output results
    if [[ $JSON_OUTPUT == true ]]; then
        output_json_results "$overall_status" "$healthy_count" "$total_count"
    else
        output_text_results "$overall_status" "$healthy_count" "$total_count"
    fi
    
    # Exit with appropriate code
    if [[ $overall_status == "healthy" ]]; then
        exit 0
    else
        exit 1
    fi
}

# Output results in JSON format
output_json_results() {
    local overall_status=$1
    local healthy_count=$2
    local total_count=$3
    
    echo "{"
    echo "  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
    echo "  \"overall_status\": \"$overall_status\","
    echo "  \"healthy_services\": $healthy_count,"
    echo "  \"total_services\": $total_count,"
    echo "  \"system_resources\": $SYSTEM_RESOURCES,"
    echo "  \"services\": {"
    
    local first=true
    for service_name in "${!SERVICES[@]}"; do
        if [[ $first == false ]]; then
            echo ","
        fi
        first=false
        
        echo -n "    \"$service_name\": {"
        echo -n "\"status\": \"${RESULTS[$service_name]}\""
        echo -n ", \"response_time\": \"${RESPONSE_TIMES[$service_name]:-0}s\""
        if [[ -n "${ERROR_MESSAGES[$service_name]}" ]]; then
            echo -n ", \"error\": \"${ERROR_MESSAGES[$service_name]}\""
        fi
        echo -n "}"
    done
    
    echo ""
    echo "  }"
    echo "}"
}

# Output results in text format
output_text_results() {
    local overall_status=$1
    local healthy_count=$2
    local total_count=$3
    
    echo ""
    echo "========================================="
    echo "Kaspa All-in-One Health Check Results"
    echo "========================================="
    echo "Overall Status: $overall_status"
    echo "Healthy Services: $healthy_count/$total_count"
    echo "Timestamp: $(date)"
    echo ""
    
    if [[ $overall_status == "unhealthy" ]]; then
        echo "Issues found:"
        for service_name in "${!SERVICES[@]}"; do
            if [[ "${RESULTS[$service_name]}" != "healthy" ]]; then
                echo "  - $service_name: ${RESULTS[$service_name]} (${ERROR_MESSAGES[$service_name]})"
            fi
        done
        echo ""
    fi
    
    echo "Recommendations:"
    if [[ $healthy_count -lt $total_count ]]; then
        echo "  - Check Docker container logs: docker compose logs [service-name]"
        echo "  - Restart unhealthy services: docker compose restart [service-name]"
        echo "  - Check system resources and available disk space"
    else
        echo "  - All services are healthy!"
        echo "  - Consider monitoring system resources regularly"
    fi
}

# Install required dependencies if missing
check_dependencies() {
    local missing_deps=()
    
    if ! command -v curl &> /dev/null; then
        missing_deps+=("curl")
    fi
    
    if ! command -v docker &> /dev/null; then
        missing_deps+=("docker")
    fi
    
    if ! command -v bc &> /dev/null; then
        missing_deps+=("bc")
    fi
    
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        log_error "Missing required dependencies: ${missing_deps[*]}"
        log_info "Please install missing dependencies and try again"
        exit 1
    fi
}

# Main execution
main() {
    check_dependencies
    perform_health_checks
}

# Run main function
main "$@"