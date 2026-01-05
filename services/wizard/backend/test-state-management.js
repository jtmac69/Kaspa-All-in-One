#!/usr/bin/env node

/**
 * Test script for wizardRunning flag state management
 * Tests setting and clearing the wizardRunning flag during reconfiguration operations
 */

const path = require('path');

// Set up environment
process.env.PROJECT_ROOT = path.resolve(__dirname, '../../..');

const { SharedStateManager } = require('../../shared/lib/state-manager');
const { createResolver } = require('../../shared/lib/path-resolver');

async function testStateManagement() {
  console.log('🧪 Testing wizardRunning flag state management...\n');
  
  try {
    // Initialize path resolver and state manager
    const resolver = createResolver(__dirname);
    const paths = resolver.getPaths();
    const statePath = paths.installationState;
    
    console.log('📁 State file path:', statePath);
    
    const stateManager = new SharedStateManager(statePath);
    
    // Test 1: Create initial state if it doesn't exist
    console.log('\n1️⃣ Testing initial state creation...');
    let currentState = await stateManager.readState();
    
    if (!currentState) {
      console.log('   No existing state found, creating initial state...');
      const initialState = {
        version: '1.0.0',
        installedAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        phase: 'complete',
        profiles: {
          selected: ['core'],
          count: 1
        },
        configuration: {
          network: 'mainnet',
          publicNode: false,
          hasIndexers: false,
          hasArchive: false,
          hasMining: false
        },
        services: [
          {
            name: 'kaspa-node',
            running: true,
            exists: true
          }
        ],
        summary: {
          total: 1,
          running: 1,
          stopped: 0,
          missing: 0
        },
        wizardRunning: false
      };
      
      await stateManager.writeState(initialState);
      console.log('   ✅ Initial state created successfully');
    } else {
      console.log('   ✅ Existing state found');
    }
    
    // Test 2: Set wizardRunning flag to true
    console.log('\n2️⃣ Testing wizardRunning flag set to true...');
    await stateManager.updateState({ wizardRunning: true });
    
    currentState = await stateManager.readState();
    if (currentState && currentState.wizardRunning === true) {
      console.log('   ✅ wizardRunning flag set to true successfully');
    } else {
      console.log('   ❌ Failed to set wizardRunning flag to true');
      return false;
    }
    
    // Test 3: Simulate reconfiguration operation
    console.log('\n3️⃣ Testing reconfiguration state update...');
    await stateManager.updateState({
      profiles: {
        selected: ['core', 'indexer-services'],
        count: 2
      },
      configuration: {
        network: 'mainnet',
        publicNode: false,
        hasIndexers: true,
        hasArchive: false,
        hasMining: false
      }
    });
    
    currentState = await stateManager.readState();
    if (currentState && currentState.profiles.count === 2 && currentState.configuration.hasIndexers === true) {
      console.log('   ✅ Reconfiguration state updated successfully');
    } else {
      console.log('   ❌ Failed to update reconfiguration state');
      return false;
    }
    
    // Test 4: Clear wizardRunning flag
    console.log('\n4️⃣ Testing wizardRunning flag cleared...');
    await stateManager.updateState({ wizardRunning: false });
    
    currentState = await stateManager.readState();
    if (currentState && currentState.wizardRunning === false) {
      console.log('   ✅ wizardRunning flag cleared successfully');
    } else {
      console.log('   ❌ Failed to clear wizardRunning flag');
      return false;
    }
    
    // Test 5: Verify state persistence
    console.log('\n5️⃣ Testing state persistence...');
    const newStateManager = new SharedStateManager(statePath);
    const persistedState = await newStateManager.readState();
    
    if (persistedState && 
        persistedState.wizardRunning === false && 
        persistedState.profiles.count === 2 &&
        persistedState.configuration.hasIndexers === true) {
      console.log('   ✅ State persisted correctly across manager instances');
    } else {
      console.log('   ❌ State not persisted correctly');
      return false;
    }
    
    console.log('\n🎉 All wizardRunning flag state management tests passed!');
    console.log('\n📊 Final state summary:');
    console.log('   - Profiles:', persistedState.profiles.selected.join(', '));
    console.log('   - Wizard running:', persistedState.wizardRunning);
    console.log('   - Has indexers:', persistedState.configuration.hasIndexers);
    console.log('   - Last modified:', persistedState.lastModified);
    
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

// Run tests
if (require.main === module) {
  testStateManagement().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = { testStateManagement };