#!/usr/bin/env node

/**
 * Simple test to verify enhanced validation is working
 */

const ConfigurationValidator = require('./src/utils/configuration-validator');

const validator = new ConfigurationValidator();

console.log('Testing enhanced validation methods directly...\n');

// Test 1: Port availability validation
console.log('=== Test 1: Port Availability Validation ===');
const config1 = {
  KASPA_NODE_RPC_PORT: 80, // Reserved port
  KASPA_NODE_P2P_PORT: 16111
};
const portErrors = validator.validatePortAvailability(config1, ['core']);
console.log('Port availability errors:', portErrors);

// Test 2: Mixed indexer validation
console.log('\n=== Test 2: Mixed Indexer Validation ===');
const config2 = {
  KASIA_INDEXER_URL: 'http://localhost:8080',
  K_INDEXER_URL: 'https://api.k-social.io',
  MIXED_INDEXER_CONFIRMED: false
};
const indexerErrors = validator.validateMixedIndexerConfiguration(config2, ['kaspa-user-applications', 'indexer-services']);
console.log('Mixed indexer errors:', indexerErrors);

// Test 3: Wallet validation
console.log('\n=== Test 3: Wallet Validation ===');
const config3 = {
  CREATE_WALLET: true,
  WALLET_PASSWORD: '123' // Weak password
};
const walletErrors = validator.validateWalletConfiguration(config3, ['core']);
console.log('Wallet errors:', walletErrors);

// Test 4: Mining wallet validation
console.log('\n=== Test 4: Mining Wallet Validation ===');
const config4 = {
  MINING_ADDRESS: 'invalid-address'
};
const miningErrors = validator.validateMiningWalletConfiguration(config4, ['mining']);
console.log('Mining wallet errors:', miningErrors);

// Test 5: Complete validation
console.log('\n=== Test 5: Complete Validation ===');
const completeConfig = {
  KASPA_NODE_RPC_PORT: 80,
  CREATE_WALLET: true,
  WALLET_PASSWORD: '123',
  MINING_ADDRESS: 'invalid-address'
};
const completeResult = validator.validateConfiguration(completeConfig, ['core', 'mining']);
console.log('Complete validation result:');
console.log('Valid:', completeResult.valid);
console.log('Errors:', completeResult.errors.length);
console.log('Warnings:', completeResult.warnings.length);
completeResult.errors.forEach((error, i) => {
  console.log(`  ${i + 1}. ${error.field}: ${error.message} (${error.type})`);
});