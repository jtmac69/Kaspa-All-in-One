#!/bin/bash

# Test script for Dashboard Blocks/Hour fix
# Tests the new blocks/hour tracking and visualization

set -e

echo "=========================================="
echo "Testing Dashboard Blocks/Hour Fix"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if dashboard is running (host-based service on port 8080)
echo "1. Checking if dashboard is running..."
DASHBOARD_PID=$(lsof -ti:8080 2>/dev/null || echo "")
if [ -n "$DASHBOARD_PID" ]; then
    echo -e "${GREEN}✓ Dashboard service is running (PID: $DASHBOARD_PID)${NC}"
else
    echo -e "${RED}✗ Dashboard service is not running${NC}"
    echo "Please start the dashboard manually with: cd services/dashboard && npm start"
    exit 1
fi
echo ""

# Check if kaspa-node is running
echo "2. Checking if kaspa-node is running..."
if docker ps | grep -q kaspa-node; then
    echo -e "${GREEN}✓ Kaspa node container is running${NC}"
else
    echo -e "${YELLOW}⚠ Kaspa node is not running - blocks/hour will show default values${NC}"
fi
echo ""

# Test the sync-status API endpoint
echo "3. Testing /api/kaspa/node/sync-status endpoint..."
RESPONSE=$(curl -s http://localhost:8080/api/kaspa/node/sync-status)

if echo "$RESPONSE" | jq -e '.blocksPerHour' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ blocksPerHour field exists in response${NC}"
    
    RATE=$(echo "$RESPONSE" | jq -r '.blocksPerHour.rate')
    ACCURATE=$(echo "$RESPONSE" | jq -r '.blocksPerHour.accurate')
    CHART_POINTS=$(echo "$RESPONSE" | jq -r '.blocksPerHour.chartData | length')
    
    echo "  - Rate: $RATE blocks/hour"
    echo "  - Accurate: $ACCURATE"
    echo "  - Chart data points: $CHART_POINTS"
    
    if [ "$CHART_POINTS" -gt 0 ]; then
        echo -e "${GREEN}✓ Chart data is populated${NC}"
    else
        echo -e "${YELLOW}⚠ Chart data is empty (needs more time to collect samples)${NC}"
    fi
else
    echo -e "${RED}✗ blocksPerHour field missing from response${NC}"
    echo "Response: $RESPONSE" | jq '.'
    exit 1
fi
echo ""

# Test top-level fields
echo "4. Testing top-level convenience fields..."
LOCAL_HEIGHT=$(echo "$RESPONSE" | jq -r '.localHeight')
NETWORK_HEIGHT=$(echo "$RESPONSE" | jq -r '.networkHeight')
CONNECTED_PEERS=$(echo "$RESPONSE" | jq -r '.connectedPeers')
NODE_VERSION=$(echo "$RESPONSE" | jq -r '.nodeVersion')

echo "  - Local Height: $LOCAL_HEIGHT"
echo "  - Network Height: $NETWORK_HEIGHT"
echo "  - Connected Peers: $CONNECTED_PEERS"
echo "  - Node Version: $NODE_VERSION"

if [ "$LOCAL_HEIGHT" != "null" ] && [ "$LOCAL_HEIGHT" != "-" ]; then
    echo -e "${GREEN}✓ Local height is populated${NC}"
else
    echo -e "${YELLOW}⚠ Local height not available yet${NC}"
fi
echo ""

# Check HTML for blocks/hour widget
echo "5. Checking HTML for blocks/hour widget..."
if grep -q "blocks-hour-widget" services/dashboard/public/index.html; then
    echo -e "${GREEN}✓ Blocks/hour widget found in HTML${NC}"
else
    echo -e "${RED}✗ Blocks/hour widget not found in HTML${NC}"
    exit 1
fi

if grep -q "blocks-hour-chart" services/dashboard/public/index.html; then
    echo -e "${GREEN}✓ Chart canvas element found in HTML${NC}"
else
    echo -e "${RED}✗ Chart canvas element not found in HTML${NC}"
    exit 1
fi
echo ""

# Check CSS for blocks/hour styles
echo "6. Checking CSS for blocks/hour styles..."
if grep -q "blocks-hour-widget" services/dashboard/public/dashboard.css; then
    echo -e "${GREEN}✓ Blocks/hour widget styles found in CSS${NC}"
else
    echo -e "${RED}✗ Blocks/hour widget styles not found in CSS${NC}"
    exit 1
fi
echo ""

# Check JavaScript for chart methods
echo "7. Checking JavaScript for chart methods..."
if grep -q "initBlocksPerHourChart" services/dashboard/public/scripts/modules/ui-manager.js; then
    echo -e "${GREEN}✓ initBlocksPerHourChart method found${NC}"
else
    echo -e "${RED}✗ initBlocksPerHourChart method not found${NC}"
    exit 1
fi

if grep -q "drawBlocksChart" services/dashboard/public/scripts/modules/ui-manager.js; then
    echo -e "${GREEN}✓ drawBlocksChart method found${NC}"
else
    echo -e "${RED}✗ drawBlocksChart method not found${NC}"
    exit 1
fi
echo ""

# Test browser console command
echo "8. Browser test command (run this in browser console):"
echo -e "${YELLOW}"
cat << 'EOF'
fetch('/api/kaspa/node/sync-status').then(r=>r.json()).then(d => {
    console.log('Rate:', d.blocksPerHour?.rate);
    console.log('Accurate:', d.blocksPerHour?.accurate);
    console.log('Chart points:', d.blocksPerHour?.chartData?.length);
    console.log('Local Height:', d.localHeight);
    console.log('Network Height:', d.networkHeight);
    console.log('Connected Peers:', d.connectedPeers);
    console.log('Node Version:', d.nodeVersion);
});
EOF
echo -e "${NC}"
echo ""

# Summary
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo ""
echo -e "${GREEN}✓ All tests passed!${NC}"
echo ""
echo "Next steps:"
echo "1. Open dashboard in browser: http://localhost:8080"
echo "2. Check the 'Local Node Status' section"
echo "3. Verify 'Blocks/Hour' widget shows:"
echo "   - Numeric value (e.g., 35,892)"
echo "   - Mini sparkline chart"
echo "4. Verify other fields show actual values:"
echo "   - LOCAL HEIGHT: should show numbers"
echo "   - CONNECTED PEERS: should show count"
echo "   - NODE VERSION: should show version"
echo ""
echo "Note: Chart will populate over time as block samples are collected."
echo "      Initial display may show flat line until enough data is gathered."
echo ""
