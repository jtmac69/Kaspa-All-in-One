#!/bin/bash
# Create Kaspa All-in-One v0.10.0 Internal Testing Release Package
# This creates a comprehensive testing package for wizard + dashboard end-to-end testing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
RELEASE_VERSION="v0.10.0"
RELEASE_NAME="kaspa-aio-${RELEASE_VERSION}-internal-test"
RELEASE_DIR="${RELEASE_NAME}"
ARCHIVE_NAME="${RELEASE_NAME}.tar.gz"

print_banner() {
  echo ""
  echo "╔════════════════════════════════════════════════════════════╗"
  echo "║   Kaspa All-in-One ${RELEASE_VERSION} - Internal Test Release Creator  ║"
  echo "║   Wizard + Dashboard End-to-End Testing Package           ║"
  echo "╚════════════════════════════════════════════════════════════╝"
  echo ""
}

# Clean up any existing release directory
cleanup_existing() {
  if [ -d "$RELEASE_DIR" ]; then
    echo -e "${YELLOW}Removing existing release directory...${NC}"
    rm -rf "$RELEASE_DIR"
  fi
  
  if [ -f "$ARCHIVE_NAME" ]; then
    echo -e "${YELLOW}Removing existing archive...${NC}"
    rm -f "$ARCHIVE_NAME"
  fi
}

# Create release directory structure
create_structure() {
  echo -e "${BLUE}Creating release directory structure...${NC}"
  
  mkdir -p "$RELEASE_DIR"
  mkdir -p "$RELEASE_DIR/services/wizard"
  mkdir -p "$RELEASE_DIR/services/dashboard"
  mkdir -p "$RELEASE_DIR/scripts/testing"
  mkdir -p "$RELEASE_DIR/scripts/monitoring"
  mkdir -p "$RELEASE_DIR/config"
  mkdir -p "$RELEASE_DIR/docs/testing"
  
  echo -e "${GREEN}✓ Directory structure created${NC}"
}

# Copy core files
copy_core_files() {
  echo -e "${BLUE}Copying core files...${NC}"
  
  # Root configuration files
  cp docker-compose.yml "$RELEASE_DIR/"
  cp .env.example "$RELEASE_DIR/"
  
  # Documentation
  cp README.md "$RELEASE_DIR/"
  cp CONTRIBUTING.md "$RELEASE_DIR/"
  cp LICENSE "$RELEASE_DIR/"
  
  # Copy testing documentation if it exists
  if [ -f "TESTING.md" ]; then
    cp TESTING.md "$RELEASE_DIR/"
  fi
  
  if [ -f "KNOWN_ISSUES.md" ]; then
    cp KNOWN_ISSUES.md "$RELEASE_DIR/"
  fi
  
  echo -e "${GREEN}✓ Core files copied${NC}"
}

# Copy wizard service
copy_wizard() {
  echo -e "${BLUE}Copying wizard service...${NC}"
  
  if [ -d "services/wizard" ]; then
    cp -r services/wizard/* "$RELEASE_DIR/services/wizard/"
    
    # Remove development files
    find "$RELEASE_DIR/services/wizard" -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
    find "$RELEASE_DIR/services/wizard" -name ".git" -type d -exec rm -rf {} + 2>/dev/null || true
    find "$RELEASE_DIR/services/wizard" -name "*.log" -type f -delete 2>/dev/null || true
    
    echo -e "${GREEN}✓ Wizard service copied${NC}"
  else
    echo -e "${YELLOW}⚠ Wizard service directory not found${NC}"
  fi
}

# Copy dashboard service
copy_dashboard() {
  echo -e "${BLUE}Copying dashboard service...${NC}"
  
  if [ -d "services/dashboard" ]; then
    cp -r services/dashboard/* "$RELEASE_DIR/services/dashboard/"
    
    # Remove development files
    find "$RELEASE_DIR/services/dashboard" -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
    find "$RELEASE_DIR/services/dashboard" -name ".git" -type d -exec rm -rf {} + 2>/dev/null || true
    find "$RELEASE_DIR/services/dashboard" -name "*.log" -type f -delete 2>/dev/null || true
    
    echo -e "${GREEN}✓ Dashboard service copied${NC}"
  else
    echo -e "${YELLOW}⚠ Dashboard service directory not found${NC}"
  fi
}

# Copy existing scripts
copy_scripts() {
  echo -e "${BLUE}Copying management scripts...${NC}"
  
  # Copy existing scripts
  if [ -d "scripts" ]; then
    cp -r scripts/* "$RELEASE_DIR/scripts/"
  fi
  
  # Copy root-level scripts
  for script in *.sh; do
    if [ -f "$script" ]; then
      cp "$script" "$RELEASE_DIR/"
    fi
  done
  
  echo -e "${GREEN}✓ Scripts copied${NC}"
}

# Create enhanced testing scripts
create_testing_scripts() {
  echo -e "${BLUE}Creating enhanced testing scripts...${NC}"
  
  # Create the main test start script
  cat > "$RELEASE_DIR/start-internal-test.sh" << 'EOF'
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
EOF

  chmod +x "$RELEASE_DIR/start-internal-test.sh"
  
  echo -e "${GREEN}✓ Enhanced testing scripts created${NC}"
}

# Create stop script
create_stop_script() {
  cat > "$RELEASE_DIR/stop-internal-test.sh" << 'EOF'
#!/bin/bash
# Stop Internal Testing Environment

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

WIZARD_PID_FILE="/tmp/kaspa-wizard-internal.pid"
DASHBOARD_PID_FILE="/tmp/kaspa-dashboard-internal.pid"

echo -e "${BLUE}Stopping internal testing environment...${NC}"

# Stop wizard
if [ -f "$WIZARD_PID_FILE" ]; then
  WIZARD_PID=$(cat "$WIZARD_PID_FILE")
  if ps -p "$WIZARD_PID" > /dev/null 2>&1; then
    kill "$WIZARD_PID" 2>/dev/null || true
    echo -e "${GREEN}✓ Wizard stopped${NC}"
  fi
  rm -f "$WIZARD_PID_FILE"
fi

# Stop dashboard
if [ -f "$DASHBOARD_PID_FILE" ]; then
  DASHBOARD_PID=$(cat "$DASHBOARD_PID_FILE")
  if ps -p "$DASHBOARD_PID" > /dev/null 2>&1; then
    kill "$DASHBOARD_PID" 2>/dev/null || true
    echo -e "${GREEN}✓ Dashboard stopped${NC}"
  fi
  rm -f "$DASHBOARD_PID_FILE"
fi

# Stop any Docker containers
if [ -f "docker-compose.yml" ]; then
  if command -v docker-compose &> /dev/null; then
    docker-compose down 2>/dev/null || true
  elif docker compose version &> /dev/null 2>&1; then
    docker compose down 2>/dev/null || true
  fi
  echo -e "${GREEN}✓ Docker containers stopped${NC}"
fi

echo -e "${GREEN}✓ Internal testing environment stopped${NC}"
EOF

  chmod +x "$RELEASE_DIR/stop-internal-test.sh"
}

# Create status script
create_status_script() {
  cat > "$RELEASE_DIR/status-internal-test.sh" << 'EOF'
#!/bin/bash
# Check Internal Testing Environment Status

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

WIZARD_PID_FILE="/tmp/kaspa-wizard-internal.pid"
DASHBOARD_PID_FILE="/tmp/kaspa-dashboard-internal.pid"
WIZARD_PORT=3000
DASHBOARD_PORT=8080

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║   Internal Testing Environment Status                      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check wizard
echo -e "${BLUE}Wizard Status:${NC}"
if [ -f "$WIZARD_PID_FILE" ]; then
  WIZARD_PID=$(cat "$WIZARD_PID_FILE")
  if ps -p "$WIZARD_PID" > /dev/null 2>&1; then
    if curl -s "http://localhost:${WIZARD_PORT}/api/health" > /dev/null 2>&1; then
      echo -e "${GREEN}✓ Running and responding (PID: $WIZARD_PID)${NC}"
      echo -e "  URL: http://localhost:${WIZARD_PORT}"
    else
      echo -e "${YELLOW}⚠ Running but not responding (PID: $WIZARD_PID)${NC}"
    fi
  else
    echo -e "${RED}✗ Not running (stale PID file)${NC}"
    rm -f "$WIZARD_PID_FILE"
  fi
else
  echo -e "${RED}✗ Not running${NC}"
fi

echo ""

# Check dashboard
echo -e "${BLUE}Dashboard Status:${NC}"
if [ -f "$DASHBOARD_PID_FILE" ]; then
  DASHBOARD_PID=$(cat "$DASHBOARD_PID_FILE")
  if ps -p "$DASHBOARD_PID" > /dev/null 2>&1; then
    if curl -s "http://localhost:${DASHBOARD_PORT}/api/health" > /dev/null 2>&1; then
      echo -e "${GREEN}✓ Running and responding (PID: $DASHBOARD_PID)${NC}"
      echo -e "  URL: http://localhost:${DASHBOARD_PORT}"
    else
      echo -e "${YELLOW}⚠ Running but not responding (PID: $DASHBOARD_PID)${NC}"
    fi
  else
    echo -e "${RED}✗ Not running (stale PID file)${NC}"
    rm -f "$DASHBOARD_PID_FILE"
  fi
else
  echo -e "${RED}✗ Not running${NC}"
fi

echo ""

# Check Docker containers
echo -e "${BLUE}Docker Containers:${NC}"
if command -v docker &> /dev/null; then
  CONTAINERS=$(docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" --filter "name=kaspa-" 2>/dev/null)
  if [ -n "$CONTAINERS" ]; then
    echo "$CONTAINERS"
  else
    echo -e "${YELLOW}⚠ No Kaspa containers running${NC}"
  fi
else
  echo -e "${RED}✗ Docker not available${NC}"
fi

echo ""

# Check logs
echo -e "${BLUE}Recent Logs:${NC}"
if [ -d "test-logs" ]; then
  echo -e "${GREEN}✓ Log directory exists${NC}"
  echo "  Wizard log: test-logs/wizard.log"
  echo "  Dashboard log: test-logs/dashboard.log"
  
  # Show last few lines of each log
  if [ -f "test-logs/wizard.log" ]; then
    echo ""
    echo -e "${BLUE}Last 3 wizard log entries:${NC}"
    tail -3 test-logs/wizard.log 2>/dev/null || echo "  (empty)"
  fi
  
  if [ -f "test-logs/dashboard.log" ]; then
    echo ""
    echo -e "${BLUE}Last 3 dashboard log entries:${NC}"
    tail -3 test-logs/dashboard.log 2>/dev/null || echo "  (empty)"
  fi
else
  echo -e "${YELLOW}⚠ No log directory found${NC}"
fi

echo ""
EOF

  chmod +x "$RELEASE_DIR/status-internal-test.sh"
}

# Create cleanup script
create_cleanup_script() {
  cat > "$RELEASE_DIR/cleanup-internal-test.sh" << 'EOF'
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
EOF

  chmod +x "$RELEASE_DIR/cleanup-internal-test.sh"
}

# Create log inspection script
create_log_script() {
  cat > "$RELEASE_DIR/logs-internal-test.sh" << 'EOF'
#!/bin/bash
# View Internal Testing Logs

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

LOG_DIR="test-logs"

show_usage() {
  echo "Usage: $0 [wizard|dashboard|docker|all] [lines]"
  echo ""
  echo "Examples:"
  echo "  $0 wizard        # Show wizard logs"
  echo "  $0 dashboard 50  # Show last 50 dashboard log lines"
  echo "  $0 all           # Show all logs"
  echo "  $0 docker        # Show Docker container logs"
  echo ""
}

show_wizard_logs() {
  local lines=${1:-50}
  echo -e "${BLUE}Wizard Logs (last $lines lines):${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  if [ -f "$LOG_DIR/wizard.log" ]; then
    tail -n "$lines" "$LOG_DIR/wizard.log"
  else
    echo -e "${YELLOW}No wizard log found${NC}"
  fi
  echo ""
}

show_dashboard_logs() {
  local lines=${1:-50}
  echo -e "${BLUE}Dashboard Logs (last $lines lines):${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  if [ -f "$LOG_DIR/dashboard.log" ]; then
    tail -n "$lines" "$LOG_DIR/dashboard.log"
  else
    echo -e "${YELLOW}No dashboard log found${NC}"
  fi
  echo ""
}

show_docker_logs() {
  echo -e "${BLUE}Docker Container Logs:${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  if command -v docker &> /dev/null; then
    local containers=$(docker ps --filter "name=kaspa-" --format "{{.Names}}" 2>/dev/null)
    if [ -n "$containers" ]; then
      echo "$containers" | while read container; do
        echo -e "${GREEN}Container: $container${NC}"
        docker logs --tail 20 "$container" 2>&1 | head -20
        echo ""
      done
    else
      echo -e "${YELLOW}No Kaspa containers running${NC}"
    fi
  else
    echo -e "${RED}Docker not available${NC}"
  fi
  echo ""
}

# Main execution
case "${1:-all}" in
  "wizard")
    show_wizard_logs "${2:-50}"
    ;;
  "dashboard")
    show_dashboard_logs "${2:-50}"
    ;;
  "docker")
    show_docker_logs
    ;;
  "all")
    show_wizard_logs "${2:-20}"
    show_dashboard_logs "${2:-20}"
    show_docker_logs
    ;;
  "help"|"-h"|"--help")
    show_usage
    ;;
  *)
    echo -e "${RED}Unknown option: $1${NC}"
    echo ""
    show_usage
    exit 1
    ;;
esac
EOF

  chmod +x "$RELEASE_DIR/logs-internal-test.sh"
}

# Create testing documentation
create_testing_docs() {
  echo -e "${BLUE}Creating testing documentation...${NC}"
  
  cat > "$RELEASE_DIR/INTERNAL_TESTING_GUIDE.md" << 'EOF'
# Kaspa All-in-One v0.10.0 - Internal Testing Guide

## Overview

This is an internal testing package for end-to-end testing of the Kaspa All-in-One wizard and dashboard integration. It provides a complete testing environment for validating the installation workflow and service management capabilities.

## Quick Start

```bash
# Extract the package
tar -xzf kaspa-aio-v0.10.0-internal-test.tar.gz
cd kaspa-aio-v0.10.0-internal-test

# Start testing environment
./start-internal-test.sh

# Access interfaces
# Wizard: http://localhost:3000
# Dashboard: http://localhost:8080
```

## Testing Scripts

### Core Scripts

- **`start-internal-test.sh`** - Start wizard and dashboard for testing
- **`stop-internal-test.sh`** - Stop all testing services
- **`status-internal-test.sh`** - Check status of all components
- **`cleanup-internal-test.sh`** - Complete cleanup for fresh start
- **`logs-internal-test.sh`** - View and analyze logs

### Log Management

```bash
# View specific logs
./logs-internal-test.sh wizard      # Wizard logs
./logs-internal-test.sh dashboard   # Dashboard logs
./logs-internal-test.sh docker      # Container logs
./logs-internal-test.sh all         # All logs

# Specify number of lines
./logs-internal-test.sh wizard 100  # Last 100 wizard log lines
```

## End-to-End Testing Workflow

### 1. Initial Setup Testing

1. **Start Environment**
   ```bash
   ./start-internal-test.sh
   ```

2. **Verify Services**
   ```bash
   ./status-internal-test.sh
   ```

3. **Check Logs**
   ```bash
   ./logs-internal-test.sh all
   ```

### 2. Wizard Installation Testing

1. **Access Wizard**: http://localhost:3000
2. **Test Installation Flow**:
   - System requirements check
   - Profile selection
   - Configuration setup
   - Installation progress
   - Completion verification

3. **Monitor Installation**:
   ```bash
   # In another terminal
   ./logs-internal-test.sh wizard
   ```

### 3. Dashboard Monitoring Testing

1. **Access Dashboard**: http://localhost:8080
2. **Test Monitoring Features**:
   - Service status display
   - Resource monitoring
   - Log viewing
   - Service controls

3. **Verify Integration**:
   - Dashboard detects wizard-installed services
   - Service states are accurate
   - Controls work properly

### 4. Reconfiguration Testing

1. **From Dashboard**: Click "Reconfigure" or "Add Services"
2. **Verify Handoff**: Should redirect to wizard
3. **Test Modification**: Add/remove services
4. **Verify Updates**: Dashboard should reflect changes

### 5. Error Scenario Testing

1. **Service Failures**:
   ```bash
   # Stop a service manually
   docker stop kaspa-node
   
   # Check dashboard response
   # Verify error handling
   ```

2. **Resource Constraints**:
   - Test with limited resources
   - Verify warnings and fallbacks

3. **Network Issues**:
   - Test with network interruptions
   - Verify reconnection handling

## Testing Scenarios

### Scenario 1: Fresh Installation (Core Profile)
- Start with clean environment
- Install Core profile through wizard
- Verify dashboard shows correct services
- Test basic service management

### Scenario 2: Service Addition
- Start with Core profile
- Use dashboard to add Production profile
- Verify wizard handles existing installation
- Confirm all services work together

### Scenario 3: Service Removal
- Start with multiple profiles
- Remove services through wizard
- Verify clean removal
- Check dashboard updates correctly

### Scenario 4: Error Recovery
- Simulate service failures
- Test automatic recovery
- Verify error reporting
- Test manual intervention

### Scenario 5: Configuration Changes
- Modify service settings
- Test configuration validation
- Verify service restarts
- Check persistence across restarts

## Log Analysis

### Key Log Locations

- **Wizard**: `test-logs/wizard.log`
- **Dashboard**: `test-logs/dashboard.log`
- **Docker**: Use `docker logs <container>`

### Important Log Patterns

**Wizard Success Indicators**:
```
✓ System requirements met
✓ Profile validation complete
✓ Installation started
✓ Services deployed successfully
```

**Dashboard Success Indicators**:
```
✓ Service discovery complete
✓ Health checks passing
✓ WebSocket connection established
✓ Real-time updates active
```

**Error Patterns to Watch**:
```
✗ Docker connection failed
✗ Port already in use
✗ Insufficient resources
✗ Service startup timeout
```

## Troubleshooting

### Common Issues

1. **Services Won't Start**
   ```bash
   # Check prerequisites
   docker --version
   docker-compose --version
   node --version
   
   # Check ports
   netstat -tulpn | grep -E ':(3000|8080)'
   ```

2. **Wizard/Dashboard Not Responding**
   ```bash
   # Check processes
   ./status-internal-test.sh
   
   # Check logs
   ./logs-internal-test.sh all
   ```

3. **Docker Issues**
   ```bash
   # Check Docker status
   docker info
   
   # Clean Docker environment
   ./cleanup-internal-test.sh
   ```

### Reset Environment

```bash
# Complete reset
./cleanup-internal-test.sh

# Fresh start
./start-internal-test.sh
```

## Performance Testing

### Resource Monitoring

```bash
# Monitor system resources
htop

# Monitor Docker resources
docker stats

# Monitor disk usage
df -h
du -sh .kaspa-aio/
```

### Load Testing

1. **Multiple Concurrent Installations**
2. **Rapid Service Start/Stop Cycles**
3. **Large Configuration Changes**
4. **Extended Runtime Testing**

## Reporting Issues

When reporting issues, include:

1. **Environment Info**:
   ```bash
   ./status-internal-test.sh > status-report.txt
   ```

2. **Complete Logs**:
   ```bash
   ./logs-internal-test.sh all > full-logs.txt
   ```

3. **System Information**:
   ```bash
   docker info > docker-info.txt
   docker ps -a > containers.txt
   ```

4. **Steps to Reproduce**
5. **Expected vs Actual Behavior**

## Advanced Testing

### Custom Configurations

1. **Modify `.env` file** for custom settings
2. **Test edge cases** with unusual configurations
3. **Validate error handling** with invalid inputs

### Integration Testing

1. **External Services**: Test with real Kaspa network
2. **Network Conditions**: Test with various network speeds
3. **Hardware Variations**: Test on different hardware configs

### Automation

Create automated test scripts for:
- Repeated installation cycles
- Configuration validation
- Service health monitoring
- Performance benchmarking

## Success Criteria

A successful test should demonstrate:

1. **✓ Smooth Installation**: Wizard completes without errors
2. **✓ Accurate Monitoring**: Dashboard shows correct service states
3. **✓ Seamless Integration**: Wizard ↔ Dashboard handoff works
4. **✓ Reliable Management**: Service controls work consistently
5. **✓ Proper Error Handling**: Graceful failure and recovery
6. **✓ Clean Cleanup**: Complete removal when needed

## Next Steps

After successful internal testing:

1. **Document Issues**: Create detailed issue reports
2. **Performance Analysis**: Analyze resource usage patterns
3. **User Experience**: Note UX improvements needed
4. **Stability Assessment**: Evaluate long-term stability
5. **Release Readiness**: Determine if ready for external testing

---

**Happy Testing!** 🚀

Your thorough testing helps ensure a smooth experience for all users.
EOF

  echo -e "${GREEN}✓ Testing documentation created${NC}"
}

# Create archive
create_archive() {
  echo -e "${BLUE}Creating release archive...${NC}"
  
  tar -czf "$ARCHIVE_NAME" "$RELEASE_DIR"
  
  # Create checksum
  sha256sum "$ARCHIVE_NAME" > "${ARCHIVE_NAME}.sha256"
  
  echo -e "${GREEN}✓ Archive created: $ARCHIVE_NAME${NC}"
  echo -e "${GREEN}✓ Checksum created: ${ARCHIVE_NAME}.sha256${NC}"
}

# Print summary
print_summary() {
  echo ""
  echo "╔════════════════════════════════════════════════════════════╗"
  echo "║   Release Package Created Successfully!                    ║"
  echo "╚════════════════════════════════════════════════════════════╝"
  echo ""
  echo -e "${GREEN}Package: $ARCHIVE_NAME${NC}"
  echo -e "${GREEN}Size: $(du -h "$ARCHIVE_NAME" | cut -f1)${NC}"
  echo ""
  echo -e "${BLUE}Contents:${NC}"
  echo "  • Wizard service (host-based)"
  echo "  • Dashboard service (host-based)"
  echo "  • Enhanced testing scripts"
  echo "  • Comprehensive logging"
  echo "  • Status monitoring"
  echo "  • Complete cleanup tools"
  echo "  • Internal testing documentation"
  echo ""
  echo -e "${BLUE}Quick Start:${NC}"
  echo "  tar -xzf $ARCHIVE_NAME"
  echo "  cd $RELEASE_DIR"
  echo "  ./start-internal-test.sh"
  echo ""
  echo -e "${YELLOW}Testing URLs:${NC}"
  echo "  Wizard:    http://localhost:3000"
  echo "  Dashboard: http://localhost:8080"
  echo ""
  echo -e "${GREEN}Ready for internal testing!${NC}"
  echo ""
}

# Main execution
main() {
  print_banner
  cleanup_existing
  create_structure
  copy_core_files
  copy_wizard
  copy_dashboard
  copy_scripts
  create_testing_scripts
  create_stop_script
  create_status_script
  create_cleanup_script
  create_log_script
  create_testing_docs
  create_archive
  print_summary
}

main