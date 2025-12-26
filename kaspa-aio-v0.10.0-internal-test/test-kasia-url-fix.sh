#!/bin/bash

# Test script for Kasia URL fix
# This script rebuilds the Kasia app and tests the URL configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Kasia URL Fix Test Script ===${NC}"
echo

# Step 1: Clean up old images
echo -e "${YELLOW}Step 1: Cleaning up old Kasia images...${NC}"
docker images | grep kasia | awk '{print $3}' | xargs -r docker rmi -f || echo "No old images to remove"
echo

# Step 2: Build with no cache to ensure changes are picked up
echo -e "${YELLOW}Step 2: Building Kasia app with no cache...${NC}"
docker-compose build --no-cache kasia-app
echo

# Step 3: Check what URLs are baked into the image
echo -e "${YELLOW}Step 3: Checking URLs in built image...${NC}"
echo "Inspecting docker-compose build args..."
docker-compose config | grep -A 10 -B 5 "VITE_INDEXER_MAINNET_URL" || echo "No build args found in config"
echo

# Step 4: Run a quick test container to check environment
echo -e "${YELLOW}Step 4: Testing container environment...${NC}"
docker run --rm kasia-app:latest cat /usr/share/nginx/html/env-config.js 2>/dev/null || echo "Could not read env-config.js"
echo

# Step 5: Start the service
echo -e "${YELLOW}Step 5: Starting Kasia app service...${NC}"
docker-compose up -d kasia-app
echo

# Step 6: Wait for service to be ready
echo -e "${YELLOW}Step 6: Waiting for service to be ready...${NC}"
sleep 10

# Step 7: Check service health
echo -e "${YELLOW}Step 7: Checking service health...${NC}"
if curl -f http://localhost:3001/health >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Kasia app is running and healthy${NC}"
else
    echo -e "${RED}✗ Kasia app health check failed${NC}"
fi

# Step 8: Check what URLs the app is actually using
echo -e "${YELLOW}Step 8: Checking runtime configuration...${NC}"
echo "Fetching env-config.js from running container..."
curl -s http://localhost:3001/env-config.js 2>/dev/null | grep -E "(INDEXER|NODE)" || echo "Could not fetch runtime config"
echo

# Step 9: Check container logs for any connection errors
echo -e "${YELLOW}Step 9: Checking container logs for errors...${NC}"
docker logs kasia-app 2>&1 | tail -20
echo

# Step 10: Instructions for manual testing
echo -e "${BLUE}=== Manual Testing Instructions ===${NC}"
echo "1. Open browser to: http://localhost:3001"
echo "2. Open browser developer tools (F12)"
echo "3. Go to Console tab"
echo "4. Look for WebSocket connection attempts"
echo "5. Verify it's connecting to: wss://wrpc.kasia.fyi (NOT wss://api.kasia.io/ws)"
echo
echo -e "${GREEN}Expected: WebSocket connection to 'wss://wrpc.kasia.fyi'${NC}"
echo -e "${RED}Wrong: WebSocket connection to 'wss://api.kasia.io/ws'${NC}"
echo

# Step 11: Cleanup option
echo -e "${YELLOW}To stop the test:${NC}"
echo "docker-compose down kasia-app"
echo

echo -e "${GREEN}Test script completed!${NC}"