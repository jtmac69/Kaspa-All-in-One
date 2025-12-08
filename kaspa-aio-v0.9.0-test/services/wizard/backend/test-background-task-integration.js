/**
 * Integration Test: Background Task Manager with WebSocket
 * 
 * Tests the integration of background task manager with Socket.IO
 * for real-time progress updates during wizard installation.
 * 
 * Note: This test uses a mock Socket.IO instance since socket.io-client
 * is not installed. For full WebSocket testing, install socket.io-client.
 */

const BackgroundTaskManager = require('./src/utils/background-task-manager');

// Mock Socket.IO for testing
class MockSocketIO {
  constructor() {
    this.events = [];
  }

  emit(event, data) {
    this.events.push({ event, data, timestamp: new Date().toISOString() });
  }

  getEvents(eventName = null) {
    if (eventName) {
      return this.events.filter(e => e.event === eventName);
    }
    return this.events;
  }

  clearEvents() {
    this.events = [];
  }
}

async function runIntegrationTests() {
  console.log('='.repeat(60));
  console.log('Background Task Manager - WebSocket Integration Tests');
  console.log('='.repeat(60));

  let testsPassed = 0;
  let testsFailed = 0;
  let mockIO;
  let taskManager;

  // Setup test environment
  console.log('\n--- Setup: Initialize Task Manager with Mock Socket.IO ---');
  try {
    mockIO = new MockSocketIO();
    taskManager = new BackgroundTaskManager(mockIO);

    console.log('✓ Task manager initialized with mock Socket.IO');
    testsPassed++;
  } catch (error) {
    console.error('✗ Failed to initialize:', error.message);
    testsFailed++;
    process.exit(1);
  }

  // Test 1: Register and monitor a task with WebSocket events
  console.log('\n--- Test 1: Register Task and Verify WebSocket Events ---');
  try {
    mockIO.clearEvents();

    // Register a task that completes quickly
    let checkCount = 0;
    const result = await taskManager.registerTask({
      id: 'test-task-1',
      type: 'database-migration',
      service: 'test-db',
      config: {},
      checkInterval: 1000, // Check every second
      statusChecker: async (task) => {
        checkCount++;
        const progress = Math.min(100, checkCount * 25);
        return {
          completed: progress >= 100,
          progress,
          metadata: {
            checkCount,
            message: `Test ${progress}% complete`
          }
        };
      }
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    // Start monitoring
    await taskManager.startMonitoring('test-task-1');

    // Wait for completion
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Verify events
    const startEvents = mockIO.getEvents('sync:start');
    const progressEvents = mockIO.getEvents('sync:progress');
    const completeEvents = mockIO.getEvents('sync:complete');

    console.log(`✓ Task registered and monitored`);
    console.log(`  - Start events: ${startEvents.length}`);
    console.log(`  - Progress events: ${progressEvents.length}`);
    console.log(`  - Complete events: ${completeEvents.length}`);

    if (startEvents.length > 0 && progressEvents.length > 0 && completeEvents.length > 0) {
      console.log('  - All expected events emitted ✓');
      testsPassed++;
    } else {
      throw new Error('Missing expected events');
    }
  } catch (error) {
    console.error('✗ Failed:', error.message);
    testsFailed++;
  }

  // Test 2: Register node sync task
  console.log('\n--- Test 2: Register Node Sync Task ---');
  try {
    const result = await taskManager.registerNodeSyncTask({
      service: 'kaspa-node',
      host: 'localhost',
      port: 16110,
      autoSwitch: true
    });

    if (result.success) {
      console.log('✓ Node sync task registered');
      console.log(`  - Task ID: ${result.taskId}`);
      console.log(`  - Service: ${result.task.service}`);
      console.log(`  - Type: ${result.task.type}`);
      console.log(`  - Auto-switch: ${result.task.config.autoSwitch}`);
      testsPassed++;
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('✗ Failed:', error.message);
    testsFailed++;
  }

  // Test 3: Get all tasks
  console.log('\n--- Test 3: Get All Tasks ---');
  try {
    const tasks = taskManager.getAllTasks();
    console.log('✓ Retrieved all tasks');
    console.log(`  - Total tasks: ${tasks.length}`);
    
    tasks.forEach((task, index) => {
      console.log(`  - Task ${index + 1}: ${task.id} (${task.type}, ${task.status})`);
    });
    
    if (tasks.length >= 2) {
      testsPassed++;
    } else {
      throw new Error('Expected at least 2 tasks');
    }
  } catch (error) {
    console.error('✗ Failed:', error.message);
    testsFailed++;
  }

  // Test 4: Monitor multiple tasks concurrently
  console.log('\n--- Test 4: Monitor Multiple Tasks Concurrently ---');
  try {
    mockIO.clearEvents();

    // Register multiple tasks
    const tasks = [];
    for (let i = 0; i < 3; i++) {
      let checkCount = 0;
      const result = await taskManager.registerTask({
        id: `concurrent-task-${i}`,
        type: 'indexer-sync',
        service: `indexer-${i}`,
        config: {},
        checkInterval: 1000,
        statusChecker: async (task) => {
          checkCount++;
          const progress = Math.min(100, checkCount * 20);
          return {
            completed: progress >= 100,
            progress,
            metadata: { checkCount }
          };
        }
      });

      if (result.success) {
        tasks.push(result.taskId);
        await taskManager.startMonitoring(result.taskId);
      }
    }

    // Wait for some progress
    await new Promise(resolve => setTimeout(resolve, 3000));

    const progressEvents = mockIO.getEvents('sync:progress');

    console.log('✓ Multiple tasks monitored concurrently');
    console.log(`  - Tasks registered: ${tasks.length}`);
    console.log(`  - Progress events received: ${progressEvents.length}`);

    if (tasks.length === 3 && progressEvents.length > 0) {
      testsPassed++;
    } else {
      throw new Error('Concurrent monitoring failed');
    }
  } catch (error) {
    console.error('✗ Failed:', error.message);
    testsFailed++;
  }

  // Test 5: Task cancellation
  console.log('\n--- Test 5: Task Cancellation ---');
  try {
    mockIO.clearEvents();

    // Register a long-running task
    const result = await taskManager.registerTask({
      id: 'task-to-cancel',
      type: 'database-migration',
      service: 'test-db',
      config: {},
      checkInterval: 1000,
      statusChecker: async () => ({
        completed: false,
        progress: 10,
        metadata: {}
      })
    });

    await taskManager.startMonitoring('task-to-cancel');
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Cancel the task
    const cancelResult = await taskManager.cancelTask('task-to-cancel');

    const cancelEvents = mockIO.getEvents('sync:cancelled');

    if (cancelResult.success && cancelEvents.length > 0) {
      console.log('✓ Task cancelled successfully');
      console.log(`  - Cancellation events: ${cancelEvents.length}`);
      testsPassed++;
    } else {
      throw new Error('Task cancellation failed');
    }
  } catch (error) {
    console.error('✗ Failed:', error.message);
    testsFailed++;
  }

  // Test 6: Error handling
  console.log('\n--- Test 6: Error Handling ---');
  try {
    mockIO.clearEvents();

    // Register a task that will error
    let checkCount = 0;
    const result = await taskManager.registerTask({
      id: 'error-task',
      type: 'database-migration',
      service: 'test-db',
      config: {},
      checkInterval: 1000,
      statusChecker: async () => {
        checkCount++;
        if (checkCount >= 2) {
          return {
            completed: false,
            progress: 20,
            error: 'Simulated error'
          };
        }
        return {
          completed: false,
          progress: 10,
          metadata: {}
        };
      }
    });

    await taskManager.startMonitoring('error-task');
    
    // Wait for error
    await new Promise(resolve => setTimeout(resolve, 3000));

    const errorEvents = mockIO.getEvents('sync:error');

    if (errorEvents.length > 0) {
      console.log('✓ Error handling works');
      console.log(`  - Error events: ${errorEvents.length}`);
      testsPassed++;
    } else {
      throw new Error('Expected error event');
    }
  } catch (error) {
    console.error('✗ Failed:', error.message);
    testsFailed++;
  }

  // Cleanup
  console.log('\n--- Cleanup ---');
  if (taskManager) {
    taskManager.shutdown();
    console.log('✓ Task manager shutdown');
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('Test Summary');
  console.log('='.repeat(60));
  console.log(`Total tests: ${testsPassed + testsFailed}`);
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);
  console.log(`Success rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
  
  if (testsFailed === 0) {
    console.log('\n✓ All integration tests passed!');
    process.exit(0);
  } else {
    console.log(`\n✗ ${testsFailed} test(s) failed`);
    process.exit(1);
  }
}

// Run tests
runIntegrationTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
