#!/bin/bash
# Kaspa All-in-One Test Release - Service Status

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   Kaspa All-in-One - Service Status                       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check wizard status
echo "=== Wizard Status ==="
if [ -f /tmp/kaspa-wizard.pid ]; then
    WIZARD_PID=$(cat /tmp/kaspa-wizard.pid)
    if ps -p $WIZARD_PID > /dev/null 2>&1; then
        echo "✓ Wizard running (PID: $WIZARD_PID)"
        echo "  URL: http://localhost:3000"
    else
        echo "✗ Wizard not running (stale PID file)"
        rm /tmp/kaspa-wizard.pid
    fi
else
    echo "✗ Wizard not running"
fi
echo ""

# Check Docker services
echo "=== Docker Services ==="

# Detect docker-compose command (v1 or v2)
if command -v docker-compose &> /dev/null && docker-compose ps --quiet 2>/dev/null | grep -q .; then
    COMPOSE_CMD="docker-compose"
elif docker compose ps --quiet 2>/dev/null | grep -q .; then
    COMPOSE_CMD="docker compose"
else
    COMPOSE_CMD=""
fi

if [ -n "$COMPOSE_CMD" ]; then
    $COMPOSE_CMD ps
    echo ""
    
    # Show resource usage
    echo "=== Resource Usage ==="
    CONTAINER_IDS=$($COMPOSE_CMD ps -q 2>/dev/null)
    if [ -n "$CONTAINER_IDS" ]; then
        docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" $CONTAINER_IDS
    fi
else
    echo "No services running"
fi
echo ""

# Show ports in use
echo "=== Ports in Use ==="
if command -v netstat &> /dev/null; then
    netstat -tuln | grep -E ':(3000|8080|16110|16111|18787)' || echo "No Kaspa ports in use"
elif command -v ss &> /dev/null; then
    ss -tuln | grep -E ':(3000|8080|16110|16111|18787)' || echo "No Kaspa ports in use"
else
    echo "Port checking not available (netstat/ss not found)"
fi
