#!/bin/bash

# Start Dashboard Service Script
# This script starts the Kaspa Management Dashboard service if it's not already running

DASHBOARD_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DASHBOARD_PORT=8080
LOG_FILE="/tmp/kaspa-dashboard-startup.log"

echo "Starting Kaspa Management Dashboard..." | tee -a "$LOG_FILE"

# Check if dashboard is already running
if curl -s http://localhost:$DASHBOARD_PORT/health > /dev/null 2>&1; then
    echo "Dashboard is already running on port $DASHBOARD_PORT" | tee -a "$LOG_FILE"
    exit 0
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed" | tee -a "$LOG_FILE"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed" | tee -a "$LOG_FILE"
    exit 1
fi

# Navigate to dashboard directory
cd "$DASHBOARD_DIR" || exit 1

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..." | tee -a "$LOG_FILE"
    npm install >> "$LOG_FILE" 2>&1
fi

# Start the dashboard in the background
echo "Starting dashboard service..." | tee -a "$LOG_FILE"
nohup npm start >> "$LOG_FILE" 2>&1 &
DASHBOARD_PID=$!

# Wait for dashboard to start (max 30 seconds)
echo "Waiting for dashboard to start..." | tee -a "$LOG_FILE"
for i in {1..30}; do
    if curl -s http://localhost:$DASHBOARD_PORT/health > /dev/null 2>&1; then
        echo "Dashboard started successfully on port $DASHBOARD_PORT (PID: $DASHBOARD_PID)" | tee -a "$LOG_FILE"
        exit 0
    fi
    sleep 1
done

echo "Error: Dashboard failed to start within 30 seconds" | tee -a "$LOG_FILE"
exit 1
