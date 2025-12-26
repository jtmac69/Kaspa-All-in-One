#!/usr/bin/env node

/**
 * Test script for Dependency Validator API endpoints
 * 
 * Tests the new API endpoints:
 * - POST /api/profiles/validate-selection
 * - POST /api/profiles/validation-report
 * - POST /api/profiles/dependency-graph
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

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

function logTest(name, passed) {
  const symbol = passed ? '✓' : '✗';
  const color = passed ? 'green' : 'red';
  log(`${symbol} ${name}`, color);
}

// Make HTTP request
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
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
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

let totalTests = 0;
let passedTests = 0;

async function runTest(name, testFn) {
  totalTests++;
  try {
    const result = await testFn();
    if (result) {
      passedTests++;
      logTest(name, true);
    } else {
      logTest(name, false);
    }
    return result;
  } catch (error) {
    logTest(name, false);
    log(`  Error: ${error.message}`, 'red');
    return false;
  }
}

async function main() {
  log('Starting API tests...', 'blue');
  log('Make sure the wizard backend is running on port 3000', 'yellow');
  
  // Wait a moment for user to read
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 1: validate-selection endpoint
  logSection('Test 1: POST /api/profiles/validate-selection');
  
  await runTest('Valid profile selection should return valid=true', async () => {
    const response = await makeRequest('POST', '/api/profiles/validate-selection', {
      profiles: ['core', 'kaspa-user-applications']
    });
    
    console.log('  Response:', JSON.stringify(response.data, null, 2));
    return response.status === 200 && response.data.valid === true;
  });

  await runTest('Mining without prerequisite should return valid=false', async () => {
    const response = await makeRequest('POST', '/api/profiles/validate-selection', {
      profiles: ['mining']
    });
    
    console.log('  Response:', JSON.stringify(response.data, null, 2));
    return response.status === 200 && 
           response.data.valid === false &&
           response.data.errors.some(e => e.type === 'missing_prerequisite');
  });

  await runTest('Empty profile list should return valid=false', async () => {
    const response = await makeRequest('POST', '/api/profiles/validate-selection', {
      profiles: []
    });
    
    console.log('  Response:', JSON.stringify(response.data, null, 2));
    return response.status === 200 && 
           response.data.valid === false &&
           response.data.errors.some(e => e.type === 'empty_selection');
  });

  // Test 2: validation-report endpoint
  logSection('Test 2: POST /api/profiles/validation-report');
  
  await runTest('Validation report should include summary', async () => {
    const response = await makeRequest('POST', '/api/profiles/validation-report', {
      profiles: ['core', 'indexer-services']
    });
    
    console.log('  Response:', JSON.stringify(response.data, null, 2));
    return response.status === 200 && 
           response.data.summary &&
           response.data.requirements &&
           response.data.recommendations !== undefined;
  });

  await runTest('Report for invalid selection should include recommendations', async () => {
    const response = await makeRequest('POST', '/api/profiles/validation-report', {
      profiles: ['mining']
    });
    
    console.log('  Response:', JSON.stringify(response.data, null, 2));
    return response.status === 200 && 
           response.data.recommendations &&
           response.data.recommendations.length > 0;
  });

  // Test 3: dependency-graph endpoint
  logSection('Test 3: POST /api/profiles/dependency-graph');
  
  await runTest('Dependency graph should have nodes and edges', async () => {
    const response = await makeRequest('POST', '/api/profiles/dependency-graph', {
      profiles: ['core', 'mining']
    });
    
    console.log('  Response:', JSON.stringify(response.data, null, 2));
    return response.status === 200 && 
           response.data.nodes &&
           response.data.nodes.length > 0;
  });

  await runTest('Graph should show prerequisite edges', async () => {
    const response = await makeRequest('POST', '/api/profiles/dependency-graph', {
      profiles: ['core', 'mining']
    });
    
    console.log('  Response:', JSON.stringify(response.data, null, 2));
    return response.status === 200 && 
           response.data.edges &&
           response.data.edges.some(e => e.type === 'prerequisite');
  });

  // Test 4: Error handling
  logSection('Test 4: Error Handling');
  
  await runTest('Invalid request body should return 400', async () => {
    const response = await makeRequest('POST', '/api/profiles/validate-selection', {
      invalid: 'data'
    });
    
    console.log('  Response:', JSON.stringify(response.data, null, 2));
    return response.status === 400;
  });

  await runTest('Missing profiles field should return 400', async () => {
    const response = await makeRequest('POST', '/api/profiles/validate-selection', {});
    
    console.log('  Response:', JSON.stringify(response.data, null, 2));
    return response.status === 400;
  });

  // Summary
  logSection('Test Summary');
  log(`Total Tests: ${totalTests}`, 'blue');
  log(`Passed: ${passedTests}`, 'green');
  log(`Failed: ${totalTests - passedTests}`, 'red');
  log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`, 'cyan');

  if (passedTests === totalTests) {
    log('\n✓ All API tests passed!', 'green');
    process.exit(0);
  } else {
    log('\n✗ Some API tests failed', 'red');
    process.exit(1);
  }
}

main().catch(error => {
  log(`Fatal error: ${error.message}`, 'red');
  log('Make sure the wizard backend is running on port 3000', 'yellow');
  process.exit(1);
});
