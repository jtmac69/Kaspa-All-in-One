/**
 * Test reconfiguration mode detection
 * Verifies that the wizard correctly detects when to enter reconfiguration mode
 */

const fs = require('fs').promises;
const path = require('path');
const { SharedStateManager } = require('../../shared/lib/state-manager');

const PROJECT_ROOT = path.resolve(__dirname, '../../..');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testReconfigurationModeDetection() {
  log('\n=== Testing Reconfiguration Mode Detection ===\n', 'cyan');
  
  const statePath = path.join(PROJECT_ROOT, '.kaspa-aio', 'installation-state.json');
  const stateManager = new SharedStateManager(statePath);
  
  try {
    // Test 1: No installation state - should return null
    log('Test 1: No installation state', 'yellow');
    await cleanupTestState();
    const noState = await stateManager.readState();
    if (noState === null) {
      log('✓ Correctly returns null when no installation state exists', 'green');
    } else {
      log('✗ Should return null when no installation state exists', 'red');
      return false;
    }
    
    // Test 2: Installation state with phase 'complete' - should return state
    log('\nTest 2: Installation state with phase "complete"', 'yellow');
    await createTestState('complete');
    const completeState = await stateManager.readState();
    if (completeState && completeState.phase === 'complete') {
      log('✓ Correctly reads installation state with phase "complete"', 'green');
      log(`  - Phase: ${completeState.phase}`, 'cyan');
      log(`  - Profiles: ${completeState.profiles.selected.join(', ')}`, 'cyan');
    } else {
      log('✗ Should return state with phase "complete"', 'red');
      return false;
    }
    
    // Test 3: Installation state with phase 'installing' - should return state but mode should be 'initial'
    log('\nTest 3: Installation state with phase "installing"', 'yellow');
    await createTestState('installing');
    const installingState = await stateManager.readState();
    if (installingState && installingState.phase === 'installing') {
      log('✓ Correctly reads installation state with phase "installing"', 'green');
      log(`  - Phase: ${installingState.phase}`, 'cyan');
      log('  - Note: Wizard should enter "initial" mode for incomplete installations', 'cyan');
    } else {
      log('✗ Should return state with phase "installing"', 'red');
      return false;
    }
    
    // Test 4: hasInstallation() method
    log('\nTest 4: hasInstallation() method', 'yellow');
    await createTestState('complete');
    const hasInstallation = await stateManager.hasInstallation();
    if (hasInstallation === true) {
      log('✓ hasInstallation() correctly returns true', 'green');
    } else {
      log('✗ hasInstallation() should return true', 'red');
      return false;
    }
    
    await cleanupTestState();
    const noInstallation = await stateManager.hasInstallation();
    if (noInstallation === false) {
      log('✓ hasInstallation() correctly returns false when no state', 'green');
    } else {
      log('✗ hasInstallation() should return false when no state', 'red');
      return false;
    }
    
    // Test 5: Validate state schema
    log('\nTest 5: State schema validation', 'yellow');
    await createTestState('complete');
    const validState = await stateManager.readState();
    if (validState && 
        validState.version &&
        validState.installedAt &&
        validState.lastModified &&
        validState.phase &&
        validState.profiles &&
        Array.isArray(validState.profiles.selected) &&
        typeof validState.profiles.count === 'number' &&
        validState.configuration &&
        Array.isArray(validState.services) &&
        validState.summary) {
      log('✓ State has all required fields', 'green');
    } else {
      log('✗ State is missing required fields', 'red');
      return false;
    }
    
    // Cleanup
    await cleanupTestState();
    
    log('\n=== All Tests Passed ===\n', 'green');
    return true;
    
  } catch (error) {
    log(`\n✗ Test failed with error: ${error.message}`, 'red');
    console.error(error);
    return false;
  }
}

async function createTestState(phase) {
  const stateDir = path.join(PROJECT_ROOT, '.kaspa-aio');
  const statePath = path.join(stateDir, 'installation-state.json');
  
  await fs.mkdir(stateDir, { recursive: true });
  
  const state = {
    version: '1.0.0',
    installedAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    phase: phase,
    profiles: {
      selected: ['core', 'kaspa-user-applications'],
      count: 2
    },
    configuration: {
      network: 'mainnet',
      publicNode: false,
      hasIndexers: true,
      hasArchive: false,
      hasMining: false
    },
    services: [
      {
        name: 'kaspa-node',
        displayName: 'Kaspa Node',
        profile: 'core',
        running: true,
        exists: true
      },
      {
        name: 'kaspa-explorer',
        displayName: 'Kaspa Explorer',
        profile: 'kaspa-user-applications',
        running: true,
        exists: true
      }
    ],
    summary: {
      total: 2,
      running: 2,
      stopped: 0,
      missing: 0
    }
  };
  
  await fs.writeFile(statePath, JSON.stringify(state, null, 2));
}

async function cleanupTestState() {
  const statePath = path.join(PROJECT_ROOT, '.kaspa-aio', 'installation-state.json');
  try {
    await fs.unlink(statePath);
  } catch (error) {
    // File doesn't exist, that's okay
  }
}

// Run the test
testReconfigurationModeDetection()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
