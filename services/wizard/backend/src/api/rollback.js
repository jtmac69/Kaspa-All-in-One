const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const RollbackManager = require('../utils/rollback-manager');
const DockerManager = require('../utils/docker-manager');

const rollbackManager = new RollbackManager();
const dockerManager = new DockerManager();

/**
 * POST /api/rollback/save-version
 * Save current configuration as a version
 */
router.post('/save-version', async (req, res) => {
  try {
    const { config, profiles, metadata } = req.body;
    
    if (!config) {
      return res.status(400).json({
        success: false,
        error: 'Missing config'
      });
    }
    
    const result = await rollbackManager.saveVersion(config, profiles || [], metadata || {});
    res.json(result);
  } catch (error) {
    console.error('Error saving version:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save version',
      message: error.message
    });
  }
});

/**
 * GET /api/rollback/history
 * Get configuration history
 */
router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const result = await rollbackManager.getHistory(limit);
    res.json(result);
  } catch (error) {
    console.error('Error getting history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get history',
      message: error.message
    });
  }
});

/**
 * POST /api/rollback/restore
 * Restore configuration from a version
 */
router.post('/restore', async (req, res) => {
  try {
    const { versionId, restartServices } = req.body;
    
    if (!versionId) {
      return res.status(400).json({
        success: false,
        error: 'Missing versionId'
      });
    }
    
    const result = await rollbackManager.restoreVersion(versionId);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    // Optionally restart services
    if (restartServices && result.profiles) {
      try {
        await dockerManager.stopAllServices();
        await new Promise(resolve => setTimeout(resolve, 3000));
        await dockerManager.startServices(result.profiles);
      } catch (error) {
        return res.json({
          ...result,
          restartError: error.message,
          message: 'Configuration restored but services restart failed'
        });
      }
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error restoring version:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to restore version',
      message: error.message
    });
  }
});

/**
 * POST /api/rollback/undo
 * Undo last configuration change (restore most recent version)
 */
router.post('/undo', async (req, res) => {
  try {
    const { restartServices } = req.body;
    
    // Get latest version
    const latestResult = await rollbackManager.getLatestVersion();
    
    if (!latestResult.success) {
      // Return 200 with success:false instead of 404
      // 404 suggests endpoint not found, which is confusing
      return res.status(200).json({
        success: false,
        error: 'No previous versions available',
        message: 'There are no saved configurations to undo to. Make some changes first.'
      });
    }
    
    // Restore it
    const result = await rollbackManager.restoreVersion(latestResult.version.versionId);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    // Load the restored configuration to return to frontend
    const restoredConfig = await rollbackManager.loadVersionConfig(result.backupPath || latestResult.version.backupPath);
    
    // Optionally restart services
    if (restartServices && result.profiles) {
      try {
        await dockerManager.stopAllServices();
        await new Promise(resolve => setTimeout(resolve, 3000));
        await dockerManager.startServices(result.profiles);
      } catch (error) {
        return res.json({
          ...result,
          config: restoredConfig,
          restartError: error.message,
          message: 'Configuration restored but services restart failed'
        });
      }
    }
    
    res.json({
      ...result,
      config: restoredConfig,
      message: 'Undone to previous configuration'
    });
  } catch (error) {
    console.error('Error undoing change:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to undo change',
      message: error.message
    });
  }
});

/**
 * GET /api/rollback/compare
 * Compare two configuration versions
 */
router.get('/compare', async (req, res) => {
  try {
    const { version1, version2 } = req.query;
    
    if (!version1 || !version2) {
      return res.status(400).json({
        success: false,
        error: 'Missing version1 or version2'
      });
    }
    
    const result = await rollbackManager.compareVersions(version1, version2);
    res.json(result);
  } catch (error) {
    console.error('Error comparing versions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to compare versions',
      message: error.message
    });
  }
});

/**
 * POST /api/rollback/checkpoint
 * Create installation checkpoint
 */
router.post('/checkpoint', async (req, res) => {
  try {
    const { stage, data } = req.body;
    
    if (!stage) {
      return res.status(400).json({
        success: false,
        error: 'Missing stage'
      });
    }
    
    const result = await rollbackManager.createCheckpoint(stage, data || {});
    res.json(result);
  } catch (error) {
    console.error('Error creating checkpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create checkpoint',
      message: error.message
    });
  }
});

/**
 * GET /api/rollback/checkpoints
 * Get all checkpoints
 */
router.get('/checkpoints', async (req, res) => {
  try {
    const result = await rollbackManager.getCheckpoints();
    res.json(result);
  } catch (error) {
    console.error('Error getting checkpoints:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get checkpoints',
      message: error.message
    });
  }
});

/**
 * POST /api/rollback/restore-checkpoint
 * Restore from checkpoint
 */
router.post('/restore-checkpoint', async (req, res) => {
  try {
    const { checkpointId } = req.body;
    
    if (!checkpointId) {
      return res.status(400).json({
        success: false,
        error: 'Missing checkpointId'
      });
    }
    
    const result = await rollbackManager.restoreCheckpoint(checkpointId);
    res.json(result);
  } catch (error) {
    console.error('Error restoring checkpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to restore checkpoint',
      message: error.message
    });
  }
});

/**
 * DELETE /api/rollback/checkpoint/:checkpointId
 * Delete a checkpoint
 */
router.delete('/checkpoint/:checkpointId', async (req, res) => {
  try {
    const { checkpointId } = req.params;
    const result = await rollbackManager.deleteCheckpoint(checkpointId);
    res.json(result);
  } catch (error) {
    console.error('Error deleting checkpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete checkpoint',
      message: error.message
    });
  }
});

/**
 * POST /api/rollback/start-over
 * Start over - clean up everything and reset
 */
router.post('/start-over', async (req, res) => {
  try {
    const { deleteData, deleteConfig, deleteBackups } = req.body;
    
    const results = {
      success: true,
      actions: []
    };
    
    // Stop all services
    try {
      await dockerManager.stopAllServices();
      results.actions.push({ action: 'stop-services', success: true });
    } catch (error) {
      results.actions.push({ 
        action: 'stop-services', 
        success: false, 
        error: error.message 
      });
    }
    
    // Remove containers
    if (deleteData) {
      try {
        await dockerManager.removeAllContainers();
        results.actions.push({ action: 'remove-containers', success: true });
      } catch (error) {
        results.actions.push({ 
          action: 'remove-containers', 
          success: false, 
          error: error.message 
        });
      }
      
      // Remove volumes
      try {
        await dockerManager.removeAllVolumes();
        results.actions.push({ action: 'remove-volumes', success: true });
      } catch (error) {
        results.actions.push({ 
          action: 'remove-volumes', 
          success: false, 
          error: error.message 
        });
      }
    }
    
    // Delete configuration
    if (deleteConfig) {
      try {
        const projectRoot = process.env.PROJECT_ROOT || '/workspace';
        const envPath = path.join(projectRoot, '.env');
        const wizardConfigPath = path.join(projectRoot, '.wizard-config.json');
        
        try {
          await fs.unlink(envPath);
        } catch (error) {
          // File might not exist
        }
        
        try {
          await fs.unlink(wizardConfigPath);
        } catch (error) {
          // File might not exist
        }
        
        results.actions.push({ action: 'delete-config', success: true });
      } catch (error) {
        results.actions.push({ 
          action: 'delete-config', 
          success: false, 
          error: error.message 
        });
      }
    }
    
    // Delete backups
    if (deleteBackups) {
      try {
        const cleanupResult = await rollbackManager.cleanupAll();
        results.actions.push({ 
          action: 'delete-backups', 
          success: cleanupResult.success,
          error: cleanupResult.error
        });
      } catch (error) {
        results.actions.push({ 
          action: 'delete-backups', 
          success: false, 
          error: error.message 
        });
      }
    }
    
    // Check if any action failed
    const anyFailed = results.actions.some(a => !a.success);
    if (anyFailed) {
      results.success = false;
      results.message = 'Some actions failed during start over';
    } else {
      results.message = 'Successfully reset to clean state';
    }
    
    res.json(results);
  } catch (error) {
    console.error('Error starting over:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start over',
      message: error.message
    });
  }
});

/**
 * GET /api/rollback/storage
 * Get storage usage for backups
 */
router.get('/storage', async (req, res) => {
  try {
    const result = await rollbackManager.getStorageUsage();
    res.json(result);
  } catch (error) {
    console.error('Error getting storage usage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get storage usage',
      message: error.message
    });
  }
});

module.exports = router;
