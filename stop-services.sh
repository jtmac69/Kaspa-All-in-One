#!/bin/bash
# Kaspa All-in-One Test Release - Stop Services
# Version: v0.9.1

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print banner
print_banner() {
  echo ""
  echo "╔════════════════════════════════════════════════════════════╗"
  echo "║   Kaspa All-in-One - Stop Services                        ║"
  echo "║   Version: v0.9.1                                     ║"
  echo "╚════════════════════════════════════════════════════════════╝"
  echo ""
}

# Check if docker-compose.yml exists
check_compose_file() {
  if [ ! -f "docker-compose.yml" ]; then
    echo -e "${YELLOW}⚠ docker-compose.yml not found${NC}"
    echo -e "${YELLOW}  No services have been installed yet.${NC}"
    echo ""
    echo "To start a new installation, run: ./start-test.sh"
    echo ""
    exit 0
  fi
}

# Detect docker-compose command
detect_compose_command() {
  # Try docker compose v2 first (more modern and reliable)
  if docker compose version &> /dev/null 2>&1; then
    echo "docker compose"
  # Fall back to docker-compose v1 if v2 not available
  elif command -v docker-compose &> /dev/null; then
    # Verify docker-compose actually works
    if docker-compose version &> /dev/null 2>&1; then
      echo "docker-compose"
    else
      echo -e "${RED}✗ docker-compose found but not working${NC}"
      echo -e "${YELLOW}  Try using Docker Compose v2 instead.${NC}"
      exit 1
    fi
  else
    echo -e "${RED}✗ Docker Compose not found${NC}"
    echo -e "${YELLOW}  Please install Docker Compose and try again.${NC}"
    exit 1
  fi
}

# Stop Docker services
stop_docker_services() {
  local compose_cmd=$1
  
  echo -e "${BLUE}Stopping Docker services...${NC}"
  
  # Check if any services are running
  local running_services=$($compose_cmd ps --services --filter "status=running" 2>/dev/null || echo "")
  
  if [ -z "$running_services" ]; then
    echo -e "${YELLOW}⚠ No Docker services are currently running${NC}"
  else
    # Stop services gracefully
    $compose_cmd stop 2>&1 | grep -v "^$" || true
    echo -e "${GREEN}✓ Docker services stopped${NC}"
  fi
  
  echo ""
}

# Stop wizard process
stop_wizard() {
  echo -e "${BLUE}Stopping wizard process...${NC}"
  
  if [ -f /tmp/kaspa-wizard.pid ]; then
    WIZARD_PID=$(cat /tmp/kaspa-wizard.pid)
    
    # Check if process is actually running
    if ps -p $WIZARD_PID > /dev/null 2>&1; then
      kill $WIZARD_PID 2>/dev/null
      
      # Wait a moment for graceful shutdown
      sleep 1
      
      # Force kill if still running
      if ps -p $WIZARD_PID > /dev/null 2>&1; then
        kill -9 $WIZARD_PID 2>/dev/null
      fi
      
      echo -e "${GREEN}✓ Wizard stopped${NC}"
    else
      echo -e "${YELLOW}⚠ Wizard was not running (stale PID file)${NC}"
    fi
    
    # Clean up PID file
    rm /tmp/kaspa-wizard.pid
  else
    echo -e "${YELLOW}⚠ Wizard was not running${NC}"
  fi
  
  echo ""
}

# Print confirmation message
print_confirmation() {
  echo ""
  echo "╔════════════════════════════════════════════════════════════╗"
  echo "║   All Services Stopped                                     ║"
  echo "╚════════════════════════════════════════════════════════════╝"
  echo ""
  echo -e "${GREEN}✓ All services have been stopped${NC}"
  echo ""
  echo -e "${BLUE}Data and configuration preserved.${NC}"
  echo ""
  echo "To restart services:"
  echo "  • Start wizard:        ./start-test.sh"
  echo "  • Restart services:    ./restart-services.sh"
  echo ""
  echo "To check status:"
  echo "  • View status:         ./status.sh"
  echo ""
  echo "To start fresh:"
  echo "  • Fresh start:         ./fresh-start.sh"
  echo "  • Full cleanup:        ./cleanup-test.sh"
  echo ""
}

# Main execution
main() {
  print_banner
  
  # Check prerequisites
  check_compose_file
  
  # Detect compose command
  local compose_cmd=$(detect_compose_command)
  echo -e "${GREEN}✓ Using: $compose_cmd${NC}"
  echo ""
  
  # Stop sequence
  stop_docker_services "$compose_cmd"
  stop_wizard
  print_confirmation
}

# Run main function
main
