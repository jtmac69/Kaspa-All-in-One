#!/usr/bin/env node

/**
 * Test script for Reconfiguration API Endpoints
 * 
 * Tests the new reconfiguration API endpoints to ensure they are properly
 * integrated and responding correctly.
 */

const http = require('http');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const API_BASE = '/api/wizard';

// Test configuration
const TEST_CONFIG = {
  timeout: 5000,
  endpoints: [
    {
      method: 'GET',
      path: '/profiles/status',
      description: 'Get profile installation status'
    },
    {
      method: 'POST',
      path: '/reconfigure/validate',
      description: 'Validate reconfiguration changes',
      body: {
        action: 'add',
        profiles: ['core'],
        configuration: {
          KASPA_NODE_RPC_PORT: 16110,
          KASPA_NODE_P2P_PORT: 16111
        }
      }
    },
    {
      method: 'GET',
      path: '/reconfigure/history',
      description: 'Get reconfiguration history'
    },
    {
      method: 'GET',
      path: '/operations',
      description: 'Get active operations'
    }
  ]
};

/**
 * Make HTTP request
 */
function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path, BASE_URL);
    
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: TEST_CONFIG.timeout
    };
    
    if (body) {
      const bodyStr = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsed
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
            parseError: error.message
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

/**
 * Test endpoint
 */
async function testEndpoint(endpoint) {
  const startTime = Date.now();
  
  try {
    console.log(`\n🧪 Testing: ${endpoint.method} ${endpoint.path}`);
    console.log(`   Description: ${endpoint.description}`);
    
    if (endpoint.body) {
      console.log(`   Body: ${JSON.stringify(endpoint.body, null, 2)}`);
    }
    
    const response = await makeRequest(endpoint.method, endpoint.path, endpoint.body);
    const duration = Date.now() - startTime;
    
    console.log(`   Status: ${response.statusCode}`);
    console.log(`   Duration: ${duration}ms`);
    
    if (response.parseError) {
      console.log(`   ⚠️  Parse Error: ${response.parseError}`);
      console.log(`   Raw Response: ${response.body.substring(0, 200)}...`);
    } else if (response.body) {
      if (response.body.success !== undefined) {
        console.log(`   Success: ${response.body.success}`);
      }
      
      if (response.body.error) {
        console.log(`   Error: ${response.body.error}`);
      }
      
      if (response.body.message) {
        console.log(`   Message: ${response.body.message}`);
      }
      
      // Show some key response data
      if (response.body.profileStates) {
        console.log(`   Profile States: ${response.body.profileStates.length} profiles`);
      }
      
      if (response.body.history) {
        console.log(`   History: ${response.body.history.length} entries`);
      }
      
      if (response.body.operations) {
        console.log(`   Operations: ${response.body.operations.length} active`);
      }
    }
    
    // Determine test result
    const isSuccess = response.statusCode >= 200 && response.statusCode < 300;
    const hasValidResponse = !response.parseError && (
      response.body.success !== false || 
      response.statusCode === 404 || // Not found is acceptable for some endpoints
      response.statusCode === 400    // Bad request is acceptable for validation
    );
    
    if (isSuccess && hasValidResponse) {
      console.log(`   ✅ PASS`);
      return { success: true, endpoint: endpoint.path, duration };
    } else {
      console.log(`   ❌ FAIL`);
      return { success: false, endpoint: endpoint.path, duration, error: response.body.error || 'Unknown error' };
    }
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`   ❌ FAIL - ${error.message}`);
    return { success: false, endpoint: endpoint.path, duration, error: error.message };
  }
}

/**
 * Check if server is running
 */
async function checkServer() {
  try {
    console.log('🔍 Checking if wizard server is running...');
    const response = await makeRequest('GET', '/../health');
    
    if (response.statusCode === 200) {
      console.log('✅ Server is running');
      return true;
    } else {
      console.log(`❌ Server responded with status ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Server is not accessible: ${error.message}`);
    console.log('\n💡 To start the server:');
    console.log('   cd services/wizard/backend');
    console.log('   npm start');
    return false;
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🚀 Reconfiguration API Endpoint Tests');
  console.log('=====================================');
  
  // Check server
  const serverRunning = await checkServer();
  if (!serverRunning) {
    process.exit(1);
  }
  
  // Run tests
  const results = [];
  
  for (const endpoint of TEST_CONFIG.endpoints) {
    const result = await testEndpoint(endpoint);
    results.push(result);
  }
  
  // Summary
  console.log('\n📊 Test Summary');
  console.log('===============');
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  
  console.log(`Total Tests: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total Duration: ${totalDuration}ms`);
  console.log(`Average Duration: ${Math.round(totalDuration / results.length)}ms`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   ${r.endpoint}: ${r.error}`);
    });
  }
  
  console.log(`\n${failed === 0 ? '🎉 All tests passed!' : '⚠️  Some tests failed'}`);
  
  // Exit with appropriate code
  process.exit(failed === 0 ? 0 : 1);
}

// Run tests if called directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}

module.exports = { runTests, testEndpoint, checkServer };