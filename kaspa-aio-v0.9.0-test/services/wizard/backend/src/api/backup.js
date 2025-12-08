/**
 * Backup API
 * API endpoints for configuration backup and restore operations
 */

const express = require('express');
const router = express.Router();
const BackupManager = require('../utils/backup-manager');

const backupManager = new BackupManager();

/**
 * POST /api/wizard/backup
 * Create a new backup of current configuration
 */
router.post('/', async (req, res) => {
  try {
    const { reason = 'Manual backup', metadata = {} } = req.body;
    
    const result = await backupManager.createBackup(reason, metadata);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create backup',
        message: result.error
      });
    }
    
    res.json({
      success: true,
      message: 'Backup created successfully',
      backup: {
        backupId: result.backupId,
        backupPath: result.backupPath,
        timestamp: result.timestamp,
        date: result.date,
        backedUpFiles: result.backedUpFiles,
        totalSize: result.totalSize,
        totalSizeMB: result.totalSizeMB
      },
      errors: result.errors
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create backup',
      message: error.message
    });
  }
});

/**
 * GET /api/wizard/backups
 * List all available backups
 */
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    
    const result = await backupManager.listBackups(limit);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to list backups',
        message: result.error
      });
    }
    
    res.json({
      success: true,
      backups: result.backups,
      total: result.total,
      showing: result.showing
    });
  } catch (error) {
    console.error('Error listing backups:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list backups',
      message: error.message
    });
  }
});

/**
 * GET /api/wizard/backups/:backupId
 * Get details of a specific backup
 */
router.get('/:backupId', async (req, res) => {
  try {
    const { backupId } = req.params;
    
    const result = await backupManager.getBackup(backupId);
    
    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: 'Backup not found',
        message: result.error
      });
    }
    
    res.json({
      success: true,
      backup: result.backup
    });
  } catch (error) {
    console.error('Error getting backup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get backup',
      message: error.message
    });
  }
});

/**
 * POST /api/wizard/rollback
 * Restore configuration from a backup
 */
router.post('/', async (req, res) => {
  try {
    const { 
      backupId, 
      createBackupBeforeRestore = true,
      restoreFiles = ['all']
    } = req.body;
    
    if (!backupId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: backupId'
      });
    }
    
    const result = await backupManager.restoreBackup(backupId, {
      createBackupBeforeRestore,
      restoreFiles
    });
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to restore backup',
        message: result.error
      });
    }
    
    res.json({
      success: true,
      message: result.message,
      backupId: result.backupId,
      restoredFrom: result.restoredFrom,
      restoredFiles: result.restoredFiles,
      preRestoreBackup: result.preRestoreBackup,
      requiresRestart: result.requiresRestart,
      errors: result.errors
    });
  } catch (error) {
    console.error('Error restoring backup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to restore backup',
      message: error.message
    });
  }
});

/**
 * DELETE /api/wizard/backups/:backupId
 * Delete a specific backup
 */
router.delete('/:backupId', async (req, res) => {
  try {
    const { backupId } = req.params;
    
    const result = await backupManager.deleteBackup(backupId);
    
    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: 'Failed to delete backup',
        message: result.error
      });
    }
    
    res.json({
      success: true,
      message: result.message,
      backupId: result.backupId
    });
  } catch (error) {
    console.error('Error deleting backup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete backup',
      message: error.message
    });
  }
});

/**
 * GET /api/wizard/backups/storage/usage
 * Get storage usage information for backups
 */
router.get('/storage/usage', async (req, res) => {
  try {
    const result = await backupManager.getStorageUsage();
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to get storage usage',
        message: result.error
      });
    }
    
    res.json({
      success: true,
      storage: {
        totalSize: result.totalSize,
        totalSizeMB: result.totalSizeMB,
        totalSizeGB: result.totalSizeGB,
        fileCount: result.fileCount,
        backupCount: result.backupCount,
        backupDir: result.backupDir
      }
    });
  } catch (error) {
    console.error('Error getting storage usage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get storage usage',
      message: error.message
    });
  }
});

/**
 * POST /api/wizard/backups/compare
 * Compare two backups
 */
router.post('/compare', async (req, res) => {
  try {
    const { backupId1, backupId2 } = req.body;
    
    if (!backupId1 || !backupId2) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: backupId1 and backupId2'
      });
    }
    
    const result = await backupManager.compareBackups(backupId1, backupId2);
    
    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: 'Failed to compare backups',
        message: result.error
      });
    }
    
    res.json({
      success: true,
      backup1: result.backup1,
      backup2: result.backup2,
      differences: result.differences
    });
  } catch (error) {
    console.error('Error comparing backups:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to compare backups',
      message: error.message
    });
  }
});

/**
 * POST /api/wizard/backups/cleanup
 * Clean up old backups
 */
router.post('/cleanup', async (req, res) => {
  try {
    const result = await backupManager.cleanupOldBackups();
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to cleanup backups',
        message: result.error
      });
    }
    
    res.json({
      success: true,
      message: 'Old backups cleaned up successfully',
      deleted: result.deleted,
      remaining: result.remaining
    });
  } catch (error) {
    console.error('Error cleaning up backups:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup backups',
      message: error.message
    });
  }
});

/**
 * DELETE /api/wizard/backups
 * Delete all backups (use with caution)
 */
router.delete('/', async (req, res) => {
  try {
    const { confirm } = req.body;
    
    if (confirm !== 'DELETE_ALL_BACKUPS') {
      return res.status(400).json({
        success: false,
        error: 'Confirmation required. Send { confirm: "DELETE_ALL_BACKUPS" }'
      });
    }
    
    const result = await backupManager.cleanupAll();
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to delete all backups',
        message: result.error
      });
    }
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Error deleting all backups:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete all backups',
      message: error.message
    });
  }
});

module.exports = router;
