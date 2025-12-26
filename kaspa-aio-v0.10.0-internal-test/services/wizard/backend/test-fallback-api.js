#!/usr/bin/env node

/**
 * Fallback API Test Suite
 * 
 * Tests the fallback API endpoints:
 * - POST /api/config/configure-fallback
 * - POST /api/config/detect-failures
 * - POST /api/config/retry-health-check
 * - GET /api/config/troubleshooting/:service
 * - GET /api/config/fallback-status
 * - GET /api/config/public-endpoints
 */

const http = require('http');

// Colors for output
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
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`TEST: ${name}`, 'cyan');
  log('='.repeat(60), 'cyan');
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

function makeRequest(method, path, data = null) {
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
  log('\n🧪 Fallback API Test Suite\n', 'cyan');
  
  let passed = 0;
  let failed = 0;

  // Test 1: GET /api/config/public-endpoints
  logTest('GET /api/config/public-endpoints');
  try {
    const response = await makeRequest('GET', '/api/config/public-endpoints');
    
    if (response.statusCode === 200 && response.data.success) {
      logSuccess('Public endpoints retrieved');
      logInfo(`Kaspa Node RPC: ${response.data.endpoints.kaspaNode.rpc}`);
      logInfo(`Indexers: ${Object.keys(response.data.endpoints.indexers).length}`);
      passed++;
    } else {
      logError(`Failed: ${response.statusCode} - ${JSON.stringify(response.data)}`);
      failed++;
    }
  } catch (error) {
    logError(`Request failed: ${error.message}`);
    failed++;
  }

  // Test 2: POST /api/config/detect-failures
  logTest('POST /api/config/detect-failures');
  try {
    const requestData = {
      services: ['kaspa-node', 'kasia-indexer'],
      profiles: ['core', 'indexer-services']
    };
    
    const response = await makeRequest('POST', '/api/config/detect-failures', requestData);
    
    if (response.statusCode === 200 && response.data.success) {
      logSuccess('Failure detection completed');
      logInfo(`Total services: ${response.data.totalServices}`);
      logInfo(`Failed services: ${response.data.failedServices}`);
      logInfo(`Has fallback options: ${response.data.hasFallbackOptions}`);
      
      if (response.data.failures.length > 0) {
        logInfo(`Failures detected:`);
        response.data.failures.forEach(f => {
          logInfo(`  - ${f.service}: ${f.message}`);
        });
      }
      
      passed++;
    } else {
      logError(`Failed: ${response.statusCode} - ${JSON.stringify(response.data)}`);
      failed++;
    }
  } catch (error) {
    logError(`Request failed: ${error.message}`);
    failed++;
  }

  // Test 3: POST /api/config/configure-fallback (continue-public strategy)
  logTest('POST /api/config/configure-fallback (continue-public)');
  try {
    const requestData = {
      failedService: 'kaspa-node',
      strategy: 'continue-public',
      dependentServices: ['kasia-indexer', 'k-indexer'],
      currentConfig: {
        KASPA_NODE_P2P_PORT: '16110',
        KASPA_NODE_RPC_PORT: '16111'
      },
      profiles: ['core', 'indexer-services']
    };
    
    const response = await makeRequest('POST', '/api/config/configure-fallback', requestData);
    
    if (response.statusCode === 200 && response.data.success) {
      logSuccess('Fallback configured with continue-public strategy');
      logInfo(`Strategy: ${response.data.strategy}`);
      logInfo(`Public RPC: ${response.data.fallbackConfig.KASPA_NODE_RPC_URL}`);
      logInfo(`Fallback enabled: ${response.data.fallbackConfig._fallback?.enabled}`);
      logInfo(`Configuration saved: ${response.data.saved}`);
      passed++;
    } else {
      logError(`Failed: ${response.statusCode} - ${JSON.stringify(response.data)}`);
      failed++;
    }
  } catch (error) {
    logError(`Request failed: ${error.message}`);
    failed++;
  }

  // Test 4: POST /api/config/configure-fallback (troubleshoot strategy)
  logTest('POST /api/config/configure-fallback (troubleshoot)');
  try {
    const requestData = {
      failedService: 'kaspa-node',
      strategy: 'troubleshoot',
      dependentServices: ['kasia-indexer'],
      profiles: ['core', 'indexer-services']
    };
    
    const response = await makeRequest('POST', '/api/config/configure-fallback', requestData);
    
    if (response.statusCode === 200 && response.data.success) {
      logSuccess('Troubleshooting information retrieved');
      logInfo(`Strategy: ${response.data.strategy}`);
      logInfo(`Steps: ${response.data.troubleshooting?.steps?.length || 0}`);
      
      if (response.data.troubleshooting?.steps) {
        response.data.troubleshooting.steps.forEach(step => {
          logInfo(`  ${step.step}. ${step.title}`);
        });
      }
      
      passed++;
    } else {
      logError(`Failed: ${response.statusCode} - ${JSON.stringify(response.data)}`);
      failed++;
    }
  } catch (error) {
    logError(`Request failed: ${error.message}`);
    failed++;
  }

  // Test 5: GET /api/config/fallback-status
  logTest('GET /api/config/fallback-status');
  try {
    const response = await makeRequest('GET', '/api/config/fallback-status');
    
    if (response.statusCode === 200 && response.data.success) {
      logSuccess('Fallback status retrieved');
      logInfo(`Fallback enabled: ${response.data.fallbackEnabled}`);
      
      if (response.data.fallbackEnabled) {
        logInfo(`Node fallback: ${response.data.nodeFallback ? 'Yes' : 'No'}`);
        logInfo(`Indexer fallback: ${response.data.indexerFallback ? 'Yes' : 'No'}`);
        
        if (response.data.publicEndpoints.kaspaNode) {
          logInfo(`Public Kaspa node: ${response.data.publicEndpoints.kaspaNode}`);
        }
      }
      
      passed++;
    } else {
      logError(`Failed: ${response.statusCode} - ${JSON.stringify(response.data)}`);
      failed++;
    }
  } catch (error) {
    logError(`Request failed: ${error.message}`);
    failed++;
  }

  // Test 6: GET /api/config/troubleshooting/:service
  logTest('GET /api/config/troubleshooting/:service');
  try {
    const response = await makeRequest('GET', '/api/config/troubleshooting/kaspa-node?profiles=core');
    
    if (response.statusCode === 200 && response.data.success) {
      logSuccess('Troubleshooting info retrieved');
      logInfo(`Service: ${response.data.service}`);
      logInfo(`Steps: ${response.data.troubleshooting?.steps?.length || 0}`);
      logInfo(`Diagnostics available: ${response.data.troubleshooting?.diagnostics ? 'Yes' : 'No'}`);
      passed++;
    } else {
      logError(`Failed: ${response.statusCode} - ${JSON.stringify(response.data)}`);
      failed++;
    }
  } catch (error) {
    logError(`Request failed: ${error.message}`);
    failed++;
  }

  // Test 7: POST /api/config/configure-fallback (indexer fallback)
  logTest('POST /api/config/configure-fallback (indexer fallback)');
  try {
    const requestData = {
      failedService: 'kasia-indexer',
      strategy: 'continue-public',
      dependentServices: ['kasia-app'],
      currentConfig: {},
      profiles: ['indexer-services', 'kaspa-user-applications']
    };
    
    const response = await makeRequest('POST', '/api/config/configure-fallback', requestData);
    
    if (response.statusCode === 200 && response.data.success) {
      logSuccess('Indexer fallback configured');
      logInfo(`Strategy: ${response.data.strategy}`);
      logInfo(`Kasia indexer URL: ${response.data.fallbackConfig.KASIA_INDEXER_URL || 'N/A'}`);
      logInfo(`Indexer fallback enabled: ${response.data.fallbackConfig._indexerFallback?.enabled}`);
      passed++;
    } else {
      logError(`Failed: ${response.statusCode} - ${JSON.stringify(response.data)}`);
      failed++;
    }
  } catch (error) {
    logError(`Request failed: ${error.message}`);
    failed++;
  }

  // Test 8: POST /api/config/configure-fallback (skip-node strategy)
  logTest('POST /api/config/configure-fallback (skip-node)');
  try {
    const requestData = {
      failedService: 'kaspa-node',
      strategy: 'skip-node',
      dependentServices: ['kasia-indexer', 'k-indexer'],
      currentConfig: {},
      profiles: ['core', 'indexer-services']
    };
    
    const response = await makeRequest('POST', '/api/config/configure-fallback', requestData);
    
    if (response.statusCode === 200 && response.data.success) {
      logSuccess('Skip-node strategy configured');
      logInfo(`Strategy: ${response.data.strategy}`);
      logInfo(`Skip local node: ${response.data.fallbackConfig.SKIP_LOCAL_NODE}`);
      logInfo(`Use public node: ${response.data.fallbackConfig.USE_PUBLIC_KASPA_NODE}`);
      passed++;
    } else {
      logError(`Failed: ${response.statusCode} - ${JSON.stringify(response.data)}`);
      failed++;
    }
  } catch (error) {
    logError(`Request failed: ${error.message}`);
    failed++;
  }

  // Test 9: Error handling - missing required fields
  logTest('Error Handling - Missing Required Fields');
  try {
    const requestData = {
      // Missing failedService and strategy
      dependentServices: []
    };
    
    const response = await makeRequest('POST', '/api/config/configure-fallback', requestData);
    
    if (response.statusCode === 400) {
      logSuccess('Correctly rejected invalid request');
      logInfo(`Error: ${response.data.error}`);
      passed++;
    } else {
      logError(`Expected 400 status, got ${response.statusCode}`);
      failed++;
    }
  } catch (error) {
    logError(`Request failed: ${error.message}`);
    failed++;
  }

  // Test 10: Error handling - invalid strategy
  logTest('Error Handling - Invalid Strategy');
  try {
    const requestData = {
      failedService: 'kaspa-node',
      strategy: 'invalid-strategy',
      dependentServices: [],
      profiles: []
    };
    
    const response = await makeRequest('POST', '/api/config/configure-fallback', requestData);
    
    if (response.statusCode === 400) {
      logSuccess('Correctly rejected invalid strategy');
      logInfo(`Error: ${response.data.error}`);
      passed++;
    } else {
      logError(`Expected 400 status, got ${response.statusCode}`);
      failed++;
    }
  } catch (error) {
    logError(`Request failed: ${error.message}`);
    failed++;
  }

  // Summary
  log('\n' + '='.repeat(60), 'cyan');
  log('TEST SUMMARY', 'cyan');
  log('='.repeat(60), 'cyan');
  log(`Total tests: ${passed + failed}`, 'blue');
  log(`Passed: ${passed}`, 'green');
  log(`Failed: ${failed}`, failed > 0 ? 'red' : 'green');
  log(`Success rate: ${Math.round((passed / (passed + failed)) * 100)}%`, failed > 0 ? 'yellow' : 'green');
  log('='.repeat(60) + '\n', 'cyan');

  process.exit(failed > 0 ? 1 : 0);
}

// Check if server is running
log('Checking if wizard server is running...', 'blue');
makeRequest('GET', '/api/health')
  .then(() => {
    log('✓ Server is running\n', 'green');
    return runTests();
  })
  .catch((error) => {
    log('✗ Server is not running', 'red');
    log('Please start the wizard server first:', 'yellow');
    log('  node services/wizard/backend/src/server.js', 'yellow');
    log('', 'reset');
    process.exit(1);
  });
