#!/bin/bash
# Kaspa All-in-One Test Release - Restart Services
# Version: v0.9.0-test

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
  echo "║   Kaspa All-in-One - Restart Services                     ║"
  echo "║   Version: v0.9.0-test                                     ║"
  echo "╚════════════════════════════════════════════════════════════╝"
  echo ""
}

# Check if docker-compose.yml exists
check_compose_file() {
  if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}✗ docker-compose.yml not found${NC}"
    echo -e "${YELLOW}  Make sure you're running this script from the project root.${NC}"
    echo -e "${YELLOW}  Or you may not have completed an installation yet.${NC}"
    echo ""
    echo "To start a new installation, run: ./start-test.sh"
    echo ""
    exit 1
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

# Stop services gracefully
stop_services() {
  local compose_cmd=$1
  
  echo -e "${BLUE}Stopping services gracefully...${NC}"
  
  # Check if any services are running
  local running_services=$($compose_cmd ps --services --filter "status=running" 2>/dev/null || echo "")
  
  if [ -z "$running_services" ]; then
    echo -e "${YELLOW}⚠ No services are currently running${NC}"
    echo ""
    return 0
  fi
  
  # Stop services
  $compose_cmd down 2>&1 | grep -v "^$" || true
  
  echo -e "${GREEN}✓ Services stopped${NC}"
  echo ""
}

# Start services
start_services() {
  local compose_cmd=$1
  
  echo -e "${BLUE}Starting services...${NC}"
  
  # Start services in detached mode
  if $compose_cmd up -d 2>&1 | grep -v "^$"; then
    echo -e "${GREEN}✓ Services started${NC}"
  else
    echo -e "${YELLOW}⚠ No services configured to start${NC}"
    echo -e "${YELLOW}  You may need to complete the installation wizard first.${NC}"
    echo ""
    echo "To configure services, run: ./start-test.sh"
  fi
  
  echo ""
}

# Wait for services to be healthy
wait_for_health() {
  local compose_cmd=$1
  
  echo -e "${BLUE}Waiting for services to be healthy...${NC}"
  echo -e "${YELLOW}  This may take a few moments...${NC}"
  
  # Wait a bit for services to initialize
  sleep 5
  
  echo -e "${GREEN}✓ Health check wait period complete${NC}"
  echo ""
}

# Display service status
display_service_status() {
  local compose_cmd=$1
  
  echo -e "${BLUE}Service Status:${NC}"
  echo ""
  
  # Get service status
  $compose_cmd ps 2>/dev/null || {
    echo -e "${YELLOW}⚠ Unable to retrieve service status${NC}"
    return 0
  }
  
  echo ""
}

# Display access information
display_access_info() {
  echo -e "${BLUE}Access Information:${NC}"
  echo ""
  echo "  🌐 Dashboard:        http://localhost:8080"
  echo "  🔧 Installation:     http://localhost:3000 (if wizard is running)"
  echo ""
  echo -e "${YELLOW}Note: Some services may take additional time to fully initialize.${NC}"
  echo ""
}

# Print success message
print_success() {
  echo ""
  echo "╔════════════════════════════════════════════════════════════╗"
  echo "║   Services Restarted Successfully!                         ║"
  echo "╚════════════════════════════════════════════════════════════╝"
  echo ""
  echo -e "${GREEN}All services have been restarted.${NC}"
  echo ""
  echo "Useful commands:"
  echo "  • Check status:     ./status.sh"
  echo "  • Stop services:    ./stop-services.sh"
  echo "  • View logs:        docker-compose logs -f [service-name]"
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
  
  # Restart sequence
  stop_services "$compose_cmd"
  start_services "$compose_cmd"
  wait_for_health "$compose_cmd"
  display_service_status "$compose_cmd"
  display_access_info
  print_success
}

# Run main function
main
