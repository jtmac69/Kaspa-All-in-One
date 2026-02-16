#!/usr/bin/env node

/**
 * Test Legacy Configuration Migration
 * 
 * Verifies that ConfigGenerator properly handles legacy configuration keys
 * and migrates them to new format while preserving functionality.
 */

const ConfigGenerator = require('./src/utils/config-generator');

// Test configuration with legacy keys
const legacyConfig = {
  KASPA_NETWORK: 'mainnet',
  WALLET_ENABLED: 'true',                    // Legacy → WALLET_CONNECTIVITY_ENABLED
  KASPA_NODE_WRPC_PORT: '17110',            // Legacy → KASPA_NODE_WRPC_BORSH_PORT
  WALLET_MODE: 'local',                      // Legacy → WALLET_SETUP_MODE
  UTXO_INDEX: 'true',                        // Legacy standalone flag
  KASPA_NODE_RPC_PORT: '16110',
  KASPA_NODE_P2P_PORT: '16111'
};

// Test configuration with mixed legacy and new keys
const mixedConfig = {
  KASPA_NETWORK: 'testnet-11',
  WALLET_ENABLED: 'true',                    // Should be ignored if new key exists
  WALLET_CONNECTIVITY_ENABLED: 'false',      // New key takes precedence
  KASPA_NODE_WRPC_PORT: '17110',            // Should be ignored if new key exists
  KASPA_NODE_WRPC_BORSH_PORT: '17111',      // New key takes precedence
  KASPA_NODE_RPC_PORT: '16110'
};

// Test configuration with UTXO_INDEX but no wallet connectivity
const utxoOnlyConfig = {
  KASPA_NETWORK: 'mainnet',
  UTXO_INDEX: 'true',                        // Should force --utxoindex
  WALLET_CONNECTIVITY_ENABLED: 'false',      // Explicitly disabled
  KASPA_NODE_RPC_PORT: '16110'
};

async function runTests() {
  console.log('='.repeat(80));
  console.log('Testing Legacy Configuration Migration');
  console.log('='.repeat(80));
  console.log();

  const generator = new ConfigGenerator();

  // Test 1: Legacy keys migration
  console.log('Test 1: Legacy Keys Migration');
  console.log('-'.repeat(80));
  console.log('Input config (legacy keys):');
  console.log(JSON.stringify(legacyConfig, null, 2));
  console.log();

  const normalized1 = generator._normalizeWalletConfig(legacyConfig);
  console.log('Normalized config:');
  console.log(JSON.stringify(normalized1, null, 2));
  console.log();

  // Verify migrations
  const test1Checks = [
    {
      name: 'WALLET_ENABLED → WALLET_CONNECTIVITY_ENABLED',
      pass: normalized1.WALLET_CONNECTIVITY_ENABLED === 'true'
    },
    {
      name: 'KASPA_NODE_WRPC_PORT → KASPA_NODE_WRPC_BORSH_PORT',
      pass: normalized1.KASPA_NODE_WRPC_BORSH_PORT === '17110'
    },
    {
      name: 'WALLET_MODE → WALLET_SETUP_MODE',
      pass: normalized1.WALLET_SETUP_MODE === 'local'
    },
    {
      name: 'Legacy UTXO_INDEX not forced (wallet enabled)',
      pass: !normalized1._FORCE_UTXO_INDEX
    }
  ];

  test1Checks.forEach(check => {
    console.log(`  ${check.pass ? '✓' : '✗'} ${check.name}`);
  });
  console.log();

  // Test 2: Mixed keys (new takes precedence)
  console.log('Test 2: Mixed Keys (New Takes Precedence)');
  console.log('-'.repeat(80));
  console.log('Input config (mixed keys):');
  console.log(JSON.stringify(mixedConfig, null, 2));
  console.log();

  const normalized2 = generator._normalizeWalletConfig(mixedConfig);
  console.log('Normalized config:');
  console.log(JSON.stringify(normalized2, null, 2));
  console.log();

  const test2Checks = [
    {
      name: 'New WALLET_CONNECTIVITY_ENABLED preserved',
      pass: normalized2.WALLET_CONNECTIVITY_ENABLED === 'false'
    },
    {
      name: 'New KASPA_NODE_WRPC_BORSH_PORT preserved',
      pass: normalized2.KASPA_NODE_WRPC_BORSH_PORT === '17111'
    }
  ];

  test2Checks.forEach(check => {
    console.log(`  ${check.pass ? '✓' : '✗'} ${check.name}`);
  });
  console.log();

  // Test 3: UTXO_INDEX without wallet connectivity
  console.log('Test 3: Legacy UTXO_INDEX Without Wallet Connectivity');
  console.log('-'.repeat(80));
  console.log('Input config (UTXO_INDEX only):');
  console.log(JSON.stringify(utxoOnlyConfig, null, 2));
  console.log();

  const normalized3 = generator._normalizeWalletConfig(utxoOnlyConfig);
  console.log('Normalized config:');
  console.log(JSON.stringify(normalized3, null, 2));
  console.log();

  const test3Checks = [
    {
      name: 'Legacy UTXO_INDEX forces flag',
      pass: normalized3._FORCE_UTXO_INDEX === true
    }
  ];

  test3Checks.forEach(check => {
    console.log(`  ${check.pass ? '✓' : '✗'} ${check.name}`);
  });
  console.log();

  // Test 4: Command args generation with legacy config
  console.log('Test 4: Command Args Generation with Legacy Config');
  console.log('-'.repeat(80));
  
  const commandArgs1 = generator._buildKaspadCommandArgs(normalized1);
  console.log('Command args (legacy config with wallet enabled):');
  console.log(JSON.stringify(commandArgs1, null, 2));
  console.log();

  const test4Checks = [
    {
      name: 'Contains --utxoindex',
      pass: commandArgs1.includes('--utxoindex')
    },
    {
      name: 'Contains --rpclisten-borsh',
      pass: commandArgs1.some(arg => arg.startsWith('--rpclisten-borsh'))
    },
    {
      name: 'Contains --rpclisten-json',
      pass: commandArgs1.some(arg => arg.startsWith('--rpclisten-json'))
    }
  ];

  test4Checks.forEach(check => {
    console.log(`  ${check.pass ? '✓' : '✗'} ${check.name}`);
  });
  console.log();

  // Test 5: Command args with forced UTXO_INDEX
  console.log('Test 5: Command Args with Forced UTXO_INDEX');
  console.log('-'.repeat(80));
  
  const commandArgs3 = generator._buildKaspadCommandArgs(normalized3);
  console.log('Command args (UTXO_INDEX without wallet):');
  console.log(JSON.stringify(commandArgs3, null, 2));
  console.log();

  const test5Checks = [
    {
      name: 'Contains --utxoindex (forced)',
      pass: commandArgs3.includes('--utxoindex')
    },
    {
      name: 'No --rpclisten-borsh (wallet disabled)',
      pass: !commandArgs3.some(arg => arg.startsWith('--rpclisten-borsh'))
    },
    {
      name: 'No --rpclisten-json (wallet disabled)',
      pass: !commandArgs3.some(arg => arg.startsWith('--rpclisten-json'))
    }
  ];

  test5Checks.forEach(check => {
    console.log(`  ${check.pass ? '✓' : '✗'} ${check.name}`);
  });
  console.log();

  // Summary
  console.log('='.repeat(80));
  console.log('Test Summary');
  console.log('='.repeat(80));
  
  const allChecks = [...test1Checks, ...test2Checks, ...test3Checks, ...test4Checks, ...test5Checks];
  const passed = allChecks.filter(c => c.pass).length;
  const total = allChecks.length;
  
  console.log(`Total: ${passed}/${total} checks passed`);
  
  if (passed === total) {
    console.log('✓ All tests passed!');
    process.exit(0);
  } else {
    console.log('✗ Some tests failed');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
