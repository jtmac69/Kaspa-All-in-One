/**
 * Background Task Manager
 * 
 * Manages long-running background tasks during wizard installation, particularly
 * node synchronization and indexer operations. Monitors tasks periodically,
 * updates wizard state, emits WebSocket events, and handles automatic service
 * switching when sync completes.
 * 
 * Features:
 * - Background task registration and monitoring
 * - Periodic status checks (every 10 seconds)
 * - Wizard state persistence
 * - WebSocket event emission for real-time updates
 * - Automatic service switching on sync completion
 * - Task lifecycle management (start, monitor, complete, error)
 * - Multiple concurrent task support
 * 
 * Requirements: 5, 6
 */

const NodeSyncManager = require('./node-sync-manager');
const StateManager = require('./state-manager');
const EventEmitter = require('events');

class BackgroundTaskManager extends EventEmitter {
  constructor(io = null) {
    super();
    this.nodeSyncManager = new NodeSyncManager();
    this.stateManager = new StateManager();
    this.io = io; // Socket.IO instance for WebSocket events
    this.tasks = new Map(); // Active tasks: taskId -> task object
    this.intervals = new Map(); // Monitoring intervals: taskId -> interval ID
    this.defaultCheckInterval = 10000; // 10 seconds
  }

  /**
   * Set Socket.IO instance for WebSocket events
   * @param {Object} io - Socket.IO instance
   */
  setSocketIO(io) {
    this.io = io;
  }

  /**
   * Register a new background task
   * @param {Object} taskConfig - Task configuration
   * @param {string} taskConfig.id - Unique task identifier
   * @param {string} taskConfig.type - Task type: 'node-sync', 'indexer-sync', 'database-migration'
   * @param {string} taskConfig.service - Service name
   * @param {Object} taskConfig.config - Task-specific configuration
   * @param {number} taskConfig.checkInterval - Check interval in ms (default: 10000)
   * @param {Function} taskConfig.statusChecker - Function to check task status
   * @param {Function} taskConfig.onComplete - Callback when task completes
   * @returns {Promise<Object>} Registration result
   */
  async registerTask(taskConfig) {
    const {
      id,
      type,
      service,
      config = {},
      checkInterval = this.defaultCheckInterval,
      statusChecker,
      onComplete
    } = taskConfig;

    // Validate required fields
    if (!id || !type || !service) {
      return {
        success: false,
        error: 'Missing required fields: id, type, service'
      };
    }

    // Check if task already exists
    if (this.tasks.has(id)) {
      return {
        success: false,
        error: `Task ${id} already registered`
      };
    }

    // Create task object
    const task = {
      id,
      type,
      service,
      config,
      checkInterval,
      statusChecker,
      onComplete,
      status: 'pending',
      progress: 0,
      startedAt: new Date().toISOString(),
      lastChecked: null,
      lastUpdate: null,
      error: null,
      metadata: {}
    };

    // Store task
    this.tasks.set(id, task);

    // Add to wizard state
    await this.stateManager.addBackgroundTask(id, {
      service,
      type,
      status: 'pending',
      progress: 0,
      canContinueInBackground: true
    });

    console.log(`Background task registered: ${id} (${type} for ${service})`);

    return {
      success: true,
      taskId: id,
      task
    };
  }

  /**
   * Start monitoring a background task
   * @param {string} taskId - Task identifier
   * @returns {Promise<Object>} Start result
   */
  async startMonitoring(taskId) {
    const task = this.tasks.get(taskId);

    if (!task) {
      return {
        success: false,
        error: `Task ${taskId} not found`
      };
    }

    // Check if already monitoring
    if (this.intervals.has(taskId)) {
      return {
        success: false,
        error: `Task ${taskId} already being monitored`
      };
    }

    // Update task status
    task.status = 'in-progress';
    task.startedAt = new Date().toISOString();

    // Start monitoring interval
    const intervalId = setInterval(async () => {
      await this.checkTaskStatus(taskId);
    }, task.checkInterval);

    this.intervals.set(taskId, intervalId);

    // Emit start event
    this.emitTaskEvent('sync:start', {
      taskId,
      service: task.service,
      type: task.type
    });

    console.log(`Started monitoring task: ${taskId} (interval: ${task.checkInterval}ms)`);

    return {
      success: true,
      taskId,
      checkInterval: task.checkInterval
    };
  }

  /**
   * Check status of a background task
   * @param {string} taskId - Task identifier
   * @returns {Promise<Object>} Status check result
   */
  async checkTaskStatus(taskId) {
    const task = this.tasks.get(taskId);

    if (!task) {
      return {
        success: false,
        error: `Task ${taskId} not found`
      };
    }

    try {
      task.lastChecked = new Date().toISOString();

      // Use custom status checker if provided
      let status;
      if (task.statusChecker && typeof task.statusChecker === 'function') {
        status = await task.statusChecker(task);
      } else {
        // Use default status checker based on task type
        status = await this.getDefaultStatusChecker(task);
      }

      // Update task with new status
      const previousProgress = task.progress;
      task.progress = status.progress || 0;
      task.metadata = { ...task.metadata, ...status.metadata };
      task.lastUpdate = new Date().toISOString();

      // Check if task completed
      if (status.completed) {
        await this.completeTask(taskId, status);
        return {
          success: true,
          completed: true,
          status
        };
      }

      // Check if task errored
      if (status.error) {
        await this.errorTask(taskId, status.error);
        return {
          success: false,
          error: status.error
        };
      }

      // Update wizard state if progress changed significantly (>1%)
      if (Math.abs(task.progress - previousProgress) > 1) {
        await this.stateManager.updateSyncOperation(taskId, {
          status: 'in-progress',
          progress: task.progress,
          ...status.metadata
        });
      }

      // Emit progress event
      this.emitTaskEvent('sync:progress', {
        taskId,
        service: task.service,
        type: task.type,
        progress: task.progress,
        ...status.metadata
      });

      return {
        success: true,
        status
      };
    } catch (error) {
      console.error(`Error checking task ${taskId}:`, error);
      await this.errorTask(taskId, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get default status checker based on task type
   * @param {Object} task - Task object
   * @returns {Promise<Object>} Status object
   */
  async getDefaultStatusChecker(task) {
    switch (task.type) {
      case 'node-sync':
        return await this.checkNodeSyncStatus(task);
      
      case 'indexer-sync':
        return await this.checkIndexerSyncStatus(task);
      
      case 'database-migration':
        return await this.checkDatabaseMigrationStatus(task);
      
      default:
        return {
          completed: false,
          progress: 0,
          error: `Unknown task type: ${task.type}`
        };
    }
  }

  /**
   * Check node synchronization status
   * @param {Object} task - Task object
   * @returns {Promise<Object>} Status object
   */
  async checkNodeSyncStatus(task) {
    const { host, port, useHttps, timeout } = task.config;

    const syncStatus = await this.nodeSyncManager.getSyncStatus({
      host: host || 'localhost',
      port: port || 16110,
      useHttps: useHttps || false,
      timeout: timeout || 5000
    });

    if (!syncStatus.connected) {
      return {
        completed: false,
        progress: 0,
        error: syncStatus.error || 'Node not reachable',
        metadata: {
          connected: false
        }
      };
    }

    return {
      completed: syncStatus.synced,
      progress: syncStatus.percentage,
      metadata: {
        connected: true,
        synced: syncStatus.synced,
        currentBlock: syncStatus.currentBlock,
        targetBlock: syncStatus.targetBlock,
        blocksRemaining: syncStatus.blocksRemaining,
        estimatedTimeRemaining: syncStatus.estimatedTimeRemaining,
        syncRate: syncStatus.syncRate,
        formattedTimeRemaining: this.nodeSyncManager.formatTimeRemaining(syncStatus.estimatedTimeRemaining)
      }
    };
  }

  /**
   * Check indexer synchronization status
   * @param {Object} task - Task object
   * @returns {Promise<Object>} Status object
   */
  async checkIndexerSyncStatus(task) {
    // Placeholder for indexer sync status checking
    // This would query the indexer's API or database to check sync progress
    
    // For now, return a mock status
    return {
      completed: false,
      progress: 0,
      metadata: {
        message: 'Indexer sync status checking not yet implemented'
      }
    };
  }

  /**
   * Check database migration status
   * @param {Object} task - Task object
   * @returns {Promise<Object>} Status object
   */
  async checkDatabaseMigrationStatus(task) {
    // Placeholder for database migration status checking
    // This would query the database or migration tool to check progress
    
    // For now, return a mock status
    return {
      completed: false,
      progress: 0,
      metadata: {
        message: 'Database migration status checking not yet implemented'
      }
    };
  }

  /**
   * Complete a background task
   * @param {string} taskId - Task identifier
   * @param {Object} finalStatus - Final status object
   * @returns {Promise<Object>} Completion result
   */
  async completeTask(taskId, finalStatus = {}) {
    const task = this.tasks.get(taskId);

    if (!task) {
      return {
        success: false,
        error: `Task ${taskId} not found`
      };
    }

    // Stop monitoring
    this.stopMonitoring(taskId);

    // Update task
    task.status = 'complete';
    task.progress = 100;
    task.completedAt = new Date().toISOString();
    task.metadata = { ...task.metadata, ...finalStatus.metadata };

    // Update wizard state
    await this.stateManager.updateSyncOperation(taskId, {
      status: 'complete',
      progress: 100
    });

    await this.stateManager.removeBackgroundTask(taskId);

    // Emit completion event
    this.emitTaskEvent('sync:complete', {
      taskId,
      service: task.service,
      type: task.type,
      completedAt: task.completedAt,
      duration: this.calculateDuration(task.startedAt, task.completedAt),
      ...task.metadata
    });

    // Call onComplete callback if provided
    if (task.onComplete && typeof task.onComplete === 'function') {
      try {
        await task.onComplete(task, finalStatus);
      } catch (error) {
        console.error(`Error in onComplete callback for task ${taskId}:`, error);
      }
    }

    // Handle automatic service switching for node sync
    if (task.type === 'node-sync' && task.config.autoSwitch) {
      await this.switchServicesToLocalNode(task);
    }

    console.log(`Task completed: ${taskId} (${task.service})`);

    // Remove task from active tasks after a delay (keep for history)
    setTimeout(() => {
      this.tasks.delete(taskId);
    }, 60000); // Keep for 1 minute

    return {
      success: true,
      taskId,
      completedAt: task.completedAt
    };
  }

  /**
   * Mark a task as errored
   * @param {string} taskId - Task identifier
   * @param {string} error - Error message
   * @returns {Promise<Object>} Error result
   */
  async errorTask(taskId, error) {
    const task = this.tasks.get(taskId);

    if (!task) {
      return {
        success: false,
        error: `Task ${taskId} not found`
      };
    }

    // Stop monitoring
    this.stopMonitoring(taskId);

    // Update task
    task.status = 'error';
    task.error = error;
    task.erroredAt = new Date().toISOString();

    // Update wizard state
    await this.stateManager.updateSyncOperation(taskId, {
      status: 'error',
      error
    });

    await this.stateManager.removeBackgroundTask(taskId);

    // Emit error event
    this.emitTaskEvent('sync:error', {
      taskId,
      service: task.service,
      type: task.type,
      error,
      erroredAt: task.erroredAt
    });

    console.error(`Task errored: ${taskId} (${task.service}) - ${error}`);

    return {
      success: true,
      taskId,
      error
    };
  }

  /**
   * Stop monitoring a task
   * @param {string} taskId - Task identifier
   * @returns {Object} Stop result
   */
  stopMonitoring(taskId) {
    const intervalId = this.intervals.get(taskId);

    if (intervalId) {
      clearInterval(intervalId);
      this.intervals.delete(taskId);
      console.log(`Stopped monitoring task: ${taskId}`);
      return { success: true };
    }

    return {
      success: false,
      error: `No monitoring interval found for task ${taskId}`
    };
  }

  /**
   * Get task status
   * @param {string} taskId - Task identifier
   * @returns {Object|null} Task object or null
   */
  getTask(taskId) {
    return this.tasks.get(taskId) || null;
  }

  /**
   * Get all active tasks
   * @returns {Array<Object>} Array of task objects
   */
  getAllTasks() {
    return Array.from(this.tasks.values());
  }

  /**
   * Get tasks by type
   * @param {string} type - Task type
   * @returns {Array<Object>} Array of task objects
   */
  getTasksByType(type) {
    return Array.from(this.tasks.values()).filter(task => task.type === type);
  }

  /**
   * Get tasks by service
   * @param {string} service - Service name
   * @returns {Array<Object>} Array of task objects
   */
  getTasksByService(service) {
    return Array.from(this.tasks.values()).filter(task => task.service === service);
  }

  /**
   * Cancel a task
   * @param {string} taskId - Task identifier
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelTask(taskId) {
    const task = this.tasks.get(taskId);

    if (!task) {
      return {
        success: false,
        error: `Task ${taskId} not found`
      };
    }

    // Stop monitoring
    this.stopMonitoring(taskId);

    // Update task
    task.status = 'cancelled';
    task.cancelledAt = new Date().toISOString();

    // Update wizard state
    await this.stateManager.updateSyncOperation(taskId, {
      status: 'cancelled'
    });

    await this.stateManager.removeBackgroundTask(taskId);

    // Emit cancellation event
    this.emitTaskEvent('sync:cancelled', {
      taskId,
      service: task.service,
      type: task.type,
      cancelledAt: task.cancelledAt
    });

    console.log(`Task cancelled: ${taskId} (${task.service})`);

    // Remove task
    this.tasks.delete(taskId);

    return {
      success: true,
      taskId
    };
  }

  /**
   * Emit task event via WebSocket
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  emitTaskEvent(event, data) {
    if (this.io) {
      this.io.emit(event, {
        timestamp: new Date().toISOString(),
        ...data
      });
    }

    // Also emit via EventEmitter for local listeners
    this.emit(event, data);
  }

  /**
   * Switch services to local node after sync completes
   * @param {Object} task - Completed node sync task
   * @returns {Promise<Object>} Switch result
   */
  async switchServicesToLocalNode(task) {
    console.log(`Switching services to local node: ${task.service}`);

    // This would update docker-compose configuration to point services
    // to the local node instead of public endpoints
    
    // For now, just emit an event
    this.emitTaskEvent('node:ready', {
      service: task.service,
      host: task.config.host || 'localhost',
      port: task.config.port || 16110,
      message: 'Local node is synced and ready for use'
    });

    // Record decision in wizard state
    await this.stateManager.recordDecision(
      'switched-to-local-node',
      `Automatically switched services to local node ${task.service} after sync completion`
    );

    return {
      success: true,
      service: task.service
    };
  }

  /**
   * Calculate duration between two timestamps
   * @param {string} startTime - Start timestamp (ISO string)
   * @param {string} endTime - End timestamp (ISO string)
   * @returns {Object} Duration object with seconds, minutes, hours
   */
  calculateDuration(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end.getTime() - start.getTime();
    const durationSeconds = Math.floor(durationMs / 1000);

    return {
      seconds: durationSeconds,
      minutes: Math.floor(durationSeconds / 60),
      hours: Math.floor(durationSeconds / 3600),
      formatted: this.formatDuration(durationSeconds)
    };
  }

  /**
   * Format duration as human-readable string
   * @param {number} seconds - Duration in seconds
   * @returns {string} Formatted duration
   */
  formatDuration(seconds) {
    if (seconds < 60) {
      return `${seconds} seconds`;
    }

    if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes} minute${minutes !== 1 ? 's' : ''}${remainingSeconds > 0 ? ` ${remainingSeconds}s` : ''}`;
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours} hour${hours !== 1 ? 's' : ''}${minutes > 0 ? ` ${minutes} min` : ''}`;
  }

  /**
   * Register a node sync task
   * Convenience method for registering node synchronization tasks
   * @param {Object} config - Node sync configuration
   * @param {string} config.service - Service name (e.g., 'kaspa-node')
   * @param {string} config.host - Node hostname
   * @param {number} config.port - Node RPC port
   * @param {boolean} config.autoSwitch - Auto-switch services when synced
   * @param {Function} config.onComplete - Completion callback
   * @returns {Promise<Object>} Registration result
   */
  async registerNodeSyncTask(config) {
    const taskId = `node-sync-${config.service}-${Date.now()}`;

    return await this.registerTask({
      id: taskId,
      type: 'node-sync',
      service: config.service,
      config: {
        host: config.host || 'localhost',
        port: config.port || 16110,
        useHttps: config.useHttps || false,
        timeout: config.timeout || 5000,
        autoSwitch: config.autoSwitch !== false
      },
      checkInterval: config.checkInterval || this.defaultCheckInterval,
      onComplete: config.onComplete
    });
  }

  /**
   * Register an indexer sync task
   * Convenience method for registering indexer synchronization tasks
   * @param {Object} config - Indexer sync configuration
   * @param {string} config.service - Service name (e.g., 'kasia-indexer')
   * @param {string} config.indexerUrl - Indexer API URL
   * @param {Function} config.statusChecker - Custom status checker
   * @param {Function} config.onComplete - Completion callback
   * @returns {Promise<Object>} Registration result
   */
  async registerIndexerSyncTask(config) {
    const taskId = `indexer-sync-${config.service}-${Date.now()}`;

    return await this.registerTask({
      id: taskId,
      type: 'indexer-sync',
      service: config.service,
      config: {
        indexerUrl: config.indexerUrl
      },
      checkInterval: config.checkInterval || this.defaultCheckInterval,
      statusChecker: config.statusChecker,
      onComplete: config.onComplete
    });
  }

  /**
   * Cleanup completed and errored tasks
   * Removes tasks that have been completed or errored for more than the specified time
   * @param {number} maxAge - Maximum age in milliseconds (default: 1 hour)
   * @returns {Object} Cleanup result
   */
  cleanupOldTasks(maxAge = 3600000) {
    const now = Date.now();
    let cleaned = 0;

    for (const [taskId, task] of this.tasks.entries()) {
      if (task.status === 'complete' || task.status === 'error' || task.status === 'cancelled') {
        const completionTime = new Date(task.completedAt || task.erroredAt || task.cancelledAt).getTime();
        
        if (now - completionTime > maxAge) {
          this.tasks.delete(taskId);
          cleaned++;
        }
      }
    }

    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} old tasks`);
    }

    return {
      success: true,
      cleaned
    };
  }

  /**
   * Shutdown the background task manager
   * Stops all monitoring intervals and cleans up resources
   * @returns {Object} Shutdown result
   */
  shutdown() {
    console.log('Shutting down background task manager...');

    // Stop all monitoring intervals
    for (const [taskId, intervalId] of this.intervals.entries()) {
      clearInterval(intervalId);
      console.log(`Stopped monitoring task: ${taskId}`);
    }

    this.intervals.clear();

    // Clear tasks
    const taskCount = this.tasks.size;
    this.tasks.clear();

    console.log(`Background task manager shutdown complete (${taskCount} tasks cleared)`);

    return {
      success: true,
      tasksCleaned: taskCount
    };
  }
}

module.exports = BackgroundTaskManager;
