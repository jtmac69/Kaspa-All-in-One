#!/usr/bin/env node

/**
 * Node Sync API Test Suite
 * 
 * Tests the REST API endpoints for node sync monitoring
 */

const http = require('http');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function logSection(title) {
  console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}${title}${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(70)}${colors.reset}\n`);
}

function logTest(message) {
  console.log(`${colors.blue}▶${colors.reset} ${message}`);
}

function logSuccess(message) {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
}

function logError(message) {
  console.log(`${colors.red}✗${colors.reset} ${message}`);
}

function logWarning(message) {
  console.log(`${colors.yellow}⚠${colors.reset} ${message}`);
}

function logInfo(message) {
  console.log(`  ${colors.cyan}ℹ${colors.reset} ${message}`);
}

const API_BASE = 'http://localhost:3000';

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ status: res.statusCode, data: response });
        } catch (error) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function runTest(description, testFn) {
  logTest(description);
  try {
    await testFn();
    logSuccess('Passed');
    return true;
  } catch (error) {
    logError(`Failed: ${error.message}`);
    return false;
  }
}

async function testNodeSyncAPI() {
  logSection('Node Sync API Tests');

  let passedTests = 0;
  let totalTests = 0;

  // Test 1: GET /api/node/sync-status (unreachable node)
  totalTests++;
  if (await runTest('Test 1: GET /api/node/sync-status (unreachable node)', async () => {
    const response = await makeRequest('GET', '/api/node/sync-status?host=nonexistent.local&port=99999');
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error('Expected success: true');
    }

    if (!response.data.status) {
      throw new Error('Expected status object');
    }

    if (response.data.status.connected) {
      throw new Error('Should not connect to nonexistent node');
    }

    logInfo(`Connected: ${response.data.status.connected}`);
    logInfo(`Error: ${response.data.status.error}`);
  })) passedTests++;

  // Test 2: GET /api/node/sync-status (default localhost)
  totalTests++;
  if (await runTest('Test 2: GET /api/node/sync-status (default localhost)', async () => {
    const response = await makeRequest('GET', '/api/node/sync-status');
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error('Expected success: true');
    }

    if (!response.data.status) {
      throw new Error('Expected status object');
    }

    logInfo(`Connected: ${response.data.status.connected}`);
    
    if (response.data.status.connected) {
      logInfo(`Synced: ${response.data.status.synced}`);
      logInfo(`Progress: ${response.data.status.percentage}%`);
      logInfo(`Current Block: ${response.data.status.currentBlock}`);
      logInfo(`Target Block: ${response.data.status.targetBlock}`);
      if (response.data.status.estimatedTimeRemainingFormatted) {
        logInfo(`Time Remaining: ${response.data.status.estimatedTimeRemainingFormatted}`);
      }
    } else {
      logInfo(`Error: ${response.data.status.error}`);
    }
  })) passedTests++;

  // Test 3: GET /api/node/is-reachable
  totalTests++;
  if (await runTest('Test 3: GET /api/node/is-reachable', async () => {
    const response = await makeRequest('GET', '/api/node/is-reachable?host=nonexistent.local&port=99999');
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error('Expected success: true');
    }

    if (typeof response.data.reachable !== 'boolean') {
      throw new Error('Expected reachable to be boolean');
    }

    logInfo(`Reachable: ${response.data.reachable}`);
  })) passedTests++;

  // Test 4: POST /api/node/multi-status
  totalTests++;
  if (await runTest('Test 4: POST /api/node/multi-status', async () => {
    const nodes = [
      { host: 'localhost', port: 16110 },
      { host: 'nonexistent.local', port: 99999 }
    ];

    const response = await makeRequest('POST', '/api/node/multi-status', { nodes });
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error('Expected success: true');
    }

    if (!Array.isArray(response.data.statuses)) {
      throw new Error('Expected statuses array');
    }

    if (response.data.statuses.length !== 2) {
      throw new Error('Expected 2 statuses');
    }

    logInfo(`Received ${response.data.statuses.length} node statuses`);
    response.data.statuses.forEach((status, i) => {
      logInfo(`Node ${i + 1}: connected=${status.connected}`);
    });
  })) passedTests++;

  // Test 5: POST /api/node/multi-status (invalid request)
  totalTests++;
  if (await runTest('Test 5: POST /api/node/multi-status (invalid request)', async () => {
    const response = await makeRequest('POST', '/api/node/multi-status', {});
    
    if (response.status !== 400) {
      throw new Error(`Expected status 400, got ${response.status}`);
    }

    if (response.data.success) {
      throw new Error('Expected success: false');
    }

    logInfo(`Error message: ${response.data.error}`);
  })) passedTests++;

  // Test 6: GET /api/node/sync-rate
  totalTests++;
  if (await runTest('Test 6: GET /api/node/sync-rate', async () => {
    const response = await makeRequest('GET', '/api/node/sync-rate?host=localhost&port=16110');
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error('Expected success: true');
    }

    if (typeof response.data.syncRate !== 'number') {
      throw new Error('Expected syncRate to be number');
    }

    logInfo(`Sync Rate: ${response.data.syncRate} blocks/second`);
    logInfo(`Formatted: ${response.data.formatted}`);
  })) passedTests++;

  // Test 7: DELETE /api/node/sync-history (specific node)
  totalTests++;
  if (await runTest('Test 7: DELETE /api/node/sync-history (specific node)', async () => {
    const response = await makeRequest('DELETE', '/api/node/sync-history?host=localhost&port=16110');
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error('Expected success: true');
    }

    logInfo(`Message: ${response.data.message}`);
  })) passedTests++;

  // Test 8: DELETE /api/node/sync-history (all nodes)
  totalTests++;
  if (await runTest('Test 8: DELETE /api/node/sync-history (all nodes)', async () => {
    const response = await makeRequest('DELETE', '/api/node/sync-history');
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error('Expected success: true');
    }

    logInfo(`Message: ${response.data.message}`);
  })) passedTests++;

  // Summary
  logSection('Test Summary');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`${colors.green}Passed: ${passedTests}${colors.reset}`);
  console.log(`${colors.red}Failed: ${totalTests - passedTests}${colors.reset}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`);

  if (passedTests === totalTests) {
    logSuccess('All tests passed!');
    return true;
  } else {
    logError('Some tests failed');
    return false;
  }
}

async function checkServerRunning() {
  try {
    const response = await makeRequest('GET', '/api/health');
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

// Main execution
async function main() {
  console.log(`${colors.bright}${colors.cyan}`);
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║         Kaspa Node Sync API Test Suite                            ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  // Check if server is running
  logSection('Server Check');
  const serverRunning = await checkServerRunning();
  
  if (!serverRunning) {
    logError('Wizard backend server is not running on http://localhost:3000');
    logInfo('Please start the server first:');
    logInfo('  cd services/wizard/backend');
    logInfo('  node src/server.js');
    process.exit(1);
  }

  logSuccess('Server is running');

  // Run API tests
  const apiTestsPassed = await testNodeSyncAPI();

  console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.bright}Testing Complete${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(70)}${colors.reset}\n`);

  process.exit(apiTestsPassed ? 0 : 1);
}

main().catch(error => {
  logError(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
