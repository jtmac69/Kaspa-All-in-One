#!/usr/bin/env node

/**
 * Test Dashboard Integration API
 * 
 * Tests all dashboard integration endpoints:
 * - GET /api/wizard/reconfigure-link
 * - GET /api/wizard/update-link
 * - GET /api/wizard/token-data
 * - POST /api/wizard/sync-status
 * - POST /api/wizard/launcher
 * - GET /api/wizard/health
 * - DELETE /api/wizard/token/:token
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const WIZARD_URL = process.env.WIZARD_URL || 'http://localhost:3000';
const PROJECT_ROOT = process.env.PROJECT_ROOT || path.resolve(__dirname, '../../..');

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

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

function logSection(message) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(message, 'cyan');
  log('='.repeat(60), 'cyan');
}

// Test results tracking
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

async function test(name, fn) {
  results.total++;
  try {
    await fn();
    results.passed++;
    logSuccess(name);
    return true;
  } catch (error) {
    results.failed++;
    logError(`${name}: ${error.message}`);
    results.errors.push({ test: name, error: error.message });
    return false;
  }
}

// Setup: Create test configuration files
async function setup() {
  logSection('Setup: Creating Test Configuration');
  
  try {
    // Create .kaspa-aio directory
    const kaspaAioDir = path.join(PROJECT_ROOT, '.kaspa-aio');
    await fs.mkdir(kaspaAioDir, { recursive: true });
    logInfo('Created .kaspa-aio directory');
    
    // Create test .env file
    const envPath = path.join(PROJECT_ROOT, '.env');
    const envContent = `# Test Configuration
KASPA_NODE_RPC_PORT=16110
KASPA_NODE_P2P_PORT=16111
KASPA_NETWORK=mainnet
DASHBOARD_PORT=8080
POSTGRES_USER=kaspa
POSTGRES_PASSWORD=test123
`;
    
    await fs.writeFile(envPath, envContent);
    logInfo('Created test .env file');
    
    // Create test installation-state.json
    const statePath = path.join(kaspaAioDir, 'installation-state.json');
    const stateContent = {
      version: '1.0.0',
      installedAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      mode: 'initial',
      profiles: {
        selected: ['core', 'kaspa-user-applications'],
        configuration: {
          KASPA_NODE_RPC_PORT: 16110,
          KASPA_NODE_P2P_PORT: 16111
        }
      },
      services: [
        { name: 'kaspa-node', version: '1.0.0', status: 'running' },
        { name: 'dashboard', version: '1.0.0', status: 'running' }
      ],
      history: []
    };
    
    await fs.writeFile(statePath, JSON.stringify(stateContent, null, 2));
    logInfo('Created test installation-state.json');
    
    logSuccess('Setup completed successfully');
  } catch (error) {
    logError(`Setup failed: ${error.message}`);
    throw error;
  }
}

// Test 1: Health Check
async function testHealthCheck() {
  await test('Health check endpoint', async () => {
    const response = await axios.get(`${WIZARD_URL}/api/wizard/health`);
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    if (!response.data.success) {
      throw new Error('Health check returned success: false');
    }
    
    if (response.data.status !== 'healthy') {
      throw new Error(`Expected status "healthy", got "${response.data.status}"`);
    }
    
    logInfo(`  Version: ${response.data.version}`);
    logInfo(`  Uptime: ${response.data.uptime}s`);
  });
}

// Test 2: Generate Reconfigure Link
async function testReconfigureLink() {
  let token = null;
  
  await test('Generate reconfigure link', async () => {
    const response = await axios.get(`${WIZARD_URL}/api/wizard/reconfigure-link`);
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    if (!response.data.success) {
      throw new Error('Failed to generate reconfigure link');
    }
    
    if (!response.data.url) {
      throw new Error('No URL in response');
    }
    
    if (!response.data.token) {
      throw new Error('No token in response');
    }
    
    token = response.data.token;
    logInfo(`  URL: ${response.data.url}`);
    logInfo(`  Token: ${token.substring(0, 16)}...`);
    logInfo(`  Expires in: ${response.data.expiresIn}ms`);
  });
  
  return token;
}

// Test 3: Generate Update Link
async function testUpdateLink() {
  let token = null;
  
  await test('Generate update link', async () => {
    const updates = [
      {
        service: 'kaspa-node',
        currentVersion: '1.0.0',
        availableVersion: '1.1.0',
        changelog: 'Bug fixes and improvements',
        breaking: false,
        releaseDate: '2024-01-01'
      },
      {
        service: 'dashboard',
        currentVersion: '1.0.0',
        availableVersion: '1.2.0',
        changelog: 'New features',
        breaking: false,
        releaseDate: '2024-01-02'
      }
    ];
    
    const response = await axios.get(`${WIZARD_URL}/api/wizard/update-link`, {
      params: {
        updates: JSON.stringify(updates)
      }
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    if (!response.data.success) {
      throw new Error('Failed to generate update link');
    }
    
    if (!response.data.url) {
      throw new Error('No URL in response');
    }
    
    if (!response.data.token) {
      throw new Error('No token in response');
    }
    
    if (!Array.isArray(response.data.updates) || response.data.updates.length !== 2) {
      throw new Error('Updates not returned correctly');
    }
    
    token = response.data.token;
    logInfo(`  URL: ${response.data.url}`);
    logInfo(`  Token: ${token.substring(0, 16)}...`);
    logInfo(`  Updates: ${response.data.updates.length} services`);
  });
  
  return token;
}

// Test 4: Retrieve Token Data
async function testTokenData(token) {
  await test('Retrieve token data', async () => {
    if (!token) {
      throw new Error('No token provided');
    }
    
    const response = await axios.get(`${WIZARD_URL}/api/wizard/token-data`, {
      params: { token }
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    if (!response.data.success) {
      throw new Error('Failed to retrieve token data');
    }
    
    if (!response.data.mode) {
      throw new Error('No mode in response');
    }
    
    logInfo(`  Mode: ${response.data.mode}`);
    logInfo(`  Purpose: ${response.data.purpose}`);
  });
}

// Test 5: Invalid Token
async function testInvalidToken() {
  await test('Reject invalid token', async () => {
    try {
      await axios.get(`${WIZARD_URL}/api/wizard/token-data`, {
        params: { token: 'invalid-token-12345' }
      });
      throw new Error('Should have rejected invalid token');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        // Expected behavior
        return;
      }
      throw error;
    }
  });
}

// Test 6: Sync Status (from dashboard)
async function testSyncStatusFromDashboard() {
  await test('Sync status from dashboard', async () => {
    const response = await axios.post(`${WIZARD_URL}/api/wizard/sync-status`, {
      source: 'dashboard',
      services: [
        { name: 'kaspa-node', status: 'running' },
        { name: 'dashboard', status: 'running' }
      ]
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    if (!response.data.success) {
      throw new Error('Sync status failed');
    }
    
    if (!Array.isArray(response.data.services)) {
      throw new Error('No services array in response');
    }
    
    logInfo(`  Services: ${response.data.services.length}`);
    logInfo(`  Timestamp: ${response.data.timestamp}`);
  });
}

// Test 7: Sync Status (from wizard)
async function testSyncStatusFromWizard() {
  await test('Sync status from wizard', async () => {
    const wizardState = {
      currentStep: 5,
      phase: 'validating',
      profiles: {
        selected: ['core', 'kaspa-user-applications']
      }
    };
    
    const response = await axios.post(`${WIZARD_URL}/api/wizard/sync-status`, {
      source: 'wizard',
      wizardState
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    if (!response.data.success) {
      throw new Error('Sync status failed');
    }
    
    logInfo(`  Wizard state saved`);
  });
}

// Test 8: Launch Wizard (Install Mode)
async function testLauncherInstallMode() {
  await test('Launch wizard in install mode', async () => {
    const response = await axios.post(`${WIZARD_URL}/api/wizard/launcher`, {
      mode: 'install',
      autoOpen: false
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    if (!response.data.success) {
      throw new Error('Failed to launch wizard');
    }
    
    if (response.data.mode !== 'install') {
      throw new Error(`Expected mode "install", got "${response.data.mode}"`);
    }
    
    logInfo(`  URL: ${response.data.url}`);
    logInfo(`  Mode: ${response.data.mode}`);
  });
}

// Test 9: Launch Wizard (Reconfigure Mode)
async function testLauncherReconfigureMode() {
  await test('Launch wizard in reconfigure mode', async () => {
    const response = await axios.post(`${WIZARD_URL}/api/wizard/launcher`, {
      mode: 'reconfigure',
      autoOpen: false
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    if (!response.data.success) {
      throw new Error('Failed to launch wizard');
    }
    
    if (response.data.mode !== 'reconfigure') {
      throw new Error(`Expected mode "reconfigure", got "${response.data.mode}"`);
    }
    
    logInfo(`  URL: ${response.data.url}`);
    logInfo(`  Mode: ${response.data.mode}`);
  });
}

// Test 10: Launch Wizard (Update Mode)
async function testLauncherUpdateMode() {
  await test('Launch wizard in update mode', async () => {
    const updates = [
      {
        service: 'kaspa-node',
        currentVersion: '1.0.0',
        availableVersion: '1.1.0'
      }
    ];
    
    const response = await axios.post(`${WIZARD_URL}/api/wizard/launcher`, {
      mode: 'update',
      updates,
      autoOpen: false
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    if (!response.data.success) {
      throw new Error('Failed to launch wizard');
    }
    
    if (response.data.mode !== 'update') {
      throw new Error(`Expected mode "update", got "${response.data.mode}"`);
    }
    
    logInfo(`  URL: ${response.data.url}`);
    logInfo(`  Mode: ${response.data.mode}`);
  });
}

// Test 11: Invalid Launcher Mode
async function testInvalidLauncherMode() {
  await test('Reject invalid launcher mode', async () => {
    try {
      await axios.post(`${WIZARD_URL}/api/wizard/launcher`, {
        mode: 'invalid-mode',
        autoOpen: false
      });
      throw new Error('Should have rejected invalid mode');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        // Expected behavior
        return;
      }
      throw error;
    }
  });
}

// Test 12: Delete Token
async function testDeleteToken(token) {
  await test('Delete/invalidate token', async () => {
    if (!token) {
      throw new Error('No token provided');
    }
    
    const response = await axios.delete(`${WIZARD_URL}/api/wizard/token/${token}`);
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    if (!response.data.success) {
      throw new Error('Failed to delete token');
    }
    
    logInfo(`  Token invalidated`);
    
    // Verify token is now invalid
    try {
      await axios.get(`${WIZARD_URL}/api/wizard/token-data`, {
        params: { token }
      });
      throw new Error('Token should be invalid after deletion');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        // Expected behavior
        return;
      }
      throw error;
    }
  });
}

// Main test runner
async function runTests() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║     Dashboard Integration API Test Suite                  ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');
  
  try {
    // Setup
    await setup();
    
    // Run tests
    logSection('Test 1: Health Check');
    await testHealthCheck();
    
    logSection('Test 2-4: Reconfigure Link Flow');
    const reconfigureToken = await testReconfigureLink();
    await testTokenData(reconfigureToken);
    
    logSection('Test 5-6: Update Link Flow');
    const updateToken = await testUpdateLink();
    await testTokenData(updateToken);
    
    logSection('Test 7: Invalid Token Handling');
    await testInvalidToken();
    
    logSection('Test 8-9: Status Synchronization');
    await testSyncStatusFromDashboard();
    await testSyncStatusFromWizard();
    
    logSection('Test 10-13: Wizard Launcher');
    await testLauncherInstallMode();
    await testLauncherReconfigureMode();
    await testLauncherUpdateMode();
    await testInvalidLauncherMode();
    
    logSection('Test 14: Token Deletion');
    await testDeleteToken(reconfigureToken);
    
    // Print summary
    logSection('Test Summary');
    log(`Total Tests: ${results.total}`, 'cyan');
    log(`Passed: ${results.passed}`, 'green');
    log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
    
    if (results.failed > 0) {
      log('\nFailed Tests:', 'red');
      results.errors.forEach(({ test, error }) => {
        log(`  - ${test}: ${error}`, 'red');
      });
    }
    
    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
    
  } catch (error) {
    logError(`\nTest suite failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run tests
runTests();
