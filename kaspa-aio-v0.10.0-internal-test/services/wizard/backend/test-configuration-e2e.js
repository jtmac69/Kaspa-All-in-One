/**
 * End-to-End Configuration Flow Test
 * 
 * Tests the complete configuration flow from profile selection through
 * installation configuration generation and validation.
 * 
 * Test Scenario:
 * 1. Select Core profile
 * 2. Configure custom RPC port (16210)
 * 3. Configure custom P2P port (16211)
 * 4. Select testnet network
 * 5. Configure custom data directory
 * 6. Complete installation
 * 7. Verify .env contains correct values
 * 8. Verify docker-compose.yml uses correct ports and network
 * 
 * Requirements: 3.9, 3.10, 3.11, 7.1
 */

const ConfigurationValidator = require('./src/utils/configuration-validator');
const ConfigGenerator = require('./src/utils/config-generator');
const FieldVisibilityResolver = require('./src/utils/field-visibility-resolver');

const validator = new ConfigurationValidator();
const generator = new ConfigGenerator();
const resolver = new FieldVisibilityResolver();

console.log('=== End-to-End Configuration Flow Test ===\n');

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✓ ${message}`);
    testsPassed++;
    return true;
  } else {
    console.log(`✗ ${message}`);
    testsFailed++;
    return false;
  }
}

// Step 1: Select Core Profile
console.log('Step 1: Select Core Profile');
console.log('============================\n');

const selectedProfiles = ['core'];
const hasFields = resolver.hasFields('core');
assert(hasFields, 'Core profile has configuration fields');

const coreFields = resolver.getFieldsForProfile('core');
assert(coreFields.length > 0, `Core profile has ${coreFields.length} fields`);

const hasRpcPort = coreFields.some(f => f.key === 'KASPA_NODE_RPC_PORT');
assert(hasRpcPort, 'Core profile includes RPC port field');

const hasP2pPort = coreFields.some(f => f.key === 'KASPA_NODE_P2P_PORT');
assert(hasP2pPort, 'Core profile includes P2P port field');

const hasNetwork = coreFields.some(f => f.key === 'KASPA_NETWORK');
assert(hasNetwork, 'Core profile includes network field');

const hasDataDir = coreFields.some(f => f.key === 'KASPA_DATA_DIR');
assert(hasDataDir, 'Core profile includes data directory field');

console.log();

// Step 2: Configure Custom RPC Port (16210)
console.log('Step 2: Configure Custom RPC Port (16210)');
console.log('==========================================\n');

let configuration = {
  KASPA_NODE_RPC_PORT: 16210,
  KASPA_NODE_P2P_PORT: 16111, // Default for now
  KASPA_NETWORK: 'mainnet' // Default for now
};

let validationResult = validator.validateConfiguration(configuration, selectedProfiles);
assert(validationResult.valid, 'Custom RPC port (16210) is valid');
assert(configuration.KASPA_NODE_RPC_PORT === 16210, 'RPC port is set to 16210');

console.log();

// Step 3: Configure Custom P2P Port (16211)
console.log('Step 3: Configure Custom P2P Port (16211)');
console.log('==========================================\n');

configuration.KASPA_NODE_P2P_PORT = 16211;

validationResult = validator.validateConfiguration(configuration, selectedProfiles);
assert(validationResult.valid, 'Custom P2P port (16211) is valid');
assert(configuration.KASPA_NODE_P2P_PORT === 16211, 'P2P port is set to 16211');

// Verify no port conflicts
const hasConflicts = validationResult.errors.some(e => e.type === 'port_conflict');
assert(!hasConflicts, 'No port conflicts detected');

console.log();

// Step 4: Select Testnet Network
console.log('Step 4: Select Testnet Network');
console.log('===============================\n');

const previousConfig = { ...configuration };
configuration.KASPA_NETWORK = 'testnet';

validationResult = validator.validateConfiguration(configuration, selectedProfiles);
assert(validationResult.valid, 'Testnet network selection is valid');
assert(configuration.KASPA_NETWORK === 'testnet', 'Network is set to testnet');

// Check for network change warning
const networkWarnings = validator.validateNetworkChange(configuration, previousConfig);
assert(networkWarnings.length > 0, 'Network change warning is generated');
assert(networkWarnings[0].severity === 'high', 'Network change warning has high severity');

console.log();

// Step 5: Configure Custom Data Directory
console.log('Step 5: Configure Custom Data Directory');
console.log('========================================\n');

configuration.KASPA_DATA_DIR = '/custom/data/kaspa';

validationResult = validator.validateConfiguration(configuration, selectedProfiles);
assert(validationResult.valid, 'Custom data directory is valid');
assert(configuration.KASPA_DATA_DIR === '/custom/data/kaspa', 'Data directory is set to custom path');

console.log();

// Step 6: Complete Installation Configuration
console.log('Step 6: Complete Installation Configuration');
console.log('============================================\n');

// Add any remaining required fields
configuration.PUBLIC_NODE = true;

// Final validation
validationResult = validator.validateConfiguration(configuration, selectedProfiles);
assert(validationResult.valid, 'Complete configuration is valid');
assert(validationResult.errors.length === 0, 'No validation errors');

// Get validation summary
const summary = validator.getValidationSummary(configuration, selectedProfiles);
assert(summary.valid, 'Validation summary shows configuration is valid');
assert(summary.totalErrors === 0, 'Validation summary shows no errors');

console.log();

// Step 7: Verify .env Contains Correct Values
console.log('Step 7: Verify .env Contains Correct Values');
console.log('============================================\n');

generator.generateEnvFile(configuration, selectedProfiles).then(envContent => {
  // Check RPC port
  const hasRpcPort = envContent.includes('KASPA_NODE_RPC_PORT=16210');
  assert(hasRpcPort, '.env contains KASPA_NODE_RPC_PORT=16210');

  // Check P2P port
  const hasP2pPort = envContent.includes('KASPA_NODE_P2P_PORT=16211');
  assert(hasP2pPort, '.env contains KASPA_NODE_P2P_PORT=16211');

  // Check network
  const hasNetwork = envContent.includes('KASPA_NETWORK=testnet');
  assert(hasNetwork, '.env contains KASPA_NETWORK=testnet');

  // Check data directory
  const hasDataDir = envContent.includes('KASPA_DATA_DIR=/custom/data/kaspa');
  assert(hasDataDir, '.env contains KASPA_DATA_DIR=/custom/data/kaspa');

  // Check public node
  const hasPublicNode = envContent.includes('PUBLIC_NODE=true');
  assert(hasPublicNode, '.env contains PUBLIC_NODE=true');

  console.log();

  // Step 8: Verify Docker Compose Uses Correct Ports and Network
  console.log('Step 8: Verify Docker Compose Uses Correct Ports and Network');
  console.log('=============================================================\n');

  return generator.generateDockerCompose(configuration, selectedProfiles);
}).then(dockerComposeContent => {
  // Check RPC port mapping
  const hasRpcPortMapping = dockerComposeContent.includes('16210:16210') || 
                            dockerComposeContent.includes('KASPA_NODE_RPC_PORT');
  assert(hasRpcPortMapping, 'docker-compose.yml uses RPC port 16210');

  // Check P2P port mapping
  const hasP2pPortMapping = dockerComposeContent.includes('16211:16211') || 
                            dockerComposeContent.includes('KASPA_NODE_P2P_PORT');
  assert(hasP2pPortMapping, 'docker-compose.yml uses P2P port 16211');

  // Check testnet flag
  const hasTestnetFlag = dockerComposeContent.includes('--testnet') || 
                         dockerComposeContent.includes('KASPA_NETWORK');
  assert(hasTestnetFlag, 'docker-compose.yml includes testnet configuration');

  // Check data directory volume
  const hasDataDirVolume = dockerComposeContent.includes('/custom/data/kaspa') || 
                           dockerComposeContent.includes('KASPA_DATA_DIR');
  assert(hasDataDirVolume, 'docker-compose.yml uses custom data directory');

  // Check kaspa-node service exists
  const hasKaspaNode = dockerComposeContent.includes('kaspa-node:') || 
                       dockerComposeContent.includes('kaspa_node');
  assert(hasKaspaNode, 'docker-compose.yml includes kaspa-node service');

  console.log();

  // Final Summary
  console.log('=== End-to-End Test Summary ===');
  console.log(`Total Assertions: ${testsPassed + testsFailed}`);
  console.log(`Passed: ${testsPassed} ✓`);
  console.log(`Failed: ${testsFailed} ✗`);
  console.log(`Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);

  if (testsFailed === 0) {
    console.log('\n✓ End-to-end configuration flow test passed!');
    console.log('\nConfiguration Flow Verified:');
    console.log('  1. ✓ Profile selection (Core)');
    console.log('  2. ✓ Custom RPC port (16210)');
    console.log('  3. ✓ Custom P2P port (16211)');
    console.log('  4. ✓ Network selection (testnet)');
    console.log('  5. ✓ Custom data directory (/custom/data/kaspa)');
    console.log('  6. ✓ Configuration validation');
    console.log('  7. ✓ .env file generation');
    console.log('  8. ✓ docker-compose.yml generation');
    process.exit(0);
  } else {
    console.log(`\n✗ ${testsFailed} assertion(s) failed`);
    process.exit(1);
  }
}).catch(error => {
  console.error('\n✗ Error during test execution:', error.message);
  console.error(error.stack);
  process.exit(1);
});
