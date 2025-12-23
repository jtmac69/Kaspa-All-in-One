#!/usr/bin/env node

/**
 * Network Change API Tests
 * 
 * Tests the API endpoints to ensure network change validation works correctly
 * through the HTTP interface.
 */

const request = require('supertest');
const express = require('express');
const configRouter = require('./src/api/config');

const app = express();
app.use(express.json());
app.use('/api/config', configRouter);

// Test tracking
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function runTest(testName, testFn) {
  totalTests++;
  return testFn()
    .then(result => {
      if (result) {
        console.log(`✓ ${testName}`);
        passedTests++;
      } else {
        console.log(`✗ ${testName}`);
        failedTests++;
      }
    })
    .catch(error => {
      console.log(`✗ ${testName} - Error: ${error.message}`);
      failedTests++;
    });
}

async function runTests() {
  console.log('Network Change API Tests');
  console.log('========================\n');

  console.log('Test Suite 1: /api/config/validate endpoint');
  console.log('--------------------------------------------');

  await runTest('Network change warning should be included in validation response', async () => {
    const response = await request(app)
      .post('/api/config/validate')
      .send({
        config: { KASPA_NETWORK: 'testnet' },
        profiles: ['core'],
        previousConfig: { KASPA_NETWORK: 'mainnet' }
      });

    return response.status === 200 && 
           response.body.warnings && 
           response.body.warnings.length > 0 &&
           response.body.warnings.some(w => w.type === 'network_change');
  });

  await runTest('No network change should not include warnings', async () => {
    const response = await request(app)
      .post('/api/config/validate')
      .send({
        config: { KASPA_NETWORK: 'mainnet' },
        profiles: ['core'],
        previousConfig: { KASPA_NETWORK: 'mainnet' }
      });

    return response.status === 200 && 
           (!response.body.warnings || 
            !response.body.warnings.some(w => w.type === 'network_change'));
  });

  await runTest('No previous config should not include network warnings', async () => {
    const response = await request(app)
      .post('/api/config/validate')
      .send({
        config: { KASPA_NETWORK: 'testnet' },
        profiles: ['core']
      });

    return response.status === 200 && 
           (!response.body.warnings || 
            !response.body.warnings.some(w => w.type === 'network_change'));
  });

  console.log();

  console.log('Test Suite 2: /api/config/validate-complete endpoint');
  console.log('-----------------------------------------------------');

  await runTest('Network change warning should be included in complete validation', async () => {
    const response = await request(app)
      .post('/api/config/validate-complete')
      .send({
        config: { 
          KASPA_NETWORK: 'testnet',
          KASPA_NODE_RPC_PORT: 16110,
          KASPA_NODE_P2P_PORT: 16111
        },
        profiles: ['core'],
        previousConfig: { KASPA_NETWORK: 'mainnet' }
      });

    return response.status === 200 && 
           response.body.warnings && 
           response.body.warnings.length > 0 &&
           response.body.warnings.some(w => w.type === 'network_change');
  });

  await runTest('Network change warning should have correct properties', async () => {
    const response = await request(app)
      .post('/api/config/validate-complete')
      .send({
        config: { 
          KASPA_NETWORK: 'testnet',
          KASPA_NODE_RPC_PORT: 16110,
          KASPA_NODE_P2P_PORT: 16111
        },
        profiles: ['core'],
        previousConfig: { KASPA_NETWORK: 'mainnet' }
      });

    if (response.status !== 200) return false;

    const networkWarning = response.body.warnings.find(w => w.type === 'network_change');
    if (!networkWarning) return false;

    return networkWarning.severity === 'high' &&
           networkWarning.action === 'confirm' &&
           networkWarning.previousValue === 'mainnet' &&
           networkWarning.newValue === 'testnet' &&
           networkWarning.requiresFreshInstall === true &&
           networkWarning.dataIncompatible === true;
  });

  console.log();

  console.log('Test Suite 3: Error Handling');
  console.log('-----------------------------');

  await runTest('Invalid request should return 400', async () => {
    const response = await request(app)
      .post('/api/config/validate')
      .send({
        config: { KASPA_NETWORK: 'testnet' }
        // Missing profiles array
      });

    return response.status === 400;
  });

  await runTest('Empty profiles array should return 400', async () => {
    const response = await request(app)
      .post('/api/config/validate')
      .send({
        config: { KASPA_NETWORK: 'testnet' },
        profiles: []
      });

    return response.status === 400;
  });

  console.log();

  // Summary
  console.log('=== Test Summary ===');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests} ✓`);
  console.log(`Failed: ${failedTests} ✗`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  if (failedTests === 0) {
    console.log('\n🎉 All network change API tests passed!');
    process.exit(0);
  } else {
    console.log(`\n❌ ${failedTests} test(s) failed. Please review the implementation.`);
    process.exit(1);
  }
}

// Check if supertest is available
try {
  require('supertest');
  runTests();
} catch (error) {
  console.log('⚠️  supertest not available, skipping API tests');
  console.log('   Install with: npm install supertest');
  process.exit(0);
}