/**
 * Test wizard mode detection
 * Tests the /api/wizard/mode endpoint with different scenarios
 */

const http = require('http');
const fs = require('fs').promises;
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const PROJECT_ROOT = path.resolve(__dirname, '../../..');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}${path}`;
    
    http.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

async function setupTestEnvironment(scenario) {
  const envPath = path.join(PROJECT_ROOT, '.env');
  const stateDir = path.join(PROJECT_ROOT, '.kaspa-aio');
  const statePath = path.join(stateDir, 'installation-state.json');
  
  // Clean up existing files
  try {
    await fs.unlink(envPath);
  } catch {}
  
  try {
    await fs.unlink(statePath);
  } catch {}
  
  // Set up scenario
  if (scenario === 'fresh') {
    // No files - fresh installation
    log('  Setup: No configuration files (fresh installation)', 'cyan');
  } else if (scenario === 'with-env') {
    // Create .env file
    await fs.writeFile(envPath, 'KASPA_NODE_RPC_PORT=16110\nPOSTGRES_PASSWORD=test123\n');
    log('  Setup: Created .env file', 'cyan');
  } else if (scenario === 'with-state') {
    // Create installation state
    await fs.mkdir(stateDir, { recursive: true });
    const state = {
      version: '1.0.0',
      installedAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      phase: 'complete',
      profiles: {
        selected: ['core', 'kaspa-user-applications']
      }
    };
    await fs.writeFile(statePath, JSON.stringify(state, null, 2));
    log('  Setup: Created installation-state.json', 'cyan');
  } else if (scenario === 'complete') {
    // Create both files
    await fs.writeFile(envPath, 'KASPA_NODE_RPC_PORT=16110\nPOSTGRES_PASSWORD=test123\n');
    await fs.mkdir(stateDir, { recursive: true });
    const state = {
      version: '1.0.0',
      installedAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      phase: 'complete',
      profiles: {
        selected: ['core', 'kaspa-user-applications']
      }
    };
    await fs.writeFile(statePath, JSON.stringify(state, null, 2));
    log('  Setup: Created .env and installation-state.json', 'cyan');
  } else if (scenario === 'incomplete') {
    // Create state with incomplete installation
    await fs.mkdir(stateDir, { recursive: true });
    const state = {
      version: '1.0.0',
      startedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      phase: 'building',
      currentStep: 5,
      profiles: {
        selected: ['core']
      }
    };
    await fs.writeFile(statePath, JSON.stringify(state, null, 2));
    log('  Setup: Created installation-state.json (incomplete)', 'cyan');
  }
}

async function testModeDetection(testName, scenario, urlParams = '', expectedMode) {
  log(`\n${testName}`, 'blue');
  
  try {
    // Setup test environment
    await setupTestEnvironment(scenario);
    
    // Make request
    const path = `/api/wizard/mode${urlParams}`;
    log(`  Request: GET ${path}`, 'cyan');
    
    const response = await makeRequest(path);
    
    if (response.status !== 200) {
      log(`  ✗ FAIL: Expected status 200, got ${response.status}`, 'red');
      return false;
    }
    
    const data = response.data;
    
    // Check mode
    if (data.mode !== expectedMode) {
      log(`  ✗ FAIL: Expected mode '${expectedMode}', got '${data.mode}'`, 'red');
      log(`  Reason: ${data.reason}`, 'yellow');
      return false;
    }
    
    log(`  ✓ Mode: ${data.mode}`, 'green');
    log(`  Reason: ${data.reason}`, 'cyan');
    log(`  Has existing config: ${data.hasExistingConfig}`, 'cyan');
    log(`  Has installation state: ${data.hasInstallationState}`, 'cyan');
    log(`  Can reconfigure: ${data.canReconfigure}`, 'cyan');
    log(`  Can update: ${data.canUpdate}`, 'cyan');
    
    log(`  ✓ PASS`, 'green');
    return true;
  } catch (error) {
    log(`  ✗ FAIL: ${error.message}`, 'red');
    return false;
  }
}

async function runTests() {
  log('\n=== Wizard Mode Detection Tests ===\n', 'blue');
  
  const tests = [
    {
      name: 'Test 1: Fresh installation (no files)',
      scenario: 'fresh',
      urlParams: '',
      expectedMode: 'initial'
    },
    {
      name: 'Test 2: Only .env exists',
      scenario: 'with-env',
      urlParams: '',
      expectedMode: 'reconfigure'
    },
    {
      name: 'Test 3: Only installation state exists',
      scenario: 'with-state',
      urlParams: '',
      expectedMode: 'reconfigure'
    },
    {
      name: 'Test 4: Complete installation (both files)',
      scenario: 'complete',
      urlParams: '',
      expectedMode: 'reconfigure'
    },
    {
      name: 'Test 5: Incomplete installation',
      scenario: 'incomplete',
      urlParams: '',
      expectedMode: 'initial'
    },
    {
      name: 'Test 6: URL parameter overrides (mode=install)',
      scenario: 'complete',
      urlParams: '?mode=install',
      expectedMode: 'initial'
    },
    {
      name: 'Test 7: URL parameter overrides (mode=reconfigure)',
      scenario: 'fresh',
      urlParams: '?mode=reconfigure',
      expectedMode: 'reconfigure'
    },
    {
      name: 'Test 8: URL parameter overrides (mode=update)',
      scenario: 'complete',
      urlParams: '?mode=update',
      expectedMode: 'update'
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    const result = await testModeDetection(
      test.name,
      test.scenario,
      test.urlParams,
      test.expectedMode
    );
    
    if (result) {
      passed++;
    } else {
      failed++;
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Summary
  log('\n=== Test Summary ===', 'blue');
  log(`Total: ${tests.length}`, 'cyan');
  log(`Passed: ${passed}`, 'green');
  log(`Failed: ${failed}`, failed > 0 ? 'red' : 'cyan');
  
  if (failed === 0) {
    log('\n✓ All tests passed!', 'green');
  } else {
    log(`\n✗ ${failed} test(s) failed`, 'red');
  }
  
  return failed === 0;
}

// Check if server is running
async function checkServer() {
  try {
    await makeRequest('/api/health');
    return true;
  } catch (error) {
    return false;
  }
}

// Main
(async () => {
  log('Checking if wizard backend is running...', 'cyan');
  
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    log('✗ Wizard backend is not running', 'red');
    log('Please start the wizard backend first:', 'yellow');
    log('  cd services/wizard/backend && node src/server.js', 'cyan');
    process.exit(1);
  }
  
  log('✓ Wizard backend is running\n', 'green');
  
  const success = await runTests();
  
  process.exit(success ? 0 : 1);
})();
