const express = require('express');
const BackupManager = require('../utils/backup-manager');

const router = express.Router();
const backupManager = new BackupManager();

// GET /api/backups - List all backups
router.get('/', async (req, res) => {
  try {
    const backups = await backupManager.listBackups();
    res.json({ backups });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to list backups',
      message: error.message
    });
  }
});

// POST /api/backups - Create a new backup
router.post('/', async (req, res) => {
  try {
    const { name, reason, includeData = false } = req.body;
    
    const result = await backupManager.createBackup({
      name,
      reason,
      includeData
    });
    
    if (result.success) {
      res.status(201).json({
        success: true,
        message: 'Backup created successfully',
        backup: result.metadata,
        backupId: result.backupId,
        backupPath: result.backupPath
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to create backup',
        message: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create backup',
      message: error.message
    });
  }
});

// GET /api/backups/:id - Get backup details
router.get('/:id', async (req, res) => {
  try {
    const backupId = req.params.id;
    const result = await backupManager.getBackupDetails(backupId);
    
    if (result.success) {
      res.json({
        success: true,
        backup: result.metadata
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Backup not found',
        message: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get backup details',
      message: error.message
    });
  }
});

// POST /api/backups/:id/restore - Restore a backup
router.post('/:id/restore', async (req, res) => {
  try {
    const backupId = req.params.id;
    const result = await backupManager.restoreBackup(backupId);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Backup restored successfully',
        backupId: result.backupId,
        restoredFiles: result.restoredFiles
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Failed to restore backup',
        message: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to restore backup',
      message: error.message
    });
  }
});

// DELETE /api/backups/:id - Delete a backup
router.delete('/:id', async (req, res) => {
  try {
    const backupId = req.params.id;
    const result = await backupManager.deleteBackup(backupId);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Backup deleted successfully',
        backupId: result.backupId
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Failed to delete backup',
        message: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete backup',
      message: error.message
    });
  }
});

module.exports = router;