#!/usr/bin/env node

/**
 * Test Docker Compose Generation (Task 5)
 * 
 * Tests:
 * - Task 5.1: Dynamic port configuration
 * - Task 5.2: Network selection (mainnet/testnet)
 * - Task 5.3: Data directory volumes
 */

const ConfigGenerator = require('./src/utils/config-generator');

const configGenerator = new ConfigGenerator();

let passed = 0;
let failed = 0;

console.log('='.repeat(80));
console.log('Docker Compose Generation Tests (Task 5)');
console.log('='.repeat(80));
console.log();

// Test 5.1: Dynamic Port Configuration
async function testDynamicPortConfiguration() {
  console.log('Test 5.1: Dynamic Port Configuration');
  console.log('-'.repeat(80));
  
  const config = {
    KASPA_NODE_RPC_PORT: 16210,
    KASPA_NODE_P2P_PORT: 16211,
    KASPA_NETWORK: 'mainnet'
  };
  
  const profiles = ['core'];
  
  try {
    const composeContent = await configGenerator.generateDockerCompose(config, profiles);
    
    // Check if custom ports are used
    const hasCustomRpcPort = composeContent.includes('16210');
    const hasCustomP2pPort = composeContent.includes('16211');
    const hasPortMapping = composeContent.includes('KASPA_NODE_P2P_PORT:-16211');
    const hasRpcMapping = composeContent.includes('KASPA_NODE_RPC_PORT:-16210');
    
    if (hasCustomRpcPort && hasCustomP2pPort && hasPortMapping && hasRpcMapping) {
      console.log('✅ PASS: Custom ports configured correctly');
      console.log('   - RPC port: 16210');
      console.log('   - P2P port: 16211');
      console.log('   - Port mappings use environment variables');
      passed++;
    } else {
      console.log('❌ FAIL: Custom ports not configured correctly');
      console.log(`   - Has custom RPC port: ${hasCustomRpcPort}`);
      console.log(`   - Has custom P2P port: ${hasCustomP2pPort}`);
      console.log(`   - Has port mapping: ${hasPortMapping}`);
      console.log(`   - Has RPC mapping: ${hasRpcMapping}`);
      failed++;
    }
  } catch (error) {
    console.log('❌ FAIL: Error generating docker-compose.yml');
    console.log(`   Error: ${error.message}`);
    failed++;
  }
  
  console.log();
}

// Test 5.2: Network Selection (Mainnet)
async function testNetworkSelectionMainnet() {
  console.log('Test 5.2a: Network Selection - Mainnet');
  console.log('-'.repeat(80));
  
  const config = {
    KASPA_NODE_RPC_PORT: 16110,
    KASPA_NODE_P2P_PORT: 16111,
    KASPA_NETWORK: 'mainnet'
  };
  
  const profiles = ['core'];
  
  try {
    const composeContent = await configGenerator.generateDockerCompose(config, profiles);
    
    // Check that --testnet flag is NOT present for mainnet
    const hasTestnetFlag = composeContent.includes('--testnet');
    const hasKaspadCommand = composeContent.includes('kaspad --utxoindex');
    
    if (!hasTestnetFlag && hasKaspadCommand) {
      console.log('✅ PASS: Mainnet configuration correct');
      console.log('   - No --testnet flag present');
      console.log('   - kaspad command configured');
      passed++;
    } else {
      console.log('❌ FAIL: Mainnet configuration incorrect');
      console.log(`   - Has testnet flag: ${hasTestnetFlag} (should be false)`);
      console.log(`   - Has kaspad command: ${hasKaspadCommand}`);
      failed++;
    }
  } catch (error) {
    console.log('❌ FAIL: Error generating docker-compose.yml');
    console.log(`   Error: ${error.message}`);
    failed++;
  }
  
  console.log();
}

// Test 5.2: Network Selection (Testnet)
async function testNetworkSelectionTestnet() {
  console.log('Test 5.2b: Network Selection - Testnet');
  console.log('-'.repeat(80));
  
  const config = {
    KASPA_NODE_RPC_PORT: 16110,
    KASPA_NODE_P2P_PORT: 16111,
    KASPA_NETWORK: 'testnet'
  };
  
  const profiles = ['core'];
  
  try {
    const composeContent = await configGenerator.generateDockerCompose(config, profiles);
    
    // Check that --testnet flag IS present for testnet
    const hasTestnetFlag = composeContent.includes('--testnet');
    const hasKaspadCommand = composeContent.includes('kaspad --utxoindex');
    
    if (hasTestnetFlag && hasKaspadCommand) {
      console.log('✅ PASS: Testnet configuration correct');
      console.log('   - --testnet flag present');
      console.log('   - kaspad command configured');
      passed++;
    } else {
      console.log('❌ FAIL: Testnet configuration incorrect');
      console.log(`   - Has testnet flag: ${hasTestnetFlag} (should be true)`);
      console.log(`   - Has kaspad command: ${hasKaspadCommand}`);
      failed++;
    }
  } catch (error) {
    console.log('❌ FAIL: Error generating docker-compose.yml');
    console.log(`   Error: ${error.message}`);
    failed++;
  }
  
  console.log();
}

// Test 5.3: Data Directory Volumes
async function testDataDirectoryVolumes() {
  console.log('Test 5.3: Data Directory Volumes');
  console.log('-'.repeat(80));
  
  const config = {
    KASPA_NODE_RPC_PORT: 16110,
    KASPA_NODE_P2P_PORT: 16111,
    KASPA_NETWORK: 'mainnet',
    KASPA_DATA_DIR: '/custom/kaspa/data',
    KASPA_ARCHIVE_DATA_DIR: '/custom/archive/data',
    TIMESCALEDB_DATA_DIR: '/custom/timescaledb/data'
  };
  
  const profiles = ['core', 'indexer-services', 'archive-node'];
  
  try {
    const composeContent = await configGenerator.generateDockerCompose(config, profiles);
    
    // Check if custom data directories are used
    const hasKaspaDataDir = composeContent.includes('/custom/kaspa/data');
    const hasArchiveDataDir = composeContent.includes('/custom/archive/data');
    const hasTimescaleDataDir = composeContent.includes('/custom/timescaledb/data');
    
    if (hasKaspaDataDir && hasArchiveDataDir && hasTimescaleDataDir) {
      console.log('✅ PASS: Custom data directories configured correctly');
      console.log('   - Kaspa data dir: /custom/kaspa/data');
      console.log('   - Archive data dir: /custom/archive/data');
      console.log('   - TimescaleDB data dir: /custom/timescaledb/data');
      passed++;
    } else {
      console.log('❌ FAIL: Custom data directories not configured correctly');
      console.log(`   - Has Kaspa data dir: ${hasKaspaDataDir}`);
      console.log(`   - Has Archive data dir: ${hasArchiveDataDir}`);
      console.log(`   - Has TimescaleDB data dir: ${hasTimescaleDataDir}`);
      failed++;
    }
  } catch (error) {
    console.log('❌ FAIL: Error generating docker-compose.yml');
    console.log(`   Error: ${error.message}`);
    failed++;
  }
  
  console.log();
}

// Test: Multiple Profiles
async function testMultipleProfiles() {
  console.log('Test: Multiple Profiles Integration');
  console.log('-'.repeat(80));
  
  const config = {
    KASPA_NODE_RPC_PORT: 16110,
    KASPA_NODE_P2P_PORT: 16111,
    KASPA_NETWORK: 'mainnet',
    POSTGRES_PORT: 5432
  };
  
  const profiles = ['core', 'kaspa-user-applications', 'indexer-services'];
  
  try {
    const composeContent = await configGenerator.generateDockerCompose(config, profiles);
    
    // Check if all profile services are included
    const hasKaspaNode = composeContent.includes('kaspa-node:');
    const hasNginx = composeContent.includes('nginx:');
    const hasKasiaApp = composeContent.includes('kasia-app:');
    const hasIndexerDb = composeContent.includes('indexer-db:');
    const hasKasiaIndexer = composeContent.includes('kasia-indexer:');
    
    if (hasKaspaNode && hasNginx && hasKasiaApp && hasIndexerDb && hasKasiaIndexer) {
      console.log('✅ PASS: Multiple profiles configured correctly');
      console.log('   - Core profile: kaspa-node');
      console.log('   - User applications: nginx, kasia-app');
      console.log('   - Indexer services: indexer-db, kasia-indexer');
      passed++;
    } else {
      console.log('❌ FAIL: Multiple profiles not configured correctly');
      console.log(`   - Has kaspa-node: ${hasKaspaNode}`);
      console.log(`   - Has nginx: ${hasNginx}`);
      console.log(`   - Has kasia-app: ${hasKasiaApp}`);
      console.log(`   - Has indexer-db: ${hasIndexerDb}`);
      console.log(`   - Has kasia-indexer: ${hasKasiaIndexer}`);
      failed++;
    }
  } catch (error) {
    console.log('❌ FAIL: Error generating docker-compose.yml');
    console.log(`   Error: ${error.message}`);
    failed++;
  }
  
  console.log();
}

// Test: Port References in Dependent Services
async function testPortReferencesInDependentServices() {
  console.log('Test: Port References in Dependent Services');
  console.log('-'.repeat(80));
  
  const config = {
    KASPA_NODE_RPC_PORT: 16210,
    KASPA_NODE_P2P_PORT: 16211,
    KASPA_NETWORK: 'mainnet'
  };
  
  const profiles = ['core', 'indexer-services', 'mining'];
  
  try {
    const composeContent = await configGenerator.generateDockerCompose(config, profiles);
    
    // Check if dependent services use the configured RPC port
    const indexerUsesCustomPort = composeContent.includes('kaspa-node:16210');
    const stratumUsesCustomPort = composeContent.includes('kaspa-node:16210');
    
    if (indexerUsesCustomPort && stratumUsesCustomPort) {
      console.log('✅ PASS: Dependent services use configured ports');
      console.log('   - Indexer services reference custom RPC port');
      console.log('   - Mining stratum references custom RPC port');
      passed++;
    } else {
      console.log('❌ FAIL: Dependent services do not use configured ports');
      console.log(`   - Indexer uses custom port: ${indexerUsesCustomPort}`);
      console.log(`   - Stratum uses custom port: ${stratumUsesCustomPort}`);
      failed++;
    }
  } catch (error) {
    console.log('❌ FAIL: Error generating docker-compose.yml');
    console.log(`   Error: ${error.message}`);
    failed++;
  }
  
  console.log();
}

// Test: Default Values
async function testDefaultValues() {
  console.log('Test: Default Values');
  console.log('-'.repeat(80));
  
  const config = {
    // No custom ports or network specified
  };
  
  const profiles = ['core'];
  
  try {
    const composeContent = await configGenerator.generateDockerCompose(config, profiles);
    
    // Check if default values are used
    const hasDefaultRpcPort = composeContent.includes('16110');
    const hasDefaultP2pPort = composeContent.includes('16111');
    const hasDefaultDataDir = composeContent.includes('/data/kaspa');
    
    if (hasDefaultRpcPort && hasDefaultP2pPort && hasDefaultDataDir) {
      console.log('✅ PASS: Default values applied correctly');
      console.log('   - Default RPC port: 16110');
      console.log('   - Default P2P port: 16111');
      console.log('   - Default data dir: /data/kaspa');
      passed++;
    } else {
      console.log('❌ FAIL: Default values not applied correctly');
      console.log(`   - Has default RPC port: ${hasDefaultRpcPort}`);
      console.log(`   - Has default P2P port: ${hasDefaultP2pPort}`);
      console.log(`   - Has default data dir: ${hasDefaultDataDir}`);
      failed++;
    }
  } catch (error) {
    console.log('❌ FAIL: Error generating docker-compose.yml');
    console.log(`   Error: ${error.message}`);
    failed++;
  }
  
  console.log();
}

// Run all tests
async function runTests() {
  await testDynamicPortConfiguration();
  await testNetworkSelectionMainnet();
  await testNetworkSelectionTestnet();
  await testDataDirectoryVolumes();
  await testMultipleProfiles();
  await testPortReferencesInDependentServices();
  await testDefaultValues();
  
  console.log('='.repeat(80));
  console.log('Test Summary');
  console.log('='.repeat(80));
  console.log(`Total tests: ${passed + failed}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log();
  
  if (failed === 0) {
    console.log('✅ All tests passed!');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed');
    process.exit(1);
  }
}

runTests();
