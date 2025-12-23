const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * Backup Manager
 * Handles creation and management of configuration backups
 * Requirements: 7.4, 13.4, 17.12, 18.4
 */
class BackupManager {
  constructor() {
    this.projectRoot = process.env.PROJECT_ROOT || path.resolve(__dirname, '../../../../..');
    this.backupDir = path.join(this.projectRoot, '.kaspa-backups');
  }

  /**
   * Initialize backup directory
   * @returns {Promise<Object>} Initialization result
   */
  async initialize() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a backup of current configuration
   * @param {string} reason - Reason for backup
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} Backup result
   */
  async createBackup(reason = 'Manual backup', metadata = {}) {
    try {
      await this.initialize();
      
      const timestamp = Date.now();
      const backupId = `${timestamp}`;
      const backupPath = path.join(this.backupDir, backupId);
      
      // Create backup directory
      await fs.mkdir(backupPath, { recursive: true });
      
      const backedUpFiles = [];
      let totalSize = 0;
      
      // Files to backup
      const filesToBackup = [
        { src: '.env', dest: '.env' },
        { src: 'docker-compose.yml', dest: 'docker-compose.yml' },
        { src: '.kaspa-aio/installation-state.json', dest: 'installation-state.json' }
      ];
      
      // Backup each file
      for (const file of filesToBackup) {
        const srcPath = path.join(this.projectRoot, file.src);
        const destPath = path.join(backupPath, file.dest);
        
        try {
          const stats = await fs.stat(srcPath);
          await fs.copyFile(srcPath, destPath);
          
          backedUpFiles.push({
            file: file.dest,
            size: stats.size,
            originalPath: file.src
          });
          totalSize += stats.size;
        } catch (error) {
          console.warn(`Could not backup ${file.src}:`, error.message);
        }
      }
      
      // Create backup metadata
      const backupMetadata = {
        backupId,
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleString(),
        reason,
        metadata,
        files: backedUpFiles,
        totalSize,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2)
      };
      
      await fs.writeFile(
        path.join(backupPath, 'backup-metadata.json'),
        JSON.stringify(backupMetadata, null, 2)
      );
      
      return {
        success: true,
        backupId,
        backupPath,
        timestamp: backupMetadata.timestamp,
        date: backupMetadata.date,
        backedUpFiles,
        totalSize,
        totalSizeMB: backupMetadata.totalSizeMB
      };
      
    } catch (error) {
      console.error('Error creating backup:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * List all available backups
   * @param {number} limit - Maximum number of backups to return
   * @returns {Promise<Object>} List of backups
   */
  async listBackups(limit = 20) {
    try {
      const backups = [];
      
      // Check if backup directory exists
      try {
        await fs.access(this.backupDir);
      } catch (error) {
        return { success: true, backups: [], total: 0, showing: 0 };
      }
      
      const entries = await fs.readdir(this.backupDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const metadataPath = path.join(this.backupDir, entry.name, 'backup-metadata.json');
          try {
            const metadataContent = await fs.readFile(metadataPath, 'utf8');
            const metadata = JSON.parse(metadataContent);
            
            // Calculate age
            const backupDate = new Date(metadata.timestamp);
            const now = new Date();
            const ageMs = now - backupDate;
            const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
            const ageHours = Math.floor((ageMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            
            let age;
            if (ageDays > 0) {
              age = `${ageDays} day${ageDays > 1 ? 's' : ''} ago`;
            } else if (ageHours > 0) {
              age = `${ageHours} hour${ageHours > 1 ? 's' : ''} ago`;
            } else {
              age = 'Less than 1 hour ago';
            }
            
            backups.push({
              ...metadata,
              age
            });
          } catch (error) {
            console.warn(`Failed to read backup metadata for ${entry.name}:`, error.message);
          }
        }
      }
      
      // Sort by timestamp (newest first)
      backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      const total = backups.length;
      const showing = Math.min(limit, total);
      const limitedBackups = backups.slice(0, limit);
      
      return {
        success: true,
        backups: limitedBackups,
        total,
        showing
      };
      
    } catch (error) {
      console.error('Error listing backups:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get backup details
   * @param {string} backupId - Backup ID
   * @returns {Promise<Object>} Backup details
   */
  async getBackup(backupId) {
    try {
      const backupPath = path.join(this.backupDir, backupId);
      const metadataPath = path.join(backupPath, 'backup-metadata.json');
      
      const metadataContent = await fs.readFile(metadataPath, 'utf8');
      const metadata = JSON.parse(metadataContent);
      
      return {
        success: true,
        backup: metadata
      };
      
    } catch (error) {
      return {
        success: false,
        error: `Backup ${backupId} not found: ${error.message}`
      };
    }
  }

  /**
   * Restore a backup
   * @param {string} backupId - Backup ID to restore
   * @param {Object} options - Restore options
   * @returns {Promise<Object>} Restore result
   */
  async restoreBackup(backupId, options = {}) {
    try {
      const { createBackupBeforeRestore = true, restoreFiles = ['all'] } = options;
      
      const backupPath = path.join(this.backupDir, backupId);
      
      // Check if backup exists
      try {
        await fs.access(backupPath);
      } catch (error) {
        return {
          success: false,
          error: `Backup ${backupId} not found`
        };
      }
      
      let preRestoreBackup = null;
      
      // Create backup before restore if requested
      if (createBackupBeforeRestore) {
        const preRestoreResult = await this.createBackup(
          `Pre-restore backup before restoring ${backupId}`,
          { preRestore: true, restoringFrom: backupId }
        );
        
        if (preRestoreResult.success) {
          preRestoreBackup = preRestoreResult.backupId;
        }
      }
      
      const restoredFiles = [];
      
      // Files to restore
      const filesToRestore = [
        { src: '.env', dest: '.env' },
        { src: 'docker-compose.yml', dest: 'docker-compose.yml' },
        { src: 'installation-state.json', dest: '.kaspa-aio/installation-state.json' }
      ];
      
      // Restore each file
      for (const file of filesToRestore) {
        if (restoreFiles.includes('all') || restoreFiles.includes(file.src)) {
          const srcPath = path.join(backupPath, file.src);
          const destPath = path.join(this.projectRoot, file.dest);
          
          try {
            // Ensure destination directory exists
            await fs.mkdir(path.dirname(destPath), { recursive: true });
            await fs.copyFile(srcPath, destPath);
            restoredFiles.push(file.dest);
          } catch (error) {
            console.warn(`Failed to restore ${file.src}:`, error.message);
          }
        }
      }
      
      return {
        success: true,
        message: `Backup ${backupId} restored successfully`,
        backupId,
        restoredFrom: backupId,
        restoredFiles,
        preRestoreBackup,
        requiresRestart: true
      };
      
    } catch (error) {
      console.error('Error restoring backup:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete a backup
   * @param {string} backupId - Backup ID to delete
   * @returns {Promise<Object>} Deletion result
   */
  async deleteBackup(backupId) {
    try {
      const backupPath = path.join(this.backupDir, backupId);
      
      // Check if backup exists
      try {
        await fs.access(backupPath);
      } catch (error) {
        return {
          success: false,
          error: `Backup ${backupId} not found`
        };
      }
      
      // Remove backup directory
      await fs.rm(backupPath, { recursive: true, force: true });
      
      return {
        success: true,
        message: `Backup ${backupId} deleted successfully`,
        backupId
      };
      
    } catch (error) {
      console.error('Error deleting backup:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get storage usage information
   * @returns {Promise<Object>} Storage usage details
   */
  async getStorageUsage() {
    try {
      let totalSize = 0;
      let fileCount = 0;
      let backupCount = 0;
      
      // Check if backup directory exists
      try {
        await fs.access(this.backupDir);
      } catch (error) {
        return {
          success: true,
          totalSize: 0,
          totalSizeMB: 0,
          totalSizeGB: 0,
          fileCount: 0,
          backupCount: 0,
          backupDir: this.backupDir
        };
      }
      
      const entries = await fs.readdir(this.backupDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          backupCount++;
          const backupPath = path.join(this.backupDir, entry.name);
          
          // Get size of backup directory
          try {
            const { stdout } = await execAsync(`du -sb ${backupPath}`);
            const size = parseInt(stdout.split('\t')[0]);
            totalSize += size;
            
            // Count files in backup
            const files = await fs.readdir(backupPath);
            fileCount += files.length;
          } catch (error) {
            console.warn(`Failed to get size for backup ${entry.name}:`, error.message);
          }
        }
      }
      
      return {
        success: true,
        totalSize,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
        totalSizeGB: (totalSize / (1024 * 1024 * 1024)).toFixed(2),
        fileCount,
        backupCount,
        backupDir: this.backupDir
      };
      
    } catch (error) {
      console.error('Error getting storage usage:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Compare two backups
   * @param {string} backupId1 - First backup ID
   * @param {string} backupId2 - Second backup ID
   * @returns {Promise<Object>} Comparison result
   */
  async compareBackups(backupId1, backupId2) {
    try {
      const backup1Result = await this.getBackup(backupId1);
      const backup2Result = await this.getBackup(backupId2);
      
      if (!backup1Result.success) {
        return { success: false, error: `Backup ${backupId1} not found` };
      }
      
      if (!backup2Result.success) {
        return { success: false, error: `Backup ${backupId2} not found` };
      }
      
      const backup1 = backup1Result.backup;
      const backup2 = backup2Result.backup;
      
      // Simple comparison based on metadata
      const differences = {
        added: [],
        removed: [],
        changed: []
      };
      
      // Compare file lists
      const files1 = backup1.files.map(f => f.file);
      const files2 = backup2.files.map(f => f.file);
      
      // Find added files (in backup2 but not backup1)
      for (const file of files2) {
        if (!files1.includes(file)) {
          differences.added.push(file);
        }
      }
      
      // Find removed files (in backup1 but not backup2)
      for (const file of files1) {
        if (!files2.includes(file)) {
          differences.removed.push(file);
        }
      }
      
      // Find changed files (different sizes)
      for (const file1 of backup1.files) {
        const file2 = backup2.files.find(f => f.file === file1.file);
        if (file2 && file1.size !== file2.size) {
          differences.changed.push({
            file: file1.file,
            oldSize: file1.size,
            newSize: file2.size
          });
        }
      }
      
      return {
        success: true,
        backup1: {
          backupId: backup1.backupId,
          date: backup1.date,
          reason: backup1.reason
        },
        backup2: {
          backupId: backup2.backupId,
          date: backup2.date,
          reason: backup2.reason
        },
        differences
      };
      
    } catch (error) {
      console.error('Error comparing backups:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Clean up old backups (keep last 10)
   * @returns {Promise<Object>} Cleanup result
   */
  async cleanupOldBackups() {
    try {
      const listResult = await this.listBackups(1000); // Get all backups
      
      if (!listResult.success) {
        return { success: false, error: listResult.error };
      }
      
      const backups = listResult.backups;
      const keepCount = 10;
      
      if (backups.length <= keepCount) {
        return {
          success: true,
          deleted: 0,
          remaining: backups.length
        };
      }
      
      // Delete old backups (keep newest 10)
      const toDelete = backups.slice(keepCount);
      let deleted = 0;
      
      for (const backup of toDelete) {
        const deleteResult = await this.deleteBackup(backup.backupId);
        if (deleteResult.success) {
          deleted++;
        }
      }
      
      return {
        success: true,
        deleted,
        remaining: backups.length - deleted
      };
      
    } catch (error) {
      console.error('Error cleaning up old backups:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete all backups
   * @returns {Promise<Object>} Cleanup result
   */
  async cleanupAll() {
    try {
      // Check if backup directory exists
      try {
        await fs.access(this.backupDir);
      } catch (error) {
        return {
          success: true,
          message: 'No backups to delete'
        };
      }
      
      // Remove entire backup directory
      await fs.rm(this.backupDir, { recursive: true, force: true });
      
      return {
        success: true,
        message: 'All backups deleted successfully'
      };
      
    } catch (error) {
      console.error('Error deleting all backups:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = BackupManager;
