/**
 * Test Resume Installation Functionality
 * Tests the complete resume workflow including state persistence and API endpoints
 */

const StateManager = require('./src/utils/state-manager');
const BackgroundTaskManager = require('./src/utils/background-task-manager');

// Test configuration
const TEST_TIMEOUT = 5000;

async function runTests() {
  console.log('=== Resume Installation Functionality Tests ===\n');
  
  const stateManager = new StateManager();
  const taskManager = new BackgroundTaskManager();
  
  try {
    // Test 1: Create resumable state
    console.log('Testing: Create resumable installation state');
    const initialState = stateManager.createInitialState();
    initialState.currentStep = 4; // Profile selection
    initialState.phase = 'preparing';
    initialState.profiles = {
      selected: ['core', 'kaspa-user-applications'],
      configuration: {
        KASPA_NODE_P2P_PORT: 16111,
        KASPA_NODE_RPC_PORT: 16110
      }
    };
    initialState.resumable = true;
    
    const saveResult = await stateManager.saveState(initialState);
    if (!saveResult.success) {
      throw new Error('Failed to save initial state');
    }
    console.log('✓ Resumable state created');
    console.log(`  - Step: ${initialState.currentStep}`);
    console.log(`  - Phase: ${initialState.phase}`);
    console.log(`  - Profiles: ${initialState.profiles.selected.join(', ')}`);
    console.log('');
    
    // Test 2: Check if can resume
    console.log('Testing: Check if wizard can be resumed');
    const canResumeResult = await stateManager.canResume();
    if (!canResumeResult.canResume) {
      throw new Error(`Cannot resume: ${canResumeResult.reason}`);
    }
    console.log('✓ Wizard can be resumed');
    console.log(`  - Last activity: ${canResumeResult.lastActivity}`);
    console.log(`  - Hours since activity: ${canResumeResult.hoursSinceActivity}`);
    console.log(`  - Current step: ${canResumeResult.currentStep}`);
    console.log(`  - Phase: ${canResumeResult.phase}`);
    console.log('');
    
    // Test 3: Add background tasks
    console.log('Testing: Add background tasks to state');
    const taskResult = await taskManager.registerTask({
      id: 'test-node-sync',
      type: 'node-sync',
      service: 'kaspa-node',
      config: {
        host: 'localhost',
        port: 16110
      }
    });
    
    if (!taskResult.success) {
      throw new Error('Failed to register background task');
    }
    console.log('✓ Background task registered');
    console.log(`  - Task ID: ${taskResult.taskId}`);
    console.log(`  - Type: ${taskResult.task.type}`);
    console.log(`  - Service: ${taskResult.task.service}`);
    console.log('');
    
    // Test 4: Verify state includes background tasks
    console.log('Testing: Verify state includes background tasks');
    const loadResult = await stateManager.loadState();
    if (!loadResult.success) {
      throw new Error('Failed to load state');
    }
    
    const state = loadResult.state;
    if (!state.backgroundTasks || state.backgroundTasks.length === 0) {
      throw new Error('Background tasks not found in state');
    }
    console.log('✓ Background tasks found in state');
    console.log(`  - Task count: ${state.backgroundTasks.length}`);
    console.log(`  - Tasks: ${state.backgroundTasks.join(', ')}`);
    console.log('');
    
    // Test 5: Update service status
    console.log('Testing: Update service status');
    const serviceUpdateResult = await stateManager.updateServiceStatus(
      'kaspa-node',
      'syncing',
      {
        containerId: 'test-container-123',
        syncProgress: 45.5
      }
    );
    
    if (!serviceUpdateResult.success) {
      throw new Error('Failed to update service status');
    }
    console.log('✓ Service status updated');
    console.log('');
    
    // Test 6: Verify resume info structure
    console.log('Testing: Verify resume info structure');
    const resumeInfo = await stateManager.canResume();
    
    const requiredFields = ['canResume', 'state', 'lastActivity', 'currentStep', 'phase', 'backgroundTasks'];
    const missingFields = requiredFields.filter(field => !(field in resumeInfo));
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
    console.log('✓ Resume info has all required fields');
    console.log(`  - Can resume: ${resumeInfo.canResume}`);
    console.log(`  - Current step: ${resumeInfo.currentStep}`);
    console.log(`  - Phase: ${resumeInfo.phase}`);
    console.log(`  - Background tasks: ${resumeInfo.backgroundTasks.length}`);
    console.log('');
    
    // Test 7: Test state summary
    console.log('Testing: Get state summary');
    const summaryResult = await stateManager.getStateSummary();
    
    if (!summaryResult.success) {
      throw new Error('Failed to get state summary');
    }
    console.log('✓ State summary retrieved');
    console.log(`  - Installation ID: ${summaryResult.summary.installationId}`);
    console.log(`  - Current step: ${summaryResult.summary.currentStep}`);
    console.log(`  - Phase: ${summaryResult.summary.phase}`);
    console.log(`  - Profiles: ${summaryResult.summary.profiles.join(', ')}`);
    console.log(`  - Services: ${summaryResult.summary.servicesCount}`);
    console.log(`  - Background tasks: ${summaryResult.summary.backgroundTasksCount}`);
    console.log('');
    
    // Test 8: Test non-resumable state (completed installation)
    console.log('Testing: Mark installation as complete (non-resumable)');
    const completeResult = await stateManager.markComplete();
    
    if (!completeResult.success) {
      throw new Error('Failed to mark installation as complete');
    }
    console.log('✓ Installation marked as complete');
    console.log('');
    
    console.log('Testing: Verify cannot resume completed installation');
    const cannotResumeResult = await stateManager.canResume();
    
    if (cannotResumeResult.canResume) {
      throw new Error('Should not be able to resume completed installation');
    }
    console.log('✓ Cannot resume completed installation');
    console.log(`  - Reason: ${cannotResumeResult.reason}`);
    console.log('');
    
    // Test 9: Clear state
    console.log('Testing: Clear wizard state');
    const clearResult = await stateManager.clearState();
    
    if (!clearResult.success) {
      throw new Error('Failed to clear state');
    }
    console.log('✓ State cleared successfully');
    console.log('');
    
    // Test 10: Verify state is cleared
    console.log('Testing: Verify state is cleared');
    const afterClearResult = await stateManager.canResume();
    
    if (afterClearResult.canResume) {
      throw new Error('State should not be resumable after clearing');
    }
    console.log('✓ State is not resumable after clearing');
    console.log(`  - Reason: ${afterClearResult.reason}`);
    console.log('');
    
    // Cleanup
    taskManager.shutdown();
    
    console.log('=== All Resume Functionality Tests Passed ===\n');
    process.exit(0);
    
  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    console.error(error.stack);
    
    // Cleanup
    taskManager.shutdown();
    
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
