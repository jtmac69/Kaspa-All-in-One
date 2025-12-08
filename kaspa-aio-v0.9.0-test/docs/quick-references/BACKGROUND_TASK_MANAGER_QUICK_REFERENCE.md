# Background Task Manager Quick Reference

## Overview

The Background Task Manager monitors long-running operations (node sync, indexer sync, database migrations) in the background, updates wizard state, and emits real-time WebSocket events.

## Quick Start

### Initialize

```javascript
const BackgroundTaskManager = require('./src/utils/background-task-manager');
const taskManager = new BackgroundTaskManager(io); // Pass Socket.IO instance
```

### Register a Node Sync Task

```javascript
const result = await taskManager.registerNodeSyncTask({
  service: 'kaspa-node',
  host: 'localhost',
  port: 16110,
  autoSwitch: true,
  onComplete: async (task, status) => {
    console.log('Node sync complete!');
  }
});

await taskManager.startMonitoring(result.taskId);
```

### Register a Custom Task

```javascript
const result = await taskManager.registerTask({
  id: 'my-task',
  type: 'database-migration',
  service: 'postgres',
  config: {},
  checkInterval: 10000, // 10 seconds
  statusChecker: async (task) => {
    // Your status checking logic
    return {
      completed: false,
      progress: 50,
      metadata: { message: 'In progress' }
    };
  },
  onComplete: async (task, status) => {
    console.log('Task complete!');
  }
});

await taskManager.startMonitoring(result.taskId);
```

## Task Types

- `node-sync` - Kaspa node blockchain synchronization
- `indexer-sync` - Indexer synchronization operations
- `database-migration` - Database migration progress
- Custom types supported

## WebSocket Events

### Emitted by Server

```javascript
// Task started
socket.on('sync:start', (data) => {
  console.log(`Task ${data.taskId} started`);
});

// Progress update
socket.on('sync:progress', (data) => {
  console.log(`${data.service}: ${data.progress}%`);
  console.log(`Time remaining: ${data.formattedTimeRemaining}`);
});

// Task completed
socket.on('sync:complete', (data) => {
  console.log(`Task ${data.taskId} complete!`);
});

// Task error
socket.on('sync:error', (data) => {
  console.error(`Task ${data.taskId} error: ${data.error}`);
});

// Task cancelled
socket.on('sync:cancelled', (data) => {
  console.log(`Task ${data.taskId} cancelled`);
});

// Node ready for use
socket.on('node:ready', (data) => {
  console.log(`Node ${data.service} is synced and ready`);
});
```

### Client to Server

```javascript
// Register a task
socket.emit('task:register', {
  type: 'node-sync',
  service: 'kaspa-node',
  config: {
    host: 'localhost',
    port: 16110,
    autoSwitch: true
  }
});

// Get task status
socket.emit('task:status', { taskId: 'my-task' });

// List all tasks
socket.emit('tasks:list');

// Cancel a task
socket.emit('task:cancel', { taskId: 'my-task' });
```

## Common Operations

### Get All Tasks

```javascript
const tasks = taskManager.getAllTasks();
console.log(`Active tasks: ${tasks.length}`);
```

### Get Tasks by Type

```javascript
const nodeSyncTasks = taskManager.getTasksByType('node-sync');
const indexerTasks = taskManager.getTasksByType('indexer-sync');
```

### Get Tasks by Service

```javascript
const kaspaNodeTasks = taskManager.getTasksByService('kaspa-node');
```

### Get Task by ID

```javascript
const task = taskManager.getTask('my-task');
if (task) {
  console.log(`Status: ${task.status}`);
  console.log(`Progress: ${task.progress}%`);
}
```

### Cancel a Task

```javascript
const result = await taskManager.cancelTask('my-task');
if (result.success) {
  console.log('Task cancelled');
}
```

### Cleanup Old Tasks

```javascript
// Remove tasks completed/errored more than 1 hour ago
const result = taskManager.cleanupOldTasks(3600000);
console.log(`Cleaned ${result.cleaned} tasks`);
```

### Shutdown

```javascript
// Stop all monitoring and cleanup
taskManager.shutdown();
```

## Task Object Structure

```javascript
{
  id: 'task-id',
  type: 'node-sync',
  service: 'kaspa-node',
  config: { host: 'localhost', port: 16110 },
  status: 'in-progress', // pending, in-progress, complete, error, cancelled
  progress: 45.5,
  startedAt: '2024-11-25T10:00:00Z',
  lastChecked: '2024-11-25T10:05:00Z',
  lastUpdate: '2024-11-25T10:05:00Z',
  completedAt: null,
  error: null,
  metadata: {
    currentBlock: 45000,
    targetBlock: 100000,
    estimatedTimeRemaining: 3600,
    formattedTimeRemaining: '1 hour'
  }
}
```

## Status Checker Function

```javascript
async function statusChecker(task) {
  // Check task status
  const status = await checkSomething();
  
  return {
    completed: false,      // true when task is done
    progress: 50,          // 0-100
    error: null,           // error message if failed
    metadata: {            // additional data
      currentBlock: 5000,
      targetBlock: 10000
    }
  };
}
```

## Integration with Node Sync Manager

```javascript
// The background task manager automatically uses NodeSyncManager
// for node-sync tasks to query RPC and calculate progress

const result = await taskManager.registerNodeSyncTask({
  service: 'kaspa-node',
  host: 'localhost',
  port: 16110
});

// Automatically queries node RPC every 10 seconds
// Calculates: currentBlock / targetBlock * 100
// Estimates time remaining based on sync rate
```

## Integration with State Manager

```javascript
// Background tasks are automatically saved to wizard state
// This enables resumable installations

// State is saved at: .kaspa-aio/wizard-state.json
// Includes: backgroundTasks array, syncOperations array

// On wizard restart, check for resumable state:
const canResume = await stateManager.canResume();
if (canResume.canResume) {
  // Resume background tasks
  for (const taskId of canResume.backgroundTasks) {
    // Restart monitoring
  }
}
```

## Configuration

### Default Check Interval

```javascript
taskManager.defaultCheckInterval = 10000; // 10 seconds
```

### Custom Check Interval per Task

```javascript
await taskManager.registerTask({
  id: 'fast-task',
  checkInterval: 5000, // Check every 5 seconds
  // ...
});
```

## Error Handling

```javascript
// Tasks automatically handle errors
// Errors are emitted via WebSocket and logged

// Listen for errors
socket.on('sync:error', (data) => {
  console.error(`Task ${data.taskId} error: ${data.error}`);
  
  // Show error to user
  showErrorMessage(data.service, data.error);
  
  // Optionally retry or fallback
  if (data.type === 'node-sync') {
    // Fallback to public network
    useFallbackConfiguration();
  }
});
```

## Best Practices

1. **Always start monitoring after registration**
   ```javascript
   const result = await taskManager.registerTask({...});
   await taskManager.startMonitoring(result.taskId);
   ```

2. **Use appropriate check intervals**
   - Node sync: 10-30 seconds
   - Indexer sync: 10-30 seconds
   - Database migrations: 5-10 seconds

3. **Provide onComplete callbacks**
   ```javascript
   onComplete: async (task, status) => {
     // Perform actions after completion
     await notifyUser(task.service);
     await updateConfiguration(task.service);
   }
   ```

4. **Handle errors gracefully**
   ```javascript
   statusChecker: async (task) => {
     try {
       const status = await checkStatus();
       return { completed: status.done, progress: status.pct };
     } catch (error) {
       return { error: error.message };
     }
   }
   ```

5. **Cleanup on shutdown**
   ```javascript
   process.on('SIGTERM', () => {
     taskManager.shutdown();
     server.close();
   });
   ```

## Testing

### Run Unit Tests

```bash
node services/wizard/backend/test-background-task-manager.js
```

### Run Integration Tests

```bash
node services/wizard/backend/test-background-task-integration.js
```

## Files

- **Implementation**: `services/wizard/backend/src/utils/background-task-manager.js`
- **Server Integration**: `services/wizard/backend/src/server.js`
- **Unit Tests**: `services/wizard/backend/test-background-task-manager.js`
- **Integration Tests**: `services/wizard/backend/test-background-task-integration.js`

## Related Components

- **NodeSyncManager**: Queries Kaspa node RPC for sync status
- **StateManager**: Persists wizard state for resumability
- **Socket.IO**: Emits real-time events to connected clients

## Support

For issues or questions:
1. Check the implementation summary: `docs/implementation-summaries/wizard/BACKGROUND_TASK_MANAGER_IMPLEMENTATION.md`
2. Review test files for usage examples
3. Check server.js for WebSocket handler examples
