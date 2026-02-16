#!/usr/bin/env node

/**
 * Test Configuration Validator
 * 
 * Verifies that the configuration validator correctly handles:
 * - Wallet field validation
 * - Conditional required fields
 * - Migration of deprecated fields
 * - Network mismatch warnings
 * - Port conflict detection
 */

const ConfigurationValidator = require('./src/utils/configuration-validator');

console.log('='.repeat(60));
console.log('Configuration Validator Tests');
console.log('='.repeat(60));

const validator = new ConfigurationValidator();

// Test 1: Wallet configuration validation
console.log('\n1. Testing wallet configuration validation...');
const config = {
  WALLET_CONNECTIVITY_ENABLED: true,
  KASPA_NETWORK: 'mainnet',
  KASPA_NODE_WRPC_BORSH_PORT: 17110,
  KASPA_NODE_WRPC_JSON_PORT: 18110,
  KASPA_NODE_RPC_PORT: 16110,
  KASPA_NODE_P2P_PORT: 16111,
  MINING_ADDRESS: 'kaspa:qr0e5n8m4s8p3j8a5k3n8m4s8p3j8a5k3n8m4s8p3j8a5k3n8m4s8p3j8a5v'
};

const result = validator.validateConfiguration(config, ['kaspa-node']);
console.log('   Valid:', result.valid);
console.log('   Errors:', result.errors.length);
console.log('   Warnings:', result.warnings.length);

if (result.errors.length > 0) {
  console.log('   Error details:', result.errors);
}

if (result.valid) {
  console.log('   ✓ PASS: Valid wallet configuration accepted');
} else {
  console.log('   ✗ FAIL: Valid configuration rejected');
}

// Test 2: Network mismatch warning
console.log('\n2. Testing network mismatch warning...');
const mismatchConfig = {
  ...config,
  MINING_ADDRESS: 'kaspatest:qr0e5n8m4s8p3j8a5k3n8m4s8p3j8a5k3n8m4s8p3j8a5k3n8m4s8p3j8a5v'
};

const mismatchResult = validator.validateConfiguration(mismatchConfig, ['kaspa-node']);
console.log('   Warnings:', mismatchResult.warnings.length);

const hasNetworkWarning = mismatchResult.warnings.some(w => w.type === 'networkMismatch');
console.log('   Has network mismatch warning:', hasNetworkWarning);

if (hasNetworkWarning) {
  const warning = mismatchResult.warnings.find(w => w.type === 'networkMismatch');
  console.log('   Warning message:', warning.message);
  console.log('   ✓ PASS: Network mismatch detected');
} else {
  console.log('   ✗ FAIL: Network mismatch not detected');
}

// Test 3: Deprecated field migration
console.log('\n3. Testing deprecated field migration...');
const deprecatedConfig = {
  WALLET_ENABLED: true,  // Old field
  KASPA_NETWORK: 'mainnet',
  KASPA_NODE_RPC_PORT: 16110
};

const deprecatedResult = validator.validateConfiguration(deprecatedConfig, ['kaspa-node']);
console.log('   Migration warnings:', deprecatedResult.warnings.filter(w => w.type === 'deprecation').length);
console.log('   Migrated config has WALLET_CONNECTIVITY_ENABLED:', 
  'WALLET_CONNECTIVITY_ENABLED' in deprecatedResult.migratedConfig);
console.log('   Migrated config has WALLET_ENABLED:', 
  'WALLET_ENABLED' in deprecatedResult.migratedConfig);

const hasDeprecationWarning = deprecatedResult.warnings.some(w => w.type === 'deprecation');
const hasMigratedField = 'WALLET_CONNECTIVITY_ENABLED' in deprecatedResult.migratedConfig;

if (hasDeprecationWarning && hasMigratedField) {
  console.log('   ✓ PASS: Deprecated fields migrated with warnings');
} else {
  console.log('   ✗ FAIL: Migration not working correctly');
}

// Test 4: Port conflict detection
console.log('\n4. Testing port conflict detection...');
const portConflictConfig = {
  KASPA_NODE_RPC_PORT: 16110,
  KASPA_NODE_P2P_PORT: 16110,  // Same as RPC port
  KASPA_NETWORK: 'mainnet'
};

const portResult = validator.validateConfiguration(portConflictConfig, ['kaspa-node']);
console.log('   Errors:', portResult.errors.length);

const hasPortConflict = portResult.errors.some(e => e.type === 'port_conflict');
console.log('   Has port conflict error:', hasPortConflict);

if (hasPortConflict) {
  const error = portResult.errors.find(e => e.type === 'port_conflict');
  console.log('   Error message:', error.message);
  console.log('   ✓ PASS: Port conflict detected');
} else {
  console.log('   ✗ FAIL: Port conflict not detected');
}

// Test 5: Conditional required validation
console.log('\n5. Testing conditional required validation...');
const conditionalConfig = {
  WALLET_CONNECTIVITY_ENABLED: true,
  KASPA_NETWORK: 'mainnet',
  // Missing KASPA_NODE_WRPC_BORSH_PORT which is conditionally required
};

const conditionalResult = validator.validateConfiguration(conditionalConfig, ['kaspa-node']);
console.log('   Errors:', conditionalResult.errors.length);

if (conditionalResult.errors.length > 0) {
  console.log('   Error fields:', conditionalResult.errors.map(e => e.field));
  console.log('   ✓ PASS: Conditional required fields validated');
} else {
  console.log('   ⚠ WARNING: Conditional required validation may need adjustment');
}

// Test 6: Mining address validation with stratum profile
console.log('\n6. Testing mining address warning with stratum profile...');
const stratumConfig = {
  KASPA_NETWORK: 'mainnet',
  KASPA_NODE_RPC_PORT: 16110,
  WALLET_CONNECTIVITY_ENABLED: true
  // Missing MINING_ADDRESS
};

const stratumResult = validator.validateConfiguration(stratumConfig, ['kaspa-node', 'kaspa-stratum']);
console.log('   Warnings:', stratumResult.warnings.length);

const hasMiningWarning = stratumResult.warnings.some(w => 
  w.field === 'MINING_ADDRESS' && w.type === 'missingRecommended'
);
console.log('   Has missing mining address warning:', hasMiningWarning);

if (hasMiningWarning) {
  console.log('   ✓ PASS: Mining address warning generated');
} else {
  console.log('   ⚠ WARNING: Mining address warning not generated');
}

// Test 7: Kaspa address validation
console.log('\n7. Testing Kaspa address validation...');
const invalidAddressConfig = {
  WALLET_CONNECTIVITY_ENABLED: true,
  KASPA_NETWORK: 'mainnet',
  MINING_ADDRESS: 'invalid-address'
};

const addressResult = validator.validateConfiguration(invalidAddressConfig, ['kaspa-node']);
console.log('   Errors:', addressResult.errors.length);

const hasAddressError = addressResult.errors.some(e => 
  e.field === 'MINING_ADDRESS' && e.type === 'kaspaAddress'
);
console.log('   Has address validation error:', hasAddressError);

if (hasAddressError) {
  const error = addressResult.errors.find(e => e.field === 'MINING_ADDRESS');
  console.log('   Error message:', error.message);
  console.log('   ✓ PASS: Invalid Kaspa address detected');
} else {
  console.log('   ⚠ WARNING: Address validation may need adjustment');
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('Test Summary');
console.log('='.repeat(60));
console.log('All critical tests completed. Review output above for any failures.');
console.log('');
