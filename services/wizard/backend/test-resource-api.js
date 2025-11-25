#!/usr/bin/env node

/**
 * Test script for resource calculation API endpoint
 * Tests POST /api/resource-check/calculate-combined
 */

const http = require('http');

// Test data
const testCases = [
  {
    name: 'Single Profile (Core)',
    data: {
      profiles: ['core']
    }
  },
  {
    name: 'Multiple Profiles with Shared Resources',
    data: {
      profiles: ['core', 'explorer']
    }
  },
  {
    name: 'All Profiles',
    data: {
      profiles: ['core', 'explorer', 'production', 'mining']
    }
  },
  {
    name: 'Empty Profile List (Error Case)',
    data: {
      profiles: []
    }
  }
];

function makeRequest(data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/resource-check/calculate-combined',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
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
          resolve({ statusCode: res.statusCode, response });
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('='.repeat(80));
  console.log('Resource Calculation API - Test Suite');
  console.log('='.repeat(80));
  console.log();
  console.log('NOTE: This test requires the wizard backend to be running on port 3000');
  console.log('Start the backend with: cd services/wizard/backend && npm start');
  console.log();
  
  for (const testCase of testCases) {
    console.log(`Test: ${testCase.name}`);
    console.log('-'.repeat(80));
    
    try {
      const { statusCode, response } = await makeRequest(testCase.data);
      
      console.log(`Status Code: ${statusCode}`);
      console.log(`Success: ${response.success}`);
      
      if (response.success) {
        console.log(`Profiles: ${response.profiles.join(', ')}`);
        console.log(`Requirements:`);
        console.log(`  RAM: ${response.requirements.minRAM.toFixed(1)}GB min, ${response.requirements.recommendedRAM.toFixed(1)}GB recommended`);
        console.log(`  Disk: ${response.requirements.minDisk.toFixed(1)}GB`);
        console.log(`  CPU: ${response.requirements.minCPU} cores`);
        console.log(`Services: ${response.services.length}`);
        console.log(`Shared Resources: ${response.sharedResources.length}`);
        if (response.sharedResources.length > 0) {
          console.log(`Shared Services:`);
          response.sharedResources.forEach(s => {
            console.log(`  - ${s.name}: shared by ${s.usedBy.join(', ')}`);
          });
        }
        console.log(`Sufficient: ${response.sufficient}`);
        console.log(`Warnings: ${response.warnings.length}`);
        if (response.warnings.length > 0) {
          response.warnings.forEach(w => {
            console.log(`  [${w.severity}] ${w.message}`);
          });
        }
        console.log(`Optimizations: ${response.optimizations.length}`);
      } else {
        console.log(`Error: ${response.error}`);
        console.log(`Message: ${response.message}`);
      }
      
      console.log('✓ Test passed');
    } catch (error) {
      console.log(`✗ Test failed: ${error.message}`);
      if (error.code === 'ECONNREFUSED') {
        console.log('  → Backend is not running. Start it with: cd services/wizard/backend && npm start');
        break;
      }
    }
    
    console.log();
  }
  
  console.log('='.repeat(80));
  console.log('API tests completed!');
  console.log('='.repeat(80));
}

// Run tests
runTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
