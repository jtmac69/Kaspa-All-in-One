#!/usr/bin/env node

/**
 * Node Sync Manager Test Suite
 * 
 * Tests the node sync monitoring functionality including:
 * - RPC connection to Kaspa node
 * - Sync status retrieval
 * - Progress calculation
 * - Time estimation
 * - Sync rate tracking
 */

const NodeSyncManager = require('./src/utils/node-sync-manager');

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

async function testNodeSyncManager() {
  logSection('Node Sync Manager Tests');

  const syncManager = new NodeSyncManager();
  let passedTests = 0;
  let totalTests = 0;

  // Test 1: Create instance
  totalTests++;
  if (await runTest('Test 1: Create NodeSyncManager instance', async () => {
    if (!syncManager) {
      throw new Error('Failed to create instance');
    }
    logInfo('Instance created successfully');
  })) passedTests++;

  // Test 2: Format time remaining
  totalTests++;
  if (await runTest('Test 2: Format time remaining', async () => {
    const tests = [
      { seconds: 0, expected: 'Complete' },
      { seconds: 30, expected: '30 seconds' },
      { seconds: 90, expected: '1 minute' },
      { seconds: 3600, expected: '1 hour' },
      { seconds: 7200, expected: '2 hours' },
      { seconds: 86400, expected: '1 day' },
      { seconds: null, expected: 'Calculating...' }
    ];

    for (const test of tests) {
      const result = syncManager.formatTimeRemaining(test.seconds);
      logInfo(`${test.seconds} seconds → "${result}"`);
      if (!result.includes(test.expected.split(' ')[0])) {
        throw new Error(`Expected "${test.expected}", got "${result}"`);
      }
    }
  })) passedTests++;

  // Test 3: Sync history management
  totalTests++;
  if (await runTest('Test 3: Sync history management', async () => {
    const nodeKey = 'test-node:16110';
    
    // Add some history entries
    syncManager.updateSyncHistory(nodeKey, 1000, 10000);
    await new Promise(resolve => setTimeout(resolve, 100));
    syncManager.updateSyncHistory(nodeKey, 1100, 10000);
    await new Promise(resolve => setTimeout(resolve, 100));
    syncManager.updateSyncHistory(nodeKey, 1200, 10000);

    logInfo('Added 3 history entries');

    // Calculate sync rate
    const syncRate = syncManager.calculateSyncRate(nodeKey);
    logInfo(`Sync rate: ${syncRate.toFixed(2)} blocks/second`);

    if (syncRate <= 0) {
      throw new Error('Sync rate should be positive');
    }

    // Clear history
    syncManager.clearSyncHistory(nodeKey);
    const clearedRate = syncManager.calculateSyncRate(nodeKey);
    
    if (clearedRate !== 0) {
      throw new Error('Sync rate should be 0 after clearing history');
    }
    
    logInfo('History cleared successfully');
  })) passedTests++;

  // Test 4: Time estimation
  totalTests++;
  if (await runTest('Test 4: Time estimation', async () => {
    const nodeKey = 'test-node:16110';
    
    // Set up history for rate calculation
    syncManager.updateSyncHistory(nodeKey, 1000, 10000);
    await new Promise(resolve => setTimeout(resolve, 100));
    syncManager.updateSyncHistory(nodeKey, 1500, 10000);

    const estimate = syncManager.estimateTimeRemaining(nodeKey, 1500, 10000, false);
    
    if (estimate === null) {
      throw new Error('Should be able to estimate time');
    }

    logInfo(`Estimated time: ${syncManager.formatTimeRemaining(estimate)}`);
    logInfo(`Blocks remaining: ${10000 - 1500}`);

    // Test synced case
    const syncedEstimate = syncManager.estimateTimeRemaining(nodeKey, 10000, 10000, true);
    if (syncedEstimate !== 0) {
      throw new Error('Synced node should have 0 time remaining');
    }

    syncManager.clearSyncHistory(nodeKey);
  })) passedTests++;

  // Test 5: RPC call error handling (with unreachable node)
  totalTests++;
  if (await runTest('Test 5: Handle unreachable node gracefully', async () => {
    const status = await syncManager.getSyncStatus({
      host: 'nonexistent-node.local',
      port: 99999,
      timeout: 1000
    });

    if (status.connected) {
      throw new Error('Should not connect to nonexistent node');
    }

    if (!status.error) {
      throw new Error('Should have error message');
    }

    logInfo(`Error handled: ${status.error}`);
  })) passedTests++;

  // Test 6: Multiple node status (mock test)
  totalTests++;
  if (await runTest('Test 6: Get multi-node status', async () => {
    const nodes = [
      { host: 'node1.local', port: 16110, timeout: 1000 },
      { host: 'node2.local', port: 16110, timeout: 1000 }
    ];

    const statuses = await syncManager.getMultiNodeStatus(nodes);

    if (statuses.length !== 2) {
      throw new Error('Should return status for both nodes');
    }

    logInfo(`Received ${statuses.length} node statuses`);
    statuses.forEach((status, i) => {
      logInfo(`Node ${i + 1}: connected=${status.connected}`);
    });
  })) passedTests++;

  // Test 7: Clear all sync history
  totalTests++;
  if (await runTest('Test 7: Clear all sync history', async () => {
    // Add history for multiple nodes
    syncManager.updateSyncHistory('node1:16110', 1000, 10000);
    syncManager.updateSyncHistory('node2:16110', 2000, 10000);

    // Clear all
    syncManager.clearAllSyncHistory();

    const rate1 = syncManager.calculateSyncRate('node1:16110');
    const rate2 = syncManager.calculateSyncRate('node2:16110');

    if (rate1 !== 0 || rate2 !== 0) {
      throw new Error('All history should be cleared');
    }

    logInfo('All history cleared successfully');
  })) passedTests++;

  // Test 8: Node reachability check
  totalTests++;
  if (await runTest('Test 8: Check node reachability', async () => {
    const reachable = await syncManager.isNodeReachable({
      host: 'nonexistent.local',
      port: 99999,
      timeout: 1000
    });

    if (reachable) {
      throw new Error('Nonexistent node should not be reachable');
    }

    logInfo('Correctly identified unreachable node');
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

async function testWithRealNode() {
  logSection('Real Node Connection Test (Optional)');
  
  logWarning('This test requires a running Kaspa node on localhost:16110');
  logInfo('Attempting to connect...\n');

  const syncManager = new NodeSyncManager();

  try {
    const status = await syncManager.getSyncStatus({
      host: 'localhost',
      port: 16110,
      timeout: 5000
    });

    if (status.connected) {
      logSuccess('Connected to Kaspa node!');
      console.log('\nNode Status:');
      console.log(`  Network: ${status.nodeInfo?.networkName || 'unknown'}`);
      console.log(`  Synced: ${status.synced ? 'Yes' : 'No'}`);
      console.log(`  Current Block: ${status.currentBlock?.toLocaleString() || 'N/A'}`);
      console.log(`  Target Block: ${status.targetBlock?.toLocaleString() || 'N/A'}`);
      console.log(`  Progress: ${status.percentage?.toFixed(2) || 0}%`);
      
      if (!status.synced && status.estimatedTimeRemaining) {
        console.log(`  Time Remaining: ${syncManager.formatTimeRemaining(status.estimatedTimeRemaining)}`);
        console.log(`  Sync Rate: ${status.syncRate?.toFixed(2) || 0} blocks/second`);
      }

      // Test a few more times to build sync rate history
      if (!status.synced) {
        logInfo('\nMonitoring sync progress for 30 seconds...');
        for (let i = 0; i < 3; i++) {
          await new Promise(resolve => setTimeout(resolve, 10000));
          const newStatus = await syncManager.getSyncStatus({
            host: 'localhost',
            port: 16110
          });
          console.log(`  Check ${i + 1}: ${newStatus.currentBlock?.toLocaleString()} blocks (${newStatus.percentage?.toFixed(2)}%)`);
          if (newStatus.syncRate > 0) {
            console.log(`  Sync Rate: ${newStatus.syncRate.toFixed(2)} blocks/second`);
          }
        }
      }
    } else {
      logWarning('Could not connect to Kaspa node');
      logInfo(`Reason: ${status.error}`);
      logInfo('This is expected if no node is running');
    }
  } catch (error) {
    logWarning('Real node test failed (this is expected if no node is running)');
    logInfo(`Error: ${error.message}`);
  }
}

// Main execution
async function main() {
  console.log(`${colors.bright}${colors.cyan}`);
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║         Kaspa Node Sync Manager Test Suite                        ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  // Run unit tests
  const unitTestsPassed = await testNodeSyncManager();

  // Optionally test with real node
  await testWithRealNode();

  console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.bright}Testing Complete${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(70)}${colors.reset}\n`);

  process.exit(unitTestsPassed ? 0 : 1);
}

main().catch(error => {
  logError(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
