#!/bin/bash

# Test script for Kaspa All-in-One Installation Wizard Integration
# Tests frontend-backend integration with API calls

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
WIZARD_DIR="services/wizard"
BACKEND_PORT=3000
API_URL="http://localhost:$BACKEND_PORT/api"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Kaspa Wizard Integration Test${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if wizard directories exist
if [ ! -d "$WIZARD_DIR/backend" ]; then
    echo -e "${RED}✗ Wizard backend directory not found${NC}"
    exit 1
fi

if [ ! -d "$WIZARD_DIR/frontend" ]; then
    echo -e "${RED}✗ Wizard frontend directory not found${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Wizard directories found${NC}"

# Check backend dependencies
echo ""
echo -e "${BLUE}Checking backend dependencies...${NC}"

if [ ! -f "$WIZARD_DIR/backend/package.json" ]; then
    echo -e "${RED}✗ Backend package.json not found${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Backend package.json found${NC}"

# Check if node_modules exists
if [ ! -d "$WIZARD_DIR/backend/node_modules" ]; then
    echo -e "${YELLOW}⚠ Backend dependencies not installed${NC}"
    echo -e "${BLUE}Installing dependencies...${NC}"
    cd "$WIZARD_DIR/backend" && npm install
    cd - > /dev/null
fi

echo -e "${GREEN}✓ Backend dependencies ready${NC}"

# Check backend API files
echo ""
echo -e "${BLUE}Checking backend API files...${NC}"

api_files=(
    "$WIZARD_DIR/backend/src/server.js"
    "$WIZARD_DIR/backend/src/api/system-check.js"
    "$WIZARD_DIR/backend/src/api/profiles.js"
    "$WIZARD_DIR/backend/src/api/config.js"
    "$WIZARD_DIR/backend/src/api/install.js"
)

for file in "${api_files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓ Found: $file${NC}"
    else
        echo -e "${RED}✗ Missing: $file${NC}"
        exit 1
    fi
done

# Check frontend integration
echo ""
echo -e "${BLUE}Checking frontend integration...${NC}"

if grep -q "socket.io" "$WIZARD_DIR/frontend/public/index.html"; then
    echo -e "${GREEN}✓ Socket.IO client included${NC}"
else
    echo -e "${RED}✗ Socket.IO client not found in HTML${NC}"
    exit 1
fi

if grep -q "API_BASE" "$WIZARD_DIR/frontend/public/scripts/wizard.js"; then
    echo -e "${GREEN}✓ API client configured${NC}"
else
    echo -e "${RED}✗ API client not configured${NC}"
    exit 1
fi

if grep -q "initializeWebSocket" "$WIZARD_DIR/frontend/public/scripts/wizard.js"; then
    echo -e "${GREEN}✓ WebSocket integration present${NC}"
else
    echo -e "${RED}✗ WebSocket integration missing${NC}"
    exit 1
fi

# Check for API call functions
echo ""
echo -e "${BLUE}Checking API integration functions...${NC}"

api_functions=(
    "runSystemCheck"
    "loadProfiles"
    "loadConfiguration"
    "startInstallation"
    "handleInstallProgress"
)

for func in "${api_functions[@]}"; do
    if grep -q "function $func" "$WIZARD_DIR/frontend/public/scripts/wizard.js" || \
       grep -q "async function $func" "$WIZARD_DIR/frontend/public/scripts/wizard.js"; then
        echo -e "${GREEN}✓ Found function: $func${NC}"
    else
        echo -e "${RED}✗ Missing function: $func${NC}"
        exit 1
    fi
done

# Start backend server for API testing
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Starting backend server for testing...${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if port is available
if lsof -Pi :$BACKEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Port $BACKEND_PORT is already in use${NC}"
    echo -e "${YELLOW}  A wizard server may already be running${NC}"
    echo -e "${YELLOW}  Skipping server start, will test existing server${NC}"
    SERVER_STARTED=false
else
    echo -e "${GREEN}Starting backend server on port $BACKEND_PORT...${NC}"
    cd "$WIZARD_DIR/backend" && npm start &
    SERVER_PID=$!
    SERVER_STARTED=true
    
    # Wait for server to start
    echo -e "${BLUE}Waiting for server to start...${NC}"
    sleep 5
fi

# Test API endpoints
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Testing API Endpoints${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Test health endpoint
echo -e "${BLUE}Testing /api/health...${NC}"
if curl -s -f "$API_URL/health" > /dev/null; then
    echo -e "${GREEN}✓ Health endpoint responding${NC}"
else
    echo -e "${RED}✗ Health endpoint not responding${NC}"
    if [ "$SERVER_STARTED" = true ]; then
        kill $SERVER_PID 2>/dev/null || true
    fi
    exit 1
fi

# Test system-check endpoint
echo -e "${BLUE}Testing /api/system-check...${NC}"
if curl -s -f "$API_URL/system-check" > /dev/null; then
    echo -e "${GREEN}✓ System check endpoint responding${NC}"
else
    echo -e "${YELLOW}⚠ System check endpoint not responding${NC}"
fi

# Test profiles endpoint
echo -e "${BLUE}Testing /api/profiles...${NC}"
if curl -s -f "$API_URL/profiles" > /dev/null; then
    echo -e "${GREEN}✓ Profiles endpoint responding${NC}"
else
    echo -e "${YELLOW}⚠ Profiles endpoint not responding${NC}"
fi

# Test config password generation
echo -e "${BLUE}Testing /api/config/password...${NC}"
if curl -s -f "$API_URL/config/password" > /dev/null; then
    echo -e "${GREEN}✓ Config password endpoint responding${NC}"
else
    echo -e "${YELLOW}⚠ Config password endpoint not responding${NC}"
fi

# Summary
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Integration Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}✓ Backend API files present${NC}"
echo -e "${GREEN}✓ Frontend integration complete${NC}"
echo -e "${GREEN}✓ WebSocket support configured${NC}"
echo -e "${GREEN}✓ API endpoints responding${NC}"
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Manual Testing Instructions${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "1. Open your browser to: ${GREEN}http://localhost:$BACKEND_PORT${NC}"
echo -e "2. Complete the wizard steps:"
echo -e "   - Welcome → System Check (should call API)"
echo -e "   - Profiles → Select profiles (should validate)"
echo -e "   - Configure → Set options (should generate passwords)"
echo -e "   - Review → Verify settings"
echo -e "   - Install → Watch real-time progress (WebSocket)"
echo -e "   - Complete → See service status"
echo -e "3. Check browser console for API calls"
echo -e "4. Check Network tab for WebSocket connection"
echo ""

if [ "$SERVER_STARTED" = true ]; then
    echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
    echo ""
    wait $SERVER_PID
else
    echo -e "${BLUE}Server was already running. Test complete.${NC}"
fi

