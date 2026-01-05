#!/usr/bin/env node

/**
 * Test script for complete reconfiguration workflow
 * Tests the complete flow: set wizardRunning -> reconfigure -> clear wizardRunning
 */

const path = require('path');

// Set up environment
process.env.PROJECT_ROOT = path.resolve(__dirname, '../../..');

const { SharedStateManager } = require('../../shared/lib/state-manager');
const { createResolver } = require('../../shared/lib/path-resolver');

async function testCompleteWorkflow() {
  console.log('🧪 Testing complete reconfiguration workflow...\n');
  
  try {
    const resolver = createResolver(__dirname);
    const paths = resolver.getPaths();
    const statePath = paths.installationState;
    const stateManager = new SharedStateManager(statePath);
    
    // Simulate the complete workflow as it would happen in the API
    console.log('1️⃣ Starting reconfiguration workflow...');
    
    // Step 1: Set wizardRunning flag (start of operation)
    console.log('   Setting wizardRunning flag to true...');
    await stateManager.updateState({ wizardRunning: true });
    
    let currentState = await stateManager.readState();
    if (!currentState || currentState.wizardRunning !== true) {
      console.log('   ❌ Failed to set wizardRunning flag');
      return false;
    }
    console.log('   ✅ wizardRunning flag set successfully');
    
    // Step 2: Simulate reconfiguration operation (add profile)
    console.log('\n2️⃣ Performing reconfiguration operation...');
    console.log('   Adding "mining" profile...');
    
    const updatedProfiles = [...currentState.profiles.selected];
    if (!updatedProfiles.includes('mining')) {
      updatedProfiles.push('mining');
    }
    
    await stateManager.updateState({
      profiles: {
        selected: updatedProfiles,
        count: updatedProfiles.length
      },
      configuration: {
        ...currentState.configuration,
        hasMining: true
      }
    });
    
    currentState = await stateManager.readState();
    if (!currentState.profiles.selected.includes('mining') || !currentState.configuration.hasMining) {
      console.log('   ❌ Failed to update configuration');
      return false;
    }
    console.log('   ✅ Configuration updated successfully');
    
    // Step 3: Clear wizardRunning flag (end of operation)
    console.log('\n3️⃣ Completing reconfiguration workflow...');
    console.log('   Clearing wizardRunning flag...');
    
    await stateManager.updateState({ wizardRunning: false });
    
    currentState = await stateManager.readState();
    if (currentState.wizardRunning !== false) {
      console.log('   ❌ Failed to clear wizardRunning flag');
      return false;
    }
    console.log('   ✅ wizardRunning flag cleared successfully');
    
    // Step 4: Verify final state
    console.log('\n4️⃣ Verifying final state...');
    
    const finalState = await stateManager.readState();
    const expectedConditions = [
      { condition: finalState.wizardRunning === false, description: 'wizardRunning is false' },
      { condition: finalState.profiles.selected.includes('mining'), description: 'mining profile is added' },
      { condition: finalState.configuration.hasMining === true, description: 'hasMining configuration is true' },
      { condition: finalState.lastModified !== null, description: 'lastModified timestamp is updated' }
    ];
    
    let allConditionsMet = true;
    for (const { condition, description } of expectedConditions) {
      if (condition) {
        console.log(`   ✅ ${description}`);
      } else {
        console.log(`   ❌ ${description}`);
        allConditionsMet = false;
      }
    }
    
    if (!allConditionsMet) {
      console.log('\n❌ Some final state conditions were not met');
      return false;
    }
    
    // Step 5: Test error handling workflow
    console.log('\n5️⃣ Testing error handling workflow...');
    
    // Simulate starting an operation
    await stateManager.updateState({ wizardRunning: true });
    
    // Simulate an error occurring (clear flag without completing operation)
    console.log('   Simulating error during operation...');
    await stateManager.updateState({ 
      wizardRunning: false,
      phase: 'error'
    });
    
    currentState = await stateManager.readState();
    if (currentState.wizardRunning !== false || currentState.phase !== 'error') {
      console.log('   ❌ Error handling workflow failed');
      return false;
    }
    console.log('   ✅ Error handling workflow works correctly');
    
    // Reset to complete state
    await stateManager.updateState({ phase: 'complete' });
    
    console.log('\n🎉 Complete reconfiguration workflow test passed!');
    console.log('\n📊 Final state summary:');
    console.log('   - Profiles:', finalState.profiles.selected.join(', '));
    console.log('   - Profile count:', finalState.profiles.count);
    console.log('   - Wizard running:', finalState.wizardRunning);
    console.log('   - Has mining:', finalState.configuration.hasMining);
    console.log('   - Phase:', finalState.phase);
    console.log('   - Last modified:', finalState.lastModified);
    
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

// Run tests
if (require.main === module) {
  testCompleteWorkflow().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = { testCompleteWorkflow };