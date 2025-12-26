#!/bin/bash
# Stop Internal Testing Environment

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

WIZARD_PID_FILE="/tmp/kaspa-wizard-internal.pid"
DASHBOARD_PID_FILE="/tmp/kaspa-dashboard-internal.pid"

echo -e "${BLUE}Stopping internal testing environment...${NC}"

# Stop wizard
if [ -f "$WIZARD_PID_FILE" ]; then
  WIZARD_PID=$(cat "$WIZARD_PID_FILE")
  if ps -p "$WIZARD_PID" > /dev/null 2>&1; then
    kill "$WIZARD_PID" 2>/dev/null || true
    echo -e "${GREEN}✓ Wizard stopped${NC}"
  fi
  rm -f "$WIZARD_PID_FILE"
fi

# Stop dashboard
if [ -f "$DASHBOARD_PID_FILE" ]; then
  DASHBOARD_PID=$(cat "$DASHBOARD_PID_FILE")
  if ps -p "$DASHBOARD_PID" > /dev/null 2>&1; then
    kill "$DASHBOARD_PID" 2>/dev/null || true
    echo -e "${GREEN}✓ Dashboard stopped${NC}"
  fi
  rm -f "$DASHBOARD_PID_FILE"
fi

# Stop any Docker containers
if [ -f "docker-compose.yml" ]; then
  if command -v docker-compose &> /dev/null; then
    docker-compose down 2>/dev/null || true
  elif docker compose version &> /dev/null 2>&1; then
    docker compose down 2>/dev/null || true
  fi
  echo -e "${GREEN}✓ Docker containers stopped${NC}"
fi

echo -e "${GREEN}✓ Internal testing environment stopped${NC}"
