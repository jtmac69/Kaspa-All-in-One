#!/bin/bash

# Rollback Features Testing Script
# This script performs automated testing of the rollback features

# Don't exit on error - we want to run all tests
set +e

echo "=========================================="
echo "Rollback Features Testing"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to print test result
test_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}: $2"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}: $2"
        ((TESTS_FAILED++))
    fi
}

echo "Prerequisites Check"
echo "===================="
echo ""

# Check if wizard backend is running
echo "Checking if wizard backend is running..."
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    test_result 0 "Wizard backend is running"
else
    test_result 1 "Wizard backend is NOT running"
    echo ""
    echo "Please start the wizard backend first:"
    echo "  cd services/wizard/backend && npm start"
    exit 1
fi

echo ""
echo "API Endpoint Tests"
echo "=================="
echo ""

# Test 1: Health check
echo "Test 1: Health check endpoint..."
RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:3000/api/health)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ]; then
    test_result 0 "Health check endpoint returns 200"
else
    test_result 1 "Health check endpoint failed (HTTP $HTTP_CODE)"
fi

# Test 2: Rollback history endpoint
echo "Test 2: Rollback history endpoint..."
RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:3000/api/rollback/history)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ]; then
    test_result 0 "Rollback history endpoint returns 200"
else
    test_result 1 "Rollback history endpoint failed (HTTP $HTTP_CODE)"
fi

# Test 3: Checkpoints endpoint
echo "Test 3: Checkpoints endpoint..."
RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:3000/api/rollback/checkpoints)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ]; then
    test_result 0 "Checkpoints endpoint returns 200"
else
    test_result 1 "Checkpoints endpoint failed (HTTP $HTTP_CODE)"
fi

# Test 4: Save version endpoint (POST)
echo "Test 4: Save version endpoint..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d '{"description":"Test version","config":{"test":"data"}}' \
    http://localhost:3000/api/rollback/save-version)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    test_result 0 "Save version endpoint works"
    VERSION_ID=$(echo "$BODY" | grep -o '"versionId":"[^"]*"' | cut -d'"' -f4)
    echo "  Created version: $VERSION_ID"
else
    test_result 1 "Save version endpoint failed (HTTP $HTTP_CODE)"
fi

# Test 5: Create checkpoint endpoint (POST)
echo "Test 5: Create checkpoint endpoint..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d '{"stage":"test-stage","state":{"test":"data"}}' \
    http://localhost:3000/api/rollback/checkpoint)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    test_result 0 "Create checkpoint endpoint works"
    CHECKPOINT_ID=$(echo "$BODY" | grep -o '"checkpointId":"[^"]*"' | cut -d'"' -f4)
    echo "  Created checkpoint: $CHECKPOINT_ID"
else
    test_result 1 "Create checkpoint endpoint failed (HTTP $HTTP_CODE)"
fi

# Test 6: Verify version was saved
echo "Test 6: Verify version appears in history..."
RESPONSE=$(curl -s http://localhost:3000/api/rollback/history)
if echo "$RESPONSE" | grep -q "$VERSION_ID"; then
    test_result 0 "Version appears in history"
else
    test_result 1 "Version NOT found in history"
fi

# Test 7: Verify checkpoint was saved
echo "Test 7: Verify checkpoint appears in list..."
RESPONSE=$(curl -s http://localhost:3000/api/rollback/checkpoints)
if echo "$RESPONSE" | grep -q "$CHECKPOINT_ID"; then
    test_result 0 "Checkpoint appears in list"
else
    test_result 1 "Checkpoint NOT found in list"
fi

echo ""
echo "Frontend File Tests"
echo "==================="
echo ""

# Test 8: Check if frontend files exist
echo "Test 8: Frontend files exist..."
FILES_EXIST=true
if [ ! -f "services/wizard/frontend/public/index.html" ]; then
    echo "  Missing: index.html"
    FILES_EXIST=false
fi
if [ ! -f "services/wizard/frontend/public/scripts/wizard-refactored.js" ]; then
    echo "  Missing: wizard-refactored.js"
    FILES_EXIST=false
fi
if [ ! -f "services/wizard/frontend/public/scripts/modules/rollback.js" ]; then
    echo "  Missing: modules/rollback.js"
    FILES_EXIST=false
fi
if [ ! -f "services/wizard/frontend/public/styles/wizard.css" ]; then
    echo "  Missing: wizard.css"
    FILES_EXIST=false
fi

if [ "$FILES_EXIST" = true ]; then
    test_result 0 "All frontend files exist"
else
    test_result 1 "Some frontend files are missing"
fi

# Test 9: Check if HTML contains rollback UI elements
echo "Test 9: HTML contains rollback UI elements..."
HTML_FILE="services/wizard/frontend/public/index.html"
ELEMENTS_FOUND=true

if ! grep -q "undo-button" "$HTML_FILE"; then
    echo "  Missing: undo-button"
    ELEMENTS_FOUND=false
fi
if ! grep -q "start-over-button" "$HTML_FILE"; then
    echo "  Missing: start-over-button"
    ELEMENTS_FOUND=false
fi
if ! grep -q "version-history-modal" "$HTML_FILE"; then
    echo "  Missing: version-history-modal"
    ELEMENTS_FOUND=false
fi
if ! grep -q "start-over-modal" "$HTML_FILE"; then
    echo "  Missing: start-over-modal"
    ELEMENTS_FOUND=false
fi
if ! grep -q "error-recovery-dialog" "$HTML_FILE"; then
    echo "  Missing: error-recovery-dialog"
    ELEMENTS_FOUND=false
fi

if [ "$ELEMENTS_FOUND" = true ]; then
    test_result 0 "All rollback UI elements present in HTML"
else
    test_result 1 "Some rollback UI elements missing from HTML"
fi

# Test 10: Check if rollback module exists and has required functions
echo "Test 10: Rollback module has required functions..."
ROLLBACK_MODULE="services/wizard/frontend/public/scripts/modules/rollback.js"
FUNCTIONS_FOUND=true

if ! grep -q "saveConfigurationVersion" "$ROLLBACK_MODULE"; then
    echo "  Missing: saveConfigurationVersion"
    FUNCTIONS_FOUND=false
fi
if ! grep -q "undoLastChange" "$ROLLBACK_MODULE"; then
    echo "  Missing: undoLastChange"
    FUNCTIONS_FOUND=false
fi
if ! grep -q "loadVersionHistory" "$ROLLBACK_MODULE"; then
    echo "  Missing: loadVersionHistory"
    FUNCTIONS_FOUND=false
fi
if ! grep -q "restoreVersion" "$ROLLBACK_MODULE"; then
    echo "  Missing: restoreVersion"
    FUNCTIONS_FOUND=false
fi
if ! grep -q "startOver" "$ROLLBACK_MODULE"; then
    echo "  Missing: startOver"
    FUNCTIONS_FOUND=false
fi
if ! grep -q "createCheckpoint" "$ROLLBACK_MODULE"; then
    echo "  Missing: createCheckpoint"
    FUNCTIONS_FOUND=false
fi

if [ "$FUNCTIONS_FOUND" = true ]; then
    test_result 0 "All required rollback functions present"
else
    test_result 1 "Some rollback functions missing"
fi

echo ""
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo ""
echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All automated tests passed!${NC}"
    echo ""
    echo "Next Steps:"
    echo "1. Open browser to http://localhost:3000"
    echo "2. Follow the manual testing checklist in ROLLBACK_TESTING_CHECKLIST.md"
    echo "3. Test all UI interactions and features"
    echo ""
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Please review the output above.${NC}"
    echo ""
    exit 1
fi
