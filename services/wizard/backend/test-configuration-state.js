/**
 * Test Configuration State Management (Task 3)
 * 
 * Tests for:
 * - Task 3.1: Extended configuration state model
 * - Task 3.2: Configuration save/load
 * - Task 3.3: Configuration backup on changes
 */

const ConfigGenerator = require('./src/utils/config-generator');
const StateManager = require('./src/utils/state-manager');
const fs = require('fs').promises;
const path = require('path');

// Test configuration
const TEST_DIR = path.join(__dirname, 'test-temp-config-state');
const TEST_ENV_PATH = path.join(TEST_DIR, '.env');
const TEST_CONFIG_PATH = path.join(TEST_DIR, 'installation-config.json');
const TEST_BACKUP_DIR = path.join(TEST_DIR, '.kaspa-backups');

async function setup() {
  // Create test directory
  await fs.mkdir(TEST_DIR, { recursive: true });
  console.log('✓ Test directory created');
}

async function cleanup() {
  // Remove test directory
  try {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
    console.log('✓ Test directory cleaned up');
  } catch (error) {
    console.error('Warning: Failed to cleanup test directory:', error.message);
  }
}

async function testTask31_ExtendedStateModel() {
  console.log('\n=== Task 3.1: Extended Configuration State Model ===\n');
  
  const stateManager = new StateManager();
  const initialState = stateManager.createInitialState();
  
  // Test 1: Verify new fields exist in initial state
  console.log('Test 1: Verify new configuration fields in initial state');
  const requiredFields = [
    'KASPA_NODE_RPC_PORT',
    'KASPA_NODE_P2P_PORT',
    'KASPA_NETWORK',
    'KASPA_DATA_DIR',
    'KASPA_ARCHIVE_DATA_DIR',
    'TIMESCALEDB_DATA_DIR'
  ];
  
  let allFieldsPresent = true;
  for (const field of requiredFields) {
    if (!(field in initialState.profiles.configuration)) {
      console.error(`  ✗ Missing field: ${field}`);
      allFieldsPresent = false;
    }
  }
  
  if (allFieldsPresent) {
    console.log('  ✓ All new configuration fields present');
  }
  
  // Test 2: Verify default values
  console.log('\nTest 2: Verify default values');
  const expectedDefaults = {
    KASPA_NODE_RPC_PORT: 16110,
    KASPA_NODE_P2P_PORT: 16111,
    KASPA_NETWORK: 'mainnet',
    KASPA_DATA_DIR: '/data/kaspa',
    KASPA_ARCHIVE_DATA_DIR: '/data/kaspa-archive',
    TIMESCALEDB_DATA_DIR: '/data/timescaledb'
  };
  
  let allDefaultsCorrect = true;
  for (const [field, expectedValue] of Object.entries(expectedDefaults)) {
    const actualValue = initialState.profiles.configuration[field];
    if (actualValue !== expectedValue) {
      console.error(`  ✗ ${field}: expected ${expectedValue}, got ${actualValue}`);
      allDefaultsCorrect = false;
    }
  }
  
  if (allDefaultsCorrect) {
    console.log('  ✓ All default values correct');
  }
  
  // Test 3: Verify ConfigGenerator schema includes new fields
  console.log('\nTest 3: Verify ConfigGenerator schema validation');
  const configGenerator = new ConfigGenerator();
  
  const testConfig = {
    KASPA_NODE_RPC_PORT: 16210,
    KASPA_NODE_P2P_PORT: 16211,
    KASPA_NETWORK: 'testnet',
    KASPA_DATA_DIR: '/custom/data/kaspa',
    POSTGRES_PASSWORD: 'test-password-12345678'
  };
  
  const validation = await configGenerator.validateConfig(testConfig);
  
  if (validation.valid) {
    console.log('  ✓ New fields validated successfully');
    console.log(`    - KASPA_NODE_RPC_PORT: ${validation.config.KASPA_NODE_RPC_PORT}`);
    console.log(`    - KASPA_NODE_P2P_PORT: ${validation.config.KASPA_NODE_P2P_PORT}`);
    console.log(`    - KASPA_NETWORK: ${validation.config.KASPA_NETWORK}`);
  } else {
    console.error('  ✗ Validation failed:', validation.errors);
  }
  
  // Test 4: Test backward compatibility
  console.log('\nTest 4: Test backward compatibility with legacy field names');
  const legacyConfig = {
    KASPA_RPC_PORT: 16110,
    KASPA_P2P_PORT: 16111,
    POSTGRES_PASSWORD: 'test-password-12345678'
  };
  
  const legacyValidation = await configGenerator.validateConfig(legacyConfig);
  
  if (legacyValidation.valid) {
    console.log('  ✓ Legacy field names still work');
    console.log(`    - KASPA_RPC_PORT mapped to: ${legacyValidation.config.KASPA_RPC_PORT}`);
    console.log(`    - KASPA_P2P_PORT mapped to: ${legacyValidation.config.KASPA_P2P_PORT}`);
  } else {
    console.error('  ✗ Legacy validation failed:', legacyValidation.errors);
  }
}

async function testTask32_SaveLoad() {
  console.log('\n=== Task 3.2: Configuration Save/Load ===\n');
  
  const configGenerator = new ConfigGenerator();
  
  // Test 1: Save configuration to both .env and installation-config.json
  console.log('Test 1: Save configuration to .env and installation-config.json');
  
  const testConfig = {
    KASPA_NODE_RPC_PORT: 16210,
    KASPA_NODE_P2P_PORT: 16211,
    KASPA_NETWORK: 'testnet',
    KASPA_DATA_DIR: '/custom/data/kaspa',
    PUBLIC_NODE: true,
    EXTERNAL_IP: '192.168.1.100',
    POSTGRES_USER: 'kaspa',
    POSTGRES_PASSWORD: 'secure-password-123456',
    POSTGRES_DB: 'kaspa_explorer',
    POSTGRES_PORT: 5432,
    TIMESCALEDB_DATA_DIR: '/custom/data/timescaledb'
  };
  
  const testProfiles = ['core', 'indexer-services'];
  
  // Generate and save .env
  const envContent = await configGenerator.generateEnvFile(testConfig, testProfiles);
  const envResult = await configGenerator.saveEnvFile(envContent, TEST_ENV_PATH);
  
  if (envResult.success) {
    console.log('  ✓ .env file saved successfully');
  } else {
    console.error('  ✗ Failed to save .env:', envResult.error);
  }
  
  // Save installation-config.json
  const configResult = await configGenerator.saveInstallationConfig(testConfig, testProfiles, TEST_CONFIG_PATH);
  
  if (configResult.success) {
    console.log('  ✓ installation-config.json saved successfully');
  } else {
    console.error('  ✗ Failed to save installation-config.json:', configResult.error);
  }
  
  // Test 2: Verify .env contains new fields
  console.log('\nTest 2: Verify .env file contains new configuration fields');
  
  const envFileContent = await fs.readFile(TEST_ENV_PATH, 'utf8');
  const requiredEnvFields = [
    'KASPA_NODE_RPC_PORT=16210',
    'KASPA_NODE_P2P_PORT=16211',
    'KASPA_NETWORK=testnet',
    'KASPA_DATA_DIR=/custom/data/kaspa',
    'TIMESCALEDB_DATA_DIR=/custom/data/timescaledb'
  ];
  
  let allFieldsInEnv = true;
  for (const field of requiredEnvFields) {
    if (!envFileContent.includes(field)) {
      console.error(`  ✗ Missing in .env: ${field}`);
      allFieldsInEnv = false;
    }
  }
  
  if (allFieldsInEnv) {
    console.log('  ✓ All new fields present in .env file');
  }
  
  // Test 3: Load from installation-config.json
  console.log('\nTest 3: Load configuration from installation-config.json');
  
  const loadedConfig = await configGenerator.loadInstallationConfig(TEST_CONFIG_PATH);
  
  if (loadedConfig.success) {
    console.log('  ✓ Configuration loaded successfully');
    console.log(`    - Profiles: ${loadedConfig.profiles.join(', ')}`);
    console.log(`    - KASPA_NODE_RPC_PORT: ${loadedConfig.configuration.KASPA_NODE_RPC_PORT}`);
    console.log(`    - KASPA_NETWORK: ${loadedConfig.configuration.KASPA_NETWORK}`);
    console.log(`    - Timestamp: ${loadedConfig.timestamp}`);
  } else {
    console.error('  ✗ Failed to load configuration:', loadedConfig.error);
  }
  
  // Test 4: Load from .env (backward compatibility)
  console.log('\nTest 4: Load configuration from .env file');
  
  const envLoaded = await configGenerator.loadEnvFile(TEST_ENV_PATH);
  
  if (envLoaded.success) {
    console.log('  ✓ .env loaded successfully');
    console.log(`    - KASPA_NODE_RPC_PORT: ${envLoaded.config.KASPA_NODE_RPC_PORT}`);
    console.log(`    - KASPA_NETWORK: ${envLoaded.config.KASPA_NETWORK}`);
    console.log(`    - Backward compatibility mapping applied: ${envLoaded.config.KASPA_NODE_RPC_PORT ? 'Yes' : 'No'}`);
  } else {
    console.error('  ✗ Failed to load .env:', envLoaded.error);
  }
  
  // Test 5: Load complete configuration (prioritizes installation-config.json)
  console.log('\nTest 5: Load complete configuration (prioritization test)');
  
  const completeConfig = await configGenerator.loadCompleteConfiguration(TEST_ENV_PATH, TEST_CONFIG_PATH);
  
  if (completeConfig.success) {
    console.log('  ✓ Complete configuration loaded');
    console.log(`    - Source: ${completeConfig.source}`);
    console.log(`    - Profiles: ${completeConfig.profiles.join(', ')}`);
    
    if (completeConfig.source === 'installation-config.json') {
      console.log('  ✓ Correctly prioritized installation-config.json over .env');
    }
  } else {
    console.error('  ✗ Failed to load complete configuration:', completeConfig.error);
  }
  
  // Test 6: Pre-populate form fields (reconfiguration mode)
  console.log('\nTest 6: Pre-populate form fields for reconfiguration');
  
  if (completeConfig.success) {
    const formData = completeConfig.configuration;
    console.log('  ✓ Form data ready for pre-population:');
    console.log(`    - KASPA_NODE_RPC_PORT: ${formData.KASPA_NODE_RPC_PORT}`);
    console.log(`    - KASPA_NODE_P2P_PORT: ${formData.KASPA_NODE_P2P_PORT}`);
    console.log(`    - KASPA_NETWORK: ${formData.KASPA_NETWORK}`);
    console.log(`    - PUBLIC_NODE: ${formData.PUBLIC_NODE}`);
  }
}

async function testTask33_Backup() {
  console.log('\n=== Task 3.3: Configuration Backup on Changes ===\n');
  
  const configGenerator = new ConfigGenerator();
  
  // Setup: Create initial configuration files
  console.log('Setup: Creating initial configuration files');
  
  const initialConfig = {
    KASPA_NODE_RPC_PORT: 16110,
    KASPA_NODE_P2P_PORT: 16111,
    KASPA_NETWORK: 'mainnet',
    POSTGRES_PASSWORD: 'initial-password-123456'
  };
  
  const profiles = ['core'];
  
  const envContent = await configGenerator.generateEnvFile(initialConfig, profiles);
  await configGenerator.saveEnvFile(envContent, TEST_ENV_PATH);
  await configGenerator.saveInstallationConfig(initialConfig, profiles, TEST_CONFIG_PATH);
  
  console.log('  ✓ Initial configuration files created');
  
  // Test 1: Create backup
  console.log('\nTest 1: Create timestamped backup');
  
  const backupResult = await configGenerator.createConfigurationBackup(
    TEST_ENV_PATH,
    TEST_CONFIG_PATH,
    TEST_BACKUP_DIR
  );
  
  if (backupResult.success) {
    console.log('  ✓ Backup created successfully');
    console.log(`    - Timestamp: ${backupResult.backup.timestamp}`);
    console.log(`    - Date: ${backupResult.backup.date}`);
    console.log(`    - Backup directory: ${backupResult.backup.backupDir}`);
    
    for (const file of backupResult.backup.files) {
      if (file.success) {
        console.log(`    - Backed up: ${path.basename(file.original)} → ${path.basename(file.backup)}`);
      } else {
        console.log(`    - Skipped: ${path.basename(file.original)} (${file.error})`);
      }
    }
  } else {
    console.error('  ✗ Backup failed:', backupResult.error);
  }
  
  // Test 2: Modify configuration and create another backup
  console.log('\nTest 2: Create second backup after configuration change');
  
  // Wait a moment to ensure different timestamp
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const modifiedConfig = {
    ...initialConfig,
    KASPA_NODE_RPC_PORT: 16210,
    KASPA_NETWORK: 'testnet'
  };
  
  const modifiedEnvContent = await configGenerator.generateEnvFile(modifiedConfig, profiles);
  await configGenerator.saveEnvFile(modifiedEnvContent, TEST_ENV_PATH);
  await configGenerator.saveInstallationConfig(modifiedConfig, profiles, TEST_CONFIG_PATH);
  
  const secondBackup = await configGenerator.createConfigurationBackup(
    TEST_ENV_PATH,
    TEST_CONFIG_PATH,
    TEST_BACKUP_DIR
  );
  
  if (secondBackup.success) {
    console.log('  ✓ Second backup created successfully');
    console.log(`    - Timestamp: ${secondBackup.backup.timestamp}`);
  } else {
    console.error('  ✗ Second backup failed:', secondBackup.error);
  }
  
  // Test 3: List backups
  console.log('\nTest 3: List available backups');
  
  const backupList = await configGenerator.listConfigurationBackups(TEST_BACKUP_DIR);
  
  if (backupList.success) {
    console.log(`  ✓ Found ${backupList.backups.length} backup(s)`);
    
    for (const backup of backupList.backups) {
      console.log(`    - Backup from ${backup.date}`);
      console.log(`      Timestamp: ${backup.timestamp}`);
      console.log(`      Files: ${backup.files.map(f => f.type).join(', ')}`);
    }
  } else {
    console.error('  ✗ Failed to list backups:', backupList.error);
  }
  
  // Test 4: Restore from backup
  console.log('\nTest 4: Restore configuration from first backup');
  
  if (backupList.success && backupList.backups.length > 0) {
    // Get the oldest backup (first one created)
    const oldestBackup = backupList.backups[backupList.backups.length - 1];
    
    const restoreResult = await configGenerator.restoreConfigurationBackup(
      oldestBackup.timestamp,
      TEST_BACKUP_DIR,
      TEST_ENV_PATH,
      TEST_CONFIG_PATH
    );
    
    if (restoreResult.success) {
      console.log('  ✓ Configuration restored successfully');
      
      for (const file of restoreResult.results.restored) {
        if (file.success) {
          console.log(`    - Restored: ${file.type}`);
        } else {
          console.log(`    - Failed to restore ${file.type}: ${file.error}`);
        }
      }
      
      // Verify restored values
      const restoredConfig = await configGenerator.loadInstallationConfig(TEST_CONFIG_PATH);
      
      if (restoredConfig.success) {
        console.log('\n  Verification of restored configuration:');
        console.log(`    - KASPA_NODE_RPC_PORT: ${restoredConfig.configuration.KASPA_NODE_RPC_PORT} (should be 16110)`);
        console.log(`    - KASPA_NETWORK: ${restoredConfig.configuration.KASPA_NETWORK} (should be mainnet)`);
        
        if (restoredConfig.configuration.KASPA_NODE_RPC_PORT === 16110 &&
            restoredConfig.configuration.KASPA_NETWORK === 'mainnet') {
          console.log('  ✓ Restored configuration values are correct');
        } else {
          console.error('  ✗ Restored configuration values do not match original');
        }
      }
    } else {
      console.error('  ✗ Restore failed:', restoreResult.error);
    }
  }
  
  // Test 5: Verify backup cleanup (create many backups)
  console.log('\nTest 5: Verify backup cleanup (keeping last 10)');
  
  // Create 12 backups
  for (let i = 0; i < 12; i++) {
    await new Promise(resolve => setTimeout(resolve, 10));
    await configGenerator.createConfigurationBackup(
      TEST_ENV_PATH,
      TEST_CONFIG_PATH,
      TEST_BACKUP_DIR
    );
  }
  
  const finalBackupList = await configGenerator.listConfigurationBackups(TEST_BACKUP_DIR);
  
  if (finalBackupList.success) {
    console.log(`  ✓ Backup count after cleanup: ${finalBackupList.backups.length}`);
    
    if (finalBackupList.backups.length <= 10) {
      console.log('  ✓ Backup cleanup working correctly (kept last 10)');
    } else {
      console.error(`  ✗ Too many backups kept: ${finalBackupList.backups.length} (expected ≤ 10)`);
    }
  }
}

async function runTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Configuration State Management Tests (Task 3)             ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  try {
    await setup();
    
    await testTask31_ExtendedStateModel();
    await testTask32_SaveLoad();
    await testTask33_Backup();
    
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  All Tests Completed                                       ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
  } catch (error) {
    console.error('\n✗ Test suite failed with error:', error);
    console.error(error.stack);
  } finally {
    await cleanup();
  }
}

// Run tests
runTests();
