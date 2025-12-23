#!/usr/bin/env node

/**
 * Network Change Validation Tests
 * 
 * Tests for Task 10.4: Fix Network Change Warning Logic
 * - Network change detection between mainnet and testnet
 * - Warning generation for network changes
 * - Data incompatibility validation
 * - Prevention of network changes with existing data
 */

const ConfigurationValidator = require('./src/utils/configuration-validator');
const fs = require('fs');
const path = require('path');

const validator = new ConfigurationValidator();

// Test tracking
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function runTest(testName, testFn) {
  totalTests++;
  try {
    const result = testFn();
    if (result) {
      console.log(`✓ ${testName}`);
      passedTests++;
    } else {
      console.log(`✗ ${testName}`);
      failedTests++;
    }
  } catch (error) {
    console.log(`✗ ${testName} - Error: ${error.message}`);
    failedTests++;
  }
}

console.log('Network Change Validation Tests');
console.log('===============================\n');

console.log('Test Suite 1: Basic Network Change Detection');
console.log('--------------------------------------------');

runTest('Network change from mainnet to testnet should generate warning', () => {
  const previousConfig = { KASPA_NETWORK: 'mainnet' };
  const newConfig = { KASPA_NETWORK: 'testnet' };
  const warnings = validator.validateNetworkChange(newConfig, previousConfig);
  return warnings.length > 0;
});

runTest('Network change from testnet to mainnet should generate warning', () => {
  const previousConfig = { KASPA_NETWORK: 'testnet' };
  const newConfig = { KASPA_NETWORK: 'mainnet' };
  const warnings = validator.validateNetworkChange(newConfig, previousConfig);
  return warnings.length > 0;
});

runTest('No network change should not generate warning', () => {
  const previousConfig = { KASPA_NETWORK: 'mainnet' };
  const newConfig = { KASPA_NETWORK: 'mainnet' };
  const warnings = validator.validateNetworkChange(newConfig, previousConfig);
  return warnings.length === 0;
});

runTest('No previous config should not generate warning', () => {
  const newConfig = { KASPA_NETWORK: 'testnet' };
  const warnings = validator.validateNetworkChange(newConfig);
  return warnings.length === 0;
});

runTest('Default network values should be handled correctly', () => {
  const previousConfig = {}; // No network specified (defaults to mainnet)
  const newConfig = { KASPA_NETWORK: 'testnet' };
  const warnings = validator.validateNetworkChange(newConfig, previousConfig);
  return warnings.length > 0;
});

console.log();

console.log('Test Suite 2: Warning Message Content');
console.log('-------------------------------------');

runTest('Network change warning should include data incompatibility message', () => {
  const previousConfig = { KASPA_NETWORK: 'mainnet' };
  const newConfig = { KASPA_NETWORK: 'testnet' };
  const warnings = validator.validateNetworkChange(newConfig, previousConfig);
  return warnings.length > 0 && 
         warnings[0].message.includes('incompatible') &&
         warnings[0].message.includes('fresh installation');
});

runTest('Network change warning should have high severity', () => {
  const previousConfig = { KASPA_NETWORK: 'mainnet' };
  const newConfig = { KASPA_NETWORK: 'testnet' };
  const warnings = validator.validateNetworkChange(newConfig, previousConfig);
  return warnings.length > 0 && warnings[0].severity === 'high';
});

runTest('Network change warning should require confirmation', () => {
  const previousConfig = { KASPA_NETWORK: 'mainnet' };
  const newConfig = { KASPA_NETWORK: 'testnet' };
  const warnings = validator.validateNetworkChange(newConfig, previousConfig);
  return warnings.length > 0 && warnings[0].action === 'confirm';
});

runTest('Network change warning should include previous and new values', () => {
  const previousConfig = { KASPA_NETWORK: 'mainnet' };
  const newConfig = { KASPA_NETWORK: 'testnet' };
  const warnings = validator.validateNetworkChange(newConfig, previousConfig);
  return warnings.length > 0 && 
         warnings[0].previousValue === 'mainnet' &&
         warnings[0].newValue === 'testnet';
});

runTest('Network change warning should indicate fresh install required', () => {
  const previousConfig = { KASPA_NETWORK: 'mainnet' };
  const newConfig = { KASPA_NETWORK: 'testnet' };
  const warnings = validator.validateNetworkChange(newConfig, previousConfig);
  return warnings.length > 0 && 
         warnings[0].requiresFreshInstall === true &&
         warnings[0].dataIncompatible === true;
});

console.log();

console.log('Test Suite 3: Integration with Main Validation');
console.log('----------------------------------------------');

runTest('Main validation should include network warnings when previousConfig provided', () => {
  const config = { KASPA_NETWORK: 'testnet' };
  const profiles = ['core'];
  const previousConfig = { KASPA_NETWORK: 'mainnet' };
  
  const result = validator.validateConfiguration(config, profiles, previousConfig);
  return result.warnings.length > 0 && 
         result.warnings.some(w => w.type === 'network_change');
});

runTest('Main validation should not include network warnings without previousConfig', () => {
  const config = { KASPA_NETWORK: 'testnet' };
  const profiles = ['core'];
  
  const result = validator.validateConfiguration(config, profiles);
  return !result.warnings.some(w => w.type === 'network_change');
});

runTest('Network change warning should not affect validation validity', () => {
  const config = { 
    KASPA_NETWORK: 'testnet',
    KASPA_NODE_RPC_PORT: 16110,
    KASPA_NODE_P2P_PORT: 16111
  };
  const profiles = ['core'];
  const previousConfig = { KASPA_NETWORK: 'mainnet' };
  
  const result = validator.validateConfiguration(config, profiles, previousConfig);
  return result.valid === true; // Warnings don't make validation invalid
});

console.log();

console.log('Test Suite 4: Edge Cases');
console.log('------------------------');

runTest('Empty network values should be handled gracefully', () => {
  const previousConfig = { KASPA_NETWORK: '' };
  const newConfig = { KASPA_NETWORK: 'testnet' };
  const warnings = validator.validateNetworkChange(newConfig, previousConfig);
  return warnings.length > 0; // Empty should default to mainnet
});

runTest('Null network values should be handled gracefully', () => {
  const previousConfig = { KASPA_NETWORK: null };
  const newConfig = { KASPA_NETWORK: 'testnet' };
  const warnings = validator.validateNetworkChange(newConfig, previousConfig);
  return warnings.length > 0; // Null should default to mainnet
});

runTest('Undefined network values should be handled gracefully', () => {
  const previousConfig = { KASPA_NETWORK: undefined };
  const newConfig = { KASPA_NETWORK: 'testnet' };
  const warnings = validator.validateNetworkChange(newConfig, previousConfig);
  return warnings.length > 0; // Undefined should default to mainnet
});

runTest('Invalid network values should not crash validation', () => {
  const previousConfig = { KASPA_NETWORK: 'invalid' };
  const newConfig = { KASPA_NETWORK: 'testnet' };
  const warnings = validator.validateNetworkChange(newConfig, previousConfig);
  return warnings.length > 0; // Should still detect change
});

console.log();

console.log('Test Suite 5: Specific Network Combinations');
console.log('-------------------------------------------');

runTest('Mainnet to testnet change should be detected', () => {
  const previousConfig = { KASPA_NETWORK: 'mainnet' };
  const newConfig = { KASPA_NETWORK: 'testnet' };
  const warnings = validator.validateNetworkChange(newConfig, previousConfig);
  return warnings.length > 0 && 
         warnings[0].previousValue === 'mainnet' &&
         warnings[0].newValue === 'testnet';
});

runTest('Testnet to mainnet change should be detected', () => {
  const previousConfig = { KASPA_NETWORK: 'testnet' };
  const newConfig = { KASPA_NETWORK: 'mainnet' };
  const warnings = validator.validateNetworkChange(newConfig, previousConfig);
  return warnings.length > 0 && 
         warnings[0].previousValue === 'testnet' &&
         warnings[0].newValue === 'mainnet';
});

runTest('Same network (mainnet) should not generate warning', () => {
  const previousConfig = { KASPA_NETWORK: 'mainnet' };
  const newConfig = { KASPA_NETWORK: 'mainnet' };
  const warnings = validator.validateNetworkChange(newConfig, previousConfig);
  return warnings.length === 0;
});

runTest('Same network (testnet) should not generate warning', () => {
  const previousConfig = { KASPA_NETWORK: 'testnet' };
  const newConfig = { KASPA_NETWORK: 'testnet' };
  const warnings = validator.validateNetworkChange(newConfig, previousConfig);
  return warnings.length === 0;
});

console.log();

console.log('Test Suite 6: Data Existence Detection');
console.log('--------------------------------------');

// Note: These tests check the data detection logic but won't actually create files
// They test the logic paths and error handling

runTest('Data detection should not crash on missing directories', () => {
  const previousConfig = { KASPA_NETWORK: 'mainnet' };
  const newConfig = { KASPA_NETWORK: 'testnet' };
  
  try {
    const warnings = validator.validateNetworkChange(newConfig, previousConfig);
    return warnings.length > 0; // Should still generate warning even if no data detected
  } catch (error) {
    return false; // Should not throw errors
  }
});

runTest('Network change warning should include data compatibility information', () => {
  const previousConfig = { KASPA_NETWORK: 'mainnet' };
  const newConfig = { KASPA_NETWORK: 'testnet' };
  const warnings = validator.validateNetworkChange(newConfig, previousConfig);
  
  return warnings.length > 0 && 
         warnings[0].message.includes('blockchain data') &&
         (warnings[0].message.includes('will not work') || warnings[0].message.includes('incompatible'));
});

console.log();

// Summary
console.log('=== Test Summary ===');
console.log(`Total Tests: ${totalTests}`);
console.log(`Passed: ${passedTests} ✓`);
console.log(`Failed: ${failedTests} ✗`);
console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

if (failedTests === 0) {
  console.log('\n🎉 All network change validation tests passed!');
  process.exit(0);
} else {
  console.log(`\n❌ ${failedTests} test(s) failed. Please review the implementation.`);
  process.exit(1);
}