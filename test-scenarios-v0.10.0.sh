#!/bin/bash
# Kaspa All-in-One v0.10.0 - Automated Test Scenarios
# Comprehensive end-to-end testing scenarios for wizard + dashboard

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
WIZARD_URL="http://localhost:3000"
DASHBOARD_URL="http://localhost:8080"
TEST_RESULTS_DIR="test-results"
SCENARIO_LOG="$TEST_RESULTS_DIR/scenario-results.log"

print_banner() {
  echo ""
  echo "╔════════════════════════════════════════════════════════════╗"
  echo "║   Kaspa All-in-One v0.10.0 - Automated Test Scenarios    ║"
  echo "║   Comprehensive End-to-End Testing Suite                  ║"
  echo "╚════════════════════════════════════════════════════════════╝"
  echo ""
}

setup_testing() {
  mkdir -p "$TEST_RESULTS_DIR"
  echo "$(date): Starting automated test scenarios" > "$SCENARIO_LOG"
  echo -e "${BLUE}Test results will be saved to: $TEST_RESULTS_DIR${NC}"
  echo ""
}

# Utility functions
wait_for_service() {
  local url=$1
  local service_name=$2
  local max_attempts=60
  local attempt=0
  
  echo -e "${BLUE}Waiting for $service_name to be ready...${NC}"
  
  while [ $attempt -lt $max_attempts ]; do
    if curl -s "$url/api/health" > /dev/null 2>&1; then
      echo -e "${GREEN}✓ $service_name is ready${NC}"
      return 0
    fi
    sleep 1
    attempt=$((attempt + 1))
  done
  
  echo -e "${RED}✗ $service_name failed to start within timeout${NC}"
  return 1
}

log_result() {
  local scenario=$1
  local status=$2
  local details=$3
  
  echo "$(date): $scenario - $status - $details" >> "$SCENARIO_LOG"
  
  if [ "$status" = "PASS" ]; then
    echo -e "${GREEN}✓ $scenario: PASSED${NC}"
  else
    echo -e "${RED}✗ $scenario: FAILED - $details${NC}"
  fi
}

# Test API endpoints
test_api_endpoint() {
  local url=$1
  local endpoint=$2
  local expected_status=${3:-200}
  
  local response=$(curl -s -w "%{http_code}" "$url$endpoint" -o /dev/null)
  
  if [ "$response" = "$expected_status" ]; then
    return 0
  else
    return 1
  fi
}

# Scenario 1: Service Availability
scenario_1_service_availability() {
  echo -e "${CYAN}=== Scenario 1: Service Availability ===${NC}"
  
  local scenario="Service Availability"
  local all_passed=true
  
  # Test wizard availability
  if wait_for_service "$WIZARD_URL" "Wizard"; then
    log_result "$scenario - Wizard" "PASS" "Wizard service responding"
  else
    log_result "$scenario - Wizard" "FAIL" "Wizard service not responding"
    all_passed=false
  fi
  
  # Test dashboard availability
  if wait_for_service "$DASHBOARD_URL" "Dashboard"; then
    log_result "$scenario - Dashboard" "PASS" "Dashboard service responding"
  else
    log_result "$scenario - Dashboard" "FAIL" "Dashboard service not responding"
    all_passed=false
  fi
  
  # Test API endpoints
  local endpoints=(
    "/api/health"
    "/api/system/requirements"
    "/api/profiles"
  )
  
  for endpoint in "${endpoints[@]}"; do
    if test_api_endpoint "$WIZARD_URL" "$endpoint"; then
      log_result "$scenario - Wizard API $endpoint" "PASS" "Endpoint responding"
    else
      log_result "$scenario - Wizard API $endpoint" "FAIL" "Endpoint not responding"
      all_passed=false
    fi
  done
  
  for endpoint in "${endpoints[@]}"; do
    if test_api_endpoint "$DASHBOARD_URL" "$endpoint"; then
      log_result "$scenario - Dashboard API $endpoint" "PASS" "Endpoint responding"
    else
      log_result "$scenario - Dashboard API $endpoint" "FAIL" "Endpoint not responding"
      all_passed=false
    fi
  done
  
  if [ "$all_passed" = true ]; then
    echo -e "${GREEN}✓ Scenario 1: All services available${NC}"
  else
    echo -e "${RED}✗ Scenario 1: Some services unavailable${NC}"
  fi
  
  echo ""
}

# Scenario 2: System Requirements Check
scenario_2_system_requirements() {
  echo -e "${CYAN}=== Scenario 2: System Requirements Check ===${NC}"
  
  local scenario="System Requirements"
  
  # Test system requirements API
  local req_response=$(curl -s "$WIZARD_URL/api/system/requirements" 2>/dev/null)
  
  if [ $? -eq 0 ] && echo "$req_response" | grep -q "docker"; then
    log_result "$scenario" "PASS" "System requirements check working"
    echo -e "${GREEN}✓ System requirements API responding${NC}"
    
    # Save requirements for analysis
    echo "$req_response" > "$TEST_RESULTS_DIR/system-requirements.json"
    
  else
    log_result "$scenario" "FAIL" "System requirements check failed"
    echo -e "${RED}✗ System requirements API failed${NC}"
  fi
  
  echo ""
}

# Scenario 3: Profile Configuration
scenario_3_profile_configuration() {
  echo -e "${CYAN}=== Scenario 3: Profile Configuration ===${NC}"
  
  local scenario="Profile Configuration"
  
  # Test profiles API
  local profiles_response=$(curl -s "$WIZARD_URL/api/profiles" 2>/dev/null)
  
  if [ $? -eq 0 ] && echo "$profiles_response" | grep -q "core"; then
    log_result "$scenario" "PASS" "Profiles API working"
    echo -e "${GREEN}✓ Profiles API responding${NC}"
    
    # Save profiles for analysis
    echo "$profiles_response" > "$TEST_RESULTS_DIR/profiles.json"
    
    # Check for expected profiles
    local expected_profiles=("core" "prod" "explorer" "mining" "development")
    local all_profiles_found=true
    
    for profile in "${expected_profiles[@]}"; do
      if echo "$profiles_response" | grep -q "\"$profile\""; then
        echo -e "${GREEN}  ✓ Profile found: $profile${NC}"
      else
        echo -e "${YELLOW}  ⚠ Profile missing: $profile${NC}"
        all_profiles_found=false
      fi
    done
    
    if [ "$all_profiles_found" = true ]; then
      log_result "$scenario - All Profiles" "PASS" "All expected profiles found"
    else
      log_result "$scenario - All Profiles" "WARN" "Some profiles missing"
    fi
    
  else
    log_result "$scenario" "FAIL" "Profiles API failed"
    echo -e "${RED}✗ Profiles API failed${NC}"
  fi
  
  echo ""
}

# Scenario 4: Docker Integration
scenario_4_docker_integration() {
  echo -e "${CYAN}=== Scenario 4: Docker Integration ===${NC}"
  
  local scenario="Docker Integration"
  
  # Test Docker status API
  local docker_response=$(curl -s "$WIZARD_URL/api/docker/status" 2>/dev/null)
  
  if [ $? -eq 0 ]; then
    log_result "$scenario - Docker Status" "PASS" "Docker status API working"
    echo -e "${GREEN}✓ Docker status API responding${NC}"
    
    # Save Docker status for analysis
    echo "$docker_response" > "$TEST_RESULTS_DIR/docker-status.json"
    
  else
    log_result "$scenario - Docker Status" "FAIL" "Docker status API failed"
    echo -e "${RED}✗ Docker status API failed${NC}"
  fi
  
  # Test actual Docker availability
  if command -v docker &> /dev/null && docker info &> /dev/null; then
    log_result "$scenario - Docker Available" "PASS" "Docker daemon accessible"
    echo -e "${GREEN}✓ Docker daemon accessible${NC}"
  else
    log_result "$scenario - Docker Available" "FAIL" "Docker daemon not accessible"
    echo -e "${RED}✗ Docker daemon not accessible${NC}"
  fi
  
  echo ""
}

# Scenario 5: Dashboard Service Discovery
scenario_5_dashboard_discovery() {
  echo -e "${CYAN}=== Scenario 5: Dashboard Service Discovery ===${NC}"
  
  local scenario="Dashboard Discovery"
  
  # Test service discovery API
  local services_response=$(curl -s "$DASHBOARD_URL/api/services" 2>/dev/null)
  
  if [ $? -eq 0 ]; then
    log_result "$scenario" "PASS" "Service discovery API working"
    echo -e "${GREEN}✓ Service discovery API responding${NC}"
    
    # Save services for analysis
    echo "$services_response" > "$TEST_RESULTS_DIR/discovered-services.json"
    
  else
    log_result "$scenario" "FAIL" "Service discovery API failed"
    echo -e "${RED}✗ Service discovery API failed${NC}"
  fi
  
  echo ""
}

# Scenario 6: WebSocket Connectivity
scenario_6_websocket_connectivity() {
  echo -e "${CYAN}=== Scenario 6: WebSocket Connectivity ===${NC}"
  
  local scenario="WebSocket Connectivity"
  
  # Test WebSocket endpoints (basic connectivity test)
  local ws_endpoints=(
    "ws://localhost:3000/ws"
    "ws://localhost:8080/ws"
  )
  
  for ws_url in "${ws_endpoints[@]}"; do
    local service_name=$(echo "$ws_url" | grep -o "300[08]" | sed 's/3000/Wizard/; s/3008/Dashboard/')
    
    # Use curl to test WebSocket upgrade (basic test)
    if curl -s -H "Connection: Upgrade" -H "Upgrade: websocket" "${ws_url/ws:/http:}" > /dev/null 2>&1; then
      log_result "$scenario - $service_name WS" "PASS" "WebSocket endpoint accessible"
      echo -e "${GREEN}✓ $service_name WebSocket endpoint accessible${NC}"
    else
      log_result "$scenario - $service_name WS" "FAIL" "WebSocket endpoint not accessible"
      echo -e "${RED}✗ $service_name WebSocket endpoint not accessible${NC}"
    fi
  done
  
  echo ""
}

# Scenario 7: Configuration Persistence
scenario_7_configuration_persistence() {
  echo -e "${CYAN}=== Scenario 7: Configuration Persistence ===${NC}"
  
  local scenario="Configuration Persistence"
  
  # Check for configuration files
  local config_files=(
    ".env"
    ".kaspa-aio/installation-state.json"
    "docker-compose.yml"
  )
  
  local configs_found=0
  
  for config_file in "${config_files[@]}"; do
    if [ -f "$config_file" ]; then
      log_result "$scenario - $config_file" "PASS" "Configuration file exists"
      echo -e "${GREEN}✓ Configuration file found: $config_file${NC}"
      configs_found=$((configs_found + 1))
    else
      log_result "$scenario - $config_file" "INFO" "Configuration file not found (may be normal)"
      echo -e "${YELLOW}⚠ Configuration file not found: $config_file${NC}"
    fi
  done
  
  if [ $configs_found -gt 0 ]; then
    log_result "$scenario" "PASS" "$configs_found configuration files found"
  else
    log_result "$scenario" "INFO" "No configuration files found (fresh installation)"
  fi
  
  echo ""
}

# Scenario 8: Resource Monitoring
scenario_8_resource_monitoring() {
  echo -e "${CYAN}=== Scenario 8: Resource Monitoring ===${NC}"
  
  local scenario="Resource Monitoring"
  
  # Test resource monitoring APIs
  local resource_endpoints=(
    "/api/system/resources"
    "/api/system/disk"
    "/api/system/memory"
  )
  
  local all_resources_ok=true
  
  for endpoint in "${resource_endpoints[@]}"; do
    if test_api_endpoint "$DASHBOARD_URL" "$endpoint"; then
      log_result "$scenario - $endpoint" "PASS" "Resource endpoint responding"
      echo -e "${GREEN}✓ Resource endpoint working: $endpoint${NC}"
      
      # Save resource data
      local filename=$(echo "$endpoint" | sed 's/\/api\/system\///; s/\//-/g')
      curl -s "$DASHBOARD_URL$endpoint" > "$TEST_RESULTS_DIR/resources-$filename.json" 2>/dev/null
      
    else
      log_result "$scenario - $endpoint" "FAIL" "Resource endpoint not responding"
      echo -e "${RED}✗ Resource endpoint failed: $endpoint${NC}"
      all_resources_ok=false
    fi
  done
  
  if [ "$all_resources_ok" = true ]; then
    log_result "$scenario" "PASS" "All resource monitoring endpoints working"
  else
    log_result "$scenario" "FAIL" "Some resource monitoring endpoints failed"
  fi
  
  echo ""
}

# Scenario 9: Error Handling
scenario_9_error_handling() {
  echo -e "${CYAN}=== Scenario 9: Error Handling ===${NC}"
  
  local scenario="Error Handling"
  
  # Test invalid endpoints (should return proper error codes)
  local invalid_endpoints=(
    "/api/nonexistent"
    "/api/invalid/endpoint"
  )
  
  local error_handling_ok=true
  
  for endpoint in "${invalid_endpoints[@]}"; do
    local response=$(curl -s -w "%{http_code}" "$WIZARD_URL$endpoint" -o /dev/null)
    
    if [ "$response" = "404" ] || [ "$response" = "400" ]; then
      log_result "$scenario - $endpoint" "PASS" "Proper error code returned: $response"
      echo -e "${GREEN}✓ Proper error handling for: $endpoint (HTTP $response)${NC}"
    else
      log_result "$scenario - $endpoint" "FAIL" "Unexpected response code: $response"
      echo -e "${RED}✗ Unexpected error handling for: $endpoint (HTTP $response)${NC}"
      error_handling_ok=false
    fi
  done
  
  if [ "$error_handling_ok" = true ]; then
    log_result "$scenario" "PASS" "Error handling working correctly"
  else
    log_result "$scenario" "FAIL" "Error handling issues detected"
  fi
  
  echo ""
}

# Scenario 10: Performance Baseline
scenario_10_performance_baseline() {
  echo -e "${CYAN}=== Scenario 10: Performance Baseline ===${NC}"
  
  local scenario="Performance Baseline"
  
  # Test response times
  local endpoints=(
    "$WIZARD_URL/api/health"
    "$DASHBOARD_URL/api/health"
    "$WIZARD_URL/api/profiles"
    "$DASHBOARD_URL/api/services"
  )
  
  echo "Response Time Analysis:" > "$TEST_RESULTS_DIR/performance-baseline.txt"
  
  for endpoint in "${endpoints[@]}"; do
    local start_time=$(date +%s%N)
    local response=$(curl -s "$endpoint" -w "%{http_code}" -o /dev/null)
    local end_time=$(date +%s%N)
    
    local response_time=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
    
    echo "$endpoint: ${response_time}ms (HTTP $response)" >> "$TEST_RESULTS_DIR/performance-baseline.txt"
    
    if [ "$response" = "200" ] && [ "$response_time" -lt 5000 ]; then
      log_result "$scenario - $(basename $endpoint)" "PASS" "Response time: ${response_time}ms"
      echo -e "${GREEN}✓ $(basename $endpoint): ${response_time}ms${NC}"
    else
      log_result "$scenario - $(basename $endpoint)" "WARN" "Slow response: ${response_time}ms"
      echo -e "${YELLOW}⚠ $(basename $endpoint): ${response_time}ms (slow)${NC}"
    fi
  done
  
  echo ""
}

# Generate test report
generate_report() {
  echo -e "${BLUE}Generating test report...${NC}"
  
  local report_file="$TEST_RESULTS_DIR/test-report.md"
  
  cat > "$report_file" << EOF
# Kaspa All-in-One v0.10.0 - Test Report

**Generated:** $(date)
**Test Suite:** Automated End-to-End Scenarios

## Test Summary

EOF

  # Count results
  local total_tests=$(grep -c "PASS\|FAIL\|WARN" "$SCENARIO_LOG")
  local passed_tests=$(grep -c "PASS" "$SCENARIO_LOG")
  local failed_tests=$(grep -c "FAIL" "$SCENARIO_LOG")
  local warning_tests=$(grep -c "WARN" "$SCENARIO_LOG")
  
  cat >> "$report_file" << EOF
- **Total Tests:** $total_tests
- **Passed:** $passed_tests
- **Failed:** $failed_tests
- **Warnings:** $warning_tests
- **Success Rate:** $(( passed_tests * 100 / total_tests ))%

## Detailed Results

\`\`\`
$(cat "$SCENARIO_LOG")
\`\`\`

## Test Artifacts

The following files contain detailed test data:

EOF

  # List all generated files
  for file in "$TEST_RESULTS_DIR"/*.json "$TEST_RESULTS_DIR"/*.txt; do
    if [ -f "$file" ]; then
      echo "- \`$(basename "$file")\`" >> "$report_file"
    fi
  done
  
  cat >> "$report_file" << EOF

## Recommendations

EOF

  if [ "$failed_tests" -gt 0 ]; then
    cat >> "$report_file" << EOF
⚠️ **Action Required:** $failed_tests tests failed. Review the detailed results above and address the issues before proceeding.

EOF
  fi
  
  if [ "$warning_tests" -gt 0 ]; then
    cat >> "$report_file" << EOF
⚠️ **Review Recommended:** $warning_tests tests had warnings. These may indicate performance issues or missing optional features.

EOF
  fi
  
  if [ "$failed_tests" -eq 0 ] && [ "$warning_tests" -eq 0 ]; then
    cat >> "$report_file" << EOF
✅ **All Tests Passed:** The system is functioning correctly and ready for further testing.

EOF
  fi
  
  echo -e "${GREEN}✓ Test report generated: $report_file${NC}"
}

# Main execution
run_all_scenarios() {
  print_banner
  setup_testing
  
  echo -e "${BLUE}Running automated test scenarios...${NC}"
  echo ""
  
  scenario_1_service_availability
  scenario_2_system_requirements
  scenario_3_profile_configuration
  scenario_4_docker_integration
  scenario_5_dashboard_discovery
  scenario_6_websocket_connectivity
  scenario_7_configuration_persistence
  scenario_8_resource_monitoring
  scenario_9_error_handling
  scenario_10_performance_baseline
  
  generate_report
  
  echo ""
  echo "╔════════════════════════════════════════════════════════════╗"
  echo "║   Automated Testing Complete!                              ║"
  echo "╚════════════════════════════════════════════════════════════╝"
  echo ""
  echo -e "${GREEN}Test results saved to: $TEST_RESULTS_DIR/${NC}"
  echo -e "${GREEN}Full report: $TEST_RESULTS_DIR/test-report.md${NC}"
  echo ""
}

# Allow running individual scenarios
case "${1:-all}" in
  "1"|"availability")
    setup_testing
    scenario_1_service_availability
    ;;
  "2"|"requirements")
    setup_testing
    scenario_2_system_requirements
    ;;
  "3"|"profiles")
    setup_testing
    scenario_3_profile_configuration
    ;;
  "4"|"docker")
    setup_testing
    scenario_4_docker_integration
    ;;
  "5"|"discovery")
    setup_testing
    scenario_5_dashboard_discovery
    ;;
  "6"|"websocket")
    setup_testing
    scenario_6_websocket_connectivity
    ;;
  "7"|"config")
    setup_testing
    scenario_7_configuration_persistence
    ;;
  "8"|"resources")
    setup_testing
    scenario_8_resource_monitoring
    ;;
  "9"|"errors")
    setup_testing
    scenario_9_error_handling
    ;;
  "10"|"performance")
    setup_testing
    scenario_10_performance_baseline
    ;;
  "all")
    run_all_scenarios
    ;;
  "help"|"-h"|"--help")
    echo "Usage: $0 [scenario|all]"
    echo ""
    echo "Scenarios:"
    echo "  1, availability  - Service availability tests"
    echo "  2, requirements  - System requirements check"
    echo "  3, profiles      - Profile configuration tests"
    echo "  4, docker        - Docker integration tests"
    echo "  5, discovery     - Dashboard service discovery"
    echo "  6, websocket     - WebSocket connectivity tests"
    echo "  7, config        - Configuration persistence"
    echo "  8, resources     - Resource monitoring tests"
    echo "  9, errors        - Error handling tests"
    echo "  10, performance  - Performance baseline tests"
    echo "  all              - Run all scenarios (default)"
    echo ""
    ;;
  *)
    echo -e "${RED}Unknown scenario: $1${NC}"
    echo "Use '$0 help' for usage information"
    exit 1
    ;;
esac