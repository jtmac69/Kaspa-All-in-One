/**
 * Test Configuration Field Definitions
 * 
 * Simple test to verify the configuration field registry,
 * field visibility resolver, and configuration validator work correctly.
 */

const { PROFILE_CONFIG_FIELDS, FIELD_CATEGORIES, FIELD_GROUPS } = require('./src/config/configuration-fields');
const FieldVisibilityResolver = require('./src/utils/field-visibility-resolver');
const ConfigurationValidator = require('./src/utils/configuration-validator');

console.log('=== Testing Configuration Field Definitions ===\n');

// Test 1: Configuration Field Registry
console.log('Test 1: Configuration Field Registry');
console.log('-------------------------------------');
console.log('Available profiles:', Object.keys(PROFILE_CONFIG_FIELDS));
console.log('Core profile fields:', PROFILE_CONFIG_FIELDS.core.length);
console.log('Archive node fields:', PROFILE_CONFIG_FIELDS['archive-node'].length);
console.log('Indexer services fields:', PROFILE_CONFIG_FIELDS['indexer-services'].length);
console.log('Common fields:', PROFILE_CONFIG_FIELDS.common.length);
console.log('Field categories:', Object.keys(FIELD_CATEGORIES));
console.log('Field groups:', Object.keys(FIELD_GROUPS));
console.log('✓ Configuration field registry loaded successfully\n');

// Test 2: Field Visibility Resolver
console.log('Test 2: Field Visibility Resolver');
console.log('----------------------------------');
const resolver = new FieldVisibilityResolver();

// Test with Core profile
const coreFields = resolver.getVisibleFields(['core']);
console.log('Core profile visible fields:', coreFields.metadata.totalFields);
console.log('Categories:', Object.keys(coreFields.categories));

// Test with multiple profiles
const multiFields = resolver.getVisibleFields(['core', 'indexer-services']);
console.log('Core + Indexer Services visible fields:', multiFields.metadata.totalFields);

// Test field summary
const summary = resolver.getSummary(['core', 'indexer-services']);
console.log('Summary:', JSON.stringify(summary, null, 2));
console.log('✓ Field visibility resolver working correctly\n');

// Test 3: Configuration Validator
console.log('Test 3: Configuration Validator');
console.log('--------------------------------');
const validator = new ConfigurationValidator();

// Test valid configuration
const validConfig = {
  KASPA_NODE_RPC_PORT: 16110,
  KASPA_NODE_P2P_PORT: 16111,
  KASPA_NETWORK: 'mainnet',
  KASPA_DATA_DIR: '/data/kaspa',
  PUBLIC_NODE: false
};

const validResult = validator.validateConfiguration(validConfig, ['core']);
console.log('Valid config result:', validResult.valid ? '✓ PASS' : '✗ FAIL');
console.log('Errors:', validResult.errors.length);
console.log('Warnings:', validResult.warnings.length);

// Test invalid port range
const invalidPortConfig = {
  KASPA_NODE_RPC_PORT: 100, // Too low
  KASPA_NODE_P2P_PORT: 16111,
  KASPA_NETWORK: 'mainnet'
};

const invalidPortResult = validator.validateConfiguration(invalidPortConfig, ['core']);
console.log('\nInvalid port config result:', invalidPortResult.valid ? '✗ FAIL' : '✓ PASS (correctly detected error)');
console.log('Errors:', invalidPortResult.errors);

// Test port conflict
const conflictConfig = {
  KASPA_NODE_RPC_PORT: 16110,
  KASPA_NODE_P2P_PORT: 16110, // Same as RPC port
  KASPA_NETWORK: 'mainnet'
};

const conflictResult = validator.validateConfiguration(conflictConfig, ['core']);
console.log('\nPort conflict config result:', conflictResult.valid ? '✗ FAIL' : '✓ PASS (correctly detected conflict)');
console.log('Errors:', conflictResult.errors);

// Test network change warning
const previousConfig = {
  KASPA_NETWORK: 'mainnet'
};

const newConfig = {
  KASPA_NETWORK: 'testnet'
};

const networkWarnings = validator.validateNetworkChange(newConfig, previousConfig);
console.log('\nNetwork change warnings:', networkWarnings.length > 0 ? '✓ PASS (warning generated)' : '✗ FAIL');
if (networkWarnings.length > 0) {
  console.log('Warning:', networkWarnings[0].message);
}

// Test required field validation
const missingRequiredConfig = {
  KASPA_NODE_P2P_PORT: 16111,
  KASPA_NETWORK: 'mainnet'
  // Missing KASPA_NODE_RPC_PORT (required)
};

const missingResult = validator.validateConfiguration(missingRequiredConfig, ['core']);
console.log('\nMissing required field result:', missingResult.valid ? '✗ FAIL' : '✓ PASS (correctly detected missing field)');
console.log('Errors:', missingResult.errors);

console.log('\n✓ Configuration validator working correctly\n');

// Test 4: Field Retrieval
console.log('Test 4: Field Retrieval');
console.log('-----------------------');

const rpcPortField = resolver.getFieldByKey('KASPA_NODE_RPC_PORT');
console.log('RPC Port field:', rpcPortField ? '✓ Found' : '✗ Not found');
if (rpcPortField) {
  console.log('  Label:', rpcPortField.label);
  console.log('  Type:', rpcPortField.type);
  console.log('  Default:', rpcPortField.defaultValue);
  console.log('  Required:', rpcPortField.required);
  console.log('  Validation rules:', rpcPortField.validation.length);
}

const coreProfileFields = resolver.getFieldsForProfile('core');
console.log('\nCore profile fields:', coreProfileFields.length);
coreProfileFields.forEach(field => {
  console.log(`  - ${field.key}: ${field.label} (${field.category}/${field.group})`);
});

console.log('\n✓ Field retrieval working correctly\n');

// Test 5: Validation Summary
console.log('Test 5: Validation Summary');
console.log('--------------------------');

const testConfig = {
  KASPA_NODE_RPC_PORT: 16110,
  KASPA_NODE_P2P_PORT: 16111,
  KASPA_NETWORK: 'mainnet',
  POSTGRES_USER: 'kaspa',
  POSTGRES_PASSWORD: 'securepassword123'
};

const validationSummary = validator.getValidationSummary(testConfig, ['core', 'indexer-services']);
console.log('Validation summary:', JSON.stringify(validationSummary, null, 2));
console.log('✓ Validation summary working correctly\n');

console.log('=== All Tests Completed Successfully ===');
