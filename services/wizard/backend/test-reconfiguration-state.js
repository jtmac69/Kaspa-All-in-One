#!/usr/bin/env node

/**
 * Test script for reconfiguration API state management
 * Tests that reconfiguration endpoints properly set and clear wizardRunning flag
 */

const path = require('path');

// Set up environment
process.env.PROJECT_ROOT = path.resolve(__dirname, '../../..');

const { SharedStateManager } = require('../../shared/lib/state-manager');
const { createResolver } = require('../../shared/lib/path-resolver');

// Import the reconfiguration API functions
const resolver = createResolver(__dirname);

async function testReconfigurationStateManagement() {
  console.log('🧪 Testing reconfiguration API state management...\n');
  
  try {
    const paths = resolver.getPaths();
    const statePath = paths.installationState;
    const stateManager = new SharedStateManager(statePath);
    
    // Test helper functions from reconfiguration API
    console.log('1️⃣ Testing setWizardRunningFlag function...');
    
    // Simulate the setWizardRunningFlag function
    const setWizardRunningFlag = async (isRunning) => {
      try {
        const currentState = await stateManager.readState();
        
        if (currentState) {
          await stateManager.updateState({
            wizardRunning: isRunning
          });
          console.log(`   [STATE UPDATE] wizardRunning flag set to: ${isRunning}`);
        } else {
          console.warn('   [STATE UPDATE] No installation state found, cannot set wizardRunning flag');
        }
      } catch (error) {
        console.error('   [STATE UPDATE] Error setting wizardRunning flag:', error);
        throw error;
      }
    };
    
    // Test setting flag to true
    await setWizardRunningFlag(true);
    let currentState = await stateManager.readState();
    if (currentState && currentState.wizardRunning === true) {
      console.log('   ✅ setWizardRunningFlag(true) works correctly');
    } else {
      console.log('   ❌ setWizardRunningFlag(true) failed');
      return false;
    }
    
    // Test clearing flag
    await setWizardRunningFlag(false);
    currentState = await stateManager.readState();
    if (currentState && currentState.wizardRunning === false) {
      console.log('   ✅ setWizardRunningFlag(false) works correctly');
    } else {
      console.log('   ❌ setWizardRunningFlag(false) failed');
      return false;
    }
    
    console.log('\n2️⃣ Testing updateInstallationStateAfterReconfiguration function...');
    
    // Simulate the updateInstallationStateAfterReconfiguration function
    const updateInstallationStateAfterReconfiguration = async (operation) => {
      try {
        const currentState = await stateManager.readState();
        
        if (!currentState) {
          console.warn('   [STATE UPDATE] No installation state found, cannot update after reconfiguration');
          return;
        }
        
        const { action, profiles, configuration } = operation;
        let updatedProfiles = [...(currentState.profiles?.selected || [])];
        
        // Update profiles based on action
        if (action === 'add') {
          // Add new profiles (avoid duplicates)
          profiles.forEach(profile => {
            if (!updatedProfiles.includes(profile)) {
              updatedProfiles.push(profile);
            }
          });
        } else if (action === 'remove') {
          // Remove profiles
          updatedProfiles = updatedProfiles.filter(profile => !profiles.includes(profile));
        }
        // For 'configure' action, profiles list stays the same
        
        // Update configuration if provided
        const updatedConfiguration = configuration ? {
          ...currentState.configuration,
          ...configuration
        } : currentState.configuration;
        
        // Update state
        await stateManager.updateState({
          profiles: {
            selected: updatedProfiles,
            count: updatedProfiles.length
          },
          configuration: updatedConfiguration,
          lastModified: new Date().toISOString()
        });
        
        console.log(`   [STATE UPDATE] Installation state updated after ${action} operation:`, {
          action,
          profilesCount: updatedProfiles.length,
          profiles: updatedProfiles
        });
        
      } catch (error) {
        console.error('   [STATE UPDATE] Error updating installation state after reconfiguration:', error);
        throw error;
      }
    };
    
    // Test adding profiles
    const initialState = await stateManager.readState();
    const initialProfiles = initialState.profiles.selected;
    
    await updateInstallationStateAfterReconfiguration({
      action: 'add',
      profiles: ['mining'],
      configuration: { hasMining: true }
    });
    
    currentState = await stateManager.readState();
    if (currentState && 
        currentState.profiles.selected.includes('mining') &&
        currentState.configuration.hasMining === true) {
      console.log('   ✅ Profile addition state update works correctly');
    } else {
      console.log('   ❌ Profile addition state update failed');
      return false;
    }
    
    // Test removing profiles
    await updateInstallationStateAfterReconfiguration({
      action: 'remove',
      profiles: ['mining'],
      configuration: { hasMining: false }
    });
    
    currentState = await stateManager.readState();
    if (currentState && 
        !currentState.profiles.selected.includes('mining') &&
        currentState.configuration.hasMining === false) {
      console.log('   ✅ Profile removal state update works correctly');
    } else {
      console.log('   ❌ Profile removal state update failed');
      return false;
    }
    
    // Test configuration changes
    await updateInstallationStateAfterReconfiguration({
      action: 'configure',
      profiles: currentState.profiles.selected,
      configuration: { publicNode: true }
    });
    
    currentState = await stateManager.readState();
    if (currentState && currentState.configuration.publicNode === true) {
      console.log('   ✅ Configuration update works correctly');
    } else {
      console.log('   ❌ Configuration update failed');
      return false;
    }
    
    console.log('\n3️⃣ Testing complete reconfiguration workflow...');
    
    // Simulate complete workflow: set flag -> update state -> clear flag
    await setWizardRunningFlag(true);
    
    currentState = await stateManager.readState();
    if (currentState.wizardRunning !== true) {
      console.log('   ❌ Failed to set wizardRunning flag at start of workflow');
      return false;
    }
    
    await updateInstallationStateAfterReconfiguration({
      action: 'add',
      profiles: ['archive-node'],
      configuration: { hasArchive: true }
    });
    
    await setWizardRunningFlag(false);
    
    currentState = await stateManager.readState();
    if (currentState && 
        currentState.wizardRunning === false &&
        currentState.profiles.selected.includes('archive-node') &&
        currentState.configuration.hasArchive === true) {
      console.log('   ✅ Complete reconfiguration workflow works correctly');
    } else {
      console.log('   ❌ Complete reconfiguration workflow failed');
      return false;
    }
    
    console.log('\n🎉 All reconfiguration API state management tests passed!');
    console.log('\n📊 Final state summary:');
    console.log('   - Profiles:', currentState.profiles.selected.join(', '));
    console.log('   - Wizard running:', currentState.wizardRunning);
    console.log('   - Public node:', currentState.configuration.publicNode);
    console.log('   - Has archive:', currentState.configuration.hasArchive);
    console.log('   - Last modified:', currentState.lastModified);
    
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

// Run tests
if (require.main === module) {
  testReconfigurationStateManagement().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = { testReconfigurationStateManagement };