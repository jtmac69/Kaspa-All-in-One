#!/bin/bash
# Cleanup Internal Testing Environment

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║   Internal Testing Environment Cleanup                     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

echo -e "${YELLOW}This will completely clean the testing environment:${NC}"
echo "  • Stop wizard and dashboard"
echo "  • Stop and remove Docker containers"
echo "  • Remove Docker volumes (optional)"
echo "  • Remove test logs"
echo "  • Remove configuration files"
echo ""

read -p "Continue with cleanup? (y/N) " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${BLUE}Cleanup cancelled${NC}"
  exit 0
fi

echo ""

# Stop services first
echo -e "${BLUE}Stopping services...${NC}"
./stop-internal-test.sh

# Remove Docker containers and volumes
echo -e "${BLUE}Cleaning Docker environment...${NC}"
if [ -f "docker-compose.yml" ]; then
  read -p "Remove Docker volumes? This deletes all container data. (y/N) " -n 1 -r
  echo
  
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v docker-compose &> /dev/null; then
      docker-compose down -v --remove-orphans 2>/dev/null || true
    elif docker compose version &> /dev/null 2>&1; then
      docker compose down -v --remove-orphans 2>/dev/null || true
    fi
    echo -e "${GREEN}✓ Containers and volumes removed${NC}"
  else
    if command -v docker-compose &> /dev/null; then
      docker-compose down --remove-orphans 2>/dev/null || true
    elif docker compose version &> /dev/null 2>&1; then
      docker compose down --remove-orphans 2>/dev/null || true
    fi
    echo -e "${GREEN}✓ Containers stopped (volumes preserved)${NC}"
  fi
fi

# Remove test logs
if [ -d "test-logs" ]; then
  echo -e "${BLUE}Removing test logs...${NC}"
  rm -rf test-logs
  echo -e "${GREEN}✓ Test logs removed${NC}"
fi

# Remove configuration files
echo -e "${BLUE}Removing configuration files...${NC}"
rm -f .env
rm -f .wizard-token
rm -f docker-compose.override.yml
rm -rf .kaspa-aio
rm -rf .kaspa-backups
echo -e "${GREEN}✓ Configuration files removed${NC}"

echo ""
echo -e "${GREEN}✓ Cleanup complete!${NC}"
echo ""
echo "To start fresh testing:"
echo "  ./start-internal-test.sh"
echo ""
