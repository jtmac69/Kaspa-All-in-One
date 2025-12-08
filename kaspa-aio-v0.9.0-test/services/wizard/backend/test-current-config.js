/**
 * Test current configuration loading
 * Tests the /api/wizard/current-config endpoint
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

async function setupTestConfig() {
  const envPath = path.join(PROJECT_ROOT, '.env');
  const stateDir = path.join(PROJECT_ROOT, '.kaspa-aio');
  const statePath = path.join(stateDir, 'installation-state.json');
  
  // Create test .env file
  const envContent = `# Kaspa All-in-One Configuration
KASPA_NODE_RPC_PORT=16110
KASPA_NODE_P2P_PORT=16111
POSTGRES_USER=kaspa
POSTGRES_PASSWORD=test_password_123
POSTGRES_DB=kaspa_db
DASHBOARD_PORT=8080
PUBLIC_NODE=false
KASPA_NETWORK=mainnet
`;
  
  await fs.writeFile(envPath, envContent);
  log('Created test .env file', 'cyan');
  
  // Create test installation state
  await fs.mkdir(stateDir, { recursive: true });
  const state = {
    version: '1.0.0',
    installedAt: '2024-01-15T10:30:00.000Z',
    lastModified: '2024-01-15T10:45:00.000Z',
    mode: 'initial',
    phase: 'complete',
    profiles: {
      selected: ['core', 'kaspa-user-applications', 'indexer-services'],
      configuration: {
        developerMode: false,
        nodeUsage: 'local'
      }
    },
    services: [
      {
        name: 'kaspa-node',
        version: '0.13.0',
        status: 'running',
        lastUpdated: '2024-01-15T10:40:00.000Z'
      },
      {
        name: 'kasia-app',
        version: '1.0.0',
        status: 'running',
        lastUpdated: '2024-01-15T10:42:00.000Z'
      }
    ],
    history: [
      {
        timestamp: '2024-01-15T10:30:00.000Z',
        action: 'install',
        changes: ['Initial installation'],
        user: 'test-user'
      }
    ]
  };
  
  await fs.writeFile(statePath, JSON.stringify(state, null, 2));
  log('Created test installation-state.json', 'cyan');
}

async function cleanupTestConfig() {
  const envPath = path.join(PROJECT_ROOT, '.env');
  const statePath = path.join(PROJECT_ROOT, '.kaspa-aio', 'installation-state.json');
  
  try {
    await fs.unlink(envPath);
    log('Cleaned up test .env file', 'cyan');
  } catch {}
  
  try {
    await fs.unlink(statePath);
    log('Cleaned up test installation-state.json', 'cyan');
  } catch {}
}

async function testLoadConfig() {
  log('\n=== Test: Load Current Configuration ===\n', 'blue');
  
  try {
    // Setup test configuration
    log('Setting up test configuration...', 'cyan');
    await setupTestConfig();
    
    // Make request
    log('\nRequesting current configuration...', 'cyan');
    const response = await makeRequest('/api/wizard/current-config');
    
    if (response.status !== 200) {
      log(`✗ FAIL: Expected status 200, got ${response.status}`, 'red');
      return false;
    }
    
    const data = response.data;
    
    // Validate response structure
    if (!data.success) {
      log(`✗ FAIL: Response indicates failure: ${data.error}`, 'red');
      return false;
    }
    
    log('✓ Response indicates success', 'green');
    
    // Check config
    if (!data.config) {
      log('✗ FAIL: No config in response', 'red');
      return false;
    }
    
    log('✓ Config loaded', 'green');
    log(`  KASPA_NODE_RPC_PORT: ${data.config.KASPA_NODE_RPC_PORT}`, 'cyan');
    log(`  POSTGRES_USER: ${data.config.POSTGRES_USER}`, 'cyan');
    log(`  PUBLIC_NODE: ${data.config.PUBLIC_NODE}`, 'cyan');
    
    // Check installation state
    if (!data.installationState) {
      log('✗ FAIL: No installation state in response', 'red');
      return false;
    }
    
    log('✓ Installation state loaded', 'green');
    log(`  Phase: ${data.installationState.phase}`, 'cyan');
    log(`  Installed at: ${data.installationState.installedAt}`, 'cyan');
    
    // Check profiles
    if (!data.profiles || !Array.isArray(data.profiles)) {
      log('✗ FAIL: No profiles array in response', 'red');
      return false;
    }
    
    log('✓ Profiles loaded', 'green');
    log(`  Selected profiles: ${data.profiles.join(', ')}`, 'cyan');
    
    // Check timestamps
    if (!data.installedAt || !data.lastModified) {
      log('⚠ WARNING: Missing timestamp information', 'yellow');
    } else {
      log('✓ Timestamp information present', 'green');
      log(`  Installed at: ${data.installedAt}`, 'cyan');
      log(`  Last modified: ${data.lastModified}`, 'cyan');
    }
    
    log('\n✓ All checks passed!', 'green');
    return true;
  } catch (error) {
    log(`✗ FAIL: ${error.message}`, 'red');
    return false;
  } finally {
    // Cleanup
    log('\nCleaning up test configuration...', 'cyan');
    await cleanupTestConfig();
  }
}

async function testLoadConfigNoFiles() {
  log('\n=== Test: Load Config (No Files) ===\n', 'blue');
  
  try {
    // Ensure no files exist
    await cleanupTestConfig();
    
    // Make request
    log('Requesting current configuration (no files)...', 'cyan');
    const response = await makeRequest('/api/wizard/current-config');
    
    if (response.status !== 404) {
      log(`✗ FAIL: Expected status 404, got ${response.status}`, 'red');
      return false;
    }
    
    log('✓ Correctly returned 404 status', 'green');
    
    const data = response.data;
    
    if (data.success) {
      log('✗ FAIL: Response should indicate failure', 'red');
      return false;
    }
    
    log('✓ Response indicates failure', 'green');
    log(`  Error: ${data.error}`, 'cyan');
    
    log('\n✓ Test passed!', 'green');
    return true;
  } catch (error) {
    log(`✗ FAIL: ${error.message}`, 'red');
    return false;
  }
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
  
  // Run tests
  const test1 = await testLoadConfig();
  const test2 = await testLoadConfigNoFiles();
  
  // Summary
  log('\n=== Test Summary ===', 'blue');
  const passed = [test1, test2].filter(Boolean).length;
  const total = 2;
  
  log(`Total: ${total}`, 'cyan');
  log(`Passed: ${passed}`, 'green');
  log(`Failed: ${total - passed}`, total - passed > 0 ? 'red' : 'cyan');
  
  if (passed === total) {
    log('\n✓ All tests passed!', 'green');
  } else {
    log(`\n✗ ${total - passed} test(s) failed`, 'red');
  }
  
  process.exit(passed === total ? 0 : 1);
})();
