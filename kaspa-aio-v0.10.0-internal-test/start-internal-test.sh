#!/bin/bash
# Kaspa All-in-One v0.10.0 - Internal Testing Start Script
# Enhanced wizard + dashboard end-to-end testing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
WIZARD_PORT=3000
DASHBOARD_PORT=8080
TEST_LOG_DIR="./test-logs"
WIZARD_PID_FILE="/tmp/kaspa-wizard-internal.pid"
DASHBOARD_PID_FILE="/tmp/kaspa-dashboard-internal.pid"

print_banner() {
  echo ""
  echo "╔════════════════════════════════════════════════════════════╗"
  echo "║   Kaspa All-in-One v0.10.0 - Internal Testing            ║"
  echo "║   Wizard + Dashboard End-to-End Testing                   ║"
  echo "╚════════════════════════════════════════════════════════════╝"
  echo ""
}

# Create test log directory
setup_logging() {
  mkdir -p "$TEST_LOG_DIR"
  echo -e "${BLUE}Test logs will be saved to: $TEST_LOG_DIR${NC}"
  echo ""
}

# Check prerequisites
check_prerequisites() {
  echo -e "${BLUE}Checking prerequisites...${NC}"
  
  local all_met=true
  
  # Check Docker
  if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker not found${NC}"
    all_met=false
  else
    echo -e "${GREEN}✓ Docker found${NC}"
    if ! docker info &> /dev/null; then
      echo -e "${RED}✗ Docker daemon not running${NC}"
      all_met=false
    fi
  fi
  
  # Check Docker Compose
  if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null 2>&1; then
    echo -e "${RED}✗ Docker Compose not found${NC}"
    all_met=false
  else
    echo -e "${GREEN}✓ Docker Compose found${NC}"
  fi
  
  # Check Node.js
  if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js not found${NC}"
    all_met=false
  else
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ Node.js found: $NODE_VERSION${NC}"
  fi
  
  if [ "$all_met" = false ]; then
    echo -e "${RED}Prerequisites not met. Please install missing components.${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}✓ All prerequisites met${NC}"
  echo ""
}

# Start wizard
start_wizard() {
  echo -e "${BLUE}Starting Installation Wizard...${NC}"
  
  cd services/wizard/backend
  
  # Install dependencies if needed
  if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}Installing wizard dependencies...${NC}"
    npm install --omit=dev
  fi
  
  # Start wizard with internal testing mode
  BUILD_MODE=internal-test nohup node src/server.js > "$TEST_LOG_DIR/wizard.log" 2>&1 &
  WIZARD_PID=$!
  echo $WIZARD_PID > "$WIZARD_PID_FILE"
  
  cd ../../..
  
  # Wait for wizard to be ready
  echo -e "${BLUE}Waiting for wizard to start...${NC}"
  local max_attempts=60
  local attempt=0
  
  while [ $attempt -lt $max_attempts ]; do
    if curl -s "http://localhost:${WIZARD_PORT}/api/health" > /dev/null 2>&1; then
      echo -e "${GREEN}✓ Wizard ready at http://localhost:${WIZARD_PORT}${NC}"
      return 0
    fi
    sleep 0.5
    attempt=$((attempt + 1))
  done
  
  echo -e "${RED}✗ Wizard failed to start${NC}"
  exit 1
}

# Start dashboard
start_dashboard() {
  echo -e "${BLUE}Starting Management Dashboard...${NC}"
  
  cd services/dashboard/backend
  
  # Install dependencies if needed
  if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}Installing dashboard dependencies...${NC}"
    npm install --omit=dev
  fi
  
  # Start dashboard with internal testing mode
  BUILD_MODE=internal-test nohup node src/server.js > "$TEST_LOG_DIR/dashboard.log" 2>&1 &
  DASHBOARD_PID=$!
  echo $DASHBOARD_PID > "$DASHBOARD_PID_FILE"
  
  cd ../../..
  
  # Wait for dashboard to be ready
  echo -e "${BLUE}Waiting for dashboard to start...${NC}"
  local max_attempts=60
  local attempt=0
  
  while [ $attempt -lt $max_attempts ]; do
    if curl -s "http://localhost:${DASHBOARD_PORT}/api/health" > /dev/null 2>&1; then
      echo -e "${GREEN}✓ Dashboard ready at http://localhost:${DASHBOARD_PORT}${NC}"
      return 0
    fi
    sleep 0.5
    attempt=$((attempt + 1))
  done
  
  echo -e "${RED}✗ Dashboard failed to start${NC}"
  exit 1
}

# Print success message
print_success() {
  echo ""
  echo "╔════════════════════════════════════════════════════════════╗"
  echo "║   Internal Testing Environment Ready!                      ║"
  echo "║                                                            ║"
  echo "║   🎯 Wizard:    http://localhost:${WIZARD_PORT}                    ║"
  echo "║   📊 Dashboard: http://localhost:${DASHBOARD_PORT}                    ║"
  echo "║                                                            ║"
  echo "║   📁 Logs:      $TEST_LOG_DIR/                        ║"
  echo "║                                                            ║"
  echo "║   🛑 Stop:      ./stop-internal-test.sh                   ║"
  echo "║   🧹 Clean:     ./cleanup-internal-test.sh                ║"
  echo "║   📊 Status:    ./status-internal-test.sh                 ║"
  echo "╚════════════════════════════════════════════════════════════╝"
  echo ""
  echo -e "${GREEN}Ready for end-to-end testing!${NC}"
  echo ""
  echo -e "${YELLOW}Testing Workflow:${NC}"
  echo "1. Use wizard to install components"
  echo "2. Monitor services in dashboard"
  echo "3. Test reconfiguration (dashboard → wizard)"
  echo "4. Verify service management"
  echo "5. Test error scenarios"
  echo ""
}

# Main execution
main() {
  print_banner
  setup_logging
  check_prerequisites
  start_wizard
  start_dashboard
  print_success
}

main
