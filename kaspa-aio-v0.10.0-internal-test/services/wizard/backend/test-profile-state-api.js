#!/usr/bin/env node

/**
 * Test script for ProfileStateManager API endpoints
 */

const path = require('path');
const express = require('express');

// Set up environment
process.env.PROJECT_ROOT = path.resolve(__dirname, '../../..');

async function testAPIEndpoints() {
  console.log('🌐 Testing ProfileStateManager API endpoints...\n');
  
  const reconfigureRouter = require('./src/api/reconfigure');
  
  const app = express();
  app.use(express.json());
  app.use('/api/wizard', reconfigureRouter);
  
  const server = app.listen(0, async () => {
    const port = server.address().port;
    console.log(`Test server running on port ${port}\n`);
    
    try {
      // Test 1: Profile states endpoint
      console.log('📋 Test 1: GET /api/wizard/profiles/state');
      await testEndpoint(port, '/api/wizard/profiles/state', 'Profile states');
      
      // Test 2: Grouped profiles endpoint
      console.log('\n📊 Test 2: GET /api/wizard/profiles/grouped');
      await testEndpoint(port, '/api/wizard/profiles/grouped', 'Grouped profiles');
      
      // Test 3: Individual profile state
      console.log('\n🔍 Test 3: GET /api/wizard/profiles/state/core');
      await testEndpoint(port, '/api/wizard/profiles/state/core', 'Core profile state');
      
      // Test 4: Cache status
      console.log('\n💾 Test 4: GET /api/wizard/profiles/cache-status');
      await testEndpoint(port, '/api/wizard/profiles/cache-status', 'Cache status');
      
      // Test 5: Force refresh
      console.log('\n🔄 Test 5: POST /api/wizard/profiles/refresh');
      await testPostEndpoint(port, '/api/wizard/profiles/refresh', {}, 'Force refresh');
      
      // Test 6: Invalid profile
      console.log('\n❓ Test 6: GET /api/wizard/profiles/state/invalid');
      await testEndpoint(port, '/api/wizard/profiles/state/invalid', 'Invalid profile (should fail)');
      
    } catch (error) {
      console.error('Test error:', error);
    } finally {
      server.close();
      console.log('\n✅ API endpoint testing completed');
      process.exit(0);
    }
  });
}

async function testEndpoint(port, endpoint, description) {
  try {
    const http = require('http');
    
    const response = await new Promise((resolve, reject) => {
      const req = http.get(`http://localhost:${port}${endpoint}`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({
              statusCode: res.statusCode,
              data: JSON.parse(data)
            });
          } catch (error) {
            reject(new Error(`Invalid JSON response: ${data}`));
          }
        });
      });
      
      req.on('error', reject);
      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });
    
    if (response.data.success) {
      console.log(`✅ ${description}: OK`);
      
      // Show some details for key endpoints
      if (endpoint.includes('/profiles/state') && !endpoint.includes('/state/')) {
        console.log(`   Found ${response.data.profileStates?.length || 0} profiles`);
        console.log(`   Installed: ${response.data.installedProfiles?.length || 0}`);
        console.log(`   Available: ${response.data.availableProfiles?.length || 0}`);
        console.log(`   Partial: ${response.data.partialProfiles?.length || 0}`);
      } else if (endpoint.includes('/grouped')) {
        console.log(`   Summary: ${JSON.stringify(response.data.summary)}`);
      } else if (endpoint.includes('/cache-status')) {
        console.log(`   Cached: ${response.data.cacheStatus.cached}`);
        console.log(`   Age: ${response.data.cacheStatus.age ? Math.round(response.data.cacheStatus.age / 1000) + 's' : 'n/a'}`);
      }
    } else {
      console.log(`❌ ${description}: ${response.data.error}`);
    }
  } catch (error) {
    console.log(`❌ ${description}: ${error.message}`);
  }
}

async function testPostEndpoint(port, endpoint, body, description) {
  try {
    const http = require('http');
    const postData = JSON.stringify(body);
    
    const response = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: port,
        path: endpoint,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };
      
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({
              statusCode: res.statusCode,
              data: JSON.parse(data)
            });
          } catch (error) {
            reject(new Error(`Invalid JSON response: ${data}`));
          }
        });
      });
      
      req.on('error', reject);
      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      req.write(postData);
      req.end();
    });
    
    if (response.data.success) {
      console.log(`✅ ${description}: OK`);
      if (response.data.message) {
        console.log(`   Message: ${response.data.message}`);
      }
    } else {
      console.log(`❌ ${description}: ${response.data.error}`);
    }
  } catch (error) {
    console.log(`❌ ${description}: ${error.message}`);
  }
}

// Run tests
if (require.main === module) {
  testAPIEndpoints().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}

module.exports = { testAPIEndpoints };