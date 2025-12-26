#!/bin/bash
# Check Internal Testing Environment Status

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

WIZARD_PID_FILE="/tmp/kaspa-wizard-internal.pid"
DASHBOARD_PID_FILE="/tmp/kaspa-dashboard-internal.pid"
WIZARD_PORT=3000
DASHBOARD_PORT=8080

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║   Internal Testing Environment Status                      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check wizard
echo -e "${BLUE}Wizard Status:${NC}"
if [ -f "$WIZARD_PID_FILE" ]; then
  WIZARD_PID=$(cat "$WIZARD_PID_FILE")
  if ps -p "$WIZARD_PID" > /dev/null 2>&1; then
    if curl -s "http://localhost:${WIZARD_PORT}/api/health" > /dev/null 2>&1; then
      echo -e "${GREEN}✓ Running and responding (PID: $WIZARD_PID)${NC}"
      echo -e "  URL: http://localhost:${WIZARD_PORT}"
    else
      echo -e "${YELLOW}⚠ Running but not responding (PID: $WIZARD_PID)${NC}"
    fi
  else
    echo -e "${RED}✗ Not running (stale PID file)${NC}"
    rm -f "$WIZARD_PID_FILE"
  fi
else
  echo -e "${RED}✗ Not running${NC}"
fi

echo ""

# Check dashboard
echo -e "${BLUE}Dashboard Status:${NC}"
if [ -f "$DASHBOARD_PID_FILE" ]; then
  DASHBOARD_PID=$(cat "$DASHBOARD_PID_FILE")
  if ps -p "$DASHBOARD_PID" > /dev/null 2>&1; then
    if curl -s "http://localhost:${DASHBOARD_PORT}/api/health" > /dev/null 2>&1; then
      echo -e "${GREEN}✓ Running and responding (PID: $DASHBOARD_PID)${NC}"
      echo -e "  URL: http://localhost:${DASHBOARD_PORT}"
    else
      echo -e "${YELLOW}⚠ Running but not responding (PID: $DASHBOARD_PID)${NC}"
    fi
  else
    echo -e "${RED}✗ Not running (stale PID file)${NC}"
    rm -f "$DASHBOARD_PID_FILE"
  fi
else
  echo -e "${RED}✗ Not running${NC}"
fi

echo ""

# Check Docker containers
echo -e "${BLUE}Docker Containers:${NC}"
if command -v docker &> /dev/null; then
  CONTAINERS=$(docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" --filter "name=kaspa-" 2>/dev/null)
  if [ -n "$CONTAINERS" ]; then
    echo "$CONTAINERS"
  else
    echo -e "${YELLOW}⚠ No Kaspa containers running${NC}"
  fi
else
  echo -e "${RED}✗ Docker not available${NC}"
fi

echo ""

# Check logs
echo -e "${BLUE}Recent Logs:${NC}"
if [ -d "test-logs" ]; then
  echo -e "${GREEN}✓ Log directory exists${NC}"
  echo "  Wizard log: test-logs/wizard.log"
  echo "  Dashboard log: test-logs/dashboard.log"
  
  # Show last few lines of each log
  if [ -f "test-logs/wizard.log" ]; then
    echo ""
    echo -e "${BLUE}Last 3 wizard log entries:${NC}"
    tail -3 test-logs/wizard.log 2>/dev/null || echo "  (empty)"
  fi
  
  if [ -f "test-logs/dashboard.log" ]; then
    echo ""
    echo -e "${BLUE}Last 3 dashboard log entries:${NC}"
    tail -3 test-logs/dashboard.log 2>/dev/null || echo "  (empty)"
  fi
else
  echo -e "${YELLOW}⚠ No log directory found${NC}"
fi

echo ""
