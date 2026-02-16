#!/usr/bin/env node

/**
 * Test Kaspad Helper Functions
 * 
 * Verifies that the kaspad command and port helper functions work correctly
 */

const ConfigGenerator = require('./src/utils/config-generator');

console.log('='.repeat(60));
console.log('Kaspad Helper Functions Tests');
console.log('='.repeat(60));

const generator = new ConfigGenerator();

// Test 1: Basic kaspad command args (no wallet connectivity)
console.log('\n1. Testing basic kaspad command args (wallet connectivity disabled)...');
const basicConfig = {
  KASPA_NETWORK: 'mainnet',
  KASPA_NODE_RPC_PORT: 16110,
  KASPA_NODE_P2P_PORT: 16111,
  WALLET_CONNECTIVITY_ENABLED: false
};

const basicArgs = generator._buildKaspadCommandArgs(basicConfig);
console.log('   Generated args:', basicArgs);

const hasUtxoIndex = basicArgs.includes('--utxoindex');
const hasWrpcBorsh = basicArgs.some(arg => arg.startsWith('--rpclisten-borsh'));
const hasWrpcJson = basicArgs.some(arg => arg.startsWith('--rpclisten-json'));
const hasRpcListen = basicArgs.some(arg => arg.startsWith('--rpclisten='));
const hasListen = basicArgs.some(arg => arg.startsWith('--listen='));

console.log('   Has --utxoindex:', hasUtxoIndex, '(should be false)');
console.log('   Has --rpclisten-borsh:', hasWrpcBorsh, '(should be false)');
console.log('   Has --rpclisten-json:', hasWrpcJson, '(should be false)');
console.log('   Has --rpclisten:', hasRpcListen, '(should be true)');
console.log('   Has --listen:', hasListen, '(should be true)');

if (!hasUtxoIndex && !hasWrpcBorsh && !hasWrpcJson && hasRpcListen && hasListen) {
  console.log('   ✓ PASS: Basic args correct (no wallet flags)');
} else {
  console.log('   ✗ FAIL: Basic args incorrect');
}

// Test 2: Kaspad command args with wallet connectivity enabled
console.log('\n2. Testing kaspad command args with wallet connectivity enabled...');
const walletConfig = {
  KASPA_NETWORK: 'mainnet',
  KASPA_NODE_RPC_PORT: 16110,
  KASPA_NODE_P2P_PORT: 16111,
  WALLET_CONNECTIVITY_ENABLED: true,
  KASPA_NODE_WRPC_BORSH_PORT: 17110,
  KASPA_NODE_WRPC_JSON_PORT: 18110
};

const walletArgs = generator._buildKaspadCommandArgs(walletConfig);
console.log('   Generated args:', walletArgs);

const walletHasUtxo = walletArgs.includes('--utxoindex');
const walletHasBorsh = walletArgs.some(arg => arg.includes('--rpclisten-borsh=0.0.0.0:17110'));
const walletHasJson = walletArgs.some(arg => arg.includes('--rpclisten-json=0.0.0.0:18110'));

console.log('   Has --utxoindex:', walletHasUtxo, '(should be true)');
console.log('   Has --rpclisten-borsh=0.0.0.0:17110:', walletHasBorsh, '(should be true)');
console.log('   Has --rpclisten-json=0.0.0.0:18110:', walletHasJson, '(should be true)');

if (walletHasUtxo && walletHasBorsh && walletHasJson) {
  console.log('   ✓ PASS: Wallet connectivity args correct');
} else {
  console.log('   ✗ FAIL: Wallet connectivity args incorrect');
}

// Test 3: Testnet network flag
console.log('\n3. Testing testnet network flag...');
const testnetConfig = {
  KASPA_NETWORK: 'testnet-10',
  KASPA_NODE_RPC_PORT: 16110,
  KASPA_NODE_P2P_PORT: 16111,
  WALLET_CONNECTIVITY_ENABLED: false
};

const testnetArgs = generator._buildKaspadCommandArgs(testnetConfig);
console.log('   Generated args:', testnetArgs);

const hasTestnetFlag = testnetArgs.includes('--testnet-10');
const hasMainnetFlag = testnetArgs.includes('--mainnet');

console.log('   Has --testnet-10:', hasTestnetFlag, '(should be true)');
console.log('   Has --mainnet:', hasMainnetFlag, '(should be false)');

if (hasTestnetFlag && !hasMainnetFlag) {
  console.log('   ✓ PASS: Testnet flag correct');
} else {
  console.log('   ✗ FAIL: Testnet flag incorrect');
}

// Test 4: Basic port mappings (no wallet connectivity)
console.log('\n4. Testing basic port mappings (wallet connectivity disabled)...');
const basicPorts = generator._buildKaspadPorts(basicConfig);
console.log('   Generated ports:', basicPorts);

const hasRpcPort = basicPorts.includes('16110:16110');
const hasP2pPort = basicPorts.includes('16111:16111');
const hasBorshPort = basicPorts.some(p => p.includes('17110'));
const hasJsonPort = basicPorts.some(p => p.includes('18110'));

console.log('   Has RPC port (16110:16110):', hasRpcPort, '(should be true)');
console.log('   Has P2P port (16111:16111):', hasP2pPort, '(should be true)');
console.log('   Has Borsh port:', hasBorshPort, '(should be false)');
console.log('   Has JSON port:', hasJsonPort, '(should be false)');

if (hasRpcPort && hasP2pPort && !hasBorshPort && !hasJsonPort) {
  console.log('   ✓ PASS: Basic ports correct (no wRPC ports)');
} else {
  console.log('   ✗ FAIL: Basic ports incorrect');
}

// Test 5: Port mappings with wallet connectivity enabled
console.log('\n5. Testing port mappings with wallet connectivity enabled...');
const walletPorts = generator._buildKaspadPorts(walletConfig);
console.log('   Generated ports:', walletPorts);

const walletPortHasRpc = walletPorts.includes('16110:16110');
const walletPortHasP2p = walletPorts.includes('16111:16111');
const walletPortHasBorsh = walletPorts.includes('17110:17110');
const walletPortHasJson = walletPorts.includes('18110:18110');

console.log('   Has RPC port (16110:16110):', walletPortHasRpc, '(should be true)');
console.log('   Has P2P port (16111:16111):', walletPortHasP2p, '(should be true)');
console.log('   Has Borsh port (17110:17110):', walletPortHasBorsh, '(should be true)');
console.log('   Has JSON port (18110:18110):', walletPortHasJson, '(should be true)');

if (walletPortHasRpc && walletPortHasP2p && walletPortHasBorsh && walletPortHasJson) {
  console.log('   ✓ PASS: Wallet connectivity ports correct');
} else {
  console.log('   ✗ FAIL: Wallet connectivity ports incorrect');
}

// Test 6: Custom wRPC ports
console.log('\n6. Testing custom wRPC ports...');
const customPortConfig = {
  KASPA_NETWORK: 'mainnet',
  KASPA_NODE_RPC_PORT: 16110,
  KASPA_NODE_P2P_PORT: 16111,
  WALLET_CONNECTIVITY_ENABLED: true,
  KASPA_NODE_WRPC_BORSH_PORT: 27110,
  KASPA_NODE_WRPC_JSON_PORT: 28110
};

const customArgs = generator._buildKaspadCommandArgs(customPortConfig);
const customPorts = generator._buildKaspadPorts(customPortConfig);

console.log('   Generated args:', customArgs);
console.log('   Generated ports:', customPorts);

const hasCustomBorshArg = customArgs.some(arg => arg.includes('27110'));
const hasCustomJsonArg = customArgs.some(arg => arg.includes('28110'));
const hasCustomBorshPort = customPorts.includes('27110:17110');
const hasCustomJsonPort = customPorts.includes('28110:18110');

console.log('   Has custom Borsh arg (27110):', hasCustomBorshArg, '(should be true)');
console.log('   Has custom JSON arg (28110):', hasCustomJsonArg, '(should be true)');
console.log('   Has custom Borsh port (27110:17110):', hasCustomBorshPort, '(should be true)');
console.log('   Has custom JSON port (28110:18110):', hasCustomJsonPort, '(should be true)');

if (hasCustomBorshArg && hasCustomJsonArg && hasCustomBorshPort && hasCustomJsonPort) {
  console.log('   ✓ PASS: Custom wRPC ports correct');
} else {
  console.log('   ✗ FAIL: Custom wRPC ports incorrect');
}

// Test 7: String boolean coercion
console.log('\n7. Testing string boolean coercion...');
const stringBoolConfig = {
  KASPA_NETWORK: 'mainnet',
  KASPA_NODE_RPC_PORT: 16110,
  KASPA_NODE_P2P_PORT: 16111,
  WALLET_CONNECTIVITY_ENABLED: 'true',  // String instead of boolean
  KASPA_NODE_WRPC_BORSH_PORT: 17110,
  KASPA_NODE_WRPC_JSON_PORT: 18110
};

const stringBoolArgs = generator._buildKaspadCommandArgs(stringBoolConfig);
const stringBoolPorts = generator._buildKaspadPorts(stringBoolConfig);

const stringHasUtxo = stringBoolArgs.includes('--utxoindex');
const stringHasPorts = stringBoolPorts.length === 4;

console.log('   Has --utxoindex with string "true":', stringHasUtxo, '(should be true)');
console.log('   Has 4 ports with string "true":', stringHasPorts, '(should be true)');

if (stringHasUtxo && stringHasPorts) {
  console.log('   ✓ PASS: String boolean coercion works');
} else {
  console.log('   ✗ FAIL: String boolean coercion failed');
}

// Test 8: Public node settings
console.log('\n8. Testing public node settings...');
const publicNodeConfig = {
  KASPA_NETWORK: 'mainnet',
  KASPA_NODE_RPC_PORT: 16110,
  KASPA_NODE_P2P_PORT: 16111,
  PUBLIC_NODE: true,
  EXTERNAL_IP: '203.0.113.1',
  WALLET_CONNECTIVITY_ENABLED: false
};

const publicArgs = generator._buildKaspadCommandArgs(publicNodeConfig);
console.log('   Generated args:', publicArgs);

const hasExternalIp = publicArgs.some(arg => arg.includes('--externalip=203.0.113.1'));
const hasDisableUpnp = publicArgs.includes('--disable-upnp');

console.log('   Has --externalip=203.0.113.1:', hasExternalIp, '(should be true)');
console.log('   Has --disable-upnp:', hasDisableUpnp, '(should be false)');

if (hasExternalIp && !hasDisableUpnp) {
  console.log('   ✓ PASS: Public node settings correct');
} else {
  console.log('   ✗ FAIL: Public node settings incorrect');
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('Test Summary');
console.log('='.repeat(60));
console.log('All tests completed. Review output above for any failures.');
console.log('');
