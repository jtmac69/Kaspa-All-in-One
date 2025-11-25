/**
 * Test: Background Task Manager
 * 
 * Tests the background task management system for monitoring node sync,
 * indexer operations, and other long-running tasks.
 */

const BackgroundTaskManager = require('./src/utils/background-task-manager');
const NodeSyncManager = require('./src/utils/node-sync-manager');
const StateManager = require('./src/utils/state-manager');

// Mock Socket.IO
class MockSocketIO {
  constructor() {
    this.events = [];
  }

  emit(event, data) {
    this.events.push({ event, data, timestamp: new Date().toISOString() });
    console.log(`[WebSocket] ${event}:`, JSON.stringify(data, null, 2));
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

async function runTests() {
  console.log('='.repeat(60));
  console.log('Background Task Manager Tests');
  console.log('='.repeat(60));

  const mockIO = new MockSocketIO();
  const taskManager = new BackgroundTaskManager(mockIO);
  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Initialize task manager
  console.log('\n--- Test 1: Initialize Task Manager ---');
  try {
    console.log('✓ Task manager initialized');
    console.log(`  - Default check interval: ${taskManager.defaultCheckInterval}ms`);
    console.log(`  - Active tasks: ${taskManager.getAllTasks().length}`);
    testsPassed++;
  } catch (error) {
    console.error('✗ Failed:', error.message);
    testsFailed++;
  }

  // Test 2: Register a node sync task
  console.log('\n--- Test 2: Register Node Sync Task ---');
  try {
    const result = await taskManager.registerNodeSyncTask({
      service: 'kaspa-node',
      host: 'localhost',
      port: 16110,
      autoSwitch: true,
      onComplete: async (task, status) => {
        console.log(`[Callback] Task ${task.id} completed!`);
      }
    });

    if (result.success) {
      console.log('✓ Node sync task registered');
      console.log(`  - Task ID: ${result.taskId}`);
      console.log(`  - Service: ${result.task.service}`);
      console.log(`  - Type: ${result.task.type}`);
      testsPassed++;
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('✗ Failed:', error.message);
    testsFailed++;
  }

  // Test 3: Register a custom task
  console.log('\n--- Test 3: Register Custom Task ---');
  try {
    let checkCount = 0;
    const customTaskId = 'custom-task-test';
    
    const result = await taskManager.registerTask({
      id: customTaskId,
      type: 'database-migration',
      service: 'postgres',
      config: {
        database: 'test_db'
      },
      checkInterval: 5000,
      statusChecker: async (task) => {
        checkCount++;
        const progress = Math.min(100, checkCount * 20);
        return {
          completed: progress >= 100,
          progress,
          metadata: {
            checkCount,
            message: `Migration ${progress}% complete`
          }
        };
      },
      onComplete: async (task) => {
        console.log(`[Callback] Custom task completed after ${checkCount} checks`);
      }
    });

    if (result.success) {
      console.log('✓ Custom task registered');
      console.log(`  - Task ID: ${result.taskId}`);
      console.log(`  - Type: ${result.task.type}`);
      console.log(`  - Check interval: ${result.task.checkInterval}ms`);
      testsPassed++;
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('✗ Failed:', error.message);
    testsFailed++;
  }

  // Test 4: Get all tasks
  console.log('\n--- Test 4: Get All Tasks ---');
  try {
    const tasks = taskManager.getAllTasks();
    console.log('✓ Retrieved all tasks');
    console.log(`  - Total tasks: ${tasks.length}`);
    
    tasks.forEach((task, index) => {
      console.log(`  - Task ${index + 1}: ${task.id} (${task.type}, ${task.status})`);
    });
    
    testsPassed++;
  } catch (error) {
    console.error('✗ Failed:', error.message);
    testsFailed++;
  }

  // Test 5: Get tasks by type
  console.log('\n--- Test 5: Get Tasks by Type ---');
  try {
    const nodeSyncTasks = taskManager.getTasksByType('node-sync');
    const dbMigrationTasks = taskManager.getTasksByType('database-migration');
    
    console.log('✓ Retrieved tasks by type');
    console.log(`  - Node sync tasks: ${nodeSyncTasks.length}`);
    console.log(`  - Database migration tasks: ${dbMigrationTasks.length}`);
    
    testsPassed++;
  } catch (error) {
    console.error('✗ Failed:', error.message);
    testsFailed++;
  }

  // Test 6: Start monitoring a task
  console.log('\n--- Test 6: Start Monitoring Task ---');
  try {
    const customTaskId = 'custom-task-test';
    const result = await taskManager.startMonitoring(customTaskId);

    if (result.success) {
      console.log('✓ Started monitoring task');
      console.log(`  - Task ID: ${result.taskId}`);
      console.log(`  - Check interval: ${result.checkInterval}ms`);
      
      // Wait for a few checks
      console.log('  - Waiting for 3 status checks...');
      await new Promise(resolve => setTimeout(resolve, 16000)); // Wait 16 seconds for 3 checks
      
      const task = taskManager.getTask(customTaskId);
      console.log(`  - Task status: ${task.status}`);
      console.log(`  - Task progress: ${task.progress}%`);
      console.log(`  - Last checked: ${task.lastChecked}`);
      
      testsPassed++;
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('✗ Failed:', error.message);
    testsFailed++;
  }

  // Test 7: Check WebSocket events
  console.log('\n--- Test 7: Check WebSocket Events ---');
  try {
    const events = mockIO.getEvents();
    console.log('✓ WebSocket events emitted');
    console.log(`  - Total events: ${events.length}`);
    
    const startEvents = mockIO.getEvents('sync:start');
    const progressEvents = mockIO.getEvents('sync:progress');
    const completeEvents = mockIO.getEvents('sync:complete');
    
    console.log(`  - Start events: ${startEvents.length}`);
    console.log(`  - Progress events: ${progressEvents.length}`);
    console.log(`  - Complete events: ${completeEvents.length}`);
    
    if (progressEvents.length > 0) {
      const lastProgress = progressEvents[progressEvents.length - 1];
      console.log(`  - Last progress: ${lastProgress.data.progress}%`);
    }
    
    testsPassed++;
  } catch (error) {
    console.error('✗ Failed:', error.message);
    testsFailed++;
  }

  // Test 8: Check task status manually
  console.log('\n--- Test 8: Manual Status Check ---');
  try {
    const customTaskId = 'custom-task-test';
    const result = await taskManager.checkTaskStatus(customTaskId);

    if (result.success) {
      console.log('✓ Manual status check successful');
      console.log(`  - Completed: ${result.status?.completed || false}`);
      console.log(`  - Progress: ${result.status?.progress || 0}%`);
      
      if (result.status?.metadata) {
        console.log(`  - Metadata:`, result.status.metadata);
      }
      
      testsPassed++;
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('✗ Failed:', error.message);
    testsFailed++;
  }

  // Test 9: Get task by ID
  console.log('\n--- Test 9: Get Task by ID ---');
  try {
    const customTaskId = 'custom-task-test';
    const task = taskManager.getTask(customTaskId);

    if (task) {
      console.log('✓ Retrieved task by ID');
      console.log(`  - ID: ${task.id}`);
      console.log(`  - Type: ${task.type}`);
      console.log(`  - Service: ${task.service}`);
      console.log(`  - Status: ${task.status}`);
      console.log(`  - Progress: ${task.progress}%`);
      console.log(`  - Started at: ${task.startedAt}`);
      console.log(`  - Last checked: ${task.lastChecked}`);
      
      testsPassed++;
    } else {
      throw new Error('Task not found');
    }
  } catch (error) {
    console.error('✗ Failed:', error.message);
    testsFailed++;
  }

  // Test 10: Cancel a task
  console.log('\n--- Test 10: Cancel Task ---');
  try {
    // Register a new task to cancel
    const cancelTaskId = 'task-to-cancel';
    await taskManager.registerTask({
      id: cancelTaskId,
      type: 'indexer-sync',
      service: 'test-indexer',
      config: {}
    });

    await taskManager.startMonitoring(cancelTaskId);
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Cancel the task
    const result = await taskManager.cancelTask(cancelTaskId);

    if (result.success) {
      console.log('✓ Task cancelled successfully');
      console.log(`  - Task ID: ${result.taskId}`);
      
      // Verify task is removed
      const task = taskManager.getTask(cancelTaskId);
      console.log(`  - Task still exists: ${task !== null}`);
      
      testsPassed++;
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('✗ Failed:', error.message);
    testsFailed++;
  }

  // Test 11: Duration calculation
  console.log('\n--- Test 11: Duration Calculation ---');
  try {
    const startTime = new Date('2024-01-01T10:00:00Z').toISOString();
    const endTime = new Date('2024-01-01T12:30:45Z').toISOString();
    
    const duration = taskManager.calculateDuration(startTime, endTime);
    
    console.log('✓ Duration calculated');
    console.log(`  - Seconds: ${duration.seconds}`);
    console.log(`  - Minutes: ${duration.minutes}`);
    console.log(`  - Hours: ${duration.hours}`);
    console.log(`  - Formatted: ${duration.formatted}`);
    
    if (duration.hours === 2 && duration.minutes === 150) {
      testsPassed++;
    } else {
      throw new Error('Duration calculation incorrect');
    }
  } catch (error) {
    console.error('✗ Failed:', error.message);
    testsFailed++;
  }

  // Test 12: Format duration
  console.log('\n--- Test 12: Format Duration ---');
  try {
    const durations = [
      { seconds: 30, expected: '30 seconds' },
      { seconds: 90, expected: '1 minute 30s' },
      { seconds: 3600, expected: '1 hour' },
      { seconds: 7260, expected: '2 hours 1 min' }
    ];

    let allCorrect = true;
    for (const { seconds, expected } of durations) {
      const formatted = taskManager.formatDuration(seconds);
      console.log(`  - ${seconds}s → "${formatted}"`);
      
      if (!formatted.includes(expected.split(' ')[0])) {
        allCorrect = false;
      }
    }

    if (allCorrect) {
      console.log('✓ Duration formatting works');
      testsPassed++;
    } else {
      throw new Error('Some duration formats incorrect');
    }
  } catch (error) {
    console.error('✗ Failed:', error.message);
    testsFailed++;
  }

  // Test 13: Cleanup old tasks
  console.log('\n--- Test 13: Cleanup Old Tasks ---');
  try {
    // The custom task should be complete by now
    const customTaskId = 'custom-task-test';
    const task = taskManager.getTask(customTaskId);
    
    if (task && task.status === 'complete') {
      console.log('  - Task is complete, ready for cleanup');
      
      // Cleanup with very short max age (0ms) to force cleanup
      const result = taskManager.cleanupOldTasks(0);
      
      console.log('✓ Cleanup executed');
      console.log(`  - Tasks cleaned: ${result.cleaned}`);
      
      testsPassed++;
    } else {
      console.log('⚠ Task not complete yet, skipping cleanup test');
      testsPassed++;
    }
  } catch (error) {
    console.error('✗ Failed:', error.message);
    testsFailed++;
  }

  // Test 14: Shutdown task manager
  console.log('\n--- Test 14: Shutdown Task Manager ---');
  try {
    const result = taskManager.shutdown();

    if (result.success) {
      console.log('✓ Task manager shutdown');
      console.log(`  - Tasks cleaned: ${result.tasksCleaned}`);
      console.log(`  - Active tasks after shutdown: ${taskManager.getAllTasks().length}`);
      
      testsPassed++;
    } else {
      throw new Error('Shutdown failed');
    }
  } catch (error) {
    console.error('✗ Failed:', error.message);
    testsFailed++;
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
    console.log('\n✓ All tests passed!');
    process.exit(0);
  } else {
    console.log(`\n✗ ${testsFailed} test(s) failed`);
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
