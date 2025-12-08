#!/bin/bash

# Test script for Kaspa All-in-One Installation Wizard Frontend
# Tests the complete 7-step wizard interface

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
WIZARD_DIR="services/wizard/frontend/public"
TEST_PORT=3001

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Kaspa Wizard Frontend Complete Test${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if wizard directory exists
if [ ! -d "$WIZARD_DIR" ]; then
    echo -e "${RED}✗ Wizard directory not found: $WIZARD_DIR${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Wizard directory found${NC}"

# Check required files
echo ""
echo -e "${BLUE}Checking required files...${NC}"

required_files=(
    "$WIZARD_DIR/index.html"
    "$WIZARD_DIR/styles/wizard.css"
    "$WIZARD_DIR/scripts/wizard.js"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓ Found: $file${NC}"
    else
        echo -e "${RED}✗ Missing: $file${NC}"
        exit 1
    fi
done

# Check HTML structure for all 7 steps
echo ""
echo -e "${BLUE}Checking wizard steps in HTML...${NC}"

steps=(
    "step-welcome"
    "step-system-check"
    "step-profiles"
    "step-configure"
    "step-review"
    "step-install"
    "step-complete"
)

for step in "${steps[@]}"; do
    if grep -q "id=\"$step\"" "$WIZARD_DIR/index.html"; then
        echo -e "${GREEN}✓ Found step: $step${NC}"
    else
        echo -e "${RED}✗ Missing step: $step${NC}"
        exit 1
    fi
done

# Check for key UI components
echo ""
echo -e "${BLUE}Checking key UI components...${NC}"

components=(
    "wizard-progress"
    "profile-card"
    "config-form"
    "review-sections"
    "install-progress"
    "completion-sections"
)

for component in "${components[@]}"; do
    if grep -q "class=\"$component\"" "$WIZARD_DIR/index.html"; then
        echo -e "${GREEN}✓ Found component: $component${NC}"
    else
        echo -e "${YELLOW}⚠ Component not found: $component${NC}"
    fi
done

# Check CSS classes
echo ""
echo -e "${BLUE}Checking CSS styling...${NC}"

css_classes=(
    ".wizard-container"
    ".wizard-progress"
    ".profile-card"
    ".config-form"
    ".review-section"
    ".install-progress"
    ".completion-section"
)

for css_class in "${css_classes[@]}"; do
    if grep -q "$css_class" "$WIZARD_DIR/styles/wizard.css"; then
        echo -e "${GREEN}✓ Found CSS: $css_class${NC}"
    else
        echo -e "${RED}✗ Missing CSS: $css_class${NC}"
        exit 1
    fi
done

# Check JavaScript functions
echo ""
echo -e "${BLUE}Checking JavaScript functions...${NC}"

js_functions=(
    "nextStep"
    "previousStep"
    "runSystemCheck"
    "loadProfiles"
    "loadConfiguration"
    "showReview"
    "startInstallation"
    "showCompletion"
)

for func in "${js_functions[@]}"; do
    if grep -q "function $func" "$WIZARD_DIR/scripts/wizard.js"; then
        echo -e "${GREEN}✓ Found function: $func${NC}"
    else
        echo -e "${RED}✗ Missing function: $func${NC}"
        exit 1
    fi
done

# Check for Kaspa branding
echo ""
echo -e "${BLUE}Checking Kaspa branding...${NC}"

if grep -q "Kaspa" "$WIZARD_DIR/index.html"; then
    echo -e "${GREEN}✓ Kaspa branding present${NC}"
else
    echo -e "${RED}✗ Kaspa branding missing${NC}"
    exit 1
fi

# Check for dark mode support
if grep -q "prefers-color-scheme: dark" "$WIZARD_DIR/styles/wizard.css"; then
    echo -e "${GREEN}✓ Dark mode support present${NC}"
else
    echo -e "${YELLOW}⚠ Dark mode support not found${NC}"
fi

# Check for responsive design
if grep -q "@media (max-width:" "$WIZARD_DIR/styles/wizard.css"; then
    echo -e "${GREEN}✓ Responsive design present${NC}"
else
    echo -e "${YELLOW}⚠ Responsive design not found${NC}"
fi

# Start local server for visual testing
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Starting local development server...${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if port is available
if lsof -Pi :$TEST_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Port $TEST_PORT is already in use${NC}"
    echo -e "${YELLOW}  Attempting to use alternative port...${NC}"
    TEST_PORT=$((TEST_PORT + 1))
fi

echo -e "${GREEN}Starting server on port $TEST_PORT...${NC}"
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Visual Testing Instructions:${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "1. Open your browser to: ${GREEN}http://localhost:$TEST_PORT${NC}"
echo -e "2. Verify all 7 wizard steps are accessible"
echo -e "3. Test navigation between steps"
echo -e "4. Verify Kaspa branding (logos, colors)"
echo -e "5. Test dark mode (System Preferences → Appearance → Dark)"
echo -e "6. Test responsive design (resize browser window)"
echo -e "7. Check browser console for errors"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
echo ""

# Start Python HTTP server
cd "$WIZARD_DIR" && python3 -m http.server $TEST_PORT

