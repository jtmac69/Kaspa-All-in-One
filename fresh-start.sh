#!/bin/bash
# Kaspa All-in-One Test Release - Fresh Start
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
  echo "║   Kaspa All-in-One - Fresh Start                          ║"
  echo "║   Version: v0.9.0-test                                     ║"
  echo "╚════════════════════════════════════════════════════════════╝"
  echo ""
}

# Explain fresh start
explain_fresh_start() {
  echo -e "${BLUE}What is Fresh Start?${NC}"
  echo ""
  echo "Fresh Start removes all Docker containers to give you a clean slate"
  echo "for testing, while preserving your wizard state and configuration files."
  echo ""
  echo -e "${GREEN}What will be preserved:${NC}"
  echo "  • Wizard state and configuration"
  echo "  • Installation settings"
  echo "  • Configuration backups"
  echo ""
  echo -e "${YELLOW}What will be removed:${NC}"
  echo "  • All Docker containers"
  echo "  • Optionally: Docker volumes (container data)"
  echo ""
  echo -e "${BLUE}Use Fresh Start when you want to:${NC}"
  echo "  • Test the same installation scenario again"
  echo "  • Recover from container issues"
  echo "  • Start services from scratch without losing configuration"
  echo ""
  echo -e "${YELLOW}Note: For complete removal, use ./cleanup-test.sh instead${NC}"
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

# Confirm fresh start
confirm_fresh_start() {
  local remove_volumes=$1
  
  echo -e "${YELLOW}⚠ Confirmation Required${NC}"
  echo ""
  
  if [ "$remove_volumes" = "yes" ]; then
    echo -e "${RED}This will remove all containers AND volumes (all container data).${NC}"
    echo ""
    echo "You will lose:"
    echo "  • All blockchain sync progress"
    echo "  • All database data"
    echo "  • All container-stored data"
    echo ""
    echo "You will keep:"
    echo "  • Wizard state and configuration"
    echo "  • Installation settings"
  else
    echo -e "${BLUE}This will remove all containers but preserve volumes (container data).${NC}"
    echo ""
    echo "You will keep:"
    echo "  • Blockchain sync progress"
    echo "  • Database data"
    echo "  • Wizard state and configuration"
    echo "  • Installation settings"
  fi
  
  echo ""
  read -p "Continue with fresh start? (y/N) " -n 1 -r
  echo
  
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${BLUE}Fresh start cancelled.${NC}"
    echo ""
    exit 0
  fi
  
  echo ""
}

# Stop and remove containers
remove_containers() {
  local compose_cmd=$1
  local remove_volumes=$2
  
  echo -e "${BLUE}Stopping and removing containers...${NC}"
  
  # Check if any containers exist
  local existing_containers=$($compose_cmd ps -a --services 2>/dev/null || echo "")
  
  if [ -z "$existing_containers" ]; then
    echo -e "${YELLOW}⚠ No containers found via docker-compose${NC}"
    
    # Check for containers by name patterns (in case they're running outside compose)
    local manual_containers=$(docker ps -a \( --filter "name=kaspa-" -o --filter "name=k-indexer" -o --filter "name=kasia-indexer" -o --filter "name=k-social-db" -o --filter "name=simply-kaspa" \) --format "{{.Names}}" 2>/dev/null)
    
    if [ -n "$manual_containers" ]; then
      echo -e "${YELLOW}Found containers running outside docker-compose:${NC}"
      echo "$manual_containers" | while read container; do
        echo "  • $container"
      done
      echo ""
      read -p "Stop and remove these containers? (Y/n) " -n 1 -r
      echo
      if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        echo -e "${BLUE}Stopping and removing manual containers...${NC}"
        echo "$manual_containers" | xargs docker stop 2>/dev/null || true
        if [ "$remove_volumes" = "yes" ]; then
          echo "$manual_containers" | xargs docker rm -v 2>/dev/null || true
        else
          echo "$manual_containers" | xargs docker rm 2>/dev/null || true
        fi
        echo -e "${GREEN}✓ Manual containers removed${NC}"
      fi
    else
      echo -e "${GREEN}✓ No containers found${NC}"
    fi
    echo ""
    return 0
  fi
  
  # Remove containers with or without volumes using docker-compose
  if [ "$remove_volumes" = "yes" ]; then
    echo -e "${YELLOW}  Removing containers and volumes...${NC}"
    # Try with --profile "*" first, fall back to regular down
    $compose_cmd --profile "*" down -v 2>&1 | grep -v "^$" || $compose_cmd down -v 2>&1 | grep -v "^$" || true
    echo -e "${GREEN}✓ Containers and volumes removed${NC}"
  else
    echo -e "${YELLOW}  Removing containers (preserving volumes)...${NC}"
    # Try with --profile "*" first, fall back to regular down
    $compose_cmd --profile "*" down 2>&1 | grep -v "^$" || $compose_cmd down 2>&1 | grep -v "^$" || true
    echo -e "${GREEN}✓ Containers removed (volumes preserved)${NC}"
  fi
  
  echo ""
}

# Display preserved items
display_preserved_items() {
  echo -e "${BLUE}Preserved Configuration:${NC}"
  echo ""
  
  local items_found=false
  
  if [ -d ".kaspa-aio" ]; then
    echo -e "  ${GREEN}✓${NC} .kaspa-aio/ (wizard state)"
    items_found=true
  fi
  
  if [ -d ".kaspa-backups" ]; then
    echo -e "  ${GREEN}✓${NC} .kaspa-backups/ (configuration backups)"
    items_found=true
  fi
  
  if [ -f ".env" ]; then
    echo -e "  ${GREEN}✓${NC} .env (environment configuration)"
    items_found=true
  fi
  
  if [ -f "docker-compose.override.yml" ]; then
    echo -e "  ${GREEN}✓${NC} docker-compose.override.yml (service configuration)"
    items_found=true
  fi
  
  if [ "$items_found" = false ]; then
    echo -e "  ${YELLOW}⚠${NC} No configuration files found"
  fi
  
  echo ""
}

# Print next steps
print_next_steps() {
  echo ""
  echo "╔════════════════════════════════════════════════════════════╗"
  echo "║   Fresh Start Complete!                                    ║"
  echo "╚════════════════════════════════════════════════════════════╝"
  echo ""
  echo -e "${GREEN}✓ All containers have been removed${NC}"
  echo -e "${BLUE}✓ Configuration and wizard state preserved${NC}"
  echo ""
  echo "Next steps:"
  echo ""
  echo "  1. Start the wizard:"
  echo "     ${GREEN}./start-test.sh${NC}"
  echo ""
  echo "  2. The wizard will detect your existing configuration"
  echo ""
  echo "  3. You can:"
  echo "     • Reinstall with the same settings"
  echo "     • Modify your configuration"
  echo "     • Choose a different profile"
  echo ""
  echo "Other useful commands:"
  echo "  • Check status:        ./status.sh"
  echo "  • Complete cleanup:    ./cleanup-test.sh"
  echo ""
}

# Main execution
main() {
  print_banner
  explain_fresh_start
  
  # Check prerequisites
  check_compose_file
  
  # Detect compose command
  local compose_cmd=$(detect_compose_command)
  echo -e "${GREEN}✓ Using: $compose_cmd${NC}"
  echo ""
  
  # Ask about volume removal
  echo -e "${BLUE}Volume Options:${NC}"
  echo ""
  echo "Do you want to remove data volumes?"
  echo ""
  echo "  • ${GREEN}No (recommended)${NC}: Keep blockchain sync progress and database data"
  echo "  • ${YELLOW}Yes${NC}: Remove all data (start completely fresh)"
  echo ""
  read -p "Remove data volumes? (y/N) " -n 1 -r
  echo
  echo ""
  
  local remove_volumes="no"
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    remove_volumes="yes"
  fi
  
  # Confirm action
  confirm_fresh_start "$remove_volumes"
  
  # Execute fresh start
  remove_containers "$compose_cmd" "$remove_volumes"
  display_preserved_items
  print_next_steps
}

# Run main function
main
