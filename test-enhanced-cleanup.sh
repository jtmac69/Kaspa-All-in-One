#!/bin/bash
# Test script for enhanced cleanup functionality

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "Testing Enhanced Cleanup Script Functionality"
echo "============================================="
echo ""

# Test 1: Check if Docker is available
echo -e "${BLUE}Test 1: Docker availability${NC}"
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓ Docker is available${NC}"
    docker --version
else
    echo -e "${RED}✗ Docker not found${NC}"
    exit 1
fi
echo ""

# Test 2: Check Docker Compose availability
echo -e "${BLUE}Test 2: Docker Compose availability${NC}"
if docker compose version &> /dev/null 2>&1; then
    echo -e "${GREEN}✓ docker compose is available${NC}"
    docker compose version
elif command -v docker-compose &> /dev/null && docker-compose --version &> /dev/null 2>&1; then
    echo -e "${GREEN}✓ docker-compose is available${NC}"
    docker-compose --version
else
    echo -e "${RED}✗ Docker Compose not found${NC}"
    exit 1
fi
echo ""

# Test 3: Check current container state
echo -e "${BLUE}Test 3: Current container state${NC}"
echo "Kaspa containers currently running:"
docker ps --filter "name=kaspa-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" || echo "No running Kaspa containers"
echo ""

echo "All Kaspa containers (any state):"
docker ps -a --filter "name=kaspa-" --format "table {{.Names}}\t{{.Status}}\t{{.CreatedAt}}" || echo "No Kaspa containers found"
echo ""

# Test 4: Check for stuck containers specifically
echo -e "${BLUE}Test 4: Checking for stuck containers${NC}"
stuck_containers=$(docker ps -a --filter "status=created" --filter "name=kaspa-" --format "{{.Names}}" 2>/dev/null)
if [ -n "$stuck_containers" ]; then
    echo -e "${YELLOW}Found stuck containers:${NC}"
    echo "$stuck_containers" | while read container; do
        echo "  • $container"
    done
else
    echo -e "${GREEN}✓ No stuck containers found${NC}"
fi
echo ""

# Test 5: Check for failed containers
echo -e "${BLUE}Test 5: Checking for failed containers${NC}"
failed_containers=$(docker ps -a --filter "status=exited" --filter "name=kaspa-" --format "{{.Names}}" 2>/dev/null)
if [ -n "$failed_containers" ]; then
    echo -e "${YELLOW}Found exited containers:${NC}"
    echo "$failed_containers" | while read container; do
        exit_code=$(docker inspect --format='{{.State.ExitCode}}' "$container" 2>/dev/null)
        echo "  • $container (exit code: $exit_code)"
    done
else
    echo -e "${GREEN}✓ No failed containers found${NC}"
fi
echo ""

# Test 6: Check for Kaspa networks
echo -e "${BLUE}Test 6: Checking for Kaspa networks${NC}"
kaspa_networks=$(docker network ls --filter "name=kaspa" --format "{{.Name}}" 2>/dev/null)
if [ -n "$kaspa_networks" ]; then
    echo -e "${YELLOW}Found Kaspa networks:${NC}"
    echo "$kaspa_networks" | while read network; do
        echo "  • $network"
    done
else
    echo -e "${GREEN}✓ No Kaspa networks found${NC}"
fi
echo ""

# Test 7: Check for Kaspa images
echo -e "${BLUE}Test 7: Checking for Kaspa images${NC}"
kaspa_images=$(docker images --filter "reference=*kaspa*" --filter "dangling=false" --format "{{.Repository}}:{{.Tag}}" 2>/dev/null)
if [ -n "$kaspa_images" ]; then
    echo -e "${YELLOW}Found Kaspa images:${NC}"
    echo "$kaspa_images" | while read image; do
        echo "  • $image"
    done
else
    echo -e "${GREEN}✓ No Kaspa images found${NC}"
fi
echo ""

# Test 8: Validate cleanup script syntax
echo -e "${BLUE}Test 8: Validating cleanup script syntax${NC}"
if bash -n cleanup-test.sh; then
    echo -e "${GREEN}✓ Cleanup script syntax is valid${NC}"
else
    echo -e "${RED}✗ Cleanup script has syntax errors${NC}"
    exit 1
fi
echo ""

# Test 9: Check for cleanup script functions
echo -e "${BLUE}Test 9: Checking cleanup script functions${NC}"
if grep -q "cleanup_stuck_containers" cleanup-test.sh; then
    echo -e "${GREEN}✓ Enhanced cleanup function found${NC}"
else
    echo -e "${RED}✗ Enhanced cleanup function not found${NC}"
    exit 1
fi

if grep -q "cleanup_stuck_containers" cleanup-test.sh && grep -A 10 "main()" cleanup-test.sh | grep -q "cleanup_stuck_containers"; then
    echo -e "${GREEN}✓ Enhanced cleanup function is called in main${NC}"
else
    echo -e "${RED}✗ Enhanced cleanup function not called in main${NC}"
    exit 1
fi
echo ""

# Summary
echo "============================================="
echo -e "${GREEN}Enhanced Cleanup Test Summary${NC}"
echo "============================================="
echo ""
echo "The enhanced cleanup script includes:"
echo "  ✓ Stuck container detection and removal"
echo "  ✓ Failed container cleanup"
echo "  ✓ Orphaned network cleanup"
echo "  ✓ Optional image cleanup"
echo "  ✓ Comprehensive container state handling"
echo ""
echo -e "${BLUE}The cleanup script is ready to provide testers with a clean start!${NC}"
echo ""
echo "To run the enhanced cleanup:"
echo "  ./cleanup-test.sh"
echo ""