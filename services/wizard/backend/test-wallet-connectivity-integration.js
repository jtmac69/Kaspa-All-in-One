#!/usr/bin/env node

/**
 * Integration tests for wallet connectivity configuration in Docker Compose generation
 * Tests the Phase 3 updates to config-generator.js
 */

const ConfigGenerator = require('./src/utils/config-generator');

let passCount = 0;
let failCount = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`   ✓ ${testName}`);
    passCount++;
  } else {
    console.log(`   ✗ ${testName}`);
    failCount++;
  }
}

console.log('='.repeat(80));
console.log('Wallet Connectivity Integration Tests');
console.log('='.repeat(80));

const generator = new ConfigGenerator();
// Mock GitHub release fetch to avoid network calls
generator._fetchLatestGitHubRelease = async () => 'v1.0.1';

// Test Group 1: _buildKaspadCommandArgs
console.log('\n--- Test Group 1: _buildKaspadCommandArgs ---\n');

console.log('Test 1.1: Includes wallet flags when WALLET_CONNECTIVITY_ENABLED is true');
const config1 = {
  WALLET_CONNECTIVITY_ENABLED: true,
  KASPA_NODE_WRPC_BORSH_PORT: 17110,
  KASPA_NODE_WRPC_JSON_PORT: 18110
};
const args1 = generator._buildKaspadCommandArgs(config1);
assert(args1.includes('--utxoindex'), 'Contains --utxoindex');
assert(args1.includes('--rpclisten-borsh=0.0.0.0:17110'), 'Contains --rpclisten-borsh with correct port');
assert(args1.includes('--rpclisten-json=0.0.0.0:18110'), 'Contains --rpclisten-json with correct port');

console.log('\nTest 1.2: Excludes wallet flags when WALLET_CONNECTIVITY_ENABLED is false');
const config2 = {
  WALLET_CONNECTIVITY_ENABLED: false
};
const args2 = generator._buildKaspadCommandArgs(config2);
assert(!args2.includes('--utxoindex'), 'Does not contain --utxoindex');
assert(!args2.join(' ').includes('rpclisten-borsh'), 'Does not contain --rpclisten-borsh');
assert(!args2.join(' ').includes('rpclisten-json'), 'Does not contain --rpclisten-json');

console.log('\nTest 1.3: Uses default ports when not specified');
const config3 = {
  WALLET_CONNECTIVITY_ENABLED: true
};
const args3 = generator._buildKaspadCommandArgs(config3);
assert(args3.includes('--rpclisten-borsh=0.0.0.0:17110'), 'Uses default Borsh port 17110');
assert(args3.includes('--rpclisten-json=0.0.0.0:18110'), 'Uses default JSON port 18110');

console.log('\nTest 1.4: Uses custom ports when specified');
const config4 = {
  WALLET_CONNECTIVITY_ENABLED: true,
  KASPA_NODE_WRPC_BORSH_PORT: 27110,
  KASPA_NODE_WRPC_JSON_PORT: 28110
};
const args4 = generator._buildKaspadCommandArgs(config4);
assert(args4.includes('--rpclisten-borsh=0.0.0.0:27110'), 'Uses custom Borsh port 27110');
assert(args4.includes('--rpclisten-json=0.0.0.0:28110'), 'Uses custom JSON port 28110');

console.log('\nTest 1.5: Handles string "true" for WALLET_CONNECTIVITY_ENABLED');
const config5 = {
  WALLET_CONNECTIVITY_ENABLED: 'true'
};
const args5 = generator._buildKaspadCommandArgs(config5);
assert(args5.includes('--utxoindex'), 'Handles string "true" correctly');

console.log('\nTest 1.6: Handles legacy UTXO_INDEX flag without wallet connectivity');
const config6 = {
  WALLET_CONNECTIVITY_ENABLED: false,
  _FORCE_UTXO_INDEX: true
};
const args6 = generator._buildKaspadCommandArgs(config6);
assert(args6.includes('--utxoindex'), 'Contains --utxoindex from legacy flag');
assert(!args6.join(' ').includes('rpclisten-borsh'), 'Does not contain wRPC flags');

// Test Group 2: _buildKaspadPorts
console.log('\n--- Test Group 2: _buildKaspadPorts ---\n');

console.log('Test 2.1: Includes wRPC ports when wallet connectivity enabled');
const config7 = {
  WALLET_CONNECTIVITY_ENABLED: true,
  KASPA_NODE_RPC_PORT: 16110,
  KASPA_NODE_P2P_PORT: 16111,
  KASPA_NODE_WRPC_BORSH_PORT: 17110,
  KASPA_NODE_WRPC_JSON_PORT: 18110
};
const ports1 = generator._buildKaspadPorts(config7);
assert(ports1.length === 4, 'Has 4 ports total');
assert(ports1.includes('17110:17110'), 'Includes Borsh port mapping');
assert(ports1.includes('18110:18110'), 'Includes JSON port mapping');

console.log('\nTest 2.2: Excludes wRPC ports when wallet connectivity disabled');
const config8 = {
  WALLET_CONNECTIVITY_ENABLED: false,
  KASPA_NODE_RPC_PORT: 16110,
  KASPA_NODE_P2P_PORT: 16111
};
const ports2 = generator._buildKaspadPorts(config8);
assert(ports2.length === 2, 'Has only 2 ports (RPC and P2P)');
assert(!ports2.includes('17110:17110'), 'Does not include Borsh port');
assert(!ports2.includes('18110:18110'), 'Does not include JSON port');

console.log('\nTest 2.3: Uses default ports when not specified');
const config9 = {
  WALLET_CONNECTIVITY_ENABLED: true
};
const ports3 = generator._buildKaspadPorts(config9);
assert(ports3.includes('16110:16110'), 'Includes default RPC port');
assert(ports3.includes('16111:16111'), 'Includes default P2P port');
assert(ports3.includes('17110:17110'), 'Includes default Borsh port');
assert(ports3.includes('18110:18110'), 'Includes default JSON port');

// Test Group 3: _normalizeWalletConfig
console.log('\n--- Test Group 3: _normalizeWalletConfig ---\n');

console.log('Test 3.1: Migrates WALLET_ENABLED to WALLET_CONNECTIVITY_ENABLED');
const config10 = { WALLET_ENABLED: true };
const normalized1 = generator._normalizeWalletConfig(config10);
assert(normalized1.WALLET_CONNECTIVITY_ENABLED === true, 'Migrates WALLET_ENABLED correctly');

console.log('\nTest 3.2: Migrates KASPA_NODE_WRPC_PORT to KASPA_NODE_WRPC_BORSH_PORT');
const config11 = { KASPA_NODE_WRPC_PORT: 17110 };
const normalized2 = generator._normalizeWalletConfig(config11);
assert(normalized2.KASPA_NODE_WRPC_BORSH_PORT === 17110, 'Migrates WRPC port correctly');

console.log('\nTest 3.3: Migrates WALLET_MODE to WALLET_SETUP_MODE');
const config12 = { WALLET_MODE: 'local' };
const normalized3 = generator._normalizeWalletConfig(config12);
assert(normalized3.WALLET_SETUP_MODE === 'local', 'Migrates WALLET_MODE correctly');

console.log('\nTest 3.4: Preserves new config keys over legacy');
const config13 = {
  WALLET_ENABLED: false,
  WALLET_CONNECTIVITY_ENABLED: true
};
const normalized4 = generator._normalizeWalletConfig(config13);
assert(normalized4.WALLET_CONNECTIVITY_ENABLED === true, 'New key takes precedence');

console.log('\nTest 3.5: Sets _FORCE_UTXO_INDEX when legacy UTXO_INDEX is true without wallet');
const config14 = {
  UTXO_INDEX: 'true',
  WALLET_CONNECTIVITY_ENABLED: false
};
const normalized5 = generator._normalizeWalletConfig(config14);
assert(normalized5._FORCE_UTXO_INDEX === true, 'Sets force flag for legacy UTXO_INDEX');

console.log('\nTest 3.6: Does not set _FORCE_UTXO_INDEX when wallet connectivity enabled');
const config15 = {
  UTXO_INDEX: 'true',
  WALLET_CONNECTIVITY_ENABLED: true
};
const normalized6 = generator._normalizeWalletConfig(config15);
assert(normalized6._FORCE_UTXO_INDEX === undefined, 'Does not set force flag when wallet enabled');

// Test Group 4: Service Generation
console.log('\n--- Test Group 4: Service Generation ---\n');

(async () => {
  console.log('Test 4.1: Generates kaspa-node service with wallet connectivity');
  const config16 = {
    KASPA_NETWORK: 'mainnet',
    WALLET_CONNECTIVITY_ENABLED: true
  };
  const service1 = await generator._generateKaspaNodeService(config16);
  assert(service1.includes('kaspa-node:'), 'Contains service name');
  assert(service1.includes('--utxoindex'), 'Contains --utxoindex flag');
  assert(service1.includes('--rpclisten-borsh'), 'Contains --rpclisten-borsh flag');
  assert(service1.includes('--rpclisten-json'), 'Contains --rpclisten-json flag');
  assert(service1.includes('17110:17110'), 'Exposes Borsh port');
  assert(service1.includes('18110:18110'), 'Exposes JSON port');

  console.log('\nTest 4.2: Generates kaspa-node service without wallet connectivity');
  const config17 = {
    KASPA_NETWORK: 'mainnet',
    WALLET_CONNECTIVITY_ENABLED: false
  };
  const service2 = await generator._generateKaspaNodeService(config17);
  assert(service2.includes('kaspa-node:'), 'Contains service name');
  assert(!service2.includes('--utxoindex'), 'Does not contain --utxoindex');
  assert(!service2.includes('--rpclisten-borsh'), 'Does not contain wRPC flags');
  assert(!service2.includes('17110:17110'), 'Does not expose wRPC ports');

  console.log('\nTest 4.3: Handles legacy WALLET_ENABLED config');
  const config18 = {
    KASPA_NETWORK: 'mainnet',
    WALLET_ENABLED: 'true'
  };
  const service3 = await generator._generateKaspaNodeService(config18);
  assert(service3.includes('--utxoindex'), 'Migrates legacy config correctly');
  assert(service3.includes('--rpclisten-borsh'), 'Includes wRPC flags from legacy config');

  console.log('\nTest 4.4: Archive node includes wallet connectivity flags when enabled');
  const config19 = {
    KASPA_NETWORK: 'mainnet',
    WALLET_CONNECTIVITY_ENABLED: true
  };
  const service4 = await generator._generateKaspaArchiveNodeService(config19);
  assert(service4.includes('kaspa-archive-node:'), 'Contains service name');
  assert(service4.includes('--nopruning'), 'Contains --nopruning flag');
  assert(service4.includes('--utxoindex'), 'Contains --utxoindex flag');
  assert(service4.includes('--rpclisten-borsh'), 'Contains wRPC flags');
  assert(service4.includes('17110:17110'), 'Exposes wRPC ports');

  console.log('\nTest 4.5: Archive node includes utxoindex even without wallet connectivity');
  const config20 = {
    KASPA_NETWORK: 'mainnet',
    WALLET_CONNECTIVITY_ENABLED: false
  };
  const service5 = await generator._generateKaspaArchiveNodeService(config20);
  assert(service5.includes('--nopruning'), 'Contains --nopruning flag');
  assert(service5.includes('--utxoindex'), 'Contains --utxoindex (archive needs it)');
  assert(!service5.includes('--rpclisten-borsh'), 'Does not contain wRPC flags');

  // Test Group 5: Stratum Service
  console.log('\n--- Test Group 5: Stratum Service ---\n');

  console.log('Test 5.1: Includes MINING_ADDRESS in environment');
  const config21 = {
    MINING_ADDRESS: 'kaspa:qr0test123'
  };
  const service6 = generator._generateKaspaStratumService(config21);
  assert(service6.includes('MINING_ADDRESS=kaspa:qr0test123'), 'Contains mining address');

  console.log('\nTest 5.2: Uses default stratum port when not specified');
  const config22 = {
    MINING_ADDRESS: 'kaspa:qr0test123'
  };
  const service7 = generator._generateKaspaStratumService(config22);
  assert(service7.includes('5555:5555'), 'Uses default port 5555');

  console.log('\nTest 5.3: Uses custom stratum port when specified');
  const config23 = {
    MINING_ADDRESS: 'kaspa:qr0test123',
    KASPA_STRATUM_PORT: 6666
  };
  const service8 = generator._generateKaspaStratumService(config23);
  assert(service8.includes('6666:5555'), 'Uses custom port 6666');

  // Test Group 6: Security Verification
  console.log('\n--- Test Group 6: Security Verification ---\n');

  console.log('Test 6.1: wRPC ports only exposed when wallet connectivity enabled');
  const configDisabled = {
    WALLET_CONNECTIVITY_ENABLED: false
  };
  const portsDisabled = generator._buildKaspadPorts(configDisabled);
  assert(!portsDisabled.includes('17110:17110'), 'Borsh port not exposed when disabled');
  assert(!portsDisabled.includes('18110:18110'), 'JSON port not exposed when disabled');

  console.log('\nTest 6.2: No sensitive data in generated service definitions');
  const config24 = {
    KASPA_NETWORK: 'mainnet',
    WALLET_CONNECTIVITY_ENABLED: true,
    MINING_ADDRESS: 'kaspa:qr0test123'
  };
  const nodeService = await generator._generateKaspaNodeService(config24);
  const stratumService = generator._generateKaspaStratumService(config24);
  
  assert(!nodeService.match(/private.*key/i), 'Node service has no private keys');
  assert(!nodeService.match(/mnemonic/i), 'Node service has no mnemonics');
  assert(!nodeService.match(/password/i), 'Node service has no passwords');
  assert(!stratumService.match(/private.*key/i), 'Stratum service has no private keys');
  assert(!stratumService.match(/mnemonic/i), 'Stratum service has no mnemonics');

  console.log('\nTest 6.3: Mining address is the only wallet-related data in stratum service');
  const config25 = {
    MINING_ADDRESS: 'kaspa:qr0test123'
  };
  const service9 = generator._generateKaspaStratumService(config25);
  assert(service9.includes('MINING_ADDRESS=kaspa:qr0test123'), 'Contains mining address');
  assert(!service9.includes('WALLET_SEED'), 'Does not contain wallet seed');
  assert(!service9.includes('PRIVATE_KEY'), 'Does not contain private key');
  assert(!service9.includes('MNEMONIC'), 'Does not contain mnemonic');

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('Test Summary');
  console.log('='.repeat(80));
  console.log(`Total: ${passCount + failCount} tests`);
  console.log(`Passed: ${passCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Success Rate: ${((passCount / (passCount + failCount)) * 100).toFixed(1)}%`);
  
  if (failCount === 0) {
    console.log('\n✓ All tests passed!');
    process.exit(0);
  } else {
    console.log(`\n✗ ${failCount} test(s) failed`);
    process.exit(1);
  }
})();
