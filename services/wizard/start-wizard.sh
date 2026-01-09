#!/bin/bash

# Start Wizard Service Script
# This script starts the Kaspa Installation Wizard service if it's not already running

WIZARD_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/backend" && pwd)"
WIZARD_PORT=3000
LOG_FILE="/tmp/kaspa-wizard-startup.log"

echo "Starting Kaspa Installation Wizard..." | tee -a "$LOG_FILE"

# Check if wizard is already running
if curl -s http://localhost:$WIZARD_PORT/api/health > /dev/null 2>&1; then
    echo "Wizard is already running on port $WIZARD_PORT" | tee -a "$LOG_FILE"
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

# Navigate to wizard backend directory
cd "$WIZARD_DIR" || exit 1

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..." | tee -a "$LOG_FILE"
    npm install >> "$LOG_FILE" 2>&1
fi

# Start the wizard in the background
echo "Starting wizard service..." | tee -a "$LOG_FILE"
nohup npm start >> "$LOG_FILE" 2>&1 &
WIZARD_PID=$!

# Wait for wizard to start (max 30 seconds)
echo "Waiting for wizard to start..." | tee -a "$LOG_FILE"
for i in {1..30}; do
    if curl -s http://localhost:$WIZARD_PORT/api/health > /dev/null 2>&1; then
        echo "Wizard started successfully on port $WIZARD_PORT (PID: $WIZARD_PID)" | tee -a "$LOG_FILE"
        exit 0
    fi
    sleep 1
done

echo "Error: Wizard failed to start within 30 seconds" | tee -a "$LOG_FILE"
exit 1
