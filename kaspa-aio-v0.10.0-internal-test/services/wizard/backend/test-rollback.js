/**
 * Test script for Rollback Manager
 * Tests configuration versioning, rollback, checkpoints, and recovery
 */

const RollbackManager = require('./src/utils/rollback-manager');
const path = require('path');

// Set project root to current directory for testing
process.env.PROJECT_ROOT = path.resolve(__dirname, '../../..');

const rollbackManager = new RollbackManager();

// ANSI color codes for output
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

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

function logTest(name) {
  log(`\n▶ ${name}`, 'blue');
}

function logSuccess(message) {
  log(`  ✓ ${message}`, 'green');
}

function logError(message) {
  log(`  ✗ ${message}`, 'red');
}

function logInfo(message) {
  log(`  ℹ ${message}`, 'yellow');
}

async function testInitialization() {
  logTest('Test: Initialize rollback manager');
  
  const result = await rollbackManager.initialize();
  
  if (result.success) {
    logSuccess('Rollback manager initialized successfully');
    return true;
  } else {
    logError(`Initialization failed: ${result.error}`);
    return false;
  }
}

async function testSaveVersion() {
  logTest('Test: Save configuration version');
  
  const testConfig = {
    KASPA_NODE_RPC_PORT: '16111',
    KASPA_NODE_P2P_PORT: '16110',
    POSTGRES_PASSWORD: 'test-password-123'
  };
  
  const testProfiles = ['core', 'explorer'];
  const metadata = {
    action: 'test-save',
    description: 'Test configuration save'
  };
  
  const result = await rollbackManager.saveVersion(testConfig, testProfiles, metadata);
  
  if (result.success) {
    logSuccess(`Version saved: ${result.versionId}`);
    logInfo(`Timestamp: ${result.timestamp}`);
    return result.versionId;
  } else {
    logError(`Failed to save version: ${result.error}`);
    return null;
  }
}

async function testGetHistory() {
  logTest('Test: Get configuration history');
  
  const result = await rollbackManager.getHistory(10);
  
  if (result.success) {
    logSuccess(`Retrieved ${result.entries.length} history entries`);
    
    if (result.entries.length > 0) {
      logInfo('Recent entries:');
      result.entries.slice(0, 3).forEach(entry => {
        console.log(`    - ${entry.versionId} (${entry.age})`);
        console.log(`      Action: ${entry.metadata.action}`);
        console.log(`      Profiles: ${entry.profiles.join(', ')}`);
      });
    }
    
    return result.entries;
  } else {
    logError(`Failed to get history: ${result.error}`);
    return [];
  }
}

async function testRestoreVersion(versionId) {
  logTest('Test: Restore configuration version');
  
  if (!versionId) {
    logError('No version ID provided');
    return false;
  }
  
  const result = await rollbackManager.restoreVersion(versionId);
  
  if (result.success) {
    logSuccess(`Version restored: ${versionId}`);
    logInfo(`Profiles: ${result.profiles.join(', ')}`);
    logInfo(`Requires restart: ${result.requiresRestart}`);
    return true;
  } else {
    logError(`Failed to restore version: ${result.error}`);
    return false;
  }
}

async function testCompareVersions(version1, version2) {
  logTest('Test: Compare two versions');
  
  if (!version1 || !version2) {
    logError('Need two version IDs to compare');
    return false;
  }
  
  const result = await rollbackManager.compareVersions(version1, version2);
  
  if (result.success) {
    logSuccess('Versions compared successfully');
    
    if (result.differences.added.length > 0) {
      logInfo(`Added keys: ${result.differences.added.length}`);
      result.differences.added.forEach(item => {
        console.log(`    + ${item.key} = ${item.value}`);
      });
    }
    
    if (result.differences.removed.length > 0) {
      logInfo(`Removed keys: ${result.differences.removed.length}`);
      result.differences.removed.forEach(item => {
        console.log(`    - ${item.key} = ${item.value}`);
      });
    }
    
    if (result.differences.changed.length > 0) {
      logInfo(`Changed keys: ${result.differences.changed.length}`);
      result.differences.changed.forEach(item => {
        console.log(`    ~ ${item.key}: ${item.oldValue} → ${item.newValue}`);
      });
    }
    
    if (result.differences.added.length === 0 && 
        result.differences.removed.length === 0 && 
        result.differences.changed.length === 0) {
      logInfo('No differences found');
    }
    
    return true;
  } else {
    logError(`Failed to compare versions: ${result.error}`);
    return false;
  }
}

async function testCreateCheckpoint() {
  logTest('Test: Create installation checkpoint');
  
  const checkpointData = {
    stage: 'test-stage',
    progress: 50,
    config: {
      KASPA_NODE_RPC_PORT: '16111'
    },
    profiles: ['core']
  };
  
  const result = await rollbackManager.createCheckpoint('test-stage', checkpointData);
  
  if (result.success) {
    logSuccess(`Checkpoint created: ${result.checkpointId}`);
    logInfo(`Stage: ${result.stage}`);
    logInfo(`Timestamp: ${result.timestamp}`);
    return result.checkpointId;
  } else {
    logError(`Failed to create checkpoint: ${result.error}`);
    return null;
  }
}

async function testGetCheckpoints() {
  logTest('Test: Get checkpoints');
  
  const result = await rollbackManager.getCheckpoints();
  
  if (result.success) {
    logSuccess(`Retrieved ${result.checkpoints.length} checkpoints`);
    
    if (result.checkpoints.length > 0) {
      logInfo('Recent checkpoints:');
      result.checkpoints.slice(0, 3).forEach(cp => {
        console.log(`    - ${cp.checkpointId} (${cp.age})`);
        console.log(`      Stage: ${cp.stage}`);
      });
    }
    
    return result.checkpoints;
  } else {
    logError(`Failed to get checkpoints: ${result.error}`);
    return [];
  }
}

async function testRestoreCheckpoint(checkpointId) {
  logTest('Test: Restore from checkpoint');
  
  if (!checkpointId) {
    logError('No checkpoint ID provided');
    return false;
  }
  
  const result = await rollbackManager.restoreCheckpoint(checkpointId);
  
  if (result.success) {
    logSuccess(`Checkpoint restored: ${checkpointId}`);
    logInfo(`Stage: ${result.stage}`);
    logInfo(`Data keys: ${Object.keys(result.data).join(', ')}`);
    return true;
  } else {
    logError(`Failed to restore checkpoint: ${result.error}`);
    return false;
  }
}

async function testStorageUsage() {
  logTest('Test: Get storage usage');
  
  const result = await rollbackManager.getStorageUsage();
  
  if (result.success) {
    logSuccess('Storage usage retrieved');
    logInfo(`Total size: ${result.totalSizeMB} MB`);
    logInfo(`File count: ${result.fileCount}`);
    logInfo(`Backup directory: ${result.backupDir}`);
    return true;
  } else {
    logError(`Failed to get storage usage: ${result.error}`);
    return false;
  }
}

async function runTests() {
  logSection('Rollback Manager Test Suite');
  
  let testsPassed = 0;
  let testsFailed = 0;
  
  // Test 1: Initialize
  if (await testInitialization()) {
    testsPassed++;
  } else {
    testsFailed++;
    log('\nAborting tests due to initialization failure', 'red');
    return;
  }
  
  // Test 2: Save first version
  const version1 = await testSaveVersion();
  if (version1) {
    testsPassed++;
  } else {
    testsFailed++;
  }
  
  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 3: Save second version (with different config)
  logTest('Test: Save second configuration version');
  const testConfig2 = {
    KASPA_NODE_RPC_PORT: '16111',
    KASPA_NODE_P2P_PORT: '16110',
    POSTGRES_PASSWORD: 'different-password-456',
    NEW_KEY: 'new-value'
  };
  const version2Result = await rollbackManager.saveVersion(testConfig2, ['core', 'prod'], {
    action: 'test-save-2',
    description: 'Second test configuration'
  });
  const version2 = version2Result.success ? version2Result.versionId : null;
  if (version2) {
    logSuccess(`Second version saved: ${version2}`);
    testsPassed++;
  } else {
    logError('Failed to save second version');
    testsFailed++;
  }
  
  // Test 4: Get history
  const history = await testGetHistory();
  if (history.length > 0) {
    testsPassed++;
  } else {
    testsFailed++;
  }
  
  // Test 5: Compare versions
  if (version1 && version2) {
    if (await testCompareVersions(version1, version2)) {
      testsPassed++;
    } else {
      testsFailed++;
    }
  } else {
    logInfo('Skipping version comparison (need 2 versions)');
  }
  
  // Test 6: Create checkpoint
  const checkpoint1 = await testCreateCheckpoint();
  if (checkpoint1) {
    testsPassed++;
  } else {
    testsFailed++;
  }
  
  // Test 7: Get checkpoints
  const checkpoints = await testGetCheckpoints();
  if (checkpoints.length > 0) {
    testsPassed++;
  } else {
    testsFailed++;
  }
  
  // Test 8: Restore checkpoint
  if (checkpoint1) {
    if (await testRestoreCheckpoint(checkpoint1)) {
      testsPassed++;
    } else {
      testsFailed++;
    }
  } else {
    logInfo('Skipping checkpoint restore (no checkpoint created)');
  }
  
  // Test 9: Storage usage
  if (await testStorageUsage()) {
    testsPassed++;
  } else {
    testsFailed++;
  }
  
  // Test 10: Restore version
  if (version1) {
    if (await testRestoreVersion(version1)) {
      testsPassed++;
    } else {
      testsFailed++;
    }
  } else {
    logInfo('Skipping version restore (no version created)');
  }
  
  // Summary
  logSection('Test Summary');
  log(`Tests passed: ${testsPassed}`, 'green');
  if (testsFailed > 0) {
    log(`Tests failed: ${testsFailed}`, 'red');
  }
  log(`Total tests: ${testsPassed + testsFailed}`, 'cyan');
  
  if (testsFailed === 0) {
    log('\n✓ All tests passed!', 'green');
  } else {
    log('\n✗ Some tests failed', 'red');
  }
}

// Run tests
runTests().catch(error => {
  logError(`Test suite error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
