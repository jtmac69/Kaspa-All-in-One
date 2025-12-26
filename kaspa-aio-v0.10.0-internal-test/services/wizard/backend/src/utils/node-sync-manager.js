/**
 * Node Sync Manager
 * 
 * Monitors Kaspa node synchronization status by connecting to the node's RPC interface
 * and querying blockchain sync progress. Provides real-time sync status, progress
 * calculation, and time estimates.
 * 
 * Features:
 * - RPC connection to Kaspa node
 * - Sync status detection (synced/syncing)
 * - Progress calculation (currentBlock / targetBlock)
 * - Time remaining estimation based on sync rate
 * - Historical sync rate tracking
 * - Error handling and retry logic
 */

const http = require('http');
const https = require('https');

class NodeSyncManager {
  constructor() {
    this.syncHistory = new Map(); // Track sync progress over time
    this.syncRates = new Map(); // Track sync rates per node
  }

  /**
   * Connect to Kaspa node RPC and get sync status
   * @param {Object} options - Connection options
   * @param {string} options.host - Node hostname (default: 'localhost')
   * @param {number} options.port - RPC port (default: 16110)
   * @param {boolean} options.useHttps - Use HTTPS (default: false)
   * @param {number} options.timeout - Request timeout in ms (default: 5000)
   * @returns {Promise<Object>} Sync status object
   */
  async getSyncStatus(options = {}) {
    const {
      host = 'localhost',
      port = 16110,
      useHttps = false,
      timeout = 5000
    } = options;

    try {
      // Query getBlockDagInfo for sync status
      const blockDagInfo = await this.rpcCall(host, port, 'getBlockDagInfo', [], useHttps, timeout);
      
      if (!blockDagInfo) {
        return {
          connected: false,
          error: 'Failed to get block DAG info',
          synced: false,
          progress: 0
        };
      }

      // Calculate sync progress
      const currentBlock = blockDagInfo.blockCount || 0;
      const targetBlock = blockDagInfo.headerCount || 0;
      const isSynced = blockDagInfo.isSynced || false;
      
      // Calculate percentage (handle edge cases)
      let percentage = 0;
      if (targetBlock > 0) {
        percentage = Math.min(100, (currentBlock / targetBlock) * 100);
      }

      // Track sync history for rate calculation
      const nodeKey = `${host}:${port}`;
      this.updateSyncHistory(nodeKey, currentBlock, targetBlock);

      // Estimate time remaining
      const estimatedTimeRemaining = this.estimateTimeRemaining(nodeKey, currentBlock, targetBlock, isSynced);

      // Get sync rate
      const syncRate = this.calculateSyncRate(nodeKey);

      return {
        connected: true,
        synced: isSynced,
        currentBlock,
        targetBlock,
        blocksRemaining: Math.max(0, targetBlock - currentBlock),
        percentage: Math.round(percentage * 100) / 100, // Round to 2 decimals
        estimatedTimeRemaining, // in seconds
        syncRate, // blocks per second
        timestamp: Date.now(),
        nodeInfo: {
          host,
          port,
          networkName: blockDagInfo.networkName || 'unknown',
          tipHashes: blockDagInfo.tipHashes || [],
          difficulty: blockDagInfo.difficulty || 0
        }
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message,
        synced: false,
        progress: 0,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Make RPC call to Kaspa node
   * @param {string} host - Node hostname
   * @param {number} port - RPC port
   * @param {string} method - RPC method name
   * @param {Array} params - Method parameters
   * @param {boolean} useHttps - Use HTTPS
   * @param {number} timeout - Request timeout
   * @returns {Promise<Object>} RPC response
   */
  async rpcCall(host, port, method, params = [], useHttps = false, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const protocol = useHttps ? https : http;
      const postData = JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params
      });

      const options = {
        hostname: host,
        port,
        path: '/',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout
      };

      const req = protocol.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.error) {
              reject(new Error(response.error.message || 'RPC error'));
            } else {
              resolve(response.result);
            }
          } catch (error) {
            reject(new Error(`Failed to parse RPC response: ${error.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`RPC connection failed: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('RPC request timeout'));
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * Update sync history for a node
   * @param {string} nodeKey - Node identifier (host:port)
   * @param {number} currentBlock - Current block count
   * @param {number} targetBlock - Target block count
   */
  updateSyncHistory(nodeKey, currentBlock, targetBlock) {
    if (!this.syncHistory.has(nodeKey)) {
      this.syncHistory.set(nodeKey, []);
    }

    const history = this.syncHistory.get(nodeKey);
    const now = Date.now();

    // Add current data point
    history.push({
      timestamp: now,
      currentBlock,
      targetBlock
    });

    // Keep only last 10 minutes of history (for rate calculation)
    const tenMinutesAgo = now - (10 * 60 * 1000);
    const recentHistory = history.filter(entry => entry.timestamp > tenMinutesAgo);
    this.syncHistory.set(nodeKey, recentHistory);
  }

  /**
   * Calculate sync rate (blocks per second)
   * @param {string} nodeKey - Node identifier
   * @returns {number} Blocks per second
   */
  calculateSyncRate(nodeKey) {
    const history = this.syncHistory.get(nodeKey);
    if (!history || history.length < 2) {
      return 0;
    }

    // Calculate rate from oldest to newest entry
    const oldest = history[0];
    const newest = history[history.length - 1];

    const blocksDiff = newest.currentBlock - oldest.currentBlock;
    const timeDiff = (newest.timestamp - oldest.timestamp) / 1000; // Convert to seconds

    if (timeDiff === 0) {
      return 0;
    }

    const rate = blocksDiff / timeDiff;
    
    // Cache the rate
    this.syncRates.set(nodeKey, rate);

    return Math.max(0, rate); // Ensure non-negative
  }

  /**
   * Estimate time remaining for sync completion
   * @param {string} nodeKey - Node identifier
   * @param {number} currentBlock - Current block count
   * @param {number} targetBlock - Target block count
   * @param {boolean} isSynced - Whether node is already synced
   * @returns {number|null} Estimated seconds remaining, or null if cannot estimate
   */
  estimateTimeRemaining(nodeKey, currentBlock, targetBlock, isSynced) {
    if (isSynced) {
      return 0;
    }

    const blocksRemaining = targetBlock - currentBlock;
    if (blocksRemaining <= 0) {
      return 0;
    }

    const syncRate = this.calculateSyncRate(nodeKey);
    if (syncRate <= 0) {
      return null; // Cannot estimate without sync rate
    }

    const secondsRemaining = blocksRemaining / syncRate;
    return Math.round(secondsRemaining);
  }

  /**
   * Format time remaining as human-readable string
   * @param {number|null} seconds - Seconds remaining
   * @returns {string} Formatted time string
   */
  formatTimeRemaining(seconds) {
    if (seconds === null || seconds === undefined) {
      return 'Calculating...';
    }

    if (seconds === 0) {
      return 'Complete';
    }

    if (seconds < 60) {
      return `${seconds} seconds`;
    }

    if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }

    if (seconds < 86400) {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours} hour${hours !== 1 ? 's' : ''}${minutes > 0 ? ` ${minutes} min` : ''}`;
    }

    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return `${days} day${days !== 1 ? 's' : ''}${hours > 0 ? ` ${hours} hr` : ''}`;
  }

  /**
   * Check if node is reachable
   * @param {Object} options - Connection options
   * @returns {Promise<boolean>} True if node is reachable
   */
  async isNodeReachable(options = {}) {
    try {
      const status = await this.getSyncStatus(options);
      return status.connected;
    } catch (error) {
      return false;
    }
  }

  /**
   * Wait for node to become synced
   * @param {Object} options - Connection options
   * @param {number} options.checkInterval - Check interval in ms (default: 10000)
   * @param {number} options.maxWaitTime - Max wait time in ms (default: null = infinite)
   * @param {Function} options.onProgress - Progress callback
   * @returns {Promise<Object>} Final sync status
   */
  async waitForSync(options = {}) {
    const {
      checkInterval = 10000,
      maxWaitTime = null,
      onProgress = null,
      ...connectionOptions
    } = options;

    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const check = async () => {
        try {
          const status = await this.getSyncStatus(connectionOptions);

          // Call progress callback if provided
          if (onProgress && typeof onProgress === 'function') {
            onProgress(status);
          }

          // Check if synced
          if (status.synced) {
            resolve(status);
            return;
          }

          // Check if max wait time exceeded
          if (maxWaitTime && (Date.now() - startTime) > maxWaitTime) {
            reject(new Error('Max wait time exceeded'));
            return;
          }

          // Schedule next check
          setTimeout(check, checkInterval);
        } catch (error) {
          reject(error);
        }
      };

      // Start checking
      check();
    });
  }

  /**
   * Get sync status for multiple nodes
   * @param {Array<Object>} nodes - Array of node connection options
   * @returns {Promise<Array<Object>>} Array of sync statuses
   */
  async getMultiNodeStatus(nodes) {
    const promises = nodes.map(node => this.getSyncStatus(node));
    return Promise.all(promises);
  }

  /**
   * Clear sync history for a node
   * @param {string} nodeKey - Node identifier (host:port)
   */
  clearSyncHistory(nodeKey) {
    this.syncHistory.delete(nodeKey);
    this.syncRates.delete(nodeKey);
  }

  /**
   * Clear all sync history
   */
  clearAllSyncHistory() {
    this.syncHistory.clear();
    this.syncRates.clear();
  }

  /**
   * Handle node sync with user choice dialog
   * Presents 3 options: Wait, Continue in background, or Skip
   * @param {Object} options - Node connection options
   * @returns {Promise<Object>} Sync decision with action and configuration
   */
  async handleNodeSync(options = {}) {
    const nodeKey = `${options.host || 'localhost'}:${options.port || 16110}`;
    
    // Check if node is already synced
    const syncStatus = await this.getSyncStatus(options);
    
    if (!syncStatus.connected) {
      return {
        action: 'error',
        message: 'Cannot connect to Kaspa node',
        error: syncStatus.error,
        fallbackRequired: true
      };
    }
    
    if (syncStatus.synced) {
      return {
        action: 'proceed',
        message: 'Node is already synced',
        syncStatus
      };
    }
    
    // Node needs to sync - return status for user decision
    return {
      action: 'needs-sync',
      message: 'Node synchronization required',
      syncStatus,
      estimatedTime: this.formatTimeRemaining(syncStatus.estimatedTimeRemaining),
      options: [
        {
          id: 'wait',
          label: 'Wait for sync to complete',
          description: 'Wizard will show progress and wait for full synchronization',
          recommended: false,
          estimatedTime: syncStatus.estimatedTimeRemaining
        },
        {
          id: 'background',
          label: 'Continue in background',
          description: 'Node syncs while wizard proceeds. Services needing synced node will wait.',
          recommended: true,
          estimatedTime: 0 // Can proceed immediately
        },
        {
          id: 'skip',
          label: 'Skip and use public network',
          description: 'Other services will use public Kaspa nodes instead',
          recommended: false,
          estimatedTime: 0 // Can proceed immediately
        }
      ]
    };
  }

  /**
   * Execute user's sync strategy choice
   * @param {string} choice - User's choice: 'wait', 'background', or 'skip'
   * @param {Object} options - Node connection options
   * @returns {Promise<Object>} Execution result
   */
  async executeSyncStrategy(choice, options = {}) {
    const nodeKey = `${options.host || 'localhost'}:${options.port || 16110}`;
    
    switch (choice) {
      case 'wait':
        return await this.executeWaitStrategy(options);
      
      case 'background':
        return await this.executeBackgroundStrategy(options);
      
      case 'skip':
        return await this.executeSkipStrategy(options);
      
      default:
        throw new Error(`Invalid sync strategy: ${choice}`);
    }
  }

  /**
   * Execute "Wait for sync" strategy
   * Monitors sync progress and waits for completion
   * @param {Object} options - Node connection options
   * @returns {Promise<Object>} Result with sync status
   */
  async executeWaitStrategy(options = {}) {
    const nodeKey = `${options.host || 'localhost'}:${options.port || 16110}`;
    
    return {
      strategy: 'wait',
      action: 'monitor-sync',
      message: 'Waiting for node synchronization',
      nodeKey,
      monitoringConfig: {
        checkInterval: 10000, // Check every 10 seconds
        emitProgress: true,
        blockUntilComplete: true
      }
    };
  }

  /**
   * Execute "Continue in background" strategy
   * Starts background monitoring while allowing wizard to proceed
   * @param {Object} options - Node connection options
   * @returns {Promise<Object>} Result with background task configuration
   */
  async executeBackgroundStrategy(options = {}) {
    const nodeKey = `${options.host || 'localhost'}:${options.port || 16110}`;
    
    return {
      strategy: 'background',
      action: 'background-sync',
      message: 'Node will sync in background',
      nodeKey,
      monitoringConfig: {
        checkInterval: 10000, // Check every 10 seconds
        emitProgress: true,
        blockUntilComplete: false,
        notifyOnComplete: true
      },
      fallbackConfig: {
        usePublicNetwork: true,
        switchWhenSynced: true,
        publicEndpoints: {
          rpc: 'https://api.kaspa.org',
          grpc: 'grpc://api.kaspa.org:16110'
        }
      }
    };
  }

  /**
   * Execute "Skip sync" strategy
   * Configures services to use public network permanently
   * @param {Object} options - Node connection options
   * @returns {Promise<Object>} Result with fallback configuration
   */
  async executeSkipStrategy(options = {}) {
    const nodeKey = `${options.host || 'localhost'}:${options.port || 16110}`;
    
    return {
      strategy: 'skip',
      action: 'use-public',
      message: 'Using public Kaspa network',
      nodeKey,
      monitoringConfig: {
        enabled: false
      },
      fallbackConfig: {
        usePublicNetwork: true,
        switchWhenSynced: false, // Never switch to local
        publicEndpoints: {
          rpc: 'https://api.kaspa.org',
          grpc: 'grpc://api.kaspa.org:16110'
        }
      }
    };
  }

  /**
   * Monitor sync progress with periodic updates
   * Used for both "wait" and "background" strategies
   * @param {Object} options - Monitoring options
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Final sync status
   */
  async monitorSyncProgress(options = {}, onProgress = null) {
    const {
      checkInterval = 10000,
      maxWaitTime = null,
      blockUntilComplete = true,
      ...connectionOptions
    } = options;

    const startTime = Date.now();
    let lastProgress = 0;

    return new Promise((resolve, reject) => {
      const check = async () => {
        try {
          const status = await this.getSyncStatus(connectionOptions);

          // Call progress callback if provided
          if (onProgress && typeof onProgress === 'function') {
            onProgress({
              ...status,
              elapsedTime: Math.floor((Date.now() - startTime) / 1000)
            });
          }

          // Check if synced
          if (status.synced) {
            resolve({
              ...status,
              completed: true,
              elapsedTime: Math.floor((Date.now() - startTime) / 1000)
            });
            return;
          }

          // If not blocking, resolve immediately with current status
          if (!blockUntilComplete && lastProgress === 0) {
            lastProgress = status.percentage;
            resolve({
              ...status,
              completed: false,
              monitoring: true,
              elapsedTime: 0
            });
            return;
          }

          // Check if max wait time exceeded
          if (maxWaitTime && (Date.now() - startTime) > maxWaitTime) {
            reject(new Error('Max wait time exceeded'));
            return;
          }

          // Schedule next check
          setTimeout(check, checkInterval);
        } catch (error) {
          reject(error);
        }
      };

      // Start checking
      check();
    });
  }

  /**
   * Get sync strategy recommendation based on estimated time
   * @param {number} estimatedSeconds - Estimated sync time in seconds
   * @returns {string} Recommended strategy: 'wait', 'background', or 'skip'
   */
  getRecommendedStrategy(estimatedSeconds) {
    if (estimatedSeconds === null || estimatedSeconds === undefined) {
      return 'background'; // Default to background if unknown
    }

    // If sync will complete in < 5 minutes, recommend waiting
    if (estimatedSeconds < 300) {
      return 'wait';
    }

    // If sync will take 5-60 minutes, recommend background
    if (estimatedSeconds < 3600) {
      return 'background';
    }

    // If sync will take > 1 hour, recommend skipping
    return 'skip';
  }

  /**
   * Store user's sync strategy choice
   * @param {string} nodeKey - Node identifier
   * @param {string} strategy - Chosen strategy
   * @param {Object} config - Strategy configuration
   */
  storeSyncStrategy(nodeKey, strategy, config = {}) {
    if (!this.syncStrategies) {
      this.syncStrategies = new Map();
    }

    this.syncStrategies.set(nodeKey, {
      strategy,
      config,
      timestamp: Date.now()
    });
  }

  /**
   * Get stored sync strategy for a node
   * @param {string} nodeKey - Node identifier
   * @returns {Object|null} Stored strategy or null
   */
  getSyncStrategy(nodeKey) {
    if (!this.syncStrategies) {
      return null;
    }

    return this.syncStrategies.get(nodeKey) || null;
  }
}

module.exports = NodeSyncManager;
