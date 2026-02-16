#!/usr/bin/env node

/**
 * Test Kaspa Archive Node Service Generation
 * 
 * Verifies that the updated _generateKaspaArchiveNodeService method:
 * - Uses helper functions for command and port generation
 * - Adds --nopruning flag for archive functionality
 * - Includes --utxoindex even without wallet connectivity
 * - Supports wallet connectivity when enabled
 */

const ConfigGenerator = require('./src/utils/config-generator');

console.log('='.repeat(60));
console.log('Kaspa Archive Node Service Generation Tests');
console.log('='.repeat(60));

const generator = new ConfigGenerator();

// Test 1: Basic archive node (no wallet connectivity)
console.log('\n1. Testing basic archive node (wallet connectivity disabled)...');
(async () => {
  const basicConfig = {
    KASPA_NETWORK: 'mainnet',
    KASPA_NODE_RPC_PORT: 16110,
    KASPA_NODE_P2P_PORT: 16111,
    WALLET_CONNECTIVITY_ENABLED: false
  };

  const service = await generator._generateKaspaArchiveNodeService(basicConfig);
  console.log('Generated service:');
  console.log(service);

  const hasNoPruning = service.includes('--nopruning');
  const hasUtxoIndex = service.includes('--utxoindex');
  const hasWrpcBorsh = service.includes('--rpclisten-borsh');
  const hasWrpcJson = service.includes('--rpclisten-json');
  const hasTwoPorts = (service.match(/- "/g) || []).length === 2;

  console.log('\n   Has --nopruning:', hasNoPruning, '(should be true)');
  console.log('   Has --utxoindex:', hasUtxoIndex, '(should be true - archive needs it)');
  console.log('   Has --rpclisten-borsh:', hasWrpcBorsh, '(should be false)');
  console.log('   Has --rpclisten-json:', hasWrpcJson, '(should be false)');
  console.log('   Has 2 ports:', hasTwoPorts, '(should be true)');

  if (hasNoPruning && hasUtxoIndex && !hasWrpcBorsh && !hasWrpcJson && hasTwoPorts) {
    console.log('   ✓ PASS: Basic archive node correct');
  } else {
    console.log('   ✗ FAIL: Basic archive node incorrect');
  }

  // Test 2: Archive node with wallet connectivity
  console.log('\n2. Testing archive node with wallet connectivity enabled...');
  const walletConfig = {
    KASPA_NETWORK: 'mainnet',
    KASPA_NODE_RPC_PORT: 16110,
    KASPA_NODE_P2P_PORT: 16111,
    WALLET_CONNECTIVITY_ENABLED: true,
    KASPA_NODE_WRPC_BORSH_PORT: 17110,
    KASPA_NODE_WRPC_JSON_PORT: 18110
  };

  const walletService = await generator._generateKaspaArchiveNodeService(walletConfig);
  console.log('Generated service:');
  console.log(walletService);

  const walletHasNoPruning = walletService.includes('--nopruning');
  const walletHasUtxo = walletService.includes('--utxoindex');
  const walletHasBorsh = walletService.includes('--rpclisten-borsh=0.0.0.0:17110');
  const walletHasJson = walletService.includes('--rpclisten-json=0.0.0.0:18110');
  const walletHasFourPorts = (walletService.match(/- "/g) || []).length === 4;

  console.log('\n   Has --nopruning:', walletHasNoPruning, '(should be true)');
  console.log('   Has --utxoindex:', walletHasUtxo, '(should be true)');
  console.log('   Has --rpclisten-borsh=0.0.0.0:17110:', walletHasBorsh, '(should be true)');
  console.log('   Has --rpclisten-json=0.0.0.0:18110:', walletHasJson, '(should be true)');
  console.log('   Has 4 ports:', walletHasFourPorts, '(should be true)');

  if (walletHasNoPruning && walletHasUtxo && walletHasBorsh && walletHasJson && walletHasFourPorts) {
    console.log('   ✓ PASS: Archive node with wallet connectivity correct');
  } else {
    console.log('   ✗ FAIL: Archive node with wallet connectivity incorrect');
  }

  // Test 3: Verify command structure
  console.log('\n3. Testing command structure...');
  const commandMatch = walletService.match(/command: (\[.*?\])/s);
  if (commandMatch) {
    const commandArray = JSON.parse(commandMatch[1]);
    console.log('   Command array:', commandArray);

    const noPruningIndex = commandArray.indexOf('--nopruning');
    const utxoIndexIndex = commandArray.indexOf('--utxoindex');
    
    console.log('   --nopruning position:', noPruningIndex);
    console.log('   --utxoindex position:', utxoIndexIndex);
    console.log('   Both flags present:', noPruningIndex >= 0 && utxoIndexIndex >= 0, '(should be true)');

    if (noPruningIndex >= 0 && utxoIndexIndex >= 0) {
      console.log('   ✓ PASS: Command structure correct');
    } else {
      console.log('   ✗ FAIL: Command structure incorrect');
    }
  } else {
    console.log('   ✗ FAIL: Could not parse command');
  }

  // Test 4: Verify no duplicate --utxoindex
  console.log('\n4. Testing no duplicate --utxoindex flags...');
  const utxoMatches = (walletService.match(/--utxoindex/g) || []).length;
  console.log('   Number of --utxoindex occurrences:', utxoMatches, '(should be 1)');

  if (utxoMatches === 1) {
    console.log('   ✓ PASS: No duplicate --utxoindex');
  } else {
    console.log('   ✗ FAIL: Duplicate --utxoindex found');
  }

  // Test 5: Testnet archive node
  console.log('\n5. Testing testnet archive node...');
  const testnetConfig = {
    KASPA_NETWORK: 'testnet-10',
    KASPA_NODE_RPC_PORT: 16110,
    KASPA_NODE_P2P_PORT: 16111,
    WALLET_CONNECTIVITY_ENABLED: false
  };

  const testnetService = await generator._generateKaspaArchiveNodeService(testnetConfig);
  
  const hasTestnetFlag = testnetService.includes('--testnet-10');
  const testnetHasNoPruning = testnetService.includes('--nopruning');
  const testnetHasUtxo = testnetService.includes('--utxoindex');

  console.log('   Has --testnet-10:', hasTestnetFlag, '(should be true)');
  console.log('   Has --nopruning:', testnetHasNoPruning, '(should be true)');
  console.log('   Has --utxoindex:', testnetHasUtxo, '(should be true)');

  if (hasTestnetFlag && testnetHasNoPruning && testnetHasUtxo) {
    console.log('   ✓ PASS: Testnet archive node correct');
  } else {
    console.log('   ✗ FAIL: Testnet archive node incorrect');
  }

  // Test 6: Verify volume path
  console.log('\n6. Testing volume path...');
  const hasArchiveVolume = walletService.includes('kaspa-archive:/app/data');
  console.log('   Has kaspa-archive volume:', hasArchiveVolume, '(should be true)');

  if (hasArchiveVolume) {
    console.log('   ✓ PASS: Archive volume path correct');
  } else {
    console.log('   ✗ FAIL: Archive volume path incorrect');
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('Test Summary');
  console.log('='.repeat(60));
  console.log('All tests completed. Review output above for any failures.');
  console.log('');
})();
