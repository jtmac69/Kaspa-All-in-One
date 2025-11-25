/**
 * Node Sync API
 * 
 * Provides REST API endpoints for monitoring Kaspa node synchronization status.
 * Supports querying sync progress, checking node reachability, and tracking
 * multiple nodes.
 */

const express = require('express');
const NodeSyncManager = require('../utils/node-sync-manager');

const router = express.Router();
const syncManager = new NodeSyncManager();

/**
 * GET /api/node/sync-status
 * 
 * Get current sync status for a Kaspa node
 * 
 * Query Parameters:
 * - host: Node hostname (default: 'localhost')
 * - port: RPC port (default: 16110)
 * - useHttps: Use HTTPS (default: false)
 * 
 * Response:
 * {
 *   connected: boolean,
 *   synced: boolean,
 *   currentBlock: number,
 *   targetBlock: number,
 *   blocksRemaining: number,
 *   percentage: number,
 *   estimatedTimeRemaining: number (seconds),
 *   syncRate: number (blocks/second),
 *   timestamp: number,
 *   nodeInfo: {
 *     host: string,
 *     port: number,
 *     networkName: string,
 *     tipHashes: array,
 *     difficulty: number
 *   }
 * }
 */
router.get('/sync-status', async (req, res) => {
  try {
    const {
      host = 'localhost',
      port = 16110,
      useHttps = false
    } = req.query;

    const options = {
      host,
      port: parseInt(port, 10),
      useHttps: useHttps === 'true' || useHttps === true
    };

    const status = await syncManager.getSyncStatus(options);

    // Add formatted time remaining
    if (status.estimatedTimeRemaining !== null && status.estimatedTimeRemaining !== undefined) {
      status.estimatedTimeRemainingFormatted = syncManager.formatTimeRemaining(status.estimatedTimeRemaining);
    }

    res.json({
      success: true,
      status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/node/is-reachable
 * 
 * Check if a Kaspa node is reachable
 * 
 * Query Parameters:
 * - host: Node hostname (default: 'localhost')
 * - port: RPC port (default: 16110)
 * - useHttps: Use HTTPS (default: false)
 * 
 * Response:
 * {
 *   success: boolean,
 *   reachable: boolean
 * }
 */
router.get('/is-reachable', async (req, res) => {
  try {
    const {
      host = 'localhost',
      port = 16110,
      useHttps = false
    } = req.query;

    const options = {
      host,
      port: parseInt(port, 10),
      useHttps: useHttps === 'true' || useHttps === true
    };

    const reachable = await syncManager.isNodeReachable(options);

    res.json({
      success: true,
      reachable
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/node/multi-status
 * 
 * Get sync status for multiple nodes
 * 
 * Request Body:
 * {
 *   nodes: [
 *     { host: 'localhost', port: 16110, useHttps: false },
 *     { host: 'node2.example.com', port: 16110, useHttps: true }
 *   ]
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   statuses: [
 *     { connected: boolean, synced: boolean, ... },
 *     { connected: boolean, synced: boolean, ... }
 *   ]
 * }
 */
router.post('/multi-status', async (req, res) => {
  try {
    const { nodes } = req.body;

    if (!nodes || !Array.isArray(nodes)) {
      return res.status(400).json({
        success: false,
        error: 'nodes array is required'
      });
    }

    const statuses = await syncManager.getMultiNodeStatus(nodes);

    // Add formatted time remaining to each status
    statuses.forEach(status => {
      if (status.estimatedTimeRemaining !== null && status.estimatedTimeRemaining !== undefined) {
        status.estimatedTimeRemainingFormatted = syncManager.formatTimeRemaining(status.estimatedTimeRemaining);
      }
    });

    res.json({
      success: true,
      statuses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/node/sync-history
 * 
 * Clear sync history for a node or all nodes
 * 
 * Query Parameters:
 * - host: Node hostname (optional, if not provided clears all)
 * - port: RPC port (optional, required if host is provided)
 * 
 * Response:
 * {
 *   success: boolean,
 *   message: string
 * }
 */
router.delete('/sync-history', (req, res) => {
  try {
    const { host, port } = req.query;

    if (host && port) {
      const nodeKey = `${host}:${port}`;
      syncManager.clearSyncHistory(nodeKey);
      res.json({
        success: true,
        message: `Sync history cleared for ${nodeKey}`
      });
    } else {
      syncManager.clearAllSyncHistory();
      res.json({
        success: true,
        message: 'All sync history cleared'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/node/sync-rate
 * 
 * Get current sync rate for a node
 * 
 * Query Parameters:
 * - host: Node hostname (default: 'localhost')
 * - port: RPC port (default: 16110)
 * 
 * Response:
 * {
 *   success: boolean,
 *   syncRate: number (blocks/second),
 *   formatted: string
 * }
 */
router.get('/sync-rate', (req, res) => {
  try {
    const {
      host = 'localhost',
      port = 16110
    } = req.query;

    const nodeKey = `${host}:${port}`;
    const syncRate = syncManager.calculateSyncRate(nodeKey);

    res.json({
      success: true,
      syncRate,
      formatted: `${syncRate.toFixed(2)} blocks/second`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
