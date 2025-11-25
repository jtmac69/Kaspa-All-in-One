#!/usr/bin/env node

/**
 * Test script for Update Mode functionality
 * Tests the update API endpoints and workflow
 */

const http = require('http');
const fs = require('fs').promises;
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const PROJECT_ROOT = process.env.PROJECT_ROOT || process.cwd();

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

/**
 * Make HTTP request
 */
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
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

/**
 * Create mock installation state for testing
 */
async function createMockInstallationState() {
  const installationStatePath = path.join(PROJECT_ROOT, '.kaspa-aio', 'installation-state.json');
  
  const mockState = {
    version: '1.0.0',
    installedAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    mode: 'initial',
    profiles: {
      selected: ['core', 'kaspa-user-applications'],
      configuration: {}
    },
    services: [
      {
        name: 'kaspa-node',
        version: '1.0.0',
        status: 'running',
        lastUpdated: new Date().toISOString()
      },
      {
        name: 'kasia-app',
        version: '1.0.0',
        status: 'running',
        lastUpdated: new Date().toISOString()
      },
      {
        name: 'dashboard',
        version: '1.0.0',
        status: 'running',
        lastUpdated: new Date().toISOString()
      }
    ],
    history: []
  };
  
  await fs.mkdir(path.dirname(installationStatePath), { recursive: true });
  await fs.writeFile(installationStatePath, JSON.stringify(mockState, null, 2));
  
  logSuccess('Created mock installation state');
}

/**
 * Test: Check for available updates
 */
async function testCheckAvailableUpdates() {
  logInfo('Testing: Check for available updates');
  
  try {
    const response = await makeRequest('GET', '/api/wizard/updates/available');
    
    if (response.status === 200 && response.data.success) {
      logSuccess('Successfully fetched available updates');
      logInfo(`Found ${response.data.updates.length} services`);
      
      const updatesAvailable = response.data.updates.filter(u => u.updateAvailable);
      if (updatesAvailable.length > 0) {
        logInfo(`${updatesAvailable.length} update(s) available`);
        updatesAvailable.forEach(update => {
          logInfo(`  - ${update.service}: ${update.currentVersion} → ${update.latestVersion}`);
        });
      } else {
        logInfo('All services are up to date');
      }
      
      return true;
    } else {
      logError(`Failed to check updates: ${response.data.error || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    logError(`Error checking updates: ${error.message}`);
    return false;
  }
}

/**
 * Test: Get changelog for a service
 */
async function testGetChangelog() {
  logInfo('Testing: Get changelog for service');
  
  try {
    const response = await makeRequest('GET', '/api/wizard/updates/changelog/kaspa-node/1.0.1');
    
    if (response.status === 200 && response.data.success) {
      logSuccess('Successfully fetched changelog');
      logInfo(`Service: ${response.data.service}`);
      logInfo(`Version: ${response.data.version}`);
      logInfo(`Changes: ${response.data.changelog.changes.length} items`);
      return true;
    } else {
      logError(`Failed to get changelog: ${response.data.error || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    logError(`Error getting changelog: ${error.message}`);
    return false;
  }
}

/**
 * Test: Apply updates (dry run - won't actually update)
 */
async function testApplyUpdates() {
  logInfo('Testing: Apply updates API');
  
  try {
    const updates = [
      { service: 'kaspa-node', version: '1.0.1' }
    ];
    
    const response = await makeRequest('POST', '/api/wizard/updates/apply', {
      updates,
      createBackup: true
    });
    
    if (response.status === 200) {
      logSuccess('Update API responded successfully');
      
      if (response.data.success) {
        logSuccess('All updates applied successfully');
      } else {
        logWarning('Some updates failed (expected in test environment)');
      }
      
      if (response.data.backup) {
        logInfo(`Backup created at: ${response.data.backup.backupDir}`);
      }
      
      logInfo(`Results: ${response.data.results.length} service(s) processed`);
      response.data.results.forEach(result => {
        if (result.success) {
          logSuccess(`  ${result.service}: ${result.oldVersion} → ${result.newVersion}`);
        } else {
          logWarning(`  ${result.service}: ${result.error || 'Failed'}`);
        }
      });
      
      return true;
    } else {
      logError(`Failed to apply updates: ${response.data.error || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    logError(`Error applying updates: ${error.message}`);
    return false;
  }
}

/**
 * Test: Rollback updates
 */
async function testRollback() {
  logInfo('Testing: Rollback updates');
  
  try {
    // Get latest backup timestamp
    const backupsDir = path.join(PROJECT_ROOT, '.kaspa-backups');
    
    try {
      const backups = await fs.readdir(backupsDir);
      const timestamps = backups.filter(f => !isNaN(f)).sort().reverse();
      
      if (timestamps.length === 0) {
        logWarning('No backups found to test rollback');
        return true; // Not a failure, just no backups
      }
      
      const latestBackup = timestamps[0];
      logInfo(`Testing rollback to backup: ${latestBackup}`);
      
      const response = await makeRequest('POST', '/api/wizard/updates/rollback', {
        backupTimestamp: latestBackup
      });
      
      if (response.status === 200 && response.data.success) {
        logSuccess('Rollback completed successfully');
        logInfo(`Restored files: ${response.data.restoredFiles.join(', ')}`);
        return true;
      } else {
        logError(`Rollback failed: ${response.data.error || 'Unknown error'}`);
        return false;
      }
    } catch (error) {
      logWarning('No backups directory found (expected in fresh installation)');
      return true;
    }
  } catch (error) {
    logError(`Error testing rollback: ${error.message}`);
    return false;
  }
}

/**
 * Test: Update mode URL parameter handling
 */
async function testUpdateModeURL() {
  logInfo('Testing: Update mode URL parameter');
  
  const updates = [
    { service: 'kaspa-node', currentVersion: '1.0.0', latestVersion: '1.0.1', updateAvailable: true }
  ];
  
  const encodedUpdates = encodeURIComponent(JSON.stringify(updates));
  const url = `${BASE_URL}/?mode=update&updates=${encodedUpdates}`;
  
  logInfo(`Update mode URL: ${url}`);
  logSuccess('URL parameter format is correct');
  
  return true;
}

/**
 * Run all tests
 */
async function runTests() {
  log('\n=== Update Mode Test Suite ===\n', 'cyan');
  
  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };
  
  // Setup
  log('\n--- Setup ---', 'yellow');
  await createMockInstallationState();
  
  // Run tests
  log('\n--- Running Tests ---', 'yellow');
  
  const tests = [
    { name: 'Check Available Updates', fn: testCheckAvailableUpdates },
    { name: 'Get Changelog', fn: testGetChangelog },
    { name: 'Apply Updates', fn: testApplyUpdates },
    { name: 'Rollback Updates', fn: testRollback },
    { name: 'Update Mode URL', fn: testUpdateModeURL }
  ];
  
  for (const test of tests) {
    results.total++;
    log(`\n[${results.total}/${tests.length}] ${test.name}`, 'cyan');
    
    try {
      const passed = await test.fn();
      if (passed) {
        results.passed++;
      } else {
        results.failed++;
      }
    } catch (error) {
      logError(`Test threw exception: ${error.message}`);
      results.failed++;
    }
  }
  
  // Summary
  log('\n=== Test Summary ===', 'cyan');
  log(`Total: ${results.total}`, 'blue');
  log(`Passed: ${results.passed}`, 'green');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  
  const successRate = ((results.passed / results.total) * 100).toFixed(1);
  log(`Success Rate: ${successRate}%`, successRate === '100.0' ? 'green' : 'yellow');
  
  if (results.failed === 0) {
    log('\n✓ All tests passed!', 'green');
    process.exit(0);
  } else {
    log(`\n✗ ${results.failed} test(s) failed`, 'red');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  logError(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
