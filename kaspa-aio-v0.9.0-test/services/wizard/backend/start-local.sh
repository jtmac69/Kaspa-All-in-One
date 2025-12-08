#!/bin/bash

# Local development start script for Kaspa Wizard Backend
# Sets PROJECT_ROOT to the repository root for local testing

# Get the repository root (3 levels up from this script)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

echo "Starting Kaspa Wizard Backend (Local Development Mode)"
echo "PROJECT_ROOT: $PROJECT_ROOT"
echo "Server will be available at: http://localhost:3000"
echo ""

# Export PROJECT_ROOT for the Node.js process
export PROJECT_ROOT="$PROJECT_ROOT"

# Start the server
node "$SCRIPT_DIR/src/server.js"
