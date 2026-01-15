#!/bin/bash

# Restart Dashboard Service
# Stops the current dashboard process and starts it in the background

set -e

echo "=========================================="
echo "Restarting Dashboard Service"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if dashboard is running
echo "1. Checking for existing dashboard process..."
DASHBOARD_PID=$(lsof -ti:8080 2>/dev/null || echo "")

if [ -n "$DASHBOARD_PID" ]; then
    echo -e "${YELLOW}Found dashboard running on PID: $DASHBOARD_PID${NC}"
    echo "Stopping dashboard..."
    kill $DASHBOARD_PID
    sleep 2
    
    # Verify it stopped
    if lsof -ti:8080 >/dev/null 2>&1; then
        echo -e "${RED}Process still running, forcing kill...${NC}"
        kill -9 $DASHBOARD_PID 2>/dev/null || true
        sleep 1
    fi
    echo -e "${GREEN}✓ Dashboard stopped${NC}"
else
    echo -e "${YELLOW}No dashboard process found${NC}"
fi
echo ""

# Start dashboard in background
echo "2. Starting dashboard service..."
cd services/dashboard

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}node_modules not found, running npm install...${NC}"
    npm install
fi

# Start in background with output redirected to log file
nohup npm start > ../../logs/dashboard.log 2>&1 &
DASHBOARD_PID=$!

echo -e "${GREEN}✓ Dashboard started (PID: $DASHBOARD_PID)${NC}"
echo ""

# Wait a moment for it to start
echo "3. Waiting for dashboard to start..."
sleep 3

# Verify it's running
if lsof -ti:8080 >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Dashboard is running on port 8080${NC}"
    echo ""
    echo "Dashboard URL: http://localhost:8080"
    echo "Log file: logs/dashboard.log"
    echo ""
    echo "To view logs: tail -f logs/dashboard.log"
else
    echo -e "${RED}✗ Dashboard failed to start${NC}"
    echo "Check logs/dashboard.log for errors"
    exit 1
fi

cd ../..
echo ""
echo -e "${GREEN}Dashboard restart complete!${NC}"
