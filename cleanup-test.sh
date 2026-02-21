#!/bin/bash
# Kaspa All-in-One Test Release - Cleanup Script
# Version: v0.9.1

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Global variables
WIZARD_PID_FILE="/tmp/kaspa-wizard.pid"
WIZARD_LOG_FILE="/tmp/kaspa-wizard.log"
DATA_DIR=".kaspa-aio"
BACKUP_DIR=".kaspa-backups"

# Print banner
print_banner() {
  echo ""
  echo "╔════════════════════════════════════════════════════════════╗"
  echo "║   Kaspa All-in-One - Test Cleanup                         ║"
  echo "║   Version: v0.9.1                                     ║"
  echo "╚════════════════════════════════════════════════════════════╝"
  echo ""
}

# Confirm cleanup
confirm_cleanup() {
  echo -e "${RED}⚠ WARNING: COMPLETE TEST INSTALLATION REMOVAL${NC}"
  echo ""
  echo -e "${YELLOW}This script is for COMPLETELY REMOVING the test installation.${NC}"
  echo ""
  echo "Use this script when you want to:"
  echo "  • Completely uninstall the test release"
  echo "  • Start fresh with a clean installation"
  echo "  • Remove all test components from your system"
  echo ""
  echo -e "${BLUE}If you want to reconfigure or adjust your installation:${NC}"
  echo "  • Just run ./start-test.sh again"
  echo "  • The wizard will detect your existing installation"
  echo "  • You can modify settings without losing data"
  echo ""
  echo -e "${YELLOW}This cleanup will:${NC}"
  echo "  • Stop the installation wizard"
  echo "  • Stop all Docker containers"
  echo "  • Remove Docker volumes (optional)"
  echo "  • Remove temporary files and logs"
  echo "  • Optionally remove all data directories"
  echo ""
  
  read -p "Do you want to COMPLETELY REMOVE the test installation? (y/N) " -n 1 -r
  echo
  
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${BLUE}Cleanup cancelled.${NC}"
    echo ""
    echo "To reconfigure your installation, run: ./start-test.sh"
    echo ""
    exit 0
  fi
  
  echo ""
}

# Stop wizard process
stop_wizard() {
  echo -e "${BLUE}Stopping wizard...${NC}"
  
  if [ -f "$WIZARD_PID_FILE" ]; then
    WIZARD_PID=$(cat "$WIZARD_PID_FILE")
    
    if ps -p "$WIZARD_PID" > /dev/null 2>&1; then
      kill "$WIZARD_PID" 2>/dev/null || true
      
      # Wait for process to stop (max 5 seconds)
      local attempt=0
      while [ $attempt -lt 10 ]; do
        if ! ps -p "$WIZARD_PID" > /dev/null 2>&1; then
          break
        fi
        sleep 0.5
        attempt=$((attempt + 1))
      done
      
      # Force kill if still running
      if ps -p "$WIZARD_PID" > /dev/null 2>&1; then
        kill -9 "$WIZARD_PID" 2>/dev/null || true
      fi
      
      echo -e "${GREEN}✓ Wizard stopped (PID: $WIZARD_PID)${NC}"
    else
      echo -e "${YELLOW}⚠ Wizard process not running${NC}"
    fi
    
    rm -f "$WIZARD_PID_FILE"
  else
    echo -e "${YELLOW}⚠ Wizard PID file not found${NC}"
  fi
  
  echo ""
}

# Stop Docker containers
stop_docker_containers() {
  echo -e "${BLUE}Stopping Docker containers...${NC}"
  
  # Check if docker-compose.yml exists
  if [ ! -f "docker-compose.yml" ]; then
    echo -e "${YELLOW}⚠ docker-compose.yml not found${NC}"
    echo -e "${YELLOW}  Skipping Docker cleanup${NC}"
    echo ""
    return 0
  fi
  
  # Check if Docker is available
  if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}⚠ Docker not found${NC}"
    echo -e "${YELLOW}  Skipping Docker cleanup${NC}"
    echo ""
    return 0
  fi
  
  # Stop containers using docker-compose or docker compose
  local compose_cmd=""
  if command -v docker-compose &> /dev/null; then
    compose_cmd="docker-compose"
  elif docker compose version &> /dev/null 2>&1; then
    compose_cmd="docker compose"
  else
    echo -e "${YELLOW}⚠ Docker Compose not found${NC}"
    echo -e "${YELLOW}  Skipping Docker cleanup${NC}"
    echo ""
    return 0
  fi
  
  # Ask about removing volumes
  echo ""
  read -p "Remove Docker volumes? This will delete all container data. (y/N) " -n 1 -r
  echo
  
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Stopping containers and removing volumes...${NC}"
    # Stop all profiles to ensure we catch everything
    $compose_cmd --profile "*" down -v 2>/dev/null || $compose_cmd down -v 2>/dev/null || true
    echo -e "${GREEN}✓ Containers stopped and volumes removed${NC}"
  else
    echo -e "${BLUE}Stopping containers (preserving volumes)...${NC}"
    # Stop all profiles to ensure we catch everything
    $compose_cmd --profile "*" down 2>/dev/null || $compose_cmd down 2>/dev/null || true
    echo -e "${GREEN}✓ Containers stopped (volumes preserved)${NC}"
  fi
  
  # Also stop any remaining containers by name patterns (covers all Kaspa-related containers)
  echo -e "${BLUE}Checking for any remaining Kaspa-related containers...${NC}"
  local remaining_containers=$(docker ps -a --filter "name=kaspa-" --filter "name=k-indexer" --filter "name=kasia-indexer" --filter "name=k-social-db" --filter "name=simply-kaspa" --format "{{.Names}}" 2>/dev/null)
  if [ -n "$remaining_containers" ]; then
    echo -e "${YELLOW}Found remaining containers:${NC}"
    echo "$remaining_containers" | while read container; do
      echo "  • $container"
    done
    echo ""
    read -p "Stop and remove these containers too? (Y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
      echo "$remaining_containers" | xargs docker stop 2>/dev/null || true
      echo "$remaining_containers" | xargs docker rm 2>/dev/null || true
      echo -e "${GREEN}✓ Removed all remaining containers${NC}"
    fi
  fi
  
  echo ""
}

# Enhanced container cleanup - handles stuck containers and conflicts
cleanup_stuck_containers() {
  echo -e "${BLUE}Performing enhanced container cleanup...${NC}"
  
  # Check if Docker is available
  if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}⚠ Docker not found, skipping container cleanup${NC}"
    echo ""
    return 0
  fi
  
  local containers_cleaned=0
  
  # 1. Find and remove containers in "Created" state (stuck containers)
  echo -e "${BLUE}Checking for stuck containers...${NC}"
  local stuck_containers=$(docker ps -a --filter "status=created" \( --filter "name=kaspa-" -o --filter "name=k-indexer" -o --filter "name=kasia-indexer" -o --filter "name=k-social-db" -o --filter "name=simply-kaspa" \) --format "{{.Names}}" 2>/dev/null)
  
  if [ -n "$stuck_containers" ]; then
    echo -e "${YELLOW}Found containers stuck in 'Created' state:${NC}"
    echo "$stuck_containers" | while read container; do
      echo "  • $container"
    done
    
    echo -e "${BLUE}Removing stuck containers...${NC}"
    echo "$stuck_containers" | while read container; do
      if docker rm "$container" 2>/dev/null; then
        echo -e "${GREEN}✓ Removed stuck container: $container${NC}"
        containers_cleaned=$((containers_cleaned + 1))
      else
        echo -e "${YELLOW}⚠ Could not remove: $container${NC}"
      fi
    done
  else
    echo -e "${GREEN}✓ No stuck containers found${NC}"
  fi
  
  # 2. Find and remove containers in "Exited" state with non-zero exit codes
  echo -e "${BLUE}Checking for failed containers...${NC}"
  local failed_containers=$(docker ps -a --filter "status=exited" \( --filter "name=kaspa-" -o --filter "name=k-indexer" -o --filter "name=kasia-indexer" -o --filter "name=k-social-db" -o --filter "name=simply-kaspa" \) --format "{{.Names}}" 2>/dev/null)
  
  if [ -n "$failed_containers" ]; then
    echo -e "${YELLOW}Found exited containers:${NC}"
    echo "$failed_containers" | while read container; do
      local exit_code=$(docker inspect --format='{{.State.ExitCode}}' "$container" 2>/dev/null)
      echo "  • $container (exit code: $exit_code)"
    done
    
    echo -e "${BLUE}Removing exited containers...${NC}"
    echo "$failed_containers" | while read container; do
      if docker rm "$container" 2>/dev/null; then
        echo -e "${GREEN}✓ Removed exited container: $container${NC}"
        containers_cleaned=$((containers_cleaned + 1))
      else
        echo -e "${YELLOW}⚠ Could not remove: $container${NC}"
      fi
    done
  else
    echo -e "${GREEN}✓ No failed containers found${NC}"
  fi
  
  # 3. Check for any remaining Kaspa-related containers in unusual states
  echo -e "${BLUE}Checking for containers in other states...${NC}"
  local other_containers=$(docker ps -a \( --filter "name=kaspa-" -o --filter "name=k-indexer" -o --filter "name=kasia-indexer" -o --filter "name=k-social-db" -o --filter "name=simply-kaspa" \) --format "{{.Names}} {{.Status}}" 2>/dev/null)
  
  if [ -n "$other_containers" ]; then
    echo -e "${YELLOW}Found other containers:${NC}"
    echo "$other_containers" | while IFS=' ' read -r container status; do
      echo "  • $container ($status)"
    done
    
    echo ""
    read -p "Force remove ALL remaining containers? (y/N) " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      echo -e "${BLUE}Force removing all containers...${NC}"
      local all_containers=$(docker ps -a \( --filter "name=kaspa-" -o --filter "name=k-indexer" -o --filter "name=kasia-indexer" -o --filter "name=k-social-db" -o --filter "name=simply-kaspa" \) --format "{{.Names}}" 2>/dev/null)
      
      if [ -n "$all_containers" ]; then
        # Stop containers first
        echo "$all_containers" | xargs docker stop 2>/dev/null || true
        # Then remove them
        echo "$all_containers" | xargs docker rm -f 2>/dev/null || true
        echo -e "${GREEN}✓ Force removed all containers${NC}"
        containers_cleaned=$((containers_cleaned + $(echo "$all_containers" | wc -l)))
      fi
    else
      echo -e "${BLUE}Skipping force removal${NC}"
    fi
  else
    echo -e "${GREEN}✓ No other containers found${NC}"
  fi
  
  # 4. Clean up any orphaned networks
  echo -e "${BLUE}Checking for orphaned networks...${NC}"
  local kaspa_networks=$(docker network ls --filter "name=kaspa" --format "{{.Name}}" 2>/dev/null)
  
  if [ -n "$kaspa_networks" ]; then
    echo -e "${YELLOW}Found Kaspa networks:${NC}"
    echo "$kaspa_networks" | while read network; do
      echo "  • $network"
    done
    
    echo ""
    read -p "Remove Kaspa networks? (y/N) " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      echo -e "${BLUE}Removing Kaspa networks...${NC}"
      echo "$kaspa_networks" | while read network; do
        if docker network rm "$network" 2>/dev/null; then
          echo -e "${GREEN}✓ Removed network: $network${NC}"
        else
          echo -e "${YELLOW}⚠ Could not remove network: $network (may be in use)${NC}"
        fi
      done
    fi
  else
    echo -e "${GREEN}✓ No Kaspa networks found${NC}"
  fi
  
  # 5. Prune unused images (optional)
  echo -e "${BLUE}Checking for unused images...${NC}"
  local kaspa_images=$(docker images --filter "reference=*kaspa*" --filter "reference=*kasia*" --filter "reference=*k-indexer*" --filter "dangling=false" --format "{{.Repository}}:{{.Tag}}" 2>/dev/null)
  
  if [ -n "$kaspa_images" ]; then
    echo -e "${YELLOW}Found related images:${NC}"
    echo "$kaspa_images" | while read image; do
      echo "  • $image"
    done
    
    echo ""
    read -p "Remove unused images? This will force rebuild on next start. (y/N) " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      echo -e "${BLUE}Removing images...${NC}"
      echo "$kaspa_images" | while read image; do
        if docker rmi "$image" 2>/dev/null; then
          echo -e "${GREEN}✓ Removed image: $image${NC}"
        else
          echo -e "${YELLOW}⚠ Could not remove image: $image (may be in use)${NC}"
        fi
      done
    fi
  else
    echo -e "${GREEN}✓ No related images found${NC}"
  fi
  
  # Summary
  if [ $containers_cleaned -gt 0 ]; then
    echo -e "${GREEN}✓ Enhanced cleanup completed - removed $containers_cleaned containers${NC}"
  else
    echo -e "${GREEN}✓ Enhanced cleanup completed - system was already clean${NC}"
  fi
  
  echo ""
}

# Remove temporary files
remove_temp_files() {
  echo -e "${BLUE}Removing temporary files...${NC}"
  
  local files_removed=0
  
  # Remove wizard log
  if [ -f "$WIZARD_LOG_FILE" ]; then
    rm -f "$WIZARD_LOG_FILE"
    echo -e "${GREEN}✓ Removed wizard log${NC}"
    files_removed=$((files_removed + 1))
  fi
  
  # Remove wizard token file
  if [ -f ".wizard-token" ]; then
    rm -f ".wizard-token"
    echo -e "${GREEN}✓ Removed wizard token${NC}"
    files_removed=$((files_removed + 1))
  fi
  
  # Remove any .env backup files in root
  if ls .env.backup.* 1> /dev/null 2>&1; then
    rm -f .env.backup.*
    echo -e "${GREEN}✓ Removed .env backup files${NC}"
    files_removed=$((files_removed + 1))
  fi
  
  # Remove configuration files that trigger reconfiguration mode
  if [ -f ".env" ]; then
    rm -f ".env"
    echo -e "${GREEN}✓ Removed .env${NC}"
    files_removed=$((files_removed + 1))
  fi
  
  if [ -f "docker-compose.override.yml" ]; then
    rm -f "docker-compose.override.yml"
    echo -e "${GREEN}✓ Removed docker-compose.override.yml${NC}"
    files_removed=$((files_removed + 1))
  fi
  
  if [ $files_removed -eq 0 ]; then
    echo -e "${YELLOW}⚠ No temporary files found${NC}"
  fi
  
  echo ""
}

# Remove data directories
remove_data_directories() {
  echo -e "${YELLOW}⚠ Data Directory Removal${NC}"
  echo ""
  echo "The following directories contain installation data:"
  
  local dirs_exist=false
  
  if [ -d "$DATA_DIR" ]; then
    echo "  • $DATA_DIR (installation state, configuration)"
    dirs_exist=true
  fi
  
  if [ -d "$BACKUP_DIR" ]; then
    echo "  • $BACKUP_DIR (configuration backups)"
    dirs_exist=true
  fi
  
  if [ -d "logs" ]; then
    echo "  • logs (service logs)"
    dirs_exist=true
  fi
  
  if [ "$dirs_exist" = false ]; then
    echo -e "${YELLOW}⚠ No data directories found${NC}"
    echo ""
    return 0
  fi
  
  echo ""
  echo -e "${RED}WARNING: This will permanently delete all installation data!${NC}"
  echo "This includes:"
  echo "  • Installation state and configuration"
  echo "  • Configuration backups"
  echo "  • Service logs"
  echo "  • Any blockchain data (if stored locally)"
  echo ""
  
  read -p "Remove all data directories? (y/N) " -n 1 -r
  echo
  
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${BLUE}Removing data directories...${NC}"
    
    # Check if logs directory exists and needs sudo
    NEEDS_SUDO=false
    if [ -d "logs" ] && [ ! -w "logs" ]; then
      NEEDS_SUDO=true
      echo -e "${YELLOW}Note: Log files were created by Docker and require sudo to remove${NC}"
    fi
    
    if [ -d "$DATA_DIR" ]; then
      rm -rf "$DATA_DIR"
      echo -e "${GREEN}✓ Removed $DATA_DIR${NC}"
    fi
    
    if [ -d "$BACKUP_DIR" ]; then
      rm -rf "$BACKUP_DIR"
      echo -e "${GREEN}✓ Removed $BACKUP_DIR${NC}"
    fi
    
    if [ -d "logs" ]; then
      # Logs may be owned by Docker (root), so we need sudo
      if [ "$NEEDS_SUDO" = true ]; then
        echo -e "${BLUE}Removing logs (requires sudo)...${NC}"
        if sudo rm -rf logs; then
          echo -e "${GREEN}✓ Removed logs${NC}"
        else
          echo -e "${YELLOW}⚠ Could not remove logs${NC}"
          echo -e "${YELLOW}  Run manually: sudo rm -rf logs${NC}"
        fi
      else
        rm -rf logs
        echo -e "${GREEN}✓ Removed logs${NC}"
      fi
    fi
    
    echo -e "${GREEN}✓ All data directories removed${NC}"
  else
    echo -e "${BLUE}Data directories preserved:${NC}"
    
    if [ -d "$DATA_DIR" ]; then
      echo -e "  • $DATA_DIR"
    fi
    
    if [ -d "$BACKUP_DIR" ]; then
      echo -e "  • $BACKUP_DIR"
    fi
    
    if [ -d "logs" ]; then
      echo -e "  • logs"
    fi
  fi
  
  echo ""
}

# Print summary
print_summary() {
  echo ""
  echo "╔════════════════════════════════════════════════════════════╗"
  echo "║   Cleanup Complete!                                        ║"
  echo "╚════════════════════════════════════════════════════════════╝"
  echo ""
  echo -e "${GREEN}Enhanced cleanup completed successfully!${NC}"
  echo ""
  echo "The cleanup process has:"
  echo "  ✓ Stopped all running services"
  echo "  ✓ Removed stuck and failed containers"
  echo "  ✓ Cleaned up orphaned networks"
  echo "  ✓ Removed temporary files and logs"
  echo "  ✓ Ensured a clean state for fresh installation"
  echo ""
  echo -e "${BLUE}Your system is now ready for a fresh test installation.${NC}"
  echo ""
  echo -e "${GREEN}Thank you for testing Kaspa All-in-One!${NC}"
  echo -e "${BLUE}Your feedback helps make the project better.${NC}"
  echo ""
  echo "To provide feedback:"
  echo "  🐛 Report bugs: https://github.com/[repo]/issues"
  echo "  💬 Discuss: https://github.com/[repo]/discussions"
  echo ""
  echo "To start a fresh test:"
  echo "  ./start-test.sh"
  echo ""
}

# Main execution
main() {
  print_banner
  confirm_cleanup
  stop_wizard
  stop_docker_containers
  cleanup_stuck_containers
  remove_temp_files
  remove_data_directories
  print_summary
}

# Run main function
main
