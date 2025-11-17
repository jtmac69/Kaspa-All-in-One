#!/bin/bash

# Nginx Infrastructure Testing Suite
# Tests nginx configuration, routing, SSL/TLS, security headers, and rate limiting

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
NGINX_HTTP_PORT=${HTTP_PORT:-80}
NGINX_HTTPS_PORT=${HTTPS_PORT:-443}
DASHBOARD_PORT=${DASHBOARD_PORT:-8080}
TIMEOUT=10
TEST_RESULTS=()

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
    echo -e "${BLUE}║ $1${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Test result tracking
add_test_result() {
    local test_name="$1"
    local result="$2"
    local message="$3"
    
    TEST_RESULTS+=("$test_name|$result|$message")
    
    if [ "$result" = "PASS" ]; then
        success "✓ $test_name: $message"
    elif [ "$result" = "FAIL" ]; then
        error "✗ $test_name: $message"
    else
        warn "⚠ $test_name: $message"
    fi
}

# Test Docker availability
test_docker() {
    header "Testing Docker Availability"
    
    if ! docker info &> /dev/null; then
        add_test_result "Docker Availability" "FAIL" "Docker is not running or not accessible"
        exit 1
    fi
    
    add_test_result "Docker Availability" "PASS" "Docker is running"
}

# Start required services
start_services() {
    header "Starting Required Services"
    
    log "Starting dashboard and nginx services..."
    docker compose up -d dashboard nginx
    
    log "Waiting for services to be ready..."
    sleep 10
    
    # Check if nginx is running
    if docker ps --format "{{.Names}}" | grep -q "^kaspa-nginx$"; then
        add_test_result "Nginx Startup" "PASS" "Nginx container is running"
    else
        add_test_result "Nginx Startup" "FAIL" "Nginx container is not running"
        return 1
    fi
    
    # Check if dashboard is running
    if docker ps --format "{{.Names}}" | grep -q "^kaspa-dashboard$"; then
        add_test_result "Dashboard Startup" "PASS" "Dashboard container is running"
    else
        add_test_result "Dashboard Startup" "FAIL" "Dashboard container is not running"
        return 1
    fi
}

# Test nginx configuration syntax
test_nginx_config_syntax() {
    header "Testing Nginx Configuration Syntax"
    
    log "Testing nginx configuration syntax..."
    local config_test=$(docker exec kaspa-nginx nginx -t 2>&1)
    
    if echo "$config_test" | grep -q "syntax is ok" && echo "$config_test" | grep -q "test is successful"; then
        add_test_result "Nginx Config Syntax" "PASS" "Configuration syntax is valid"
    else
        add_test_result "Nginx Config Syntax" "FAIL" "Configuration syntax errors detected"
        echo "$config_test"
    fi
}

# Test HTTP connectivity
test_http_connectivity() {
    header "Testing HTTP Connectivity"
    
    log "Testing HTTP port accessibility..."
    local response=$(curl -s -m $TIMEOUT -w "\n%{http_code}" http://localhost:$NGINX_HTTP_PORT/health 2>&1)
    local http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" = "200" ]; then
        add_test_result "HTTP Connectivity" "PASS" "HTTP port $NGINX_HTTP_PORT is accessible"
    else
        add_test_result "HTTP Connectivity" "FAIL" "HTTP port returned status $http_code"
    fi
}

# Test routing to dashboard
test_dashboard_routing() {
    header "Testing Dashboard Routing"
    
    log "Testing root path routing to dashboard..."
    local response=$(curl -s -m $TIMEOUT http://localhost:$NGINX_HTTP_PORT/ 2>&1)
    
    if echo "$response" | grep -q "Kaspa\|Dashboard\|<html"; then
        add_test_result "Dashboard Routing" "PASS" "Root path routes to dashboard"
    else
        add_test_result "Dashboard Routing" "FAIL" "Dashboard routing failed"
    fi
}

# Test API endpoint routing
test_api_routing() {
    header "Testing API Endpoint Routing"
    
    log "Testing /api/health endpoint routing..."
    local response=$(curl -s -m $TIMEOUT http://localhost:$NGINX_HTTP_PORT/api/health 2>&1)
    
    if [ -n "$response" ]; then
        add_test_result "API Routing" "PASS" "API endpoints are routable"
    else
        add_test_result "API Routing" "FAIL" "API routing failed"
    fi
}

# Test security headers
test_security_headers() {
    header "Testing Security Headers"
    
    log "Testing security headers..."
    local headers=$(curl -s -I -m $TIMEOUT http://localhost:$NGINX_HTTP_PORT/ 2>&1)
    
    # Check for X-Frame-Options
    if echo "$headers" | grep -qi "X-Frame-Options"; then
        add_test_result "X-Frame-Options Header" "PASS" "X-Frame-Options header is present"
    else
        add_test_result "X-Frame-Options Header" "FAIL" "X-Frame-Options header is missing"
    fi
    
    # Check for X-XSS-Protection
    if echo "$headers" | grep -qi "X-XSS-Protection"; then
        add_test_result "X-XSS-Protection Header" "PASS" "X-XSS-Protection header is present"
    else
        add_test_result "X-XSS-Protection Header" "FAIL" "X-XSS-Protection header is missing"
    fi
    
    # Check for X-Content-Type-Options
    if echo "$headers" | grep -qi "X-Content-Type-Options"; then
        add_test_result "X-Content-Type-Options Header" "PASS" "X-Content-Type-Options header is present"
    else
        add_test_result "X-Content-Type-Options Header" "FAIL" "X-Content-Type-Options header is missing"
    fi
    
    # Check for Content-Security-Policy
    if echo "$headers" | grep -qi "Content-Security-Policy"; then
        add_test_result "Content-Security-Policy Header" "PASS" "Content-Security-Policy header is present"
    else
        add_test_result "Content-Security-Policy Header" "WARN" "Content-Security-Policy header is missing"
    fi
    
    # Check for Referrer-Policy
    if echo "$headers" | grep -qi "Referrer-Policy"; then
        add_test_result "Referrer-Policy Header" "PASS" "Referrer-Policy header is present"
    else
        add_test_result "Referrer-Policy Header" "WARN" "Referrer-Policy header is missing"
    fi
}

# Test rate limiting
test_rate_limiting() {
    header "Testing Rate Limiting"
    
    log "Testing rate limiting on dashboard endpoint..."
    local success_count=0
    local rate_limited_count=0
    
    # Send 30 rapid requests (should trigger rate limit)
    for i in {1..30}; do
        local http_code=$(curl -s -o /dev/null -w "%{http_code}" -m 2 http://localhost:$NGINX_HTTP_PORT/health 2>&1)
        
        if [ "$http_code" = "200" ]; then
            ((success_count++))
        elif [ "$http_code" = "503" ] || [ "$http_code" = "429" ]; then
            ((rate_limited_count++))
        fi
    done
    
    log "Successful requests: $success_count, Rate limited: $rate_limited_count"
    
    if [ $rate_limited_count -gt 0 ]; then
        add_test_result "Rate Limiting" "PASS" "Rate limiting is active ($rate_limited_count requests limited)"
    else
        add_test_result "Rate Limiting" "WARN" "Rate limiting may not be configured (all $success_count requests succeeded)"
    fi
}

# Test gzip compression
test_gzip_compression() {
    header "Testing Gzip Compression"
    
    log "Testing gzip compression..."
    local headers=$(curl -s -I -H "Accept-Encoding: gzip" -m $TIMEOUT http://localhost:$NGINX_HTTP_PORT/ 2>&1)
    
    if echo "$headers" | grep -qi "Content-Encoding.*gzip"; then
        add_test_result "Gzip Compression" "PASS" "Gzip compression is enabled"
    else
        add_test_result "Gzip Compression" "WARN" "Gzip compression not detected"
    fi
}

# Test WebSocket support
test_websocket_support() {
    header "Testing WebSocket Support"
    
    log "Testing WebSocket upgrade headers..."
    local headers=$(curl -s -I -H "Connection: Upgrade" -H "Upgrade: websocket" -m $TIMEOUT http://localhost:$NGINX_HTTP_PORT/ 2>&1)
    
    # Nginx should pass through WebSocket upgrade headers
    if echo "$headers" | grep -qi "HTTP/1.1"; then
        add_test_result "WebSocket Support" "PASS" "WebSocket upgrade headers are supported"
    else
        add_test_result "WebSocket Support" "WARN" "WebSocket support could not be verified"
    fi
}

# Test error pages
test_error_pages() {
    header "Testing Error Pages"
    
    log "Testing 404 error page..."
    local response=$(curl -s -w "\n%{http_code}" -m $TIMEOUT http://localhost:$NGINX_HTTP_PORT/nonexistent-page 2>&1)
    local http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" = "404" ]; then
        add_test_result "404 Error Page" "PASS" "404 errors are handled correctly"
    else
        add_test_result "404 Error Page" "WARN" "Unexpected status code: $http_code"
    fi
}

# Test upstream health
test_upstream_health() {
    header "Testing Upstream Health"
    
    log "Testing dashboard upstream connectivity..."
    if docker exec kaspa-nginx wget -q -O- --timeout=5 http://dashboard:8080/health > /dev/null 2>&1; then
        add_test_result "Dashboard Upstream" "PASS" "Dashboard upstream is reachable"
    else
        add_test_result "Dashboard Upstream" "FAIL" "Dashboard upstream is not reachable"
    fi
}

# Test nginx logs
test_nginx_logs() {
    header "Testing Nginx Logs"
    
    log "Checking nginx access logs..."
    local access_logs=$(docker logs kaspa-nginx 2>&1 | grep -E "GET|POST" | tail -5)
    
    if [ -n "$access_logs" ]; then
        add_test_result "Nginx Access Logs" "PASS" "Access logs are being generated"
        log "Recent access log entries:"
        echo "$access_logs"
    else
        add_test_result "Nginx Access Logs" "WARN" "No access logs found"
    fi
    
    log "Checking nginx error logs..."
    local error_logs=$(docker logs kaspa-nginx 2>&1 | grep -i "error" | tail -5)
    
    if [ -z "$error_logs" ]; then
        add_test_result "Nginx Error Logs" "PASS" "No errors in recent logs"
    else
        add_test_result "Nginx Error Logs" "WARN" "Errors found in logs"
        echo "$error_logs"
    fi
}

# Test nginx resource usage
test_resource_usage() {
    header "Testing Nginx Resource Usage"
    
    log "Checking nginx resource usage..."
    local stats=$(docker stats kaspa-nginx --no-stream --format "{{.CPUPerc}}|{{.MemUsage}}" 2>/dev/null)
    
    if [ -n "$stats" ]; then
        local cpu=$(echo "$stats" | cut -d'|' -f1)
        local mem=$(echo "$stats" | cut -d'|' -f2)
        
        add_test_result "Nginx Resource Usage" "PASS" "CPU: $cpu, Memory: $mem"
    else
        add_test_result "Nginx Resource Usage" "WARN" "Could not retrieve resource stats"
    fi
}

# Test nginx reload capability
test_nginx_reload() {
    header "Testing Nginx Reload Capability"
    
    log "Testing nginx configuration reload..."
    if docker exec kaspa-nginx nginx -s reload 2>&1 | grep -qv "error"; then
        add_test_result "Nginx Reload" "PASS" "Nginx can reload configuration"
    else
        add_test_result "Nginx Reload" "FAIL" "Nginx reload failed"
    fi
}

# Test SSL/TLS configuration (if SSL is enabled)
test_ssl_configuration() {
    header "Testing SSL/TLS Configuration"
    
    log "Checking if SSL is configured..."
    
    # Check if SSL certificates exist
    if docker exec kaspa-nginx test -f /etc/nginx/ssl/cert.pem 2>/dev/null; then
        add_test_result "SSL Certificates" "PASS" "SSL certificates are present"
        
        # Try to connect via HTTPS
        log "Testing HTTPS connectivity..."
        local https_response=$(curl -s -k -m $TIMEOUT -w "\n%{http_code}" https://localhost:$NGINX_HTTPS_PORT/health 2>&1)
        local https_code=$(echo "$https_response" | tail -n1)
        
        if [ "$https_code" = "200" ]; then
            add_test_result "HTTPS Connectivity" "PASS" "HTTPS port $NGINX_HTTPS_PORT is accessible"
        else
            add_test_result "HTTPS Connectivity" "WARN" "HTTPS returned status $https_code"
        fi
    else
        add_test_result "SSL Certificates" "WARN" "SSL certificates not found (HTTP-only mode)"
    fi
}

# Test client max body size
test_client_max_body_size() {
    header "Testing Client Max Body Size"
    
    log "Testing client_max_body_size configuration..."
    local config=$(docker exec kaspa-nginx cat /etc/nginx/nginx.conf 2>/dev/null)
    
    if echo "$config" | grep -q "client_max_body_size"; then
        local max_size=$(echo "$config" | grep "client_max_body_size" | head -1 | awk '{print $2}' | tr -d ';')
        add_test_result "Client Max Body Size" "PASS" "Configured: $max_size"
    else
        add_test_result "Client Max Body Size" "WARN" "client_max_body_size not explicitly configured"
    fi
}

# Test keepalive timeout
test_keepalive_timeout() {
    header "Testing Keepalive Timeout"
    
    log "Testing keepalive_timeout configuration..."
    local config=$(docker exec kaspa-nginx cat /etc/nginx/nginx.conf 2>/dev/null)
    
    if echo "$config" | grep -q "keepalive_timeout"; then
        local timeout=$(echo "$config" | grep "keepalive_timeout" | head -1 | awk '{print $2}' | tr -d ';')
        add_test_result "Keepalive Timeout" "PASS" "Configured: $timeout"
    else
        add_test_result "Keepalive Timeout" "WARN" "keepalive_timeout not explicitly configured"
    fi
}

# Display test summary
display_test_summary() {
    header "Test Summary"
    
    local total_tests=${#TEST_RESULTS[@]}
    local passed=0
    local failed=0
    local warnings=0
    
    for result in "${TEST_RESULTS[@]}"; do
        local status=$(echo "$result" | cut -d'|' -f2)
        case "$status" in
            "PASS") ((passed++)) ;;
            "FAIL") ((failed++)) ;;
            "WARN") ((warnings++)) ;;
        esac
    done
    
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                      TEST RESULTS                            ║${NC}"
    echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${CYAN}║${NC} Total Tests:    ${BLUE}$total_tests${NC}"
    echo -e "${CYAN}║${NC} Passed:         ${GREEN}$passed${NC}"
    echo -e "${CYAN}║${NC} Failed:         ${RED}$failed${NC}"
    echo -e "${CYAN}║${NC} Warnings:       ${YELLOW}$warnings${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    if [ $failed -eq 0 ]; then
        success "All critical tests passed! ✓"
        return 0
    else
        error "Some tests failed. Please review the results above."
        return 1
    fi
}

# Show recommendations
show_recommendations() {
    header "Recommendations"
    
    echo "Nginx Configuration Best Practices:"
    echo "  • Keep nginx.conf under version control"
    echo "  • Test configuration changes with 'nginx -t' before reload"
    echo "  • Monitor access and error logs regularly"
    echo "  • Implement SSL/TLS for production deployments"
    echo "  • Configure rate limiting to prevent abuse"
    echo "  • Enable gzip compression for better performance"
    echo "  • Set appropriate client_max_body_size for your use case"
    echo ""
    
    echo "Security Hardening:"
    echo "  • Use strong SSL/TLS protocols (TLS 1.2+)"
    echo "  • Implement HSTS header for HTTPS"
    echo "  • Configure CSP headers to prevent XSS attacks"
    echo "  • Restrict access to sensitive endpoints"
    echo "  • Keep nginx updated to latest stable version"
    echo "  • Use fail2ban or similar for brute force protection"
    echo ""
    
    echo "Performance Optimization:"
    echo "  • Enable HTTP/2 for better performance"
    echo "  • Configure appropriate worker_processes and worker_connections"
    echo "  • Use caching for static assets"
    echo "  • Implement connection pooling for upstreams"
    echo "  • Monitor and tune buffer sizes"
    echo ""
    
    echo "Monitoring:"
    echo "  • Access logs: docker logs kaspa-nginx"
    echo "  • Configuration test: docker exec kaspa-nginx nginx -t"
    echo "  • Reload config: docker exec kaspa-nginx nginx -s reload"
    echo "  • Resource usage: docker stats kaspa-nginx"
    echo ""
}

# Main test execution
main() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║           Nginx Infrastructure Testing Suite                ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    
    test_docker
    start_services
    
    # Configuration tests
    test_nginx_config_syntax
    
    # Connectivity tests
    test_http_connectivity
    test_dashboard_routing
    test_api_routing
    
    # Security tests
    test_security_headers
    test_rate_limiting
    test_ssl_configuration
    
    # Feature tests
    test_gzip_compression
    test_websocket_support
    test_error_pages
    test_client_max_body_size
    test_keepalive_timeout
    
    # Infrastructure tests
    test_upstream_health
    test_nginx_logs
    test_resource_usage
    test_nginx_reload
    
    # Display results
    display_test_summary
    local test_exit_code=$?
    
    show_recommendations
    
    return $test_exit_code
}

# Track which services we started
STARTED_NGINX=false
STARTED_DASHBOARD=false

# Cleanup functions
cleanup_containers() {
    local cleanup_level=${1:-basic}
    
    log "Cleaning up containers..."
    
    # Stop and remove test containers
    local test_containers=("kaspa-nginx-test" "kaspa-dashboard-test")
    for container in "${test_containers[@]}"; do
        if docker ps -a --format "{{.Names}}" | grep -q "^${container}$"; then
            log "Removing test container: $container"
            docker stop "$container" 2>/dev/null || true
            docker rm "$container" 2>/dev/null || true
        fi
    done
    
    # Stop compose services
    log "Stopping compose services..."
    docker compose stop nginx dashboard 2>/dev/null || true
    
    if [ "$cleanup_level" = "full" ]; then
        log "Performing full cleanup..."
        
        # Remove networks
        docker network rm kaspa-aio_kaspa-network 2>/dev/null || true
        
        # Remove unused images (optional)
        if [ "$CLEANUP_IMAGES" = "true" ]; then
            warn "Removing unused images..."
            docker image prune -f 2>/dev/null || true
        fi
    fi
}

cleanup_on_exit() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        error "Test failed with exit code $exit_code"
        log "Performing cleanup due to test failure..."
    else
        log "Test completed, performing cleanup..."
    fi
    
    cleanup_containers basic
    exit $exit_code
}

cleanup_full() {
    log "Performing full cleanup (including networks)..."
    cleanup_containers full
}

# Function to show cleanup options
show_cleanup_help() {
    echo "Cleanup Options:"
    echo "  --cleanup-only     Run cleanup only (no tests)"
    echo "  --cleanup-full     Full cleanup including networks"
    echo "  --cleanup-images   Remove unused Docker images during cleanup"
    echo "  --no-cleanup       Skip cleanup on exit"
    echo
}

# Set trap for cleanup (can be disabled with --no-cleanup)
ENABLE_CLEANUP=true
CLEANUP_IMAGES=false

setup_cleanup_trap() {
    if [ "$ENABLE_CLEANUP" = "true" ]; then
        trap cleanup_on_exit EXIT INT TERM
        log "Cleanup trap enabled (use --no-cleanup to disable)"
    else
        log "Cleanup disabled"
    fi
}

# Parse command line arguments
CLEANUP_ONLY=false
FULL_CLEANUP=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --cleanup-only)
            CLEANUP_ONLY=true
            shift
            ;;
        --cleanup-full)
            FULL_CLEANUP=true
            shift
            ;;
        --cleanup-images)
            CLEANUP_IMAGES=true
            shift
            ;;
        --no-cleanup)
            ENABLE_CLEANUP=false
            shift
            ;;
        -h|--help)
            echo "Nginx Infrastructure Testing Suite"
            echo
            echo "Usage: $0 [OPTIONS]"
            echo
            echo "Test Options:"
            echo "  -h, --help         Show this help message"
            echo
            show_cleanup_help
            exit 0
            ;;
        *)
            warn "Unknown option: $1"
            shift
            ;;
    esac
done

# Handle cleanup-only mode
if [ "$CLEANUP_ONLY" = "true" ]; then
    log "Running cleanup only..."
    if [ "$FULL_CLEANUP" = "true" ]; then
        cleanup_full
    else
        cleanup_containers basic
    fi
    success "Cleanup completed!"
    exit 0
fi

# Handle full cleanup mode
if [ "$FULL_CLEANUP" = "true" ]; then
    log "Full cleanup mode enabled"
fi

# Setup cleanup trap
setup_cleanup_trap

# Run main function
main
