#!/usr/bin/env node

/**
 * Test Reconfiguration Mode
 * Tests the enhanced reconfiguration API endpoints
 */

const http = require('http');
const fs = require('fs').promises;
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const PROJECT_ROOT = path.resolve(__dirname, '../../..');

// Set PROJECT_ROOT for the server
process.env.PROJECT_ROOT = PROJECT_ROOT;

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

async function setupTestEnvironment() {
  log('\n📋 Setting up test environment...', 'cyan');
  
  // Create test .env file
  const envPath = path.join(PROJECT_ROOT, '.env');
  const testEnvContent = `# Test Configuration
KASPA_NODE_RPC_PORT=16110
KASPA_NODE_P2P_PORT=16111
DASHBOARD_PORT=8080
POSTGRES_USER=kaspa
POSTGRES_PASSWORD=test123
KASPA_NETWORK=mainnet
`;
  
  await fs.writeFile(envPath, testEnvContent);
  log('✓ Created test .env file', 'green');
  
  // Create test installation state
  const stateDir = path.join(PROJECT_ROOT, '.kaspa-aio');
  await fs.mkdir(stateDir, { recursive: true });
  
  const installationState = {
    version: '1.0.0',
    installedAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    mode: 'initial',
    profiles: {
      selected: ['core'],
      configuration: {
        KASPA_NODE_RPC_PORT: '16110',
        KASPA_NODE_P2P_PORT: '16111',
        DASHBOARD_PORT: '8080'
      }
    },
    history: []
  };
  
  const statePath = path.join(stateDir, 'installation-state.json');
  await fs.writeFile(statePath, JSON.stringify(installationState, null, 2));
  log('✓ Created test installation state', 'green');
}

async function testGetCurrentConfig() {
  log('\n🧪 Test 1: GET /api/wizard/current-config', 'blue');
  
  try {
    const response = await makeRequest('GET', '/api/wizard/current-config');
    
    if (response.status === 200 && response.data.success) {
      log('✓ Successfully retrieved current configuration', 'green');
      log(`  - Has existing config: ${response.data.hasExistingConfig}`, 'cyan');
      log(`  - Active profiles: ${response.data.activeProfiles.join(', ')}`, 'cyan');
      log(`  - Mode: ${response.data.mode}`, 'cyan');
      
      if (response.data.currentConfig) {
        const configKeys = Object.keys(response.data.currentConfig);
        log(`  - Config keys: ${configKeys.length}`, 'cyan');
      }
      
      return true;
    } else {
      log(`✗ Failed: ${response.data.error || 'Unknown error'}`, 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    return false;
  }
}

async function testCreateBackup() {
  log('\n🧪 Test 2: POST /api/wizard/reconfigure/backup', 'blue');
  
  try {
    const response = await makeRequest('POST', '/api/wizard/reconfigure/backup', {
      reason: 'Test backup before reconfiguration'
    });
    
    if (response.status === 200 && response.data.success) {
      log('✓ Successfully created backup', 'green');
      log(`  - Backup directory: ${response.data.backupDir}`, 'cyan');
      log(`  - Timestamp: ${response.data.timestamp}`, 'cyan');
      log(`  - Backed up files: ${response.data.backedUpFiles.join(', ')}`, 'cyan');
      
      // Verify backup directory exists
      try {
        await fs.access(response.data.backupDir);
        log('  - Backup directory verified', 'green');
      } catch (error) {
        log('  - Warning: Backup directory not found', 'yellow');
      }
      
      return response.data.backupDir;
    } else {
      log(`✗ Failed: ${response.data.error || 'Unknown error'}`, 'red');
      return null;
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    return null;
  }
}

async function testReconfigure() {
  log('\n🧪 Test 3: POST /api/wizard/reconfigure', 'blue');
  
  try {
    const newConfig = {
      KASPA_NODE_RPC_PORT: '16110',
      KASPA_NODE_P2P_PORT: '16111',
      DASHBOARD_PORT: '8081', // Changed from 8080
      POSTGRES_USER: 'kaspa',
      POSTGRES_PASSWORD: 'newpassword123456', // Changed (16+ chars required)
      KASPA_NETWORK: 'mainnet',
      KASIA_APP_PORT: '3001' // Added new service
    };
    
    const profiles = ['core', 'kaspa-user-applications'];
    
    const response = await makeRequest('POST', '/api/wizard/reconfigure', {
      config: newConfig,
      profiles,
      createBackup: true
    });
    
    if (response.status === 200 && response.data.success) {
      log('✓ Successfully applied reconfiguration', 'green');
      
      if (response.data.backup) {
        log(`  - Backup created: ${response.data.backup.backupDir}`, 'cyan');
      }
      
      if (response.data.diff) {
        log(`  - Configuration changes: ${response.data.diff.changeCount}`, 'cyan');
        
        if (response.data.diff.changes.length > 0) {
          log('  - Changes:', 'cyan');
          response.data.diff.changes.forEach(change => {
            const symbol = change.type === 'added' ? '+' : change.type === 'removed' ? '-' : '~';
            log(`    ${symbol} ${change.key}: ${change.type}`, 'yellow');
          });
        }
      }
      
      if (response.data.affectedServices) {
        log(`  - Affected services: ${response.data.affectedServices.join(', ')}`, 'cyan');
      }
      
      log(`  - Requires restart: ${response.data.requiresRestart}`, 'cyan');
      
      return true;
    } else {
      log(`✗ Failed: ${response.data.error || 'Unknown error'}`, 'red');
      if (response.data.errors) {
        response.data.errors.forEach(err => {
          log(`  - ${err}`, 'red');
        });
      }
      return false;
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    return false;
  }
}

async function testGetBackups() {
  log('\n🧪 Test 4: GET /api/reconfigure/backups', 'blue');
  
  try {
    const response = await makeRequest('GET', '/api/reconfigure/backups');
    
    if (response.status === 200 && response.data.success) {
      log('✓ Successfully retrieved backup list', 'green');
      log(`  - Total backups: ${response.data.backups.length}`, 'cyan');
      
      if (response.data.backups.length > 0) {
        log('  - Recent backups:', 'cyan');
        response.data.backups.slice(0, 3).forEach(backup => {
          log(`    - ${backup.filename} (${backup.timestamp})`, 'yellow');
        });
      }
      
      return true;
    } else {
      log(`✗ Failed: ${response.data.error || 'Unknown error'}`, 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    return false;
  }
}

async function testRestartServices() {
  log('\n🧪 Test 5: POST /api/reconfigure/restart', 'blue');
  
  try {
    const response = await makeRequest('POST', '/api/reconfigure/restart', {
      profiles: ['core', 'kaspa-user-applications']
    });
    
    if (response.status === 200 && response.data.success) {
      log('✓ Successfully restarted services', 'green');
      log(`  - Message: ${response.data.message}`, 'cyan');
      return true;
    } else {
      log(`✗ Failed: ${response.data.error || 'Unknown error'}`, 'red');
      log('  Note: This is expected if Docker is not running', 'yellow');
      return false;
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    log('  Note: This is expected if Docker is not running', 'yellow');
    return false;
  }
}

async function verifyConfigurationDiff() {
  log('\n🧪 Test 6: Verify configuration was applied', 'blue');
  
  try {
    // Read the updated .env file
    const envPath = path.join(PROJECT_ROOT, '.env');
    const envContent = await fs.readFile(envPath, 'utf8');
    
    // Check that .env file was updated (should be different from test setup)
    const hasContent = envContent.length > 100; // Should have substantial content
    
    // Check for configuration that should be present for core + kaspa-user-applications profiles
    const hasDashboardPort = envContent.includes('DASHBOARD_PORT=8081'); // Dashboard port was changed
    const hasProfiles = envContent.includes('COMPOSE_PROFILES=core,kaspa-user-applications'); // Profiles set
    const hasKaspaRpcPort = envContent.includes('KASPA_RPC_PORT=16111'); // Kaspa RPC port
    const hasGeneratedComment = envContent.includes('Generated by Installation Wizard'); // Generated file marker
    
    // Verify the file was actually modified
    const stats = await fs.stat(envPath);
    const modifiedRecently = (Date.now() - stats.mtimeMs) < 60000; // Modified in last minute
    
    if (hasContent && hasDashboardPort && hasProfiles && hasKaspaRpcPort && hasGeneratedComment && modifiedRecently) {
      log('✓ Configuration changes verified in .env file', 'green');
      log('  - Dashboard port changed to 8081', 'cyan');
      log('  - Profiles set correctly', 'cyan');
      log('  - Kaspa RPC port configured', 'cyan');
      log('  - File generated by wizard', 'cyan');
      log('  - File modified recently', 'cyan');
      return true;
    } else {
      log('✗ Some configuration checks failed', 'red');
      log(`  - Has content: ${hasContent}`, hasContent ? 'green' : 'red');
      log(`  - Dashboard port (8081): ${hasDashboardPort}`, hasDashboardPort ? 'green' : 'red');
      log(`  - Profiles set: ${hasProfiles}`, hasProfiles ? 'green' : 'red');
      log(`  - Kaspa RPC port: ${hasKaspaRpcPort}`, hasKaspaRpcPort ? 'green' : 'red');
      log(`  - Generated marker: ${hasGeneratedComment}`, hasGeneratedComment ? 'green' : 'red');
      log(`  - Modified recently: ${modifiedRecently}`, modifiedRecently ? 'green' : 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    return false;
  }
}

async function verifyInstallationStateHistory() {
  log('\n🧪 Test 7: Verify installation state history', 'blue');
  
  try {
    const statePath = path.join(PROJECT_ROOT, '.kaspa-aio', 'installation-state.json');
    const stateContent = await fs.readFile(statePath, 'utf8');
    const state = JSON.parse(stateContent);
    
    if (state.history && state.history.length > 0) {
      log('✓ Installation state history updated', 'green');
      log(`  - Total history entries: ${state.history.length}`, 'cyan');
      
      const lastEntry = state.history[state.history.length - 1];
      log(`  - Last action: ${lastEntry.action}`, 'cyan');
      log(`  - Timestamp: ${lastEntry.timestamp}`, 'cyan');
      log(`  - Changes: ${lastEntry.changes.length}`, 'cyan');
      
      if (lastEntry.backupTimestamp) {
        log(`  - Backup timestamp: ${lastEntry.backupTimestamp}`, 'cyan');
      }
      
      return true;
    } else {
      log('✗ No history entries found', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    return false;
  }
}

async function cleanup() {
  log('\n🧹 Cleaning up test environment...', 'cyan');
  
  try {
    // Note: We keep the test files for inspection
    // In a real scenario, you might want to restore from backup
    log('✓ Test files preserved for inspection', 'green');
    log('  To restore original state, use the backup restore endpoint', 'yellow');
  } catch (error) {
    log(`Warning: ${error.message}`, 'yellow');
  }
}

async function runTests() {
  log('═══════════════════════════════════════════════════════', 'cyan');
  log('  Reconfiguration Mode Test Suite', 'cyan');
  log('═══════════════════════════════════════════════════════', 'cyan');
  
  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };
  
  // Setup
  await setupTestEnvironment();
  
  // Run tests
  const tests = [
    { name: 'Get Current Config', fn: testGetCurrentConfig },
    { name: 'Create Backup', fn: testCreateBackup },
    { name: 'Apply Reconfiguration', fn: testReconfigure },
    { name: 'Get Backup List', fn: testGetBackups },
    { name: 'Restart Services', fn: testRestartServices },
    { name: 'Verify Config Diff', fn: verifyConfigurationDiff },
    { name: 'Verify State History', fn: verifyInstallationStateHistory }
  ];
  
  for (const test of tests) {
    results.total++;
    const passed = await test.fn();
    if (passed) {
      results.passed++;
    } else {
      results.failed++;
    }
  }
  
  // Cleanup
  await cleanup();
  
  // Summary
  log('\n═══════════════════════════════════════════════════════', 'cyan');
  log('  Test Summary', 'cyan');
  log('═══════════════════════════════════════════════════════', 'cyan');
  log(`Total Tests: ${results.total}`, 'blue');
  log(`Passed: ${results.passed}`, 'green');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`, 
      results.failed === 0 ? 'green' : 'yellow');
  
  if (results.failed === 0) {
    log('\n✓ All tests passed!', 'green');
    process.exit(0);
  } else {
    log('\n✗ Some tests failed', 'red');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  log(`\n✗ Fatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
