#!/usr/bin/env node

/**
 * Test Wizard State Management
 * Tests state persistence, resumability, and state operations
 */

const StateManager = require('./src/utils/state-manager');

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

function logTest(name) {
  console.log(`\n${colors.cyan}Testing: ${name}${colors.reset}`);
}

function logSuccess(message) {
  console.log(`${colors.green}✓ ${message}${colors.reset}`);
}

function logError(message) {
  console.log(`${colors.red}✗ ${message}${colors.reset}`);
}

async function runTests() {
  const stateManager = new StateManager();
  let testsPassed = 0;
  let testsFailed = 0;

  log('\n=== Wizard State Manager Tests ===\n', 'blue');

  // Test 1: Initialize state manager
  logTest('Initialize state manager');
  try {
    const result = await stateManager.initialize();
    if (result.success) {
      logSuccess('State manager initialized');
      testsPassed++;
    } else {
      logError(`Initialization failed: ${result.error}`);
      testsFailed++;
    }
  } catch (error) {
    logError(`Initialization error: ${error.message}`);
    testsFailed++;
  }

  // Test 2: Create initial state
  logTest('Create initial state');
  try {
    const initialState = stateManager.createInitialState();
    if (initialState.installationId && initialState.version && initialState.phase === 'preparing') {
      logSuccess('Initial state created with correct structure');
      testsPassed++;
    } else {
      logError('Initial state missing required fields');
      testsFailed++;
    }
  } catch (error) {
    logError(`Create initial state error: ${error.message}`);
    testsFailed++;
  }

  // Test 3: Save state
  logTest('Save wizard state');
  try {
    const testState = stateManager.createInitialState();
    testState.currentStep = 2;
    testState.profiles.selected = ['core', 'kaspa-user-applications'];
    
    const result = await stateManager.saveState(testState);
    if (result.success) {
      logSuccess('State saved successfully');
      testsPassed++;
    } else {
      logError(`Save state failed: ${result.error}`);
      testsFailed++;
    }
  } catch (error) {
    logError(`Save state error: ${error.message}`);
    testsFailed++;
  }

  // Test 4: Load state
  logTest('Load wizard state');
  try {
    const result = await stateManager.loadState();
    if (result.success && result.state) {
      logSuccess('State loaded successfully');
      if (result.state.currentStep === 2) {
        logSuccess('State data matches saved data');
        testsPassed++;
      } else {
        logError('State data does not match');
        testsFailed++;
      }
    } else {
      logError(`Load state failed: ${result.error}`);
      testsFailed++;
    }
  } catch (error) {
    logError(`Load state error: ${error.message}`);
    testsFailed++;
  }

  // Test 5: Check resumability
  logTest('Check if wizard can be resumed');
  try {
    const result = await stateManager.canResume();
    if (result.canResume) {
      logSuccess('Wizard can be resumed');
      logSuccess(`Last activity: ${result.lastActivity}`);
      logSuccess(`Current step: ${result.currentStep}`);
      logSuccess(`Phase: ${result.phase}`);
      testsPassed++;
    } else {
      logError(`Cannot resume: ${result.reason}`);
      testsFailed++;
    }
  } catch (error) {
    logError(`Check resume error: ${error.message}`);
    testsFailed++;
  }

  // Test 6: Update step
  logTest('Update wizard step');
  try {
    const result = await stateManager.updateStep(3, 'configure');
    if (result.success) {
      logSuccess('Step updated successfully');
      
      // Verify update
      const loadResult = await stateManager.loadState();
      if (loadResult.state.currentStep === 3 && loadResult.state.resumePoint === 'configure') {
        logSuccess('Step update verified');
        testsPassed++;
      } else {
        logError('Step update not reflected in state');
        testsFailed++;
      }
    } else {
      logError(`Update step failed: ${result.error}`);
      testsFailed++;
    }
  } catch (error) {
    logError(`Update step error: ${error.message}`);
    testsFailed++;
  }

  // Test 7: Update profiles
  logTest('Update profiles selection');
  try {
    const profiles = ['core', 'indexer-services', 'kaspa-user-applications'];
    const config = { KASPA_NODE_P2P_PORT: 16111 };
    
    const result = await stateManager.updateProfiles(profiles, config);
    if (result.success) {
      logSuccess('Profiles updated successfully');
      
      // Verify update
      const loadResult = await stateManager.loadState();
      if (loadResult.state.profiles.selected.length === 3) {
        logSuccess('Profiles update verified');
        testsPassed++;
      } else {
        logError('Profiles update not reflected in state');
        testsFailed++;
      }
    } else {
      logError(`Update profiles failed: ${result.error}`);
      testsFailed++;
    }
  } catch (error) {
    logError(`Update profiles error: ${error.message}`);
    testsFailed++;
  }

  // Test 8: Update service status
  logTest('Update service status');
  try {
    const result = await stateManager.updateServiceStatus('kaspa-node', 'starting', {
      containerId: 'abc123',
      logs: ['Starting Kaspa node...']
    });
    
    if (result.success) {
      logSuccess('Service status updated successfully');
      
      // Verify update
      const loadResult = await stateManager.loadState();
      const service = loadResult.state.services.find(s => s.name === 'kaspa-node');
      if (service && service.status === 'starting') {
        logSuccess('Service status update verified');
        testsPassed++;
      } else {
        logError('Service status update not reflected in state');
        testsFailed++;
      }
    } else {
      logError(`Update service status failed: ${result.error}`);
      testsFailed++;
    }
  } catch (error) {
    logError(`Update service status error: ${error.message}`);
    testsFailed++;
  }

  // Test 9: Add sync operation
  logTest('Add sync operation');
  try {
    const operation = {
      service: 'kaspa-node',
      type: 'blockchain',
      status: 'in-progress',
      progress: 25,
      canContinueInBackground: true
    };
    
    const result = await stateManager.addSyncOperation(operation);
    if (result.success) {
      logSuccess('Sync operation added successfully');
      
      // Verify addition
      const loadResult = await stateManager.loadState();
      if (loadResult.state.syncOperations.length > 0) {
        logSuccess('Sync operation verified');
        testsPassed++;
      } else {
        logError('Sync operation not found in state');
        testsFailed++;
      }
    } else {
      logError(`Add sync operation failed: ${result.error}`);
      testsFailed++;
    }
  } catch (error) {
    logError(`Add sync operation error: ${error.message}`);
    testsFailed++;
  }

  // Test 10: Record user decision
  logTest('Record user decision');
  try {
    const result = await stateManager.recordDecision('continue-with-public', 'Node sync taking too long');
    if (result.success) {
      logSuccess('User decision recorded successfully');
      
      // Verify recording
      const loadResult = await stateManager.loadState();
      if (loadResult.state.userDecisions.length > 0) {
        logSuccess('User decision verified');
        testsPassed++;
      } else {
        logError('User decision not found in state');
        testsFailed++;
      }
    } else {
      logError(`Record decision failed: ${result.error}`);
      testsFailed++;
    }
  } catch (error) {
    logError(`Record decision error: ${error.message}`);
    testsFailed++;
  }

  // Test 11: Add background task
  logTest('Add background task');
  try {
    const result = await stateManager.addBackgroundTask('sync-kaspa-node', {
      service: 'kaspa-node',
      type: 'blockchain',
      status: 'in-progress'
    });
    
    if (result.success) {
      logSuccess('Background task added successfully');
      
      // Verify addition
      const loadResult = await stateManager.loadState();
      if (loadResult.state.backgroundTasks.includes('sync-kaspa-node')) {
        logSuccess('Background task verified');
        testsPassed++;
      } else {
        logError('Background task not found in state');
        testsFailed++;
      }
    } else {
      logError(`Add background task failed: ${result.error}`);
      testsFailed++;
    }
  } catch (error) {
    logError(`Add background task error: ${error.message}`);
    testsFailed++;
  }

  // Test 12: Update phase
  logTest('Update installation phase');
  try {
    const result = await stateManager.updatePhase('building');
    if (result.success) {
      logSuccess('Phase updated successfully');
      
      // Verify update
      const loadResult = await stateManager.loadState();
      if (loadResult.state.phase === 'building') {
        logSuccess('Phase update verified');
        testsPassed++;
      } else {
        logError('Phase update not reflected in state');
        testsFailed++;
      }
    } else {
      logError(`Update phase failed: ${result.error}`);
      testsFailed++;
    }
  } catch (error) {
    logError(`Update phase error: ${error.message}`);
    testsFailed++;
  }

  // Test 13: Get state summary
  logTest('Get state summary');
  try {
    const result = await stateManager.getStateSummary();
    if (result.success && result.summary) {
      logSuccess('State summary retrieved successfully');
      log(`  Installation ID: ${result.summary.installationId}`, 'yellow');
      log(`  Phase: ${result.summary.phase}`, 'yellow');
      log(`  Profiles: ${result.summary.profiles.join(', ')}`, 'yellow');
      log(`  Services: ${result.summary.servicesCount}`, 'yellow');
      log(`  Sync operations: ${result.summary.syncOperationsCount}`, 'yellow');
      log(`  Background tasks: ${result.summary.backgroundTasksCount}`, 'yellow');
      testsPassed++;
    } else {
      logError(`Get state summary failed: ${result.error}`);
      testsFailed++;
    }
  } catch (error) {
    logError(`Get state summary error: ${error.message}`);
    testsFailed++;
  }

  // Test 14: Get state history
  logTest('Get state history');
  try {
    const result = await stateManager.getStateHistory();
    if (result.success) {
      logSuccess(`State history retrieved: ${result.snapshots.length} snapshots`);
      testsPassed++;
    } else {
      logError(`Get state history failed: ${result.error}`);
      testsFailed++;
    }
  } catch (error) {
    logError(`Get state history error: ${error.message}`);
    testsFailed++;
  }

  // Test 15: Mark complete
  logTest('Mark installation as complete');
  try {
    const result = await stateManager.markComplete();
    if (result.success) {
      logSuccess('Installation marked as complete');
      
      // Verify completion
      const loadResult = await stateManager.loadState();
      if (loadResult.state.phase === 'complete' && !loadResult.state.resumable) {
        logSuccess('Completion verified');
        testsPassed++;
      } else {
        logError('Completion not reflected in state');
        testsFailed++;
      }
    } else {
      logError(`Mark complete failed: ${result.error}`);
      testsFailed++;
    }
  } catch (error) {
    logError(`Mark complete error: ${error.message}`);
    testsFailed++;
  }

  // Test 16: Check resumability after completion
  logTest('Check resumability after completion');
  try {
    const result = await stateManager.canResume();
    if (!result.canResume && result.reason === 'Installation already complete') {
      logSuccess('Correctly prevents resume after completion');
      testsPassed++;
    } else {
      logError('Should not allow resume after completion');
      testsFailed++;
    }
  } catch (error) {
    logError(`Check resume after completion error: ${error.message}`);
    testsFailed++;
  }

  // Test 17: Clear state
  logTest('Clear wizard state');
  try {
    const result = await stateManager.clearState();
    if (result.success) {
      logSuccess('State cleared successfully');
      
      // Verify clearing
      const loadResult = await stateManager.loadState();
      if (!loadResult.success) {
        logSuccess('State clearing verified');
        testsPassed++;
      } else {
        logError('State still exists after clearing');
        testsFailed++;
      }
    } else {
      logError(`Clear state failed: ${result.error}`);
      testsFailed++;
    }
  } catch (error) {
    logError(`Clear state error: ${error.message}`);
    testsFailed++;
  }

  // Summary
  log('\n=== Test Summary ===\n', 'blue');
  log(`Total tests: ${testsPassed + testsFailed}`, 'cyan');
  log(`Passed: ${testsPassed}`, 'green');
  log(`Failed: ${testsFailed}`, 'red');
  
  if (testsFailed === 0) {
    log('\n✓ All tests passed!', 'green');
    process.exit(0);
  } else {
    log(`\n✗ ${testsFailed} test(s) failed`, 'red');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Test execution error:', error);
  process.exit(1);
});
