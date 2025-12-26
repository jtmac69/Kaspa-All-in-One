#!/usr/bin/env node

/**
 * Network Change Integration Tests
 * 
 * Tests the integration between the configuration validator and the expected
 * behavior for network change warnings without requiring HTTP testing.
 */

const ConfigurationValidator = require('./src/utils/configuration-validator');

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

console.log('Network Change Integration Tests');
console.log('================================\n');

console.log('Test Suite 1: Main Validation Method Integration');
console.log('-------------------------------------------------');

runTest('validateConfiguration should include network warnings when previousConfig provided', () => {
  const config = { 
    KASPA_NETWORK: 'testnet',
    KASPA_NODE_RPC_PORT: 16110,
    KASPA_NODE_P2P_PORT: 16111
  };
  const profiles = ['core'];
  const previousConfig = { KASPA_NETWORK: 'mainnet' };
  
  const result = validator.validateConfiguration(config, profiles, previousConfig);
  
  return result.warnings.length > 0 && 
         result.warnings.some(w => w.type === 'network_change') &&
         result.valid === true; // Warnings don't make validation invalid
});

runTest('validateConfiguration should not include network warnings without previousConfig', () => {
  const config = { 
    KASPA_NETWORK: 'testnet',
    KASPA_NODE_RPC_PORT: 16110,
    KASPA_NODE_P2P_PORT: 16111
  };
  const profiles = ['core'];
  
  const result = validator.validateConfiguration(config, profiles);
  
  return !result.warnings.some(w => w.type === 'network_change');
});

runTest('Network change warning should have all required properties', () => {
  const config = { 
    KASPA_NETWORK: 'testnet',
    KASPA_NODE_RPC_PORT: 16110,
    KASPA_NODE_P2P_PORT: 16111
  };
  const profiles = ['core'];
  const previousConfig = { KASPA_NETWORK: 'mainnet' };
  
  const result = validator.validateConfiguration(config, profiles, previousConfig);
  const networkWarning = result.warnings.find(w => w.type === 'network_change');
  
  if (!networkWarning) return false;
  
  return networkWarning.field === 'KASPA_NETWORK' &&
         networkWarning.severity === 'high' &&
         networkWarning.action === 'confirm' &&
         networkWarning.previousValue === 'mainnet' &&
         networkWarning.newValue === 'testnet' &&
         networkWarning.requiresFreshInstall === true &&
         networkWarning.dataIncompatible === true &&
         networkWarning.message.includes('incompatible') &&
         networkWarning.message.includes('fresh installation');
});

console.log();

console.log('Test Suite 2: Default Network Handling');
console.log('--------------------------------------');

runTest('Missing network should default to mainnet in comparison', () => {
  const config = { 
    KASPA_NODE_RPC_PORT: 16110,
    KASPA_NODE_P2P_PORT: 16111
    // No KASPA_NETWORK specified
  };
  const profiles = ['core'];
  const previousConfig = { KASPA_NETWORK: 'testnet' };
  
  const result = validator.validateConfiguration(config, profiles, previousConfig);
  const networkWarning = result.warnings.find(w => w.type === 'network_change');
  
  return networkWarning &&
         networkWarning.previousValue === 'testnet' &&
         networkWarning.newValue === 'mainnet'; // Should default to mainnet
});

runTest('Previous config missing network should default to mainnet', () => {
  const config = { 
    KASPA_NETWORK: 'testnet',
    KASPA_NODE_RPC_PORT: 16110,
    KASPA_NODE_P2P_PORT: 16111
  };
  const profiles = ['core'];
  const previousConfig = {}; // No KASPA_NETWORK specified
  
  const result = validator.validateConfiguration(config, profiles, previousConfig);
  const networkWarning = result.warnings.find(w => w.type === 'network_change');
  
  return networkWarning &&
         networkWarning.previousValue === 'mainnet' && // Should default to mainnet
         networkWarning.newValue === 'testnet';
});

console.log();

console.log('Test Suite 3: Complex Configuration Scenarios');
console.log('---------------------------------------------');

runTest('Network change with multiple profiles should still generate warning', () => {
  const config = { 
    KASPA_NETWORK: 'testnet',
    KASPA_NODE_RPC_PORT: 16110,
    KASPA_NODE_P2P_PORT: 16111,
    K_SOCIAL_DB_PASSWORD: 'securepassword123',
    SIMPLY_KASPA_DB_PASSWORD: 'securepassword456'
  };
  const profiles = ['core', 'indexer-services'];
  const previousConfig = { KASPA_NETWORK: 'mainnet' };
  
  const result = validator.validateConfiguration(config, profiles, previousConfig);
  
  return result.warnings.some(w => w.type === 'network_change') &&
         result.valid === true;
});

runTest('Network change warning should not interfere with other validation errors', () => {
  const config = { 
    KASPA_NETWORK: 'testnet',
    KASPA_NODE_RPC_PORT: 70000, // Invalid port - too high
    KASPA_NODE_P2P_PORT: 16111
  };
  const profiles = ['core'];
  const previousConfig = { KASPA_NETWORK: 'mainnet' };
  
  const result = validator.validateConfiguration(config, profiles, previousConfig);
  
  return result.warnings.some(w => w.type === 'network_change') &&
         result.errors.some(e => e.type === 'range') &&
         result.valid === false; // Should be invalid due to port error
});

runTest('Same network should not generate warning even with other changes', () => {
  const config = { 
    KASPA_NETWORK: 'mainnet',
    KASPA_NODE_RPC_PORT: 16210, // Changed port
    KASPA_NODE_P2P_PORT: 16211  // Changed port
  };
  const profiles = ['core'];
  const previousConfig = { 
    KASPA_NETWORK: 'mainnet',
    KASPA_NODE_RPC_PORT: 16110,
    KASPA_NODE_P2P_PORT: 16111
  };
  
  const result = validator.validateConfiguration(config, profiles, previousConfig);
  
  return !result.warnings.some(w => w.type === 'network_change') &&
         result.valid === true;
});

console.log();

console.log('Test Suite 4: Edge Cases and Error Handling');
console.log('--------------------------------------------');

runTest('Null previous config should not crash', () => {
  const config = { 
    KASPA_NETWORK: 'testnet',
    KASPA_NODE_RPC_PORT: 16110,
    KASPA_NODE_P2P_PORT: 16111
  };
  const profiles = ['core'];
  
  try {
    const result = validator.validateConfiguration(config, profiles, null);
    return !result.warnings.some(w => w.type === 'network_change');
  } catch (error) {
    return false; // Should not throw
  }
});

runTest('Undefined previous config should not crash', () => {
  const config = { 
    KASPA_NETWORK: 'testnet',
    KASPA_NODE_RPC_PORT: 16110,
    KASPA_NODE_P2P_PORT: 16111
  };
  const profiles = ['core'];
  
  try {
    const result = validator.validateConfiguration(config, profiles, undefined);
    return !result.warnings.some(w => w.type === 'network_change');
  } catch (error) {
    return false; // Should not throw
  }
});

runTest('Empty previous config object should handle gracefully', () => {
  const config = { 
    KASPA_NETWORK: 'testnet',
    KASPA_NODE_RPC_PORT: 16110,
    KASPA_NODE_P2P_PORT: 16111
  };
  const profiles = ['core'];
  const previousConfig = {};
  
  const result = validator.validateConfiguration(config, profiles, previousConfig);
  const networkWarning = result.warnings.find(w => w.type === 'network_change');
  
  return networkWarning &&
         networkWarning.previousValue === 'mainnet' && // Should default
         networkWarning.newValue === 'testnet';
});

console.log();

// Summary
console.log('=== Test Summary ===');
console.log(`Total Tests: ${totalTests}`);
console.log(`Passed: ${passedTests} ✓`);
console.log(`Failed: ${failedTests} ✗`);
console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

if (failedTests === 0) {
  console.log('\n🎉 All network change integration tests passed!');
  process.exit(0);
} else {
  console.log(`\n❌ ${failedTests} test(s) failed. Please review the implementation.`);
  process.exit(1);
}