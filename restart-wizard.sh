#!/bin/bash
# Kaspa All-in-One Test Release - Restart Wizard
# Version: v0.9.1
#
# This script restarts the wizard server to pick up code changes
# or to reset the wizard to a fresh state.

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Global variables
WIZARD_PID_FILE="/tmp/kaspa-wizard.pid"
WIZARD_LOG_FILE="/tmp/kaspa-wizard.log"
WIZARD_PORT=3000

# Print banner
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║   Kaspa All-in-One - Restart Wizard                       ║"
echo "║   Version: v0.9.1                                     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Stop existing wizard
echo -e "${BLUE}Stopping wizard...${NC}"

if [ -f "$WIZARD_PID_FILE" ]; then
  WIZARD_PID=$(cat "$WIZARD_PID_FILE")
  if ps -p "$WIZARD_PID" > /dev/null 2>&1; then
    kill "$WIZARD_PID" 2>/dev/null || true
    sleep 2
    echo -e "${GREEN}✓ Wizard stopped (PID: $WIZARD_PID)${NC}"
  else
    echo -e "${YELLOW}⚠ Wizard process not running${NC}"
  fi
  rm -f "$WIZARD_PID_FILE"
else
  echo -e "${YELLOW}⚠ Wizard PID file not found${NC}"
fi

echo ""

# Ask if user wants to reset wizard state
echo -e "${YELLOW}Reset wizard to fresh state?${NC}"
echo ""
echo "This will:"
echo "  • Clear browser localStorage (you'll need to refresh)"
echo "  • Remove .env and docker-compose.override.yml"
echo "  • Start wizard from step 1 (Welcome)"
echo ""
echo "Choose 'No' if you want to continue from where you left off."
echo ""

read -p "Reset to fresh state? (y/N) " -n 1 -r
echo
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${BLUE}Resetting wizard state...${NC}"
  
  # Remove configuration files
  if [ -f ".env" ]; then
    rm -f ".env"
    echo -e "${GREEN}✓ Removed .env${NC}"
  fi
  
  if [ -f "docker-compose.override.yml" ]; then
    rm -f "docker-compose.override.yml"
    echo -e "${GREEN}✓ Removed docker-compose.override.yml${NC}"
  fi
  
  echo ""
  echo -e "${YELLOW}⚠ IMPORTANT: After wizard starts, you must:${NC}"
  echo -e "${YELLOW}  1. Open browser to http://localhost:${WIZARD_PORT}${NC}"
  echo -e "${YELLOW}  2. Press Ctrl+Shift+R (or Cmd+Shift+R on Mac) to hard refresh${NC}"
  echo -e "${YELLOW}  3. Or open DevTools (F12) and right-click refresh button → 'Empty Cache and Hard Reload'${NC}"
  echo ""
else
  echo -e "${BLUE}Keeping existing state${NC}"
  echo ""
fi

# Start wizard
echo -e "${BLUE}Starting wizard...${NC}"

cd services/wizard/backend
BUILD_MODE=test nohup node src/server.js > "$WIZARD_LOG_FILE" 2>&1 &
WIZARD_PID=$!
echo $WIZARD_PID > "$WIZARD_PID_FILE"
cd ../../..

# Wait for wizard to be ready
echo -e "${BLUE}Waiting for wizard to start...${NC}"

max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
  if curl -s "http://localhost:${WIZARD_PORT}/api/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Wizard is ready!${NC}"
    break
  fi
  sleep 0.5
  attempt=$((attempt + 1))
done

if [ $attempt -eq $max_attempts ]; then
  echo -e "${RED}✗ Wizard failed to start${NC}"
  echo -e "${YELLOW}Check logs at: ${WIZARD_LOG_FILE}${NC}"
  exit 1
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║   Wizard Restarted Successfully!                           ║"
echo "║                                                             ║"
echo "║   🌐 Access at: http://localhost:${WIZARD_PORT}                    ║"
echo "║                                                             ║"
echo "║   ⚠️  REMEMBER: Hard refresh your browser!                  ║"
echo "║      Press Ctrl+Shift+R (Cmd+Shift+R on Mac)               ║"
echo "║                                                             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
