# Wizard Testing Guide

## Overview

This guide covers testing the Kaspa All-in-One Installation Wizard, including automated tests, manual validation, and troubleshooting test failures.

## Table of Contents

1. [Automated Testing](#automated-testing)
2. [Test Coverage](#test-coverage)
3. [Running Tests](#running-tests)
4. [Understanding Test Results](#understanding-test-results)
5. [Manual Testing](#manual-testing)
6. [Troubleshooting Test Failures](#troubleshooting-test-failures)
7. [CI/CD Integration](#cicd-integration)

---

## Automated Testing

The wizard includes a comprehensive automated test suite that validates all aspects of the installation wizard.

### Test Script

**File:** `test-wizard-integration.sh`

**Purpose:** End-to-end testing of wizard functionality

**Coverage:**
- Task 6.4.1: End-to-end wizard testing
- Task 6.4.2: All profiles (Core, Production, Explorer, Archive, Mining, Development)
- Task 6.4.3: Reconfiguration mode validation
- Task 6.4.4: Error handling and recovery

---

## Test Coverage

### Section 1: Basic Integration Tests (15 tests)

Tests fundamental wizard functionality:

1. ✅ Wizard script exists and is executable
2. ✅ Wizard service defined in docker-compose.yml
3. ✅ Wizard Dockerfile exists
4. ✅ Wizard backend files exist
5. ✅ Start wizard in install mode
6. ✅ Wizard health endpoint responds
7. ✅ Wizard mode endpoint returns correct mode
8. ✅ System check API responds
9. ✅ Profiles API responds
10. ✅ Reconfigure API responds
11. ✅ Frontend loads correctly
12. ✅ Security headers are set
13. ✅ Stop wizard
14. ✅ Restart wizard in reconfigure mode
15. ✅ Wizard status command works

### Section 2: Profile Testing (18 tests)

Tests all 6 deployment profiles (3 tests per profile):

**For each profile (Core, Production, Explorer, Archive, Mining, Development):**
1. ✅ Profile validation - Profile exists in wizard
2. ✅ Configuration generation - Config can be generated
3. ✅ Service dependencies - Dependencies are defined

**Total:** 6 profiles × 3 tests = 18 tests

### Section 3: Reconfiguration Mode (3 tests)

Tests wizard reconfiguration functionality:

1. ✅ Reconfiguration mode detection
2. ✅ Load existing configuration
3. ✅ Configuration update

### Section 4: Error Handling and Recovery (8 tests)

Tests error handling and recovery mechanisms:

1. ✅ Invalid profile handling
2. ✅ Missing required fields
3. ✅ Malformed JSON handling
4. ✅ Port conflict detection
5. ✅ Docker availability check
6. ✅ Resource requirements validation
7. ✅ Error recovery - wizard restart
8. ✅ State persistence across restarts

### Total Test Count

**44 tests** covering all wizard functionality

---

## Running Tests

### Quick Start

```bash
# Run all tests
./test-wizard-integration.sh
```

### Command Line Options

```bash
# Verbose output (shows detailed information)
./test-wizard-integration.sh --verbose

# Skip cleanup (useful for debugging)
./test-wizard-integration.sh --no-cleanup

# Show help
./test-wizard-integration.sh --help
```

### Test Execution Flow

1. **Setup Phase**
   - Checks prerequisites
   - Starts wizard if needed
   - Initializes test environment

2. **Test Execution**
   - Runs tests in 5 sections
   - Reports pass/fail for each test
   - Continues even if some tests fail

3. **Cleanup Phase**
   - Stops wizard container
   - Removes test state files
   - Cleans up temporary files

4. **Summary Report**
   - Total tests run
   - Tests passed/failed
   - Pass rate percentage
   - Coverage summary

### Expected Output

```
╔══════════════════════════════════════════════════════════════╗
║        Kaspa All-in-One Wizard Integration Tests            ║
║                                                              ║
║  Task 6.4: Complete wizard testing and documentation        ║
║  - 6.4.1: End-to-end wizard testing                         ║
║  - 6.4.2: Test all profiles                                 ║
║  - 6.4.3: Validate reconfiguration mode                     ║
║  - 6.4.4: Test error handling and recovery                  ║
╚══════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════
  Section 1: Basic Integration Tests (Task 6.4.1)
═══════════════════════════════════════════════════════════════

[TEST] Test 1: Wizard script exists and is executable
[PASS] Wizard script exists and is executable
[TEST] Test 2: Wizard service defined in docker-compose.yml
[PASS] Wizard service is defined in docker-compose.yml
...

═══════════════════════════════════════════════════════════════
  Section 2: Profile Testing (Task 6.4.2)
═══════════════════════════════════════════════════════════════

[TEST] Test: Profile validation for 'core'
[PASS] Profile 'core' is available in wizard
...

═══════════════════════════════════════════════════════════════
  Section 3: Reconfiguration Mode Testing (Task 6.4.3)
═══════════════════════════════════════════════════════════════

[TEST] Test: Reconfiguration mode detection
[PASS] Reconfiguration mode detected correctly
...

═══════════════════════════════════════════════════════════════
  Section 4: Error Handling and Recovery (Task 6.4.4)
═══════════════════════════════════════════════════════════════

[TEST] Test: Invalid profile handling
[PASS] Invalid profile rejected correctly
...

╔══════════════════════════════════════════════════════════════╗
║                    Test Summary                              ║
╚══════════════════════════════════════════════════════════════╝

Tests Run:    44
Tests Passed: 44
Tests Failed: 0
Pass Rate:    100%

Test Coverage:
  ✓ Task 6.4.1: End-to-end wizard testing
  ✓ Task 6.4.2: All profiles tested (6 profiles)
  ✓ Task 6.4.3: Reconfiguration mode validated
  ✓ Task 6.4.4: Error handling and recovery tested

╔══════════════════════════════════════════════════════════════╗
║                  ✓ All tests passed!                         ║
╚══════════════════════════════════════════════════════════════╝

Wizard integration is fully functional and ready for use.
```

---

## Understanding Test Results

### Test Status Indicators

- **[TEST]** - Test is starting
- **[PASS]** - Test passed successfully (green)
- **[FAIL]** - Test failed (red)
- **[WARN]** - Warning, test unclear (yellow)
- **[INFO]** - Informational message (blue)
- **[VERBOSE]** - Detailed information (only with --verbose)

### Pass Rate Interpretation

| Pass Rate | Status | Action |
|-----------|--------|--------|
| 100% | ✅ Excellent | Ready for production |
| 95-99% | ✅ Good | Review warnings |
| 90-94% | ⚠️ Acceptable | Fix failing tests |
| 85-89% | ⚠️ Needs work | Investigate failures |
| <85% | ❌ Critical | Major issues present |

### Common Test Outcomes

#### All Tests Pass (100%)

```
Tests Run:    44
Tests Passed: 44
Tests Failed: 0
Pass Rate:    100%
```

**Meaning:** Wizard is fully functional and ready for use.

**Action:** None required. Proceed with confidence.

#### Some Tests Fail (<100%)

```
Tests Run:    44
Tests Passed: 40
Tests Failed: 4
Pass Rate:    91%
```

**Meaning:** Some functionality may not work correctly.

**Action:** Review failed tests and fix issues before deployment.

#### Many Tests Fail (<85%)

```
Tests Run:    44
Tests Passed: 35
Tests Failed: 9
Pass Rate:    80%
```

**Meaning:** Major issues with wizard functionality.

**Action:** Do not deploy. Investigate and fix critical issues.

---

## Manual Testing

### Prerequisites Check

```bash
# Check Docker
docker --version
docker ps

# Check Docker Compose
docker compose version

# Check wizard script
ls -la scripts/wizard.sh
```

### Start Wizard

```bash
# Start wizard
./scripts/wizard.sh start

# Check status
./scripts/wizard.sh status

# View logs
./scripts/wizard.sh logs
```

### Test Frontend

1. **Open browser:** http://localhost:3000

2. **Verify elements:**
   - [ ] Wizard loads without errors
   - [ ] Kaspa branding visible
   - [ ] Progress indicator present
   - [ ] All 7 steps accessible
   - [ ] Navigation buttons work

3. **Check browser console:**
   - Open Developer Tools (F12)
   - Look for JavaScript errors
   - Verify no 404 errors for assets

### Test API Endpoints

```bash
# Health check
curl http://localhost:3000/api/health
# Expected: {"status":"ok","version":"1.0.0"}

# Wizard mode
curl http://localhost:3000/api/wizard/mode
# Expected: {"mode":"install","autoStart":false}

# System check
curl http://localhost:3000/api/system-check
# Expected: JSON with docker, resources, ports

# Profiles
curl http://localhost:3000/api/profiles
# Expected: Array of 6 profiles

# Password generation
curl http://localhost:3000/api/config/password
# Expected: {"password":"..."}
```

### Test Configuration Generation

```bash
# Generate config for Core profile
curl -X POST http://localhost:3000/api/config/generate \
  -H "Content-Type: application/json" \
  -d '{"profiles":["core"],"kaspaNodeRpc":"localhost:16110"}'

# Expected: Configuration with COMPOSE_PROFILES=core
```

### Test Reconfiguration Mode

```bash
# Create test .env
echo "COMPOSE_PROFILES=core" > .env

# Stop wizard
./scripts/wizard.sh stop

# Start in reconfigure mode
./scripts/wizard.sh reconfigure

# Check mode
curl http://localhost:3000/api/wizard/mode
# Expected: {"mode":"reconfigure"}

# Get current config
curl http://localhost:3000/api/reconfigure/current
# Expected: Current configuration
```

### Test Error Handling

```bash
# Test invalid profile
curl -X POST http://localhost:3000/api/config/generate \
  -H "Content-Type: application/json" \
  -d '{"profiles":["invalid_profile"]}'
# Expected: Error or empty config

# Test malformed JSON
curl -X POST http://localhost:3000/api/config/generate \
  -H "Content-Type: application/json" \
  -d '{invalid json}'
# Expected: Error response

# Test missing fields
curl -X POST http://localhost:3000/api/config/generate \
  -H "Content-Type: application/json" \
  -d '{}'
# Expected: Error or validation message
```

---

## Troubleshooting Test Failures

### Test 1-4: Setup Tests Fail

**Symptoms:**
- Wizard script not found
- Service not defined
- Dockerfile missing
- Backend files missing

**Solutions:**

```bash
# Verify project structure
ls -la scripts/wizard.sh
ls -la services/wizard/Dockerfile
ls -la services/wizard/backend/src/

# Check git status
git status

# Pull latest changes
git pull

# Verify docker-compose.yml
grep -A20 "wizard:" docker-compose.yml
```

### Test 5: Wizard Won't Start

**Symptoms:**
- Wizard fails to start
- Container exits immediately
- Health check never passes

**Solutions:**

```bash
# Check Docker
docker ps
docker images | grep wizard

# Check port availability
lsof -i :3000

# View wizard logs
docker logs kaspa-wizard

# Rebuild wizard
docker compose --profile wizard build wizard

# Try starting manually
docker compose --profile wizard up wizard
```

### Test 6-11: API Tests Fail

**Symptoms:**
- Health endpoint returns 404 or 500
- API endpoints not responding
- Frontend not loading

**Solutions:**

```bash
# Check wizard is running
docker ps | grep wizard

# Check wizard logs for errors
docker logs kaspa-wizard | grep -i error

# Test with curl
curl -v http://localhost:3000/api/health

# Check backend is running
docker exec kaspa-wizard ps aux | grep node

# Restart wizard
./scripts/wizard.sh restart install
```

### Test 12-15: Mode and Status Tests Fail

**Symptoms:**
- Mode endpoint returns wrong mode
- Status command fails
- Wizard won't stop/restart

**Solutions:**

```bash
# Check environment variables
docker exec kaspa-wizard env | grep WIZARD

# Check wizard state
ls -la .wizard-state

# Force stop
docker stop kaspa-wizard
docker rm kaspa-wizard

# Restart
./scripts/wizard.sh start install
```

### Profile Tests Fail

**Symptoms:**
- Profile not found in API
- Configuration generation fails
- Dependencies not defined

**Solutions:**

```bash
# Check profiles API
curl http://localhost:3000/api/profiles | jq

# Check profile manager
docker exec kaspa-wizard cat /app/backend/src/utils/profile-manager.js

# Verify docker-compose.yml profiles
grep -A5 "profiles:" docker-compose.yml

# Restart wizard
./scripts/wizard.sh restart install
```

### Reconfiguration Tests Fail

**Symptoms:**
- Mode not detected correctly
- Configuration not loaded
- Update fails

**Solutions:**

```bash
# Check .env file exists
ls -la .env

# Check .env content
cat .env

# Test reconfigure API
curl http://localhost:3000/api/reconfigure/current

# Restart in reconfigure mode
./scripts/wizard.sh stop
./scripts/wizard.sh reconfigure
```

### Error Handling Tests Fail

**Symptoms:**
- Invalid input accepted
- No error messages
- Validation not working

**Solutions:**

```bash
# Check error handler
docker exec kaspa-wizard cat /app/backend/src/utils/error-handler.js

# Check validation middleware
docker exec kaspa-wizard cat /app/backend/src/middleware/security.js

# Test with verbose logging
docker logs kaspa-wizard -f
# Then run failing test
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Wizard Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test-wizard:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Docker
      uses: docker/setup-buildx-action@v2
    
    - name: Build wizard
      run: docker compose --profile wizard build wizard
    
    - name: Run wizard tests
      run: ./test-wizard-integration.sh
    
    - name: Upload test results
      if: always()
      uses: actions/upload-artifact@v3
      with:
        name: wizard-test-results
        path: |
          wizard-test-results.txt
          docker-logs/
```

### GitLab CI Example

```yaml
wizard-tests:
  stage: test
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker compose --profile wizard build wizard
    - ./test-wizard-integration.sh
  artifacts:
    when: always
    paths:
      - wizard-test-results.txt
      - docker-logs/
```

### Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "Running wizard tests..."
./test-wizard-integration.sh

if [ $? -ne 0 ]; then
    echo "Wizard tests failed. Commit aborted."
    exit 1
fi

echo "All tests passed!"
exit 0
```

---

## Test Maintenance

### Adding New Tests

1. **Identify test category:**
   - Basic integration
   - Profile testing
   - Reconfiguration
   - Error handling

2. **Create test function:**
   ```bash
   test_new_feature() {
       TESTS_RUN=$((TESTS_RUN + 1))
       log "Test: New feature description"
       
       # Test logic here
       
       if [[ condition ]]; then
           pass "New feature works"
           return 0
       else
           fail "New feature failed"
           return 1
       fi
   }
   ```

3. **Add to main function:**
   ```bash
   # In appropriate section
   test_new_feature
   ```

4. **Test the test:**
   ```bash
   ./test-wizard-integration.sh --verbose
   ```

### Updating Tests

When wizard functionality changes:

1. Review affected tests
2. Update test expectations
3. Add new tests for new features
4. Remove obsolete tests
5. Update documentation

### Test Best Practices

- ✅ Keep tests independent
- ✅ Clean up after tests
- ✅ Use descriptive test names
- ✅ Test both success and failure cases
- ✅ Provide clear error messages
- ✅ Document test purpose
- ✅ Keep tests fast (<5 minutes total)

---

## Conclusion

The wizard test suite provides comprehensive coverage of all wizard functionality. Regular testing ensures the wizard remains reliable and functional as the project evolves.

**Key Points:**

✅ Run tests before deploying  
✅ Aim for 100% pass rate  
✅ Investigate all failures  
✅ Use verbose mode for debugging  
✅ Keep tests up to date  
✅ Integrate with CI/CD  

**Need Help?**

- Review test output carefully
- Check troubleshooting section
- View wizard logs: `docker logs kaspa-wizard`
- Run with `--verbose` for details
- Open GitHub issue with test results

Happy testing! 🧪
