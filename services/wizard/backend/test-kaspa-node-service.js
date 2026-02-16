#!/usr/bin/env node

/**
 * Test Kaspa Node Service Generation
 * 
 * Verifies that the updated _generateKaspaNodeService method:
 * - Uses WALLET_CONNECTIVITY_ENABLED instead of WALLET_ENABLED
 * - Calls helper functions for command and port generation
 * - Generates proper docker-compose YAML
 */

const ConfigGenerator = require('./src/utils/config-generator');

console.log('='.repeat(60));
console.log('Kaspa Node Service Generation Tests');
console.log('='.repeat(60));

const generator = new ConfigGenerator();

// Test 1: Basic kaspa-node service (no wallet connectivity)
console.log('\n1. Testing basic kaspa-node service (wallet connectivity disabled)...');
(async () => {
  const basicConfig = {
    KASPA_NETWORK: 'mainnet',
    KASPA_NODE_RPC_PORT: 16110,
    KASPA_NODE_P2P_PORT: 16111,
    WALLET_CONNECTIVITY_ENABLED: false
  };

  const service = await generator._generateKaspaNodeService(basicConfig);
  console.log('Generated service:');
  console.log(service);

  const hasUtxoIndex = service.includes('--utxoindex');
  const hasWrpcBorsh = service.includes('--rpclisten-borsh');
  const hasWrpcJson = service.includes('--rpclisten-json');
  const hasTwoPorts = (service.match(/- "/g) || []).length === 2;
  const hasHealthcheck = service.includes('healthcheck:');

  console.log('\n   Has --utxoindex:', hasUtxoIndex, '(should be false)');
  console.log('   Has --rpclisten-borsh:', hasWrpcBorsh, '(should be false)');
  console.log('   Has --rpclisten-json:', hasWrpcJson, '(should be false)');
  console.log('   Has 2 ports:', hasTwoPorts, '(should be true)');
  console.log('   Has healthcheck:', hasHealthcheck, '(should be true)');

  if (!hasUtxoIndex && !hasWrpcBorsh && !hasWrpcJson && hasTwoPorts && hasHealthcheck) {
    console.log('   ✓ PASS: Basic service correct');
  } else {
    console.log('   ✗ FAIL: Basic service incorrect');
  }

  // Test 2: Kaspa-node service with wallet connectivity
  console.log('\n2. Testing kaspa-node service with wallet connectivity enabled...');
  const walletConfig = {
    KASPA_NETWORK: 'mainnet',
    KASPA_NODE_RPC_PORT: 16110,
    KASPA_NODE_P2P_PORT: 16111,
    WALLET_CONNECTIVITY_ENABLED: true,
    KASPA_NODE_WRPC_BORSH_PORT: 17110,
    KASPA_NODE_WRPC_JSON_PORT: 18110
  };

  const walletService = await generator._generateKaspaNodeService(walletConfig);
  console.log('Generated service:');
  console.log(walletService);

  const walletHasUtxo = walletService.includes('--utxoindex');
  const walletHasBorsh = walletService.includes('--rpclisten-borsh=0.0.0.0:17110');
  const walletHasJson = walletService.includes('--rpclisten-json=0.0.0.0:18110');
  const walletHasFourPorts = (walletService.match(/- "/g) || []).length === 4;
  const walletHasPort17110 = walletService.includes('"17110:17110"');
  const walletHasPort18110 = walletService.includes('"18110:18110"');

  console.log('\n   Has --utxoindex:', walletHasUtxo, '(should be true)');
  console.log('   Has --rpclisten-borsh=0.0.0.0:17110:', walletHasBorsh, '(should be true)');
  console.log('   Has --rpclisten-json=0.0.0.0:18110:', walletHasJson, '(should be true)');
  console.log('   Has 4 ports:', walletHasFourPorts, '(should be true)');
  console.log('   Has port 17110:17110:', walletHasPort17110, '(should be true)');
  console.log('   Has port 18110:18110:', walletHasPort18110, '(should be true)');

  if (walletHasUtxo && walletHasBorsh && walletHasJson && walletHasFourPorts && 
      walletHasPort17110 && walletHasPort18110) {
    console.log('   ✓ PASS: Wallet connectivity service correct');
  } else {
    console.log('   ✗ FAIL: Wallet connectivity service incorrect');
  }

  // Test 3: Verify old fields are NOT present
  console.log('\n3. Testing that old fields are removed...');
  const hasWalletEnabled = walletService.includes('WALLET_ENABLED');
  const hasUtxoIndexEnv = walletService.includes('UTXO_INDEX');
  const hasOldWrpcListen = walletService.includes('--wrpc-listen');
  const hasEnvironmentSection = walletService.includes('environment:');

  console.log('   Has WALLET_ENABLED env var:', hasWalletEnabled, '(should be false)');
  console.log('   Has UTXO_INDEX env var:', hasUtxoIndexEnv, '(should be false)');
  console.log('   Has old --wrpc-listen flag:', hasOldWrpcListen, '(should be false)');
  console.log('   Has environment section:', hasEnvironmentSection, '(should be false)');

  if (!hasWalletEnabled && !hasUtxoIndexEnv && !hasOldWrpcListen && !hasEnvironmentSection) {
    console.log('   ✓ PASS: Old fields removed');
  } else {
    console.log('   ✗ FAIL: Old fields still present');
  }

  // Test 4: Testnet configuration
  console.log('\n4. Testing testnet configuration...');
  const testnetConfig = {
    KASPA_NETWORK: 'testnet-10',
    KASPA_NODE_RPC_PORT: 16110,
    KASPA_NODE_P2P_PORT: 16111,
    WALLET_CONNECTIVITY_ENABLED: false
  };

  const testnetService = await generator._generateKaspaNodeService(testnetConfig);
  console.log('Generated service (excerpt):');
  const commandLine = testnetService.split('\n').find(line => line.includes('--testnet'));
  console.log('   Command line:', commandLine);

  const hasTestnetFlag = testnetService.includes('--testnet-10');
  const hasMainnetFlag = testnetService.includes('--mainnet');

  console.log('\n   Has --testnet-10:', hasTestnetFlag, '(should be true)');
  console.log('   Has --mainnet:', hasMainnetFlag, '(should be false)');

  if (hasTestnetFlag && !hasMainnetFlag) {
    console.log('   ✓ PASS: Testnet configuration correct');
  } else {
    console.log('   ✗ FAIL: Testnet configuration incorrect');
  }

  // Test 5: Custom wRPC ports
  console.log('\n5. Testing custom wRPC ports...');
  const customPortConfig = {
    KASPA_NETWORK: 'mainnet',
    KASPA_NODE_RPC_PORT: 16110,
    KASPA_NODE_P2P_PORT: 16111,
    WALLET_CONNECTIVITY_ENABLED: true,
    KASPA_NODE_WRPC_BORSH_PORT: 27110,
    KASPA_NODE_WRPC_JSON_PORT: 28110
  };

  const customService = await generator._generateKaspaNodeService(customPortConfig);
  
  const hasCustomBorsh = customService.includes('--rpclisten-borsh=0.0.0.0:27110');
  const hasCustomJson = customService.includes('--rpclisten-json=0.0.0.0:28110');
  const hasCustomBorshPort = customService.includes('"27110:17110"');
  const hasCustomJsonPort = customService.includes('"28110:18110"');

  console.log('   Has custom Borsh arg (27110):', hasCustomBorsh, '(should be true)');
  console.log('   Has custom JSON arg (28110):', hasCustomJson, '(should be true)');
  console.log('   Has custom Borsh port mapping:', hasCustomBorshPort, '(should be true)');
  console.log('   Has custom JSON port mapping:', hasCustomJsonPort, '(should be true)');

  if (hasCustomBorsh && hasCustomJson && hasCustomBorshPort && hasCustomJsonPort) {
    console.log('   ✓ PASS: Custom wRPC ports correct');
  } else {
    console.log('   ✗ FAIL: Custom wRPC ports incorrect');
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('Test Summary');
  console.log('='.repeat(60));
  console.log('All tests completed. Review output above for any failures.');
  console.log('');
})();
