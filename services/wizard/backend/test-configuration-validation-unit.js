/**
 * Unit Tests for Configuration Validation
 * 
 * Tests the configuration validation logic including:
 * - Port range validation (1024-65535)
 * - Port conflict detection
 * - Network selection validation
 * - Data directory path validation
 * 
 * Requirements: 3.3, 4.6
 */

const ConfigurationValidator = require('./src/utils/configuration-validator');

const validator = new ConfigurationValidator();

console.log('=== Unit Tests for Configuration Validation ===\n');

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

// Test Suite 1: Port Range Validation
console.log('Test Suite 1: Port Range Validation (1024-65535)');
console.log('=================================================\n');

runTest('Valid RPC port (16110) should pass', () => {
  const config = {
    KASPA_NODE_RPC_PORT: 16110,
    KASPA_NODE_P2P_PORT: 16111,
    KASPA_NETWORK: 'mainnet'
  };
  const result = validator.validateConfiguration(config, ['core']);
  return result.valid === true;
});

runTest('Valid P2P port (16111) should pass', () => {
  const config = {
    KASPA_NODE_RPC_PORT: 16110,
    KASPA_NODE_P2P_PORT: 16111,
    KASPA_NETWORK: 'mainnet'
  };
  const result = validator.validateConfiguration(config, ['core']);
  return result.valid === true;
});

runTest('Valid custom RPC port (16210) should pass', () => {
  const config = {
    KASPA_NODE_RPC_PORT: 16210,
    KASPA_NODE_P2P_PORT: 16211,
    KASPA_NETWORK: 'mainnet'
  };
  const result = validator.validateConfiguration(config, ['core']);
  return result.valid === true;
});

runTest('Minimum valid port (1024) should pass', () => {
  const config = {
    KASPA_NODE_RPC_PORT: 1024,
    KASPA_NODE_P2P_PORT: 1025,
    KASPA_NETWORK: 'mainnet'
  };
  const result = validator.validateConfiguration(config, ['core']);
  return result.valid === true;
});

runTest('Maximum valid port (65535) should pass', () => {
  const config = {
    KASPA_NODE_RPC_PORT: 65534,
    KASPA_NODE_P2P_PORT: 65535,
    KASPA_NETWORK: 'mainnet'
  };
  const result = validator.validateConfiguration(config, ['core']);
  return result.valid === true;
});

runTest('Port below minimum (1023) should fail', () => {
  const config = {
    KASPA_NODE_RPC_PORT: 1023,
    KASPA_NODE_P2P_PORT: 16111,
    KASPA_NETWORK: 'mainnet'
  };
  const result = validator.validateConfiguration(config, ['core']);
  return result.valid === false && result.errors.some(e => e.field === 'KASPA_NODE_RPC_PORT');
});

runTest('Port below minimum (500) should fail', () => {
  const config = {
    KASPA_NODE_RPC_PORT: 500,
    KASPA_NODE_P2P_PORT: 16111,
    KASPA_NETWORK: 'mainnet'
  };
  const result = validator.validateConfiguration(config, ['core']);
  return result.valid === false && result.errors.some(e => e.field === 'KASPA_NODE_RPC_PORT');
});

runTest('Port above maximum (65536) should fail', () => {
  const config = {
    KASPA_NODE_RPC_PORT: 16110,
    KASPA_NODE_P2P_PORT: 65536,
    KASPA_NETWORK: 'mainnet'
  };
  const result = validator.validateConfiguration(config, ['core']);
  return result.valid === false && result.errors.some(e => e.field === 'KASPA_NODE_P2P_PORT');
});

runTest('Port above maximum (70000) should fail', () => {
  const config = {
    KASPA_NODE_RPC_PORT: 16110,
    KASPA_NODE_P2P_PORT: 70000,
    KASPA_NETWORK: 'mainnet'
  };
  const result = validator.validateConfiguration(config, ['core']);
  return result.valid === false && result.errors.some(e => e.field === 'KASPA_NODE_P2P_PORT');
});

runTest('Negative port should fail', () => {
  const config = {
    KASPA_NODE_RPC_PORT: -1,
    KASPA_NODE_P2P_PORT: 16111,
    KASPA_NETWORK: 'mainnet'
  };
  const result = validator.validateConfiguration(config, ['core']);
  return result.valid === false && result.errors.some(e => e.field === 'KASPA_NODE_RPC_PORT');
});

runTest('Zero port should fail', () => {
  const config = {
    KASPA_NODE_RPC_PORT: 0,
    KASPA_NODE_P2P_PORT: 16111,
    KASPA_NETWORK: 'mainnet'
  };
  const result = validator.validateConfiguration(config, ['core']);
  return result.valid === false && result.errors.some(e => e.field === 'KASPA_NODE_RPC_PORT');
});

console.log();

// Test Suite 2: Port Conflict Detection
console.log('Test Suite 2: Port Conflict Detection');
console.log('======================================\n');

runTest('Same port for RPC and P2P should fail', () => {
  const config = {
    KASPA_NODE_RPC_PORT: 16110,
    KASPA_NODE_P2P_PORT: 16110,
    KASPA_NETWORK: 'mainnet'
  };
  const result = validator.validateConfiguration(config, ['core']);
  return result.valid === false && result.errors.some(e => e.type === 'port_conflict');
});

runTest('Different ports for RPC and P2P should pass', () => {
  const config = {
    KASPA_NODE_RPC_PORT: 16110,
    KASPA_NODE_P2P_PORT: 16111,
    KASPA_NETWORK: 'mainnet'
  };
  const result = validator.validateConfiguration(config, ['core']);
  return result.valid === true;
});

runTest('Port conflict with common service ports should be detected', () => {
  const config = {
    KASPA_NODE_RPC_PORT: 80, // HTTP port - but below minimum, so will fail for range first
    KASPA_NODE_P2P_PORT: 16111,
    KASPA_NETWORK: 'mainnet'
  };
  const result = validator.validateConfiguration(config, ['core']);
  return result.valid === false;
});

runTest('Multiple port conflicts should all be detected', () => {
  const config = {
    KASPA_NODE_RPC_PORT: 16110,
    KASPA_NODE_P2P_PORT: 16110,
    KASPA_NETWORK: 'mainnet'
  };
  const result = validator.validateConfiguration(config, ['core']);
  const conflictErrors = result.errors.filter(e => e.type === 'port_conflict');
  return result.valid === false && conflictErrors.length > 0;
});

console.log();

// Test Suite 3: Network Selection Validation
console.log('Test Suite 3: Network Selection Validation');
console.log('===========================================\n');

runTest('Valid network "mainnet" should pass', () => {
  const config = {
    KASPA_NODE_RPC_PORT: 16110,
    KASPA_NODE_P2P_PORT: 16111,
    KASPA_NETWORK: 'mainnet'
  };
  const result = validator.validateConfiguration(config, ['core']);
  return result.valid === true;
});

runTest('Valid network "testnet" should pass', () => {
  const config = {
    KASPA_NODE_RPC_PORT: 16110,
    KASPA_NODE_P2P_PORT: 16111,
    KASPA_NETWORK: 'testnet'
  };
  const result = validator.validateConfiguration(config, ['core']);
  return result.valid === true;
});

runTest('Invalid network "devnet" should fail', () => {
  const config = {
    KASPA_NODE_RPC_PORT: 16110,
    KASPA_NODE_P2P_PORT: 16111,
    KASPA_NETWORK: 'devnet'
  };
  const result = validator.validateConfiguration(config, ['core']);
  return result.valid === false && result.errors.some(e => e.field === 'KASPA_NETWORK');
});

runTest('Invalid network "invalid" should fail', () => {
  const config = {
    KASPA_NODE_RPC_PORT: 16110,
    KASPA_NODE_P2P_PORT: 16111,
    KASPA_NETWORK: 'invalid'
  };
  const result = validator.validateConfiguration(config, ['core']);
  return result.valid === false && result.errors.some(e => e.field === 'KASPA_NETWORK');
});

runTest('Empty network should fail', () => {
  const config = {
    KASPA_NODE_RPC_PORT: 16110,
    KASPA_NODE_P2P_PORT: 16111,
    KASPA_NETWORK: ''
  };
  const result = validator.validateConfiguration(config, ['core']);
  return result.valid === false && result.errors.some(e => e.field === 'KASPA_NETWORK');
});

runTest('Missing network should use default', () => {
  const config = {
    KASPA_NODE_RPC_PORT: 16110,
    KASPA_NODE_P2P_PORT: 16111
  };
  const result = validator.validateConfiguration(config, ['core']);
  // Should pass because validator applies default 'mainnet'
  return result.valid === true;
});

console.log();

// Test Suite 4: Data Directory Path Validation
console.log('Test Suite 4: Data Directory Path Validation');
console.log('=============================================\n');

runTest('Valid absolute path "/data/kaspa" should pass', () => {
  const config = {
    KASPA_NODE_RPC_PORT: 16110,
    KASPA_NODE_P2P_PORT: 16111,
    KASPA_NETWORK: 'mainnet',
    KASPA_DATA_DIR: '/data/kaspa'
  };
  const result = validator.validateConfiguration(config, ['core']);
  return result.valid === true;
});

runTest('Valid absolute path "/var/lib/kaspa" should pass', () => {
  const config = {
    KASPA_NODE_RPC_PORT: 16110,
    KASPA_NODE_P2P_PORT: 16111,
    KASPA_NETWORK: 'mainnet',
    KASPA_DATA_DIR: '/var/lib/kaspa'
  };
  const result = validator.validateConfiguration(config, ['core']);
  return result.valid === true;
});

runTest('Valid relative path "./data" should pass', () => {
  const config = {
    KASPA_NODE_RPC_PORT: 16110,
    KASPA_NODE_P2P_PORT: 16111,
    KASPA_NETWORK: 'mainnet',
    KASPA_DATA_DIR: './data'
  };
  const result = validator.validateConfiguration(config, ['core']);
  return result.valid === true;
});

runTest('Valid path with subdirectories should pass', () => {
  const config = {
    KASPA_NODE_RPC_PORT: 16110,
    KASPA_NODE_P2P_PORT: 16111,
    KASPA_NETWORK: 'mainnet',
    KASPA_DATA_DIR: '/data/kaspa/node/mainnet'
  };
  const result = validator.validateConfiguration(config, ['core']);
  return result.valid === true;
});

runTest('Path with special characters "<" should fail', () => {
  const config = {
    KASPA_NODE_RPC_PORT: 16110,
    KASPA_NODE_P2P_PORT: 16111,
    KASPA_NETWORK: 'mainnet',
    KASPA_DATA_DIR: '/data/kaspa<test>'
  };
  const result = validator.validateConfiguration(config, ['core']);
  return result.valid === false && result.errors.some(e => e.field === 'KASPA_DATA_DIR');
});

runTest('Path with special characters ">" should fail', () => {
  const config = {
    KASPA_NODE_RPC_PORT: 16110,
    KASPA_NODE_P2P_PORT: 16111,
    KASPA_NETWORK: 'mainnet',
    KASPA_DATA_DIR: '/data/kaspa>test'
  };
  const result = validator.validateConfiguration(config, ['core']);
  return result.valid === false && result.errors.some(e => e.field === 'KASPA_DATA_DIR');
});

runTest('Path with pipe "|" should fail', () => {
  const config = {
    KASPA_NODE_RPC_PORT: 16110,
    KASPA_NODE_P2P_PORT: 16111,
    KASPA_NETWORK: 'mainnet',
    KASPA_DATA_DIR: '/data/kaspa|pipe'
  };
  const result = validator.validateConfiguration(config, ['core']);
  return result.valid === false && result.errors.some(e => e.field === 'KASPA_DATA_DIR');
});

runTest('TimescaleDB data directory should validate', () => {
  const config = {
    TIMESCALEDB_DATA_DIR: '/data/timescaledb',
    POSTGRES_USER: 'kaspa',
    POSTGRES_PASSWORD: 'securepassword123'
  };
  const result = validator.validateConfiguration(config, ['indexer-services']);
  return result.valid === true;
});

runTest('Archive node data directory should validate', () => {
  const config = {
    KASPA_NODE_RPC_PORT: 16110,
    KASPA_NODE_P2P_PORT: 16111,
    KASPA_NETWORK: 'mainnet',
    KASPA_ARCHIVE_DATA_DIR: '/data/kaspa-archive'
  };
  const result = validator.validateConfiguration(config, ['archive-node']);
  return result.valid === true;
});

console.log();

// Test Suite 5: Combined Validation Scenarios
console.log('Test Suite 5: Combined Validation Scenarios');
console.log('============================================\n');

runTest('Multiple errors should all be reported', () => {
  const config = {
    KASPA_NODE_RPC_PORT: 100,           // Invalid range
    KASPA_NODE_P2P_PORT: 100,           // Invalid range + conflict
    KASPA_NETWORK: 'invalid',           // Invalid network
    KASPA_DATA_DIR: '/data<test>'       // Invalid path
  };
  const result = validator.validateConfiguration(config, ['core']);
  return result.valid === false && result.errors.length >= 3;
});

runTest('Valid complete configuration should pass', () => {
  const config = {
    KASPA_NODE_RPC_PORT: 16210,
    KASPA_NODE_P2P_PORT: 16211,
    KASPA_NETWORK: 'testnet',
    KASPA_DATA_DIR: '/custom/data/kaspa',
    PUBLIC_NODE: true
  };
  const result = validator.validateConfiguration(config, ['core']);
  return result.valid === true;
});

runTest('Configuration with all profiles should validate', () => {
  const config = {
    KASPA_NODE_RPC_PORT: 16110,
    KASPA_NODE_P2P_PORT: 16111,
    KASPA_NETWORK: 'mainnet',
    KASPA_DATA_DIR: '/data/kaspa',
    TIMESCALEDB_DATA_DIR: '/data/timescaledb',
    POSTGRES_USER: 'kaspa',
    POSTGRES_PASSWORD: 'securepassword123'
  };
  const result = validator.validateConfiguration(config, ['core', 'indexer-services']);
  return result.valid === true;
});

console.log();

// Test Suite 6: Network Change Warnings
console.log('Test Suite 6: Network Change Warnings');
console.log('======================================\n');

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

runTest('Network change warning should include helpful message', () => {
  const previousConfig = { KASPA_NETWORK: 'mainnet' };
  const newConfig = { KASPA_NETWORK: 'testnet' };
  const warnings = validator.validateNetworkChange(newConfig, previousConfig);
  return warnings.length > 0 && warnings[0].message.includes('incompatible');
});

console.log();

// Summary
console.log('=== Test Summary ===');
console.log(`Total Tests: ${totalTests}`);
console.log(`Passed: ${passedTests} ✓`);
console.log(`Failed: ${failedTests} ✗`);
console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

if (failedTests === 0) {
  console.log('\n✓ All unit tests passed!');
  process.exit(0);
} else {
  console.log(`\n✗ ${failedTests} test(s) failed`);
  process.exit(1);
}
