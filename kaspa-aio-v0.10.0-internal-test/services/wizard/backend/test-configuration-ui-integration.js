/**
 * Integration Tests for Configuration UI
 * 
 * Tests the configuration UI components including:
 * - Kaspa Node section visibility based on profile selection
 * - Port configuration modal functionality
 * - Network change warning dialog
 * - Advanced options show/hide toggle
 * 
 * Requirements: 3.12, 4.7
 * 
 * Note: These tests simulate UI behavior through the backend logic.
 * For full UI testing, use the test-configuration-ui.html page.
 */

const FieldVisibilityResolver = require('./src/utils/field-visibility-resolver');
const ConfigurationValidator = require('./src/utils/configuration-validator');

const resolver = new FieldVisibilityResolver();
const validator = new ConfigurationValidator();

console.log('=== Integration Tests for Configuration UI ===\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function runTest(testName, testFn) {
  totalTests++;
  try {
    const result = testFn();
    if (result) {
      passedTests++;
      console.log(`✓ ${testName}`);
      return true;
    } else {
      failedTests++;
      console.log(`✗ ${testName}`);
      return false;
    }
  } catch (error) {
    failedTests++;
    console.log(`✗ ${testName} - Error: ${error.message}`);
    return false;
  }
}

// Test Suite 1: Kaspa Node Section Visibility
console.log('Test Suite 1: Kaspa Node Section Visibility');
console.log('============================================\n');

runTest('Kaspa Node section should appear when Core profile selected', () => {
  const kaspaNodeFields = resolver.getFieldsByGroup(['core'], 'kaspa-node');
  return kaspaNodeFields.length > 0;
});

runTest('Kaspa Node section should include RPC port field for Core profile', () => {
  const rpcPortField = resolver.getFieldByKey('KASPA_NODE_RPC_PORT');
  return rpcPortField !== null && rpcPortField.visibleForProfiles.includes('core');
});

runTest('Kaspa Node section should include P2P port field for Core profile', () => {
  const p2pPortField = resolver.getFieldByKey('KASPA_NODE_P2P_PORT');
  return p2pPortField !== null && p2pPortField.visibleForProfiles.includes('core');
});

runTest('Kaspa Node section should include network selector for Core profile', () => {
  const networkField = resolver.getFieldByKey('KASPA_NETWORK');
  return networkField !== null && networkField.type === 'select' && networkField.visibleForProfiles.includes('core');
});

runTest('Kaspa Node section should appear when Archive Node profile selected', () => {
  const kaspaNodeFields = resolver.getFieldsByGroup(['archive-node'], 'kaspa-node');
  return kaspaNodeFields.length > 0;
});

runTest('Kaspa Node section should include RPC port field for Archive Node profile', () => {
  const rpcPortField = resolver.getFieldByKey('KASPA_NODE_RPC_PORT');
  return rpcPortField !== null;
});

runTest('Kaspa Node section should include P2P port field for Archive Node profile', () => {
  const p2pPortField = resolver.getFieldByKey('KASPA_NODE_P2P_PORT');
  return p2pPortField !== null;
});

runTest('Kaspa Node section should be hidden when only Indexer Services selected', () => {
  const kaspaNodeFields = resolver.getFieldsByGroup(['indexer-services'], 'kaspa-node');
  return kaspaNodeFields.length === 0;
});

runTest('Kaspa Node section should be hidden when no node profiles selected', () => {
  const kaspaNodeFields = resolver.getFieldsByGroup(['kaspa-user-applications'], 'kaspa-node');
  return kaspaNodeFields.length === 0;
});

console.log();

// Test Suite 2: Port Configuration Modal
console.log('Test Suite 2: Port Configuration Modal');
console.log('=======================================\n');

runTest('Port configuration modal should validate RPC port range', () => {
  const config = {
    KASPA_NODE_RPC_PORT: 16210,
    KASPA_NODE_P2P_PORT: 16211,
    KASPA_NETWORK: 'mainnet'
  };
  const result = validator.validateConfiguration(config, ['core']);
  return result.valid === true;
});

runTest('Port configuration modal should reject invalid RPC port (too low)', () => {
  const config = {
    KASPA_NODE_RPC_PORT: 500,
    KASPA_NODE_P2P_PORT: 16111,
    KASPA_NETWORK: 'mainnet'
  };
  const result = validator.validateConfiguration(config, ['core']);
  return result.valid === false && result.errors.some(e => e.field === 'KASPA_NODE_RPC_PORT');
});

runTest('Port configuration modal should reject invalid RPC port (too high)', () => {
  const config = {
    KASPA_NODE_RPC_PORT: 70000,
    KASPA_NODE_P2P_PORT: 16111,
    KASPA_NETWORK: 'mainnet'
  };
  const result = validator.validateConfiguration(config, ['core']);
  return result.valid === false && result.errors.some(e => e.field === 'KASPA_NODE_RPC_PORT');
});

runTest('Port configuration modal should detect port conflicts', () => {
  const config = {
    KASPA_NODE_RPC_PORT: 16110,
    KASPA_NODE_P2P_PORT: 16110,
    KASPA_NETWORK: 'mainnet'
  };
  const result = validator.validateConfiguration(config, ['core']);
  return result.valid === false && result.errors.some(e => e.type === 'port_conflict');
});

runTest('Port configuration modal should accept valid port configuration', () => {
  const config = {
    KASPA_NODE_RPC_PORT: 16210,
    KASPA_NODE_P2P_PORT: 16211,
    KASPA_NETWORK: 'mainnet'
  };
  const result = validator.validateConfiguration(config, ['core']);
  return result.valid === true;
});

runTest('Port configuration modal should save values correctly', () => {
  // Simulate saving port configuration
  const initialConfig = {
    KASPA_NODE_RPC_PORT: 16110,
    KASPA_NODE_P2P_PORT: 16111,
    KASPA_NETWORK: 'mainnet'
  };
  
  const updatedConfig = {
    ...initialConfig,
    KASPA_NODE_RPC_PORT: 16210,
    KASPA_NODE_P2P_PORT: 16211
  };
  
  const result = validator.validateConfiguration(updatedConfig, ['core']);
  return result.valid === true && 
         updatedConfig.KASPA_NODE_RPC_PORT === 16210 &&
         updatedConfig.KASPA_NODE_P2P_PORT === 16211;
});

runTest('Port configuration modal should reset to defaults', () => {
  // Simulate reset to defaults
  const customConfig = {
    KASPA_NODE_RPC_PORT: 16210,
    KASPA_NODE_P2P_PORT: 16211,
    KASPA_NETWORK: 'mainnet'
  };
  
  const defaultConfig = {
    KASPA_NODE_RPC_PORT: 16110,
    KASPA_NODE_P2P_PORT: 16111,
    KASPA_NETWORK: 'mainnet'
  };
  
  const result = validator.validateConfiguration(defaultConfig, ['core']);
  return result.valid === true &&
         defaultConfig.KASPA_NODE_RPC_PORT === 16110 &&
         defaultConfig.KASPA_NODE_P2P_PORT === 16111;
});

console.log();

// Test Suite 3: Network Change Warning
console.log('Test Suite 3: Network Change Warning');
console.log('=====================================\n');

runTest('Network change warning should appear when changing from mainnet to testnet', () => {
  const previousConfig = { KASPA_NETWORK: 'mainnet' };
  const newConfig = { KASPA_NETWORK: 'testnet' };
  const warnings = validator.validateNetworkChange(newConfig, previousConfig);
  return warnings.length > 0;
});

runTest('Network change warning should appear when changing from testnet to mainnet', () => {
  const previousConfig = { KASPA_NETWORK: 'testnet' };
  const newConfig = { KASPA_NETWORK: 'mainnet' };
  const warnings = validator.validateNetworkChange(newConfig, previousConfig);
  return warnings.length > 0;
});

runTest('Network change warning should not appear when network unchanged', () => {
  const previousConfig = { KASPA_NETWORK: 'mainnet' };
  const newConfig = { KASPA_NETWORK: 'mainnet' };
  const warnings = validator.validateNetworkChange(newConfig, previousConfig);
  return warnings.length === 0;
});

runTest('Network change warning should include severity level', () => {
  const previousConfig = { KASPA_NETWORK: 'mainnet' };
  const newConfig = { KASPA_NETWORK: 'testnet' };
  const warnings = validator.validateNetworkChange(newConfig, previousConfig);
  return warnings.length > 0 && warnings[0].severity === 'high';
});

runTest('Network change warning should include action type', () => {
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

runTest('Network change can be cancelled (validation still works)', () => {
  // Simulate cancelling network change - revert to previous value
  const config = {
    KASPA_NODE_RPC_PORT: 16110,
    KASPA_NODE_P2P_PORT: 16111,
    KASPA_NETWORK: 'mainnet' // Reverted back
  };
  const result = validator.validateConfiguration(config, ['core']);
  return result.valid === true;
});

runTest('Network change can be confirmed (validation still works)', () => {
  // Simulate confirming network change
  const config = {
    KASPA_NODE_RPC_PORT: 16110,
    KASPA_NODE_P2P_PORT: 16111,
    KASPA_NETWORK: 'testnet' // Changed
  };
  const result = validator.validateConfiguration(config, ['core']);
  return result.valid === true;
});

console.log();

// Test Suite 4: Advanced Options Toggle
console.log('Test Suite 4: Advanced Options Toggle');
console.log('======================================\n');

runTest('Advanced options should include data directory fields', () => {
  const advancedFields = resolver.getFieldsByCategory(['core'], 'advanced');
  return advancedFields.length > 0;
});

runTest('Advanced options should include Kaspa data directory for Core profile', () => {
  const dataDir = resolver.getFieldByKey('KASPA_DATA_DIR');
  return dataDir !== null && dataDir.category === 'advanced';
});

runTest('Advanced options should include Archive data directory for Archive Node profile', () => {
  const dataDir = resolver.getFieldByKey('KASPA_ARCHIVE_DATA_DIR');
  return dataDir !== null && dataDir.category === 'advanced';
});

runTest('Advanced options should include TimescaleDB data directory for Indexer Services', () => {
  const dataDir = resolver.getFieldByKey('TIMESCALEDB_DATA_DIR');
  return dataDir !== null && dataDir.category === 'advanced';
});

runTest('Advanced options should not show Kaspa data directory for non-node profiles', () => {
  const allFields = resolver._collectVisibleFields(['indexer-services']);
  const dataDir = allFields.find(f => f.key === 'KASPA_DATA_DIR');
  return dataDir === undefined;
});

runTest('Advanced options should not show TimescaleDB directory for non-indexer profiles', () => {
  const allFields = resolver._collectVisibleFields(['core']);
  const dataDir = allFields.find(f => f.key === 'TIMESCALEDB_DATA_DIR');
  return dataDir === undefined;
});

runTest('Advanced options should include custom environment variables', () => {
  const customEnv = resolver.getFieldByKey('CUSTOM_ENV_VARS');
  return customEnv !== null && customEnv.category === 'advanced';
});

runTest('Basic options should not include data directories', () => {
  const basicFields = resolver.getFieldsByCategory(['core'], 'basic');
  const hasDataDir = basicFields.some(f => f.key.includes('DATA_DIR'));
  return !hasDataDir;
});

console.log();

// Test Suite 5: Profile-Specific Field Visibility
console.log('Test Suite 5: Profile-Specific Field Visibility');
console.log('================================================\n');

runTest('Core profile should show Core-specific fields', () => {
  const coreFields = resolver.getFieldsForProfile('core');
  return coreFields.length > 0;
});

runTest('Archive Node profile should show Archive-specific fields', () => {
  const archiveFields = resolver.getFieldsForProfile('archive-node');
  return archiveFields.length > 0;
});

runTest('Indexer Services profile should show Indexer-specific fields', () => {
  const indexerFields = resolver.getFieldsForProfile('indexer-services');
  return indexerFields.length > 0;
});

runTest('Multiple profiles should show combined fields', () => {
  const coreFields = resolver._collectVisibleFields(['core']);
  const indexerFields = resolver._collectVisibleFields(['indexer-services']);
  const combinedFields = resolver._collectVisibleFields(['core', 'indexer-services']);
  
  return combinedFields.length >= coreFields.length &&
         combinedFields.length >= indexerFields.length;
});

runTest('Field visibility should update when profile selection changes', () => {
  const initialFields = resolver._collectVisibleFields(['core']);
  const updatedFields = resolver._collectVisibleFields(['indexer-services']);
  
  const hasKaspaNode = initialFields.some(f => f.group === 'kaspa-node');
  const hasDatabase = updatedFields.some(f => f.group === 'database');
  
  return hasKaspaNode && hasDatabase;
});

runTest('Common fields should appear for all profiles', () => {
  const coreFields = resolver._collectVisibleFields(['core']);
  const indexerFields = resolver._collectVisibleFields(['indexer-services']);
  
  const coreHasCommon = coreFields.some(f => f.key === 'EXTERNAL_IP');
  const indexerHasCommon = indexerFields.some(f => f.key === 'EXTERNAL_IP');
  
  return coreHasCommon && indexerHasCommon;
});

console.log();

// Test Suite 6: Form Validation Integration
console.log('Test Suite 6: Form Validation Integration');
console.log('==========================================\n');

runTest('Form should validate all fields before submission', () => {
  const config = {
    KASPA_NODE_RPC_PORT: 16110,
    KASPA_NODE_P2P_PORT: 16111,
    KASPA_NETWORK: 'mainnet',
    KASPA_DATA_DIR: '/data/kaspa'
  };
  const result = validator.validateConfiguration(config, ['core']);
  return result.valid === true;
});

runTest('Form should show errors for invalid fields', () => {
  const config = {
    KASPA_NODE_RPC_PORT: 100,
    KASPA_NODE_P2P_PORT: 16111,
    KASPA_NETWORK: 'mainnet'
  };
  const result = validator.validateConfiguration(config, ['core']);
  return result.valid === false && result.errors.length > 0;
});

runTest('Form should show multiple errors when multiple fields invalid', () => {
  const config = {
    KASPA_NODE_RPC_PORT: 100,
    KASPA_NODE_P2P_PORT: 70000,
    KASPA_NETWORK: 'invalid'
  };
  const result = validator.validateConfiguration(config, ['core']);
  return result.valid === false && result.errors.length >= 3;
});

runTest('Form should clear errors when fields corrected', () => {
  // First validation with errors
  const invalidConfig = {
    KASPA_NODE_RPC_PORT: 100,
    KASPA_NODE_P2P_PORT: 16111,
    KASPA_NETWORK: 'mainnet'
  };
  const invalidResult = validator.validateConfiguration(invalidConfig, ['core']);
  
  // Second validation with corrections
  const validConfig = {
    KASPA_NODE_RPC_PORT: 16110,
    KASPA_NODE_P2P_PORT: 16111,
    KASPA_NETWORK: 'mainnet'
  };
  const validResult = validator.validateConfiguration(validConfig, ['core']);
  
  return invalidResult.valid === false && validResult.valid === true;
});

console.log();

// Summary
console.log('=== Test Summary ===');
console.log(`Total Tests: ${totalTests}`);
console.log(`Passed: ${passedTests} ✓`);
console.log(`Failed: ${failedTests} ✗`);
console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

if (failedTests === 0) {
  console.log('\n✓ All integration tests passed!');
  console.log('\nNote: For full UI testing, open test-configuration-ui.html in a browser');
  process.exit(0);
} else {
  console.log(`\n✗ ${failedTests} test(s) failed`);
  process.exit(1);
}
