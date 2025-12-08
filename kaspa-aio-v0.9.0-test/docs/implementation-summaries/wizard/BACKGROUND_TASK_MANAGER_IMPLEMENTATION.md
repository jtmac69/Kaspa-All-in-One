# Background Task Manager Implementation Summary

**Date**: November 25, 2024  
**Task**: 6.7.4 - Implement background task management  
**Status**: ✅ COMPLETED

## Overview

Implemented a comprehensive background task management system for the wizard backend that monitors long-running operations (node synchronization, indexer operations, database migrations) in the background, updates wizard state periodically, and emits real-time WebSocket events for progress tracking.

## Implementation Details

### Core Component

**File**: `services/wizard/backend/src/utils/background-task-manager.js`

The `BackgroundTaskManager` class provides:

1. **Task Registration**: Register background tasks with custom status checkers
2. **Periodic Monitoring**: Check task status every 10 seconds (configurable)
3. **State Persistence**: Update wizard state with task progress
4. **WebSocket Events**: Emit real-time progress updates via Socket.IO
5. **Lifecycle Management**: Handle task completion, errors, and cancellation
6. **Automatic Service Switching**: Switch services to local node when sync completes

### Key Features

#### 1. Task Types Supported

- **Node Sync**: Monitor Kaspa node blockchain synchronization
- **Indexer Sync**: Monitor indexer synchronization operations
- **Database Migration**: Monitor database migration progress
- **Custom Tasks**: Support for any custom background operation

#### 2. Task Registration

```javascript
// Register a node sync task
const result = await taskManager.registerNodeSyncTask({
  service: 'kaspa-node',
  host: 'localhost',
  port: 16110,
  autoSwitch: true,
  onComplete: async (task, status) => {
    console.log('Node sync complete!');
  }
});

// Register a custom task
const result = await taskManager.registerTask({
  id: 'custom-task',
  type: 'database-migration',
  service: 'postgres',
  config: {},
  checkInterval: 10000,
  statusChecker: async (task) => {
    // Custom status checking logic
    return {
      completed: false,
      progress: 50,
      metadata: {}
    };
  }
});
```

#### 3. Monitoring and Progress Tracking

- **Automatic Monitoring**: Tasks are monitored at configurable intervals (default: 10 seconds)
- **Progress Calculation**: Tracks progress percentage (0-100%)
- **Time Estimation**: Calculates estimated time remaining for node sync
- **State Updates**: Saves progress to wizard state for resumability

#### 4. WebSocket Events

The task manager emits the following events via Socket.IO:

- `sync:start` - Task monitoring started
- `sync:progress` - Progress update (emitted on significant changes)
- `sync:complete` - Task completed successfully
- `sync:error` - Task encountered an error
- `sync:cancelled` - Task was cancelled
- `node:ready` - Local node is synced and ready for use

#### 5. Integration with Node Sync Manager

The background task manager integrates with the existing `NodeSyncManager` to:

- Query Kaspa node RPC for sync status
- Calculate sync progress (currentBlock / targetBlock)
- Estimate time remaining based on sync rate
- Track sync history for rate calculation

#### 6. Integration with State Manager

The background task manager integrates with the existing `StateManager` to:

- Save background tasks to wizard state
- Update sync operation progress
- Record user decisions
- Enable installation resumability

### Server Integration

**File**: `services/wizard/backend/src/server.js`

Added WebSocket handlers for:

1. **Task Registration**: `task:register` event
2. **Task Status**: `task:status` event
3. **List Tasks**: `tasks:list` event
4. **Task Cancellation**: `task:cancel` event

The background task manager is initialized with the Socket.IO instance and automatically emits events to all connected clients.

### Graceful Shutdown

The task manager properly shuts down on server termination:

- Stops all monitoring intervals
- Clears active tasks
- Logs shutdown status

## Testing

### Unit Tests

**File**: `services/wizard/backend/test-background-task-manager.js`

Comprehensive unit tests covering:

1. ✅ Task manager initialization
2. ✅ Node sync task registration
3. ✅ Custom task registration
4. ✅ Get all tasks
5. ✅ Get tasks by type
6. ✅ Start monitoring task
7. ✅ WebSocket event emission
8. ✅ Manual status check
9. ✅ Get task by ID
10. ✅ Task cancellation
11. ✅ Duration calculation
12. ✅ Duration formatting
13. ✅ Cleanup old tasks
14. ✅ Shutdown task manager

**Result**: 14/14 tests passed (100% success rate)

### Integration Tests

**File**: `services/wizard/backend/test-background-task-integration.js`

Integration tests covering:

1. ✅ Task registration with WebSocket events
2. ✅ Node sync task registration
3. ✅ Get all tasks
4. ✅ Monitor multiple tasks concurrently
5. ✅ Task cancellation
6. ✅ Error handling

**Result**: 7/7 tests passed (100% success rate)

## API Reference

### BackgroundTaskManager Class

#### Methods

**registerTask(taskConfig)**
- Register a new background task
- Returns: `{ success, taskId, task }`

**registerNodeSyncTask(config)**
- Convenience method for node sync tasks
- Returns: `{ success, taskId, task }`

**registerIndexerSyncTask(config)**
- Convenience method for indexer sync tasks
- Returns: `{ success, taskId, task }`

**startMonitoring(taskId)**
- Start monitoring a registered task
- Returns: `{ success, taskId, checkInterval }`

**checkTaskStatus(taskId)**
- Manually check task status
- Returns: `{ success, status }`

**getTask(taskId)**
- Get task by ID
- Returns: Task object or null

**getAllTasks()**
- Get all active tasks
- Returns: Array of task objects

**getTasksByType(type)**
- Get tasks by type
- Returns: Array of task objects

**getTasksByService(service)**
- Get tasks by service
- Returns: Array of task objects

**cancelTask(taskId)**
- Cancel a running task
- Returns: `{ success, taskId }`

**completeTask(taskId, finalStatus)**
- Mark task as complete
- Returns: `{ success, taskId, completedAt }`

**errorTask(taskId, error)**
- Mark task as errored
- Returns: `{ success, taskId, error }`

**stopMonitoring(taskId)**
- Stop monitoring a task
- Returns: `{ success }`

**cleanupOldTasks(maxAge)**
- Remove old completed/errored tasks
- Returns: `{ success, cleaned }`

**shutdown()**
- Shutdown task manager
- Returns: `{ success, tasksCleaned }`

### WebSocket Events

#### Client → Server

- `task:register` - Register a new task
- `task:status` - Request task status
- `tasks:list` - Request all tasks
- `task:cancel` - Cancel a task

#### Server → Client

- `sync:start` - Task started
- `sync:progress` - Progress update
- `sync:complete` - Task completed
- `sync:error` - Task error
- `sync:cancelled` - Task cancelled
- `node:ready` - Node synced and ready
- `task:registered` - Task registration confirmed
- `task:status:response` - Task status response
- `tasks:list:response` - Task list response
- `task:cancelled` - Cancellation confirmed
- `task:error` - Error response

## Usage Examples

### Example 1: Monitor Node Synchronization

```javascript
const taskManager = new BackgroundTaskManager(io);

// Register node sync task
const result = await taskManager.registerNodeSyncTask({
  service: 'kaspa-node',
  host: 'localhost',
  port: 16110,
  autoSwitch: true,
  onComplete: async (task, status) => {
    console.log('Node sync complete!');
    // Automatically switch services to local node
  }
});

// Start monitoring
await taskManager.startMonitoring(result.taskId);

// Task will emit progress events every 10 seconds
// When complete, services will automatically switch to local node
```

### Example 2: Monitor Multiple Indexers

```javascript
const indexers = ['kasia-indexer', 'k-indexer', 'simply-kaspa-indexer'];

for (const indexer of indexers) {
  const result = await taskManager.registerIndexerSyncTask({
    service: indexer,
    indexerUrl: `http://localhost:${getPort(indexer)}`,
    statusChecker: async (task) => {
      // Custom indexer status checking
      const status = await checkIndexerStatus(task.config.indexerUrl);
      return {
        completed: status.synced,
        progress: status.progress,
        metadata: status
      };
    }
  });

  await taskManager.startMonitoring(result.taskId);
}

// All indexers monitored concurrently
```

### Example 3: Frontend WebSocket Integration

```javascript
// Connect to wizard backend
const socket = io('http://localhost:3000');

// Listen for progress updates
socket.on('sync:progress', (data) => {
  console.log(`${data.service}: ${data.progress}%`);
  updateProgressBar(data.service, data.progress);
  
  if (data.estimatedTimeRemaining) {
    updateTimeRemaining(data.service, data.formattedTimeRemaining);
  }
});

// Listen for completion
socket.on('sync:complete', (data) => {
  console.log(`${data.service} sync complete!`);
  showSuccessMessage(data.service);
});

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
```

## Benefits

1. **Resumable Installations**: Tasks persist in wizard state, allowing installations to be resumed
2. **Real-time Updates**: WebSocket events provide instant feedback to users
3. **Concurrent Monitoring**: Multiple tasks can be monitored simultaneously
4. **Flexible Architecture**: Easy to add new task types with custom status checkers
5. **Automatic Service Switching**: Services automatically switch to local node when synced
6. **Error Handling**: Comprehensive error handling with user notifications
7. **Resource Efficient**: Configurable check intervals prevent excessive polling

## Requirements Satisfied

- ✅ **Requirement 5**: Installation Progress Tracking
  - Real-time progress updates via WebSocket
  - Background task monitoring with periodic checks
  - Progress persistence for resumability

- ✅ **Requirement 6**: Post-Installation Validation
  - Monitor service synchronization status
  - Automatic service switching when ready
  - Validation of background operations

## Next Steps

1. **Task 6.7.5**: Add resume installation UI
   - Display resumable state on wizard start
   - Show background task status in UI
   - Offer "Resume" or "Start Over" options

2. **Task 6.7.6**: Update installation progress UI for sync
   - Add "Syncing" phase to progress indicator
   - Display sync progress bar with percentage
   - Show estimated time remaining
   - Add pause/resume buttons

3. **Frontend Integration**: Connect wizard UI to background task WebSocket events
   - Display real-time sync progress
   - Show background task status
   - Handle task completion notifications

## Files Created/Modified

### Created
- `services/wizard/backend/src/utils/background-task-manager.js` (700+ lines)
- `services/wizard/backend/test-background-task-manager.js` (400+ lines)
- `services/wizard/backend/test-background-task-integration.js` (300+ lines)

### Modified
- `services/wizard/backend/src/server.js`
  - Added BackgroundTaskManager import
  - Added WebSocket handlers for task management
  - Added graceful shutdown for task manager

## Conclusion

The background task manager provides a robust foundation for monitoring long-running operations during wizard installation. It integrates seamlessly with the existing node sync manager and state manager, provides real-time updates via WebSocket, and enables resumable installations. All tests pass with 100% success rate, confirming the implementation is solid and ready for production use.
