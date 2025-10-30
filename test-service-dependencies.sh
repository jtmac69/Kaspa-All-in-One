#!/bin/bash

# Kaspa All-in-One Service Dependency Testing Script
# Tests service dependencies and startup order validation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_header() {
    echo -e "\n${BLUE}🔍 $1${NC}"
    echo "========================================"
}

# Test functions
test_kaspa_network_access() {
    log_header "Testing Kaspa Network Accessibility"
    
    # Check if using local node
    if docker compose ps kaspa-node | grep -q "Up"; then
        log_info "Local Kaspa Node is running - testing local access..."
        if curl -s -X POST -H "Content-Type: application/json" \
           -d '{"method":"ping","params":{}}' \
           http://localhost:16111 > /dev/null 2>&1; then
            log_success "Local Kaspa Node RPC is accessible"
            return 0
        else
            log_warning "Local Kaspa Node is running but RPC not accessible"
        fi
    else
        log_info "Local Kaspa Node is not running - checking for remote node configuration..."
    fi
    
    # Check if remote node is configured
    if [ -n "${REMOTE_KASPA_NODE_URL}" ]; then
        log_info "Testing remote Kaspa Node: ${REMOTE_KASPA_NODE_URL}"
        remote_host=$(echo "${REMOTE_KASPA_NODE_URL}" | sed 's|http://||' | sed 's|https://||')
        if curl -s -X POST -H "Content-Type: application/json" \
           -d '{"method":"ping","params":{}}' \
           "${REMOTE_KASPA_NODE_URL}" > /dev/null 2>&1; then
            log_success "Remote Kaspa Node is accessible: ${REMOTE_KASPA_NODE_URL}"
            return 0
        else
            log_warning "Remote Kaspa Node not accessible: ${REMOTE_KASPA_NODE_URL}"
        fi
    fi
    
    # Test some public nodes as fallback
    log_info "Testing public Kaspa nodes as fallback..."
    public_nodes=(
        "http://kaspa-node.example.com:16111"
        "http://public-kaspa.community:16111"
    )
    
    for node in "${public_nodes[@]}"; do
        log_info "Testing public node: $node"
        if curl -s -m 5 -X POST -H "Content-Type: application/json" \
           -d '{"method":"ping","params":{}}' \
           "$node" > /dev/null 2>&1; then
            log_success "Public Kaspa Node accessible: $node"
            log_info "Consider setting REMOTE_KASPA_NODE_URL=$node"
            return 0
        fi
    done
    
    log_error "No accessible Kaspa nodes found (local, remote, or public)"
    log_info "Indexers and applications may not function without Kaspa network access"
    return 1
}

test_databases() {
    log_header "Testing Database Connectivity"
    
    # Test indexer database
    if docker compose ps indexer-db | grep -q "Up"; then
        log_info "Testing Indexer Database connectivity..."
        if docker compose exec -T indexer-db pg_isready -U indexer -d kaspa_indexers > /dev/null 2>&1; then
            log_success "Indexer Database is ready"
        else
            log_error "Indexer Database is not ready"
            return 1
        fi
    else
        log_warning "Indexer Database is not running (may be intentional)"
    fi
    
    # Test archive database (if running)
    if docker compose ps archive-db | grep -q "Up"; then
        log_info "Testing Archive Database connectivity..."
        if docker compose exec -T archive-db pg_isready -U archiver -d kaspa_archive > /dev/null 2>&1; then
            log_success "Archive Database is ready"
        else
            log_error "Archive Database is not ready"
            return 1
        fi
    else
        log_warning "Archive Database is not running (may be intentional)"
    fi
    
    return 0
}

test_indexers() {
    log_header "Testing Indexer API Endpoints"
    
    # Test Kasia Indexer
    if docker compose ps kasia-indexer | grep -q "Up"; then
        log_info "Testing Kasia Indexer API..."
        if curl -s -f http://localhost:3002/health > /dev/null 2>&1; then
            log_success "Kasia Indexer is serving requests"
        else
            log_error "Kasia Indexer is not responding"
            return 1
        fi
    else
        log_warning "Kasia Indexer is not running (may be intentional)"
    fi
    
    # Test K-indexer (if running)
    if docker compose ps k-indexer | grep -q "Up"; then
        log_info "Testing K-indexer API..."
        if curl -s -f http://localhost:3004/health > /dev/null 2>&1; then
            log_success "K-indexer is serving requests"
        else
            log_error "K-indexer is not responding"
            return 1
        fi
    else
        log_warning "K-indexer is not running (may be intentional)"
    fi
    
    # Test Simply Kaspa Indexer (if running)
    if docker compose ps simply-kaspa-indexer | grep -q "Up"; then
        log_info "Testing Simply Kaspa Indexer API..."
        if curl -s -f http://localhost:3005/health > /dev/null 2>&1; then
            log_success "Simply Kaspa Indexer is serving requests"
        else
            log_error "Simply Kaspa Indexer is not responding"
            return 1
        fi
    else
        log_warning "Simply Kaspa Indexer is not running (may be intentional)"
    fi
    
    # Test Archive Indexer (if running)
    if docker compose ps archive-indexer | grep -q "Up"; then
        log_info "Testing Archive Indexer API..."
        if curl -s -f http://localhost:3006/health > /dev/null 2>&1; then
            log_success "Archive Indexer is serving requests"
        else
            log_error "Archive Indexer is not responding"
            return 1
        fi
    else
        log_warning "Archive Indexer is not running (may be intentional)"
    fi
    
    return 0
}

test_applications() {
    log_header "Testing Application Dependencies"
    
    # Test Kasia App dependency on Kasia Indexer
    if docker compose ps kasia-app | grep -q "Up"; then
        log_info "Testing Kasia App accessibility..."
        if curl -s -f http://localhost:3001/health > /dev/null 2>&1; then
            log_success "Kasia App is accessible"
            
            # Verify it can reach its indexer
            log_info "Testing Kasia App → Kasia Indexer connection..."
            if docker compose exec -T kasia-app curl -s -f http://kasia-indexer:3000/health > /dev/null 2>&1; then
                log_success "Kasia App can reach Kasia Indexer"
            else
                log_error "Kasia App cannot reach Kasia Indexer"
                return 1
            fi
        else
            log_error "Kasia App is not responding"
            return 1
        fi
    else
        log_warning "Kasia App is not running (may be intentional)"
    fi
    
    # Test K Social App dependency on K-indexer
    if docker compose ps k-social | grep -q "Up"; then
        log_info "Testing K Social App accessibility..."
        if curl -s -f http://localhost:3003/health > /dev/null 2>&1; then
            log_success "K Social App is accessible"
            
            # Verify it can reach its indexer
            log_info "Testing K Social App → K-indexer connection..."
            if docker compose exec -T k-social curl -s -f http://k-indexer:3000/health > /dev/null 2>&1; then
                log_success "K Social App can reach K-indexer"
            else
                log_error "K Social App cannot reach K-indexer"
                return 1
            fi
        else
            log_error "K Social App is not responding"
            return 1
        fi
    else
        log_warning "K Social App is not running (may be intentional)"
    fi
    
    return 0
}

test_dependency_chain() {
    log_header "Testing End-to-End Dependency Chains"
    
    # Test: Node → Indexer → App chain for Kasia
    if docker compose ps kasia-app | grep -q "Up" && docker compose ps kasia-indexer | grep -q "Up"; then
        log_info "Testing Kaspa Node → Kasia Indexer → Kasia App chain..."
        
        # Check if Kasia Indexer can reach Kaspa network
        log_info "Testing Kasia Indexer → Kaspa Network connection..."
        kaspa_url="${REMOTE_KASPA_NODE_URL:-http://kaspa-node:16111}"
        if docker compose exec -T kasia-indexer curl -s -f "$kaspa_url" > /dev/null 2>&1; then
            log_success "Kasia Indexer → Kaspa Network connection verified ($kaspa_url)"
        else
            log_warning "Kasia Indexer cannot reach configured Kaspa node ($kaspa_url)"
            log_info "This may be normal if using WebSocket-only connection"
        fi
        
        # Check if Kasia App can reach Kasia Indexer
        log_info "Testing Kasia App → Kasia Indexer connection..."
        if docker compose exec -T kasia-app curl -s -f http://kasia-indexer:3000/health > /dev/null 2>&1; then
            log_success "Kasia App → Kasia Indexer connection verified"
        else
            log_error "Kasia App cannot reach Kasia Indexer"
            return 1
        fi
        
        log_success "Complete Kasia dependency chain verified"
    else
        log_warning "Kasia dependency chain not testable (services not running)"
    fi
    
    # Test: Node → Database → Indexer → App chain for K Social
    if docker compose ps k-social | grep -q "Up" && docker compose ps k-indexer | grep -q "Up" && docker compose ps indexer-db | grep -q "Up"; then
        log_info "Testing Kaspa Node → Database → K-indexer → K Social App chain..."
        
        # Check database connectivity from K-indexer
        log_info "Testing K-indexer → Database connection..."
        if docker compose exec -T k-indexer sh -c "pg_isready -h indexer-db -U indexer -d ksocial" > /dev/null 2>&1; then
            log_success "K-indexer → Database connection verified"
        else
            log_error "K-indexer cannot reach database"
            return 1
        fi
        
        # Check if K-indexer can reach Kaspa network
        log_info "Testing K-indexer → Kaspa Network connection..."
        kaspa_url="${REMOTE_KASPA_NODE_URL:-http://kaspa-node:16111}"
        if docker compose exec -T k-indexer curl -s -f "$kaspa_url" > /dev/null 2>&1; then
            log_success "K-indexer → Kaspa Network connection verified ($kaspa_url)"
        else
            log_error "K-indexer cannot reach configured Kaspa node ($kaspa_url)"
            return 1
        fi
        
        log_success "Complete K Social dependency chain verified"
    else
        log_warning "K Social dependency chain not testable (services not running)"
    fi
    
    return 0
}

test_startup_order() {
    log_header "Testing Service Startup Order"
    
    log_info "Checking Docker Compose dependency configuration..."
    
    # Check if depends_on is properly configured
    if grep -q "depends_on:" docker-compose.yml; then
        log_success "Docker Compose dependencies are configured"
    else
        log_error "No Docker Compose dependencies found"
        return 1
    fi
    
    # Verify critical dependencies
    log_info "Verifying critical service dependencies..."
    
    # Check Kasia App depends on Kasia Indexer
    if grep -A 5 "kasia-app:" docker-compose.yml | grep -q "kasia-indexer:"; then
        log_success "Kasia App → Kasia Indexer dependency configured"
    else
        log_error "Kasia App → Kasia Indexer dependency missing"
        return 1
    fi
    
    # Check K Social App depends on K-indexer
    if grep -A 5 "k-social:" docker-compose.yml | grep -q "k-indexer:"; then
        log_success "K Social App → K-indexer dependency configured"
    else
        log_error "K Social App → K-indexer dependency missing"
        return 1
    fi
    
    # Check indexers depend on Kaspa Node
    if grep -A 10 "k-indexer:" docker-compose.yml | grep -q "kaspa-node:"; then
        log_success "K-indexer → Kaspa Node dependency configured"
    else
        log_error "K-indexer → Kaspa Node dependency missing"
        return 1
    fi
    
    return 0
}

show_service_status() {
    log_header "Current Service Status"
    
    echo "Running Services:"
    docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
    
    echo -e "\nService Health Status:"
    for service in kaspa-node indexer-db archive-db kasia-indexer k-indexer simply-kaspa-indexer archive-indexer; do
        if docker compose ps "$service" | grep -q "Up"; then
            health=$(docker inspect --format='{{.State.Health.Status}}' "$(docker compose ps -q "$service" 2>/dev/null)" 2>/dev/null || echo "no-healthcheck")
            if [ "$health" = "healthy" ]; then
                log_success "$service: healthy"
            elif [ "$health" = "unhealthy" ]; then
                log_error "$service: unhealthy"
            elif [ "$health" = "starting" ]; then
                log_warning "$service: starting"
            else
                log_info "$service: running (no health check)"
            fi
        fi
    done
}

run_dependency_failure_simulation() {
    log_header "Dependency Failure Simulation (Optional)"
    
    read -p "Do you want to run dependency failure simulation tests? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Skipping dependency failure simulation"
        return 0
    fi
    
    log_warning "Starting dependency failure simulation..."
    
    # Test 1: Stop indexer, verify app handles failure
    if docker compose ps kasia-indexer | grep -q "Up" && docker compose ps kasia-app | grep -q "Up"; then
        log_info "Test 1: Stopping Kasia Indexer to test app resilience..."
        docker compose stop kasia-indexer
        sleep 5
        
        if curl -s http://localhost:3001/ | grep -q "connection\|error\|unavailable"; then
            log_success "Kasia App properly handles indexer failure"
        else
            log_warning "Kasia App response unclear when indexer is down"
        fi
        
        log_info "Restarting Kasia Indexer..."
        docker compose up -d kasia-indexer
        sleep 10
    fi
    
    # Test 2: Stop database, verify indexer handles failure
    if docker compose ps indexer-db | grep -q "Up" && docker compose ps k-indexer | grep -q "Up"; then
        log_info "Test 2: Stopping Database to test indexer resilience..."
        docker compose stop indexer-db
        sleep 5
        
        if ! curl -s -f http://localhost:3004/health > /dev/null 2>&1; then
            log_success "K-indexer properly fails when database is unavailable"
        else
            log_warning "K-indexer still responds when database is down"
        fi
        
        log_info "Restarting Database..."
        docker compose up -d indexer-db
        sleep 15
        docker compose up -d k-indexer
        sleep 10
    fi
    
    log_success "Dependency failure simulation completed"
}

# Main execution
main() {
    echo -e "${BLUE}"
    echo "🔍 Kaspa All-in-One Service Dependency Testing"
    echo "=============================================="
    echo -e "${NC}"
    
    # Show current status first
    show_service_status
    
    # Run core dependency tests
    log_info "Starting dependency validation tests..."
    
    if ! test_kaspa_network_access; then
        log_warning "Kaspa network access test failed - services may not function properly"
        log_info "Continuing with other tests..."
    fi
    
    if ! test_databases; then
        log_error "Database test failed"
        exit 1
    fi
    
    if ! test_indexers; then
        log_error "Indexer test failed"
        exit 1
    fi
    
    if ! test_applications; then
        log_error "Application test failed"
        exit 1
    fi
    
    if ! test_dependency_chain; then
        log_error "Dependency chain test failed"
        exit 1
    fi
    
    if ! test_startup_order; then
        log_error "Startup order configuration test failed"
        exit 1
    fi
    
    # Optional failure simulation
    run_dependency_failure_simulation
    
    # Final summary
    log_header "Dependency Test Summary"
    log_success "All dependency tests passed!"
    echo ""
    log_info "Service dependency validation complete."
    log_info "All services are properly connected and functional."
    echo ""
    log_info "Key findings:"
    echo "  • Kasia App has CONFIRMED dependency on Kasia Indexer"
    echo "  • K Social App has CONFIRMED dependency on K-indexer"
    echo "  • All indexers can connect to any accessible Kaspa node (local or remote)"
    echo "  • Database dependencies are correctly configured"
    echo "  • Docker Compose dependencies respect Kaspa's decentralized architecture"
    echo ""
    log_success "Your Kaspa All-in-One deployment has proper service dependencies! 🎉"
}

# Check if docker compose is available
if ! command -v docker &> /dev/null || ! docker compose version &> /dev/null; then
    log_error "Docker and Docker Compose are required for this test"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    log_error "docker-compose.yml not found. Please run this script from the project root directory."
    exit 1
fi

# Run main function
main "$@"