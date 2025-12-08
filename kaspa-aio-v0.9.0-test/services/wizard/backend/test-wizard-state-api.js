#!/usr/bin/env node

/**
 * Test Wizard State API Endpoints
 * Tests API endpoints for state management
 */

const http = require('http');

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

// API request helper
function apiRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ statusCode: res.statusCode, data: response });
        } catch (error) {
          resolve({ statusCode: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function runTests() {
  let testsPassed = 0;
  let testsFailed = 0;

  log('\n=== Wizard State API Tests ===\n', 'blue');

  // Test 1: Check server health
  logTest('Check server health');
  try {
    const response = await apiRequest('GET', '/api/health');
    if (response.statusCode === 200 && response.data.status === 'ok') {
      logSuccess('Server is healthy');
      testsPassed++;
    } else {
      logError('Server health check failed');
      testsFailed++;
    }
  } catch (error) {
    logError(`Server not running: ${error.message}`);
    log('\nPlease start the wizard backend server first:', 'yellow');
    log('  cd services/wizard/backend && npm start', 'yellow');
    process.exit(1);
  }

  // Test 2: Clear state (start fresh)
  logTest('Clear existing state');
  try {
    const response = await apiRequest('POST', '/api/wizard/clear-state');
    if (response.statusCode === 200) {
      logSuccess('State cleared');
      testsPassed++;
    } else {
      logError('Failed to clear state');
      testsFailed++;
    }
  } catch (error) {
    logError(`Clear state error: ${error.message}`);
    testsFailed++;
  }

  // Test 3: Update step
  logTest('Update wizard step');
  try {
    const response = await apiRequest('POST', '/api/wizard/update-step', {
      stepNumber: 2,
      stepName: 'configure'
    });
    
    if (response.statusCode === 200 && response.data.success) {
      logSuccess('Step updated via API');
      testsPassed++;
    } else {
      logError(`Update step failed: ${response.data.error}`);
      testsFailed++;
    }
  } catch (error) {
    logError(`Update step error: ${error.message}`);
    testsFailed++;
  }

  // Test 4: Update profiles
  logTest('Update profiles selection');
  try {
    const response = await apiRequest('POST', '/api/wizard/update-profiles', {
      profiles: ['core', 'kaspa-user-applications'],
      configuration: { KASPA_NODE_P2P_PORT: 16111 }
    });
    
    if (response.statusCode === 200 && response.data.success) {
      logSuccess('Profiles updated via API');
      testsPassed++;
    } else {
      logError(`Update profiles failed: ${response.data.error}`);
      testsFailed++;
    }
  } catch (error) {
    logError(`Update profiles error: ${error.message}`);
    testsFailed++;
  }

  // Test 5: Load state
  logTest('Load wizard state');
  try {
    const response = await apiRequest('GET', '/api/wizard/load-state');
    
    if (response.statusCode === 200 && response.data.success && response.data.state) {
      logSuccess('State loaded via API');
      if (response.data.state.currentStep === 2) {
        logSuccess('State data is correct');
        testsPassed++;
      } else {
        logError('State data mismatch');
        testsFailed++;
      }
    } else {
      logError(`Load state failed: ${response.data.error}`);
      testsFailed++;
    }
  } catch (error) {
    logError(`Load state error: ${error.message}`);
    testsFailed++;
  }

  // Test 6: Check resumability
  logTest('Check if wizard can be resumed');
  try {
    const response = await apiRequest('GET', '/api/wizard/can-resume');
    
    if (response.statusCode === 200 && response.data.canResume) {
      logSuccess('Wizard can be resumed');
      logSuccess(`Current step: ${response.data.currentStep}`);
      logSuccess(`Phase: ${response.data.phase}`);
      testsPassed++;
    } else {
      logError(`Cannot resume: ${response.data.reason}`);
      testsFailed++;
    }
  } catch (error) {
    logError(`Check resume error: ${error.message}`);
    testsFailed++;
  }

  // Test 7: Update service status
  logTest('Update service status');
  try {
    const response = await apiRequest('POST', '/api/wizard/update-service', {
      serviceName: 'kaspa-node',
      status: 'running',
      details: {
        containerId: 'test123',
        logs: ['Node started successfully']
      }
    });
    
    if (response.statusCode === 200 && response.data.success) {
      logSuccess('Service status updated via API');
      testsPassed++;
    } else {
      logError(`Update service failed: ${response.data.error}`);
      testsFailed++;
    }
  } catch (error) {
    logError(`Update service error: ${error.message}`);
    testsFailed++;
  }

  // Test 8: Add sync operation
  logTest('Add sync operation');
  try {
    const response = await apiRequest('POST', '/api/wizard/add-sync-operation', {
      operation: {
        service: 'kaspa-node',
        type: 'blockchain',
        status: 'in-progress',
        progress: 50,
        canContinueInBackground: true
      }
    });
    
    if (response.statusCode === 200 && response.data.success) {
      logSuccess('Sync operation added via API');
      testsPassed++;
    } else {
      logError(`Add sync operation failed: ${response.data.error}`);
      testsFailed++;
    }
  } catch (error) {
    logError(`Add sync operation error: ${error.message}`);
    testsFailed++;
  }

  // Test 9: Record user decision
  logTest('Record user decision');
  try {
    const response = await apiRequest('POST', '/api/wizard/record-decision', {
      decision: 'wait-for-sync',
      context: 'User chose to wait for node sync'
    });
    
    if (response.statusCode === 200 && response.data.success) {
      logSuccess('User decision recorded via API');
      testsPassed++;
    } else {
      logError(`Record decision failed: ${response.data.error}`);
      testsFailed++;
    }
  } catch (error) {
    logError(`Record decision error: ${error.message}`);
    testsFailed++;
  }

  // Test 10: Add background task
  logTest('Add background task');
  try {
    const response = await apiRequest('POST', '/api/wizard/add-background-task', {
      taskId: 'sync-node-123',
      taskInfo: {
        service: 'kaspa-node',
        type: 'blockchain'
      }
    });
    
    if (response.statusCode === 200 && response.data.success) {
      logSuccess('Background task added via API');
      testsPassed++;
    } else {
      logError(`Add background task failed: ${response.data.error}`);
      testsFailed++;
    }
  } catch (error) {
    logError(`Add background task error: ${error.message}`);
    testsFailed++;
  }

  // Test 11: Update phase
  logTest('Update installation phase');
  try {
    const response = await apiRequest('POST', '/api/wizard/update-phase', {
      phase: 'syncing'
    });
    
    if (response.statusCode === 200 && response.data.success) {
      logSuccess('Phase updated via API');
      testsPassed++;
    } else {
      logError(`Update phase failed: ${response.data.error}`);
      testsFailed++;
    }
  } catch (error) {
    logError(`Update phase error: ${error.message}`);
    testsFailed++;
  }

  // Test 12: Get state summary
  logTest('Get state summary');
  try {
    const response = await apiRequest('GET', '/api/wizard/state-summary');
    
    if (response.statusCode === 200 && response.data.success && response.data.summary) {
      logSuccess('State summary retrieved via API');
      log(`  Phase: ${response.data.summary.phase}`, 'yellow');
      log(`  Profiles: ${response.data.summary.profiles.join(', ')}`, 'yellow');
      log(`  Services: ${response.data.summary.servicesCount}`, 'yellow');
      log(`  Sync operations: ${response.data.summary.syncOperationsCount}`, 'yellow');
      testsPassed++;
    } else {
      logError(`Get state summary failed: ${response.data.error}`);
      testsFailed++;
    }
  } catch (error) {
    logError(`Get state summary error: ${error.message}`);
    testsFailed++;
  }

  // Test 13: Get state history
  logTest('Get state history');
  try {
    const response = await apiRequest('GET', '/api/wizard/state-history');
    
    if (response.statusCode === 200 && response.data.success) {
      logSuccess(`State history retrieved: ${response.data.snapshots.length} snapshots`);
      testsPassed++;
    } else {
      logError(`Get state history failed: ${response.data.error}`);
      testsFailed++;
    }
  } catch (error) {
    logError(`Get state history error: ${error.message}`);
    testsFailed++;
  }

  // Test 14: Mark complete
  logTest('Mark installation as complete');
  try {
    const response = await apiRequest('POST', '/api/wizard/mark-complete');
    
    if (response.statusCode === 200 && response.data.success) {
      logSuccess('Installation marked as complete via API');
      testsPassed++;
    } else {
      logError(`Mark complete failed: ${response.data.error}`);
      testsFailed++;
    }
  } catch (error) {
    logError(`Mark complete error: ${error.message}`);
    testsFailed++;
  }

  // Test 15: Check resumability after completion
  logTest('Check resumability after completion');
  try {
    const response = await apiRequest('GET', '/api/wizard/can-resume');
    
    if (response.statusCode === 200 && !response.data.canResume) {
      logSuccess('Correctly prevents resume after completion');
      testsPassed++;
    } else {
      logError('Should not allow resume after completion');
      testsFailed++;
    }
  } catch (error) {
    logError(`Check resume error: ${error.message}`);
    testsFailed++;
  }

  // Test 16: Remove background task
  logTest('Remove background task');
  try {
    const response = await apiRequest('POST', '/api/wizard/remove-background-task', {
      taskId: 'sync-node-123'
    });
    
    if (response.statusCode === 200 && response.data.success) {
      logSuccess('Background task removed via API');
      testsPassed++;
    } else {
      logError(`Remove background task failed: ${response.data.error}`);
      testsFailed++;
    }
  } catch (error) {
    logError(`Remove background task error: ${error.message}`);
    testsFailed++;
  }

  // Test 17: Clear state
  logTest('Clear wizard state');
  try {
    const response = await apiRequest('POST', '/api/wizard/clear-state');
    
    if (response.statusCode === 200 && response.data.success) {
      logSuccess('State cleared via API');
      testsPassed++;
    } else {
      logError(`Clear state failed: ${response.data.error}`);
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
    log('\n✓ All API tests passed!', 'green');
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
