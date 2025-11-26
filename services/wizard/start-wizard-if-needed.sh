#!/bin/bash

# Start Wizard If Needed
# This script checks if the wizard is running and starts it if not
# Can be called by the dashboard before making API requests

WIZARD_PORT=${WIZARD_PORT:-3000}
WIZARD_HOST=${WIZARD_HOST:-localhost}
PROJECT_ROOT=${PROJECT_ROOT:-$(cd "$(dirname "$0")/../.." && pwd)}

# Check if wizard is already running
if curl -s "http://${WIZARD_HOST}:${WIZARD_PORT}/api/health" > /dev/null 2>&1; then
    echo "Wizard is already running"
    exit 0
fi

echo "Wizard is not running. Starting wizard..."

# Start wizard in background
cd "$PROJECT_ROOT/services/wizard/backend"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing wizard dependencies..."
    npm install
fi

# Start the wizard server in background
nohup node src/server.js > /tmp/wizard.log 2>&1 &
WIZARD_PID=$!

echo "Wizard starting with PID: $WIZARD_PID"

# Wait for wizard to be ready (max 10 seconds)
for i in {1..20}; do
    if curl -s "http://${WIZARD_HOST}:${WIZARD_PORT}/api/health" > /dev/null 2>&1; then
        echo "Wizard is ready!"
        echo $WIZARD_PID > /tmp/wizard.pid
        exit 0
    fi
    sleep 0.5
done

echo "Warning: Wizard may not have started successfully"
echo "Check logs: tail -f /tmp/wizard.log"
exit 1
