#!/bin/bash
# Kaspa All-in-One Test Release - Quick Start
# Version: v0.9.0-test

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Global variables
PLATFORM=""
WIZARD_PORT=3000
WIZARD_PID_FILE="/tmp/kaspa-wizard.pid"
WIZARD_LOG_FILE="/tmp/kaspa-wizard.log"

# Print banner
print_banner() {
  echo ""
  echo "╔════════════════════════════════════════════════════════════╗"
  echo "║   Kaspa All-in-One - Test Release v0.9.0                  ║"
  echo "║   Thank you for testing!                                   ║"
  echo "╚════════════════════════════════════════════════════════════╝"
  echo ""
}

# Detect platform
detect_platform() {
  echo -e "${BLUE}Detecting platform...${NC}"
  
  # Check for WSL first (before generic Linux check)
  if grep -qEi "(Microsoft|WSL)" /proc/version 2>/dev/null; then
    PLATFORM="windows-wsl"
    echo -e "${GREEN}✓ Platform: Windows/WSL${NC}"
  elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    PLATFORM="linux"
    echo -e "${GREEN}✓ Platform: Linux${NC}"
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    PLATFORM="macos"
    echo -e "${GREEN}✓ Platform: macOS${NC}"
  elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    PLATFORM="windows-wsl"
    echo -e "${GREEN}✓ Platform: Windows (Git Bash/Cygwin)${NC}"
  else
    PLATFORM="unknown"
    echo -e "${YELLOW}⚠ Platform: Unknown ($OSTYPE)${NC}"
    echo -e "${YELLOW}  Attempting to continue...${NC}"
  fi
  echo ""
}

# Show Docker installation instructions
show_docker_install_instructions() {
  echo ""
  echo -e "${YELLOW}Docker Installation Instructions:${NC}"
  echo ""
  
  case "$PLATFORM" in
    "linux")
      echo "For Ubuntu/Debian:"
      echo "  curl -fsSL https://get.docker.com -o get-docker.sh"
      echo "  sudo sh get-docker.sh"
      echo "  sudo usermod -aG docker \$USER"
      echo "  newgrp docker"
      echo ""
      echo "For other distributions, visit:"
      echo "  https://docs.docker.com/engine/install/"
      ;;
    "macos")
      echo "Install Docker Desktop for Mac:"
      echo "  https://docs.docker.com/desktop/install/mac-install/"
      echo ""
      echo "Or use Homebrew:"
      echo "  brew install --cask docker"
      ;;
    "windows-wsl")
      echo "Install Docker Desktop for Windows:"
      echo "  https://docs.docker.com/desktop/install/windows-install/"
      echo ""
      echo "Make sure WSL2 integration is enabled in Docker Desktop settings."
      ;;
    *)
      echo "Visit: https://docs.docker.com/get-docker/"
      ;;
  esac
  echo ""
}

# Show Docker Compose installation instructions
show_docker_compose_instructions() {
  echo ""
  echo -e "${YELLOW}Docker Compose Installation Instructions:${NC}"
  echo ""
  
  case "$PLATFORM" in
    "linux")
      echo "Docker Compose v2 is usually included with Docker."
      echo "If not installed, run:"
      echo "  sudo apt-get update"
      echo "  sudo apt-get install docker-compose-plugin"
      echo ""
      echo "Or visit:"
      echo "  https://docs.docker.com/compose/install/"
      ;;
    "macos"|"windows-wsl")
      echo "Docker Compose is included with Docker Desktop."
      echo "Make sure Docker Desktop is installed and running."
      ;;
    *)
      echo "Visit: https://docs.docker.com/compose/install/"
      ;;
  esac
  echo ""
}

# Show Node.js installation instructions
show_nodejs_instructions() {
  echo ""
  echo -e "${YELLOW}Node.js Installation Instructions:${NC}"
  echo ""
  
  case "$PLATFORM" in
    "linux")
      echo "Using NodeSource repository (recommended):"
      echo "  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -"
      echo "  sudo apt-get install -y nodejs"
      echo ""
      echo "Or using nvm:"
      echo "  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
      echo "  nvm install 18"
      ;;
    "macos")
      echo "Using Homebrew (recommended):"
      echo "  brew install node@18"
      echo ""
      echo "Or using nvm:"
      echo "  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
      echo "  nvm install 18"
      ;;
    "windows-wsl")
      echo "Inside WSL, use nvm:"
      echo "  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
      echo "  nvm install 18"
      echo ""
      echo "Or download from:"
      echo "  https://nodejs.org/en/download/"
      ;;
    *)
      echo "Visit: https://nodejs.org/en/download/"
      ;;
  esac
  echo ""
}

# Check prerequisites
check_prerequisites() {
  echo -e "${BLUE}Checking prerequisites...${NC}"
  local all_met=true
  
  # Check Docker
  if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker not found${NC}"
    show_docker_install_instructions
    all_met=false
  else
    DOCKER_VERSION=$(docker --version 2>/dev/null || echo "unknown")
    echo -e "${GREEN}✓ Docker found: ${DOCKER_VERSION}${NC}"
    
    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
      echo -e "${RED}✗ Docker daemon is not running${NC}"
      echo -e "${YELLOW}  Please start Docker and try again.${NC}"
      all_met=false
    fi
  fi
  
  # Check Docker Compose
  if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null 2>&1; then
    echo -e "${RED}✗ Docker Compose not found${NC}"
    show_docker_compose_instructions
    all_met=false
  else
    if command -v docker-compose &> /dev/null; then
      COMPOSE_VERSION=$(docker-compose --version 2>/dev/null || echo "unknown")
    else
      COMPOSE_VERSION=$(docker compose version 2>/dev/null || echo "unknown")
    fi
    echo -e "${GREEN}✓ Docker Compose found: ${COMPOSE_VERSION}${NC}"
  fi
  
  # Check Node.js
  if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js not found${NC}"
    show_nodejs_instructions
    all_met=false
  else
    NODE_VERSION=$(node --version 2>/dev/null || echo "unknown")
    NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d'v' -f2 | cut -d'.' -f1)
    
    if [ "$NODE_MAJOR" -lt 18 ] 2>/dev/null; then
      echo -e "${RED}✗ Node.js version 18+ required (found: ${NODE_VERSION})${NC}"
      show_nodejs_instructions
      all_met=false
    else
      echo -e "${GREEN}✓ Node.js found: ${NODE_VERSION}${NC}"
    fi
  fi
  
  echo ""
  
  if [ "$all_met" = false ]; then
    echo -e "${RED}Prerequisites not met. Please install missing components and try again.${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}✓ All prerequisites met!${NC}"
  echo ""
}

# Install wizard dependencies
install_wizard_deps() {
  echo -e "${BLUE}Installing wizard dependencies...${NC}"
  
  if [ ! -d "services/wizard/backend" ]; then
    echo -e "${RED}✗ Wizard backend directory not found${NC}"
    echo -e "${RED}  Make sure you're running this script from the project root.${NC}"
    exit 1
  fi
  
  cd services/wizard/backend
  
  # Check if package.json exists
  if [ ! -f "package.json" ]; then
    echo -e "${RED}✗ package.json not found in services/wizard/backend${NC}"
    cd ../../..
    exit 1
  fi
  
  # Check if dependencies are already installed
  if [ -d "node_modules" ] && [ -n "$(ls -A node_modules 2>/dev/null)" ]; then
    echo -e "${GREEN}✓ Dependencies already installed${NC}"
    echo ""
    cd ../../..
    return 0
  fi
  
  # Install dependencies
  echo "  Running npm install..."
  if npm install --omit=dev 2>&1 | tee /tmp/npm-install.log | grep -q "added\|up to date"; then
    cd ../../..
    echo -e "${GREEN}✓ Dependencies installed${NC}"
    echo ""
  else
    cd ../../..
    echo -e "${RED}✗ Failed to install dependencies${NC}"
    echo ""
    echo -e "${YELLOW}Error details:${NC}"
    tail -20 /tmp/npm-install.log
    echo ""
    echo -e "${YELLOW}To install manually, try:${NC}"
    echo -e "${YELLOW}  cd services/wizard/backend && npm install --omit=dev${NC}"
    exit 1
  fi
}

# Check if wizard is already running
check_wizard_running() {
  if [ -f "$WIZARD_PID_FILE" ]; then
    EXISTING_PID=$(cat "$WIZARD_PID_FILE")
    if ps -p "$EXISTING_PID" > /dev/null 2>&1; then
      echo -e "${YELLOW}⚠ Wizard is already running (PID: $EXISTING_PID)${NC}"
      echo -e "${YELLOW}  Access it at: http://localhost:${WIZARD_PORT}${NC}"
      echo ""
      read -p "Stop existing wizard and start fresh? (y/N) " -n 1 -r
      echo
      if [[ $REPLY =~ ^[Yy]$ ]]; then
        kill "$EXISTING_PID" 2>/dev/null || true
        rm -f "$WIZARD_PID_FILE"
        sleep 2
      else
        open_browser "http://localhost:${WIZARD_PORT}"
        exit 0
      fi
    else
      # PID file exists but process is not running
      rm -f "$WIZARD_PID_FILE"
    fi
  fi
}

# Check for existing state
check_existing_state() {
  if [ -d ".kaspa-aio" ] || [ -f ".env" ]; then
    echo -e "${YELLOW}⚠ Found existing installation state${NC}"
    if [ -d ".kaspa-aio" ]; then
      echo -e "${YELLOW}  - .kaspa-aio/ directory exists${NC}"
    fi
    if [ -f ".env" ]; then
      echo -e "${YELLOW}  - .env file exists${NC}"
    fi
    echo ""
    echo -e "${YELLOW}This may cause the wizard to skip steps or show incorrect state.${NC}"
    echo ""
    read -p "Remove existing state and start fresh? (Y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
      echo -e "${BLUE}Removing existing state...${NC}"
      rm -rf .kaspa-aio
      rm -f .env
      echo -e "${GREEN}✓ State cleared${NC}"
      echo ""
    fi
  fi
}

# Start wizard
start_wizard() {
  echo -e "${BLUE}Starting Installation Wizard...${NC}"
  echo ""
  
  # Check for existing state
  check_existing_state
  
  # Check if wizard is already running
  check_wizard_running
  
  # Start wizard in background with TEST build mode
  cd services/wizard/backend
  BUILD_MODE=test nohup node src/server.js > "$WIZARD_LOG_FILE" 2>&1 &
  WIZARD_PID=$!
  echo $WIZARD_PID > "$WIZARD_PID_FILE"
  cd ../../..
  
  echo -e "${BLUE}Waiting for wizard to start...${NC}"
  
  # Wait for wizard to be ready (max 30 seconds)
  local max_attempts=60
  local attempt=0
  
  while [ $attempt -lt $max_attempts ]; do
    if curl -s "http://localhost:${WIZARD_PORT}/api/health" > /dev/null 2>&1; then
      echo -e "${GREEN}✓ Wizard is ready!${NC}"
      echo ""
      return 0
    fi
    sleep 0.5
    attempt=$((attempt + 1))
  done
  
  echo -e "${RED}✗ Wizard failed to start${NC}"
  echo -e "${YELLOW}Check logs at: ${WIZARD_LOG_FILE}${NC}"
  exit 1
}

# Open browser
open_browser() {
  local URL=$1
  
  echo -e "${BLUE}Opening browser...${NC}"
  
  case "$PLATFORM" in
    "macos")
      open "$URL" 2>/dev/null || echo -e "${YELLOW}Please open: ${URL}${NC}"
      ;;
    "linux")
      if command -v xdg-open &> /dev/null; then
        xdg-open "$URL" 2>/dev/null || echo -e "${YELLOW}Please open: ${URL}${NC}"
      else
        echo -e "${YELLOW}Please open: ${URL}${NC}"
      fi
      ;;
    "windows-wsl")
      if command -v cmd.exe &> /dev/null; then
        cmd.exe /c start "$URL" 2>/dev/null || echo -e "${YELLOW}Please open: ${URL}${NC}"
      else
        echo -e "${YELLOW}Please open: ${URL}${NC}"
      fi
      ;;
    *)
      echo -e "${YELLOW}Please open: ${URL}${NC}"
      ;;
  esac
}

# Print success message
print_success() {
  echo ""
  echo "╔════════════════════════════════════════════════════════════╗"
  echo "║   Wizard Started Successfully!                             ║"
  echo "║                                                             ║"
  echo "║   🌐 Access at: http://localhost:${WIZARD_PORT}                    ║"
  echo "║                                                             ║"
  echo "║   📖 Testing Instructions: See TESTING.md                  ║"
  echo "║   🐛 Report Issues: GitHub Issues                          ║"
  echo "║   💬 Discuss: GitHub Discussions                           ║"
  echo "║                                                             ║"
  echo "║   To stop the wizard: ./cleanup-test.sh                    ║"
  echo "╚════════════════════════════════════════════════════════════╝"
  echo ""
  echo -e "${GREEN}Follow the wizard to complete installation.${NC}"
  echo -e "${YELLOW}Need help? Check TESTING.md for detailed instructions.${NC}"
  echo ""
}

# Main execution
main() {
  print_banner
  detect_platform
  check_prerequisites
  install_wizard_deps
  start_wizard
  open_browser "http://localhost:${WIZARD_PORT}"
  print_success
}

# Run main function
main
