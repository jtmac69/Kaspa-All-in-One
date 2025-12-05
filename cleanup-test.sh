#!/bin/bash
# Kaspa All-in-One Test Release - Cleanup Script
# Version: v0.9.0-test

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
  echo "║   Version: v0.9.0-test                                     ║"
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
    $compose_cmd down -v 2>/dev/null || true
    echo -e "${GREEN}✓ Containers stopped and volumes removed${NC}"
  else
    echo -e "${BLUE}Stopping containers (preserving volumes)...${NC}"
    $compose_cmd down 2>/dev/null || true
    echo -e "${GREEN}✓ Containers stopped (volumes preserved)${NC}"
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
  echo -e "${GREEN}Thank you for testing Kaspa All-in-One!${NC}"
  echo -e "${BLUE}Your feedback helps make the project better.${NC}"
  echo ""
  echo "To provide feedback:"
  echo "  🐛 Report bugs: https://github.com/[repo]/issues"
  echo "  💬 Discuss: https://github.com/[repo]/discussions"
  echo ""
  echo "To test again:"
  echo "  ./start-test.sh"
  echo ""
}

# Main execution
main() {
  print_banner
  confirm_cleanup
  stop_wizard
  stop_docker_containers
  remove_temp_files
  remove_data_directories
  print_summary
}

# Run main function
main
