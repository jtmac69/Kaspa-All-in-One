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
