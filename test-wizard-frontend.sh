#!/bin/bash

# Kaspa All-in-One - Wizard Frontend Visual Verification Test
# Tests the wizard frontend UI according to task 6.2.1 requirements

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
WIZARD_URL="http://localhost:3000"
TEST_RESULTS=()
FAILED_TESTS=0
PASSED_TESTS=0

# Print functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_test() {
    echo -e "${YELLOW}TEST:${NC} $1"
}

print_pass() {
    echo -e "${GREEN}✓ PASS:${NC} $1"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    TEST_RESULTS+=("PASS: $1")
}

print_fail() {
    echo -e "${RED}✗ FAIL:${NC} $1"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    TEST_RESULTS+=("FAIL: $1")
}

print_info() {
    echo -e "${BLUE}ℹ INFO:${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠ WARNING:${NC} $1"
}

# Check if server is running
check_server() {
    print_header "Checking Development Server"
    
    print_test "Verifying server is accessible at $WIZARD_URL"
    if curl -s -o /dev/null -w "%{http_code}" "$WIZARD_URL" | grep -q "200"; then
        print_pass "Server is running and accessible"
    else
        print_fail "Server is not accessible at $WIZARD_URL"
        print_info "Start the server with: cd services/wizard/frontend/public && python3 -m http.server 3000"
        exit 1
    fi
}

# Check HTML structure
check_html_structure() {
    print_header "Checking HTML Structure"
    
    print_test "Fetching HTML content"
    HTML_CONTENT=$(curl -s "$WIZARD_URL")
    
    # Check for essential elements
    print_test "Checking for wizard container"
    if echo "$HTML_CONTENT" | grep -q 'id="wizard-app"'; then
        print_pass "Wizard container found"
    else
        print_fail "Wizard container not found"
    fi
    
    print_test "Checking for progress indicator"
    if echo "$HTML_CONTENT" | grep -q 'class="wizard-progress"'; then
        print_pass "Progress indicator found"
    else
        print_fail "Progress indicator not found"
    fi
    
    print_test "Checking for all 7 wizard steps"
    STEP_COUNT=$(echo "$HTML_CONTENT" | grep -o 'data-step="[0-9]"' | wc -l | tr -d ' ')
    if [ "$STEP_COUNT" -eq 7 ]; then
        print_pass "All 7 wizard steps found"
    else
        print_fail "Expected 7 steps, found $STEP_COUNT"
    fi
    
    print_test "Checking for step labels"
    EXPECTED_STEPS=("Welcome" "System Check" "Profiles" "Configure" "Review" "Install" "Complete")
    for step in "${EXPECTED_STEPS[@]}"; do
        if echo "$HTML_CONTENT" | grep -q "$step"; then
            print_pass "Step label '$step' found"
        else
            print_fail "Step label '$step' not found"
        fi
    done
}

# Check Kaspa branding
check_branding() {
    print_header "Checking Kaspa Branding"
    
    print_test "Fetching HTML content"
    HTML_CONTENT=$(curl -s "$WIZARD_URL")
    
    print_test "Checking for Kaspa logo in header"
    if echo "$HTML_CONTENT" | grep -q 'kaspa-logo'; then
        print_pass "Kaspa logo reference found in header"
    else
        print_fail "Kaspa logo reference not found in header"
    fi
    
    print_test "Checking for Kaspa logo in footer"
    if echo "$HTML_CONTENT" | grep -q 'footer-logo'; then
        print_pass "Footer logo found"
    else
        print_fail "Footer logo not found"
    fi
    
    print_test "Checking for Montserrat font"
    if echo "$HTML_CONTENT" | grep -q 'Montserrat'; then
        print_pass "Montserrat font loaded"
    else
        print_fail "Montserrat font not loaded"
    fi
    
    print_test "Checking for Open Sans font"
    if echo "$HTML_CONTENT" | grep -qi 'Open.Sans\|Open+Sans'; then
        print_pass "Open Sans font loaded"
    else
        print_fail "Open Sans font not loaded"
    fi
    
    print_test "Checking for favicon"
    if echo "$HTML_CONTENT" | grep -q 'rel="icon"'; then
        print_pass "Favicon link found"
    else
        print_fail "Favicon link not found"
    fi
}

# Check CSS and styling
check_styling() {
    print_header "Checking CSS and Styling"
    
    print_test "Checking for wizard.css"
    if curl -s -o /dev/null -w "%{http_code}" "$WIZARD_URL/styles/wizard.css" | grep -q "200"; then
        print_pass "wizard.css is accessible"
    else
        print_fail "wizard.css is not accessible"
    fi
    
    print_test "Fetching CSS content"
    CSS_CONTENT=$(curl -s "$WIZARD_URL/styles/wizard.css")
    
    print_test "Checking for Kaspa brand colors"
    if echo "$CSS_CONTENT" | grep -q '#70C7BA\|#49C8B5'; then
        print_pass "Kaspa brand colors found in CSS"
    else
        print_fail "Kaspa brand colors not found in CSS"
    fi
    
    print_test "Checking for dark mode support"
    if echo "$CSS_CONTENT" | grep -q 'prefers-color-scheme: dark'; then
        print_pass "Dark mode media query found"
    else
        print_fail "Dark mode media query not found"
    fi
    
    print_test "Checking for responsive design"
    if echo "$CSS_CONTENT" | grep -q '@media.*max-width'; then
        print_pass "Responsive design media queries found"
    else
        print_fail "Responsive design media queries not found"
    fi
}

# Check JavaScript functionality
check_javascript() {
    print_header "Checking JavaScript"
    
    print_test "Checking for wizard.js"
    if curl -s -o /dev/null -w "%{http_code}" "$WIZARD_URL/scripts/wizard.js" | grep -q "200"; then
        print_pass "wizard.js is accessible"
    else
        print_fail "wizard.js is not accessible"
    fi
    
    print_test "Fetching JavaScript content"
    JS_CONTENT=$(curl -s "$WIZARD_URL/scripts/wizard.js")
    
    print_test "Checking for navigation functions"
    if echo "$JS_CONTENT" | grep -q 'function nextStep\|function previousStep'; then
        print_pass "Navigation functions found"
    else
        print_fail "Navigation functions not found"
    fi
    
    print_test "Checking for wizard state management"
    if echo "$JS_CONTENT" | grep -q 'wizardState'; then
        print_pass "Wizard state management found"
    else
        print_fail "Wizard state management not found"
    fi
}

# Check assets
check_assets() {
    print_header "Checking Brand Assets"
    
    print_test "Checking for light logo"
    if curl -s -o /dev/null -w "%{http_code}" "$WIZARD_URL/assets/brand/logos/svg/kaspa-logo-light.svg" | grep -q "200"; then
        print_pass "Light logo (kaspa-logo-light.svg) is accessible"
    else
        print_fail "Light logo (kaspa-logo-light.svg) is not accessible"
    fi
    
    print_test "Checking for dark logo"
    if curl -s -o /dev/null -w "%{http_code}" "$WIZARD_URL/assets/brand/logos/svg/kaspa-logo-dark.svg" | grep -q "200"; then
        print_pass "Dark logo (kaspa-logo-dark.svg) is accessible"
    else
        print_fail "Dark logo (kaspa-logo-dark.svg) is not accessible"
    fi
    
    print_test "Checking for light icon"
    if curl -s -o /dev/null -w "%{http_code}" "$WIZARD_URL/assets/brand/icons/svg/kaspa-icon-light.svg" | grep -q "200"; then
        print_pass "Light icon (kaspa-icon-light.svg) is accessible"
    else
        print_fail "Light icon (kaspa-icon-light.svg) is not accessible"
    fi
    
    print_test "Checking for dark icon"
    if curl -s -o /dev/null -w "%{http_code}" "$WIZARD_URL/assets/brand/icons/svg/kaspa-icon-dark.svg" | grep -q "200"; then
        print_pass "Dark icon (kaspa-icon-dark.svg) is accessible"
    else
        print_fail "Dark icon (kaspa-icon-dark.svg) is not accessible"
    fi
}

# Check profile cards
check_profile_cards() {
    print_header "Checking Profile Cards"
    
    print_test "Fetching HTML content"
    HTML_CONTENT=$(curl -s "$WIZARD_URL")
    
    print_test "Checking for profile grid"
    if echo "$HTML_CONTENT" | grep -q 'class="profile-grid"'; then
        print_pass "Profile grid found"
    else
        print_fail "Profile grid not found"
    fi
    
    print_test "Checking for profile cards"
    if echo "$HTML_CONTENT" | grep -q 'class="profile-card"'; then
        print_pass "Profile cards found"
    else
        print_fail "Profile cards not found"
    fi
    
    print_test "Checking for service tags"
    if echo "$HTML_CONTENT" | grep -q 'class="service-tag"'; then
        print_pass "Service tags found"
    else
        print_fail "Service tags not found"
    fi
    
    print_test "Checking for resource requirements"
    if echo "$HTML_CONTENT" | grep -q 'class="profile-resources"'; then
        print_pass "Resource requirements section found"
    else
        print_fail "Resource requirements section not found"
    fi
}

# Generate summary report
generate_summary() {
    print_header "Test Summary"
    
    TOTAL_TESTS=$((PASSED_TESTS + FAILED_TESTS))
    
    echo -e "Total Tests: $TOTAL_TESTS"
    echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
    echo -e "${RED}Failed: $FAILED_TESTS${NC}"
    
    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "\n${GREEN}✓ All tests passed!${NC}"
        echo -e "\n${BLUE}Manual Verification Steps:${NC}"
        echo -e "1. Open browser to $WIZARD_URL"
        echo -e "2. Verify Kaspa branding displays correctly"
        echo -e "3. Test dark mode (System Preferences → Appearance → Dark)"
        echo -e "4. Verify logos switch from colored to white versions in dark mode"
        echo -e "5. Test navigation between wizard steps"
        echo -e "6. Test responsive design (resize browser window)"
        echo -e "7. Check browser console for any errors"
        return 0
    else
        echo -e "\n${RED}✗ Some tests failed${NC}"
        echo -e "\n${YELLOW}Failed Tests:${NC}"
        for result in "${TEST_RESULTS[@]}"; do
            if [[ $result == FAIL* ]]; then
                echo -e "  - ${result#FAIL: }"
            fi
        done
        return 1
    fi
}

# Main execution
main() {
    print_header "Kaspa Wizard Frontend Visual Verification"
    print_info "Testing wizard at: $WIZARD_URL"
    print_info "Task: 6.2.1 Verify wizard frontend visually"
    
    check_server
    check_html_structure
    check_branding
    check_styling
    check_javascript
    check_assets
    check_profile_cards
    
    generate_summary
}

# Run main function
main
