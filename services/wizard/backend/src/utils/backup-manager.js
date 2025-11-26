/**
 * Backup Manager
 * Comprehensive configuration backup system for wizard reconfiguration and updates
 * Creates timestamped backups of all configuration files
 */

const fs = require('fs').promises;
const path = require('path');

class BackupManager {
  constructor() {
    // Use PROJECT_ROOT env var, or go up 5 levels from backend/src/utils to project root
    // Path: backend/src/utils -> backend/src -> backend -> wizard -> services -> project root
    this.projectRoot = process.env.PROJECT_ROOT || path.resolve(__dirname, '../../../../..');
    this.backupDir = path.join(this.projectRoot, '.kaspa-backups');
    this.maxBackups = 20; // Keep last 20 backups
    
    console.log(`BackupManager initialized with project root: ${this.projectRoot}`);
    console.log(`Backup directory: ${this.backupDir}`);
  }

  /**
   * Initialize backup directory
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
   * Create comprehensive backup of current configuration
   * Backs up to .kaspa-backups/[timestamp]/
   */
  async createBackup(reason = 'Manual backup', metadata = {}) {
    try {
      await this.initialize();
      
      const timestamp = Date.now();
      const backupPath = path.join(this.backupDir, timestamp.toString());
      
      // Create backup directory
      await fs.mkdir(backupPath, { recursive: true });
      
      const backedUpFiles = [];
      const errors = [];
      
      // Files to backup
      const filesToBackup = [
        { 
          src: '.env', 
          dest: '.env',
          required: false,
          description: 'Environment configuration'
        },
        { 
          src: 'docker-compose.yml', 
          dest: 'docker-compose.yml',
          required: false,
          description: 'Docker Compose configuration'
        },
        { 
          src: 'docker-compose.override.yml', 
          dest: 'docker-compose.override.yml',
          required: false,
          description: 'Docker Compose overrides'
        },
        { 
          src: '.kaspa-aio/installation-state.json', 
          dest: 'installation-state.json',
          required: false,
          description: 'Installation state'
        },
        { 
          src: '.kaspa-aio/wizard-state.json', 
          dest: 'wizard-state.json',
          required: false,
          description: 'Wizard state'
        }
      ];
      
      // Backup each file
      for (const file of filesToBackup) {
        const srcPath = path.join(this.projectRoot, file.src);
        const destPath = path.join(backupPath, file.dest);
        
        try {
          await fs.access(srcPath);
          await fs.copyFile(srcPath, destPath);
          
          // Get file stats
          const stats = await fs.stat(srcPath);
          
          backedUpFiles.push({
            file: file.src,
            description: file.description,
            size: stats.size,
            sizeMB: (stats.size / 1024 / 1024).toFixed(2)
          });
        } catch (error) {
          if (file.required) {
            errors.push({ 
              file: file.src, 
              error: error.message,
              description: file.description
            });
          }
        }
      }
      
      // Create backup metadata
      const backupMetadata = {
        backupId: timestamp.toString(),
        timestamp,
        date: new Date(timestamp).toISOString(),
        reason,
        files: backedUpFiles,
        errors: errors.length > 0 ? errors : undefined,
        metadata: {
          ...metadata,
          createdBy: 'wizard-backup-manager',
          version: '1.0.0'
        }
      };
      
      await fs.writeFile(
        path.join(backupPath, 'backup-metadata.json'),
        JSON.stringify(backupMetadata, null, 2)
      );
      
      // Cleanup old backups
      await this.cleanupOldBackups();
      
      return {
        success: true,
        backupId: timestamp.toString(),
        backupPath,
        timestamp,
        date: new Date(timestamp).toISOString(),
        backedUpFiles,
        errors: errors.length > 0 ? errors : undefined,
        totalSize: backedUpFiles.reduce((sum, f) => sum + f.size, 0),
        totalSizeMB: backedUpFiles.reduce((sum, f) => sum + parseFloat(f.sizeMB), 0).toFixed(2)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * List all available backups
   */
  async listBackups(limit = 20) {
    try {
      await this.initialize();
      
      // Read backup directory
      const entries = await fs.readdir(this.backupDir);
      
      // Filter for timestamp directories
      const backupDirs = entries.filter(entry => /^\d+$/.test(entry));
      
      // Sort by timestamp (newest first)
      backupDirs.sort((a, b) => parseInt(b) - parseInt(a));
      
      // Limit results
      const limitedDirs = backupDirs.slice(0, limit);
      
      // Load metadata for each backup
      const backups = await Promise.all(limitedDirs.map(async (dir) => {
        const backupPath = path.join(this.backupDir, dir);
        const metadataPath = path.join(backupPath, 'backup-metadata.json');
        
        try {
          const metadataContent = await fs.readFile(metadataPath, 'utf8');
          const metadata = JSON.parse(metadataContent);
          
          // Calculate backup size
          const files = await fs.readdir(backupPath);
          let totalSize = 0;
          
          for (const file of files) {
            try {
              const filePath = path.join(backupPath, file);
              const stats = await fs.stat(filePath);
              if (stats.isFile()) {
                totalSize += stats.size;
              }
            } catch (error) {
              // Ignore errors
            }
          }
          
          return {
            backupId: dir,
            timestamp: parseInt(dir),
            date: metadata.date,
            reason: metadata.reason,
            files: metadata.files,
            fileCount: metadata.files.length,
            totalSize,
            totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
            age: this.getAge(metadata.date),
            backupPath,
            canRestore: metadata.files.length > 0
          };
        } catch (error) {
          // Metadata file doesn't exist or is corrupted
          return {
            backupId: dir,
            timestamp: parseInt(dir),
            date: new Date(parseInt(dir)).toISOString(),
            reason: 'Unknown',
            files: [],
            fileCount: 0,
            totalSize: 0,
            totalSizeMB: '0.00',
            age: this.getAge(new Date(parseInt(dir)).toISOString()),
            backupPath,
            canRestore: false,
            error: 'Metadata not found'
          };
        }
      }));
      
      return {
        success: true,
        backups,
        total: backupDirs.length,
        showing: backups.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        backups: []
      };
    }
  }

  /**
   * Get backup details by ID
   */
  async getBackup(backupId) {
    try {
      const backupPath = path.join(this.backupDir, backupId);
      const metadataPath = path.join(backupPath, 'backup-metadata.json');
      
      // Verify backup exists
      try {
        await fs.access(backupPath);
      } catch (error) {
        return {
          success: false,
          error: 'Backup not found'
        };
      }
      
      // Load metadata
      const metadataContent = await fs.readFile(metadataPath, 'utf8');
      const metadata = JSON.parse(metadataContent);
      
      // Get file details
      const files = await fs.readdir(backupPath);
      const fileDetails = await Promise.all(files.map(async (file) => {
        const filePath = path.join(backupPath, file);
        try {
          const stats = await fs.stat(filePath);
          return {
            name: file,
            size: stats.size,
            sizeMB: (stats.size / 1024 / 1024).toFixed(2),
            modified: stats.mtime.toISOString()
          };
        } catch (error) {
          return null;
        }
      }));
      
      return {
        success: true,
        backup: {
          ...metadata,
          backupPath,
          age: this.getAge(metadata.date),
          fileDetails: fileDetails.filter(f => f !== null)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Restore configuration from backup
   */
  async restoreBackup(backupId, options = {}) {
    try {
      const { 
        createBackupBeforeRestore = true,
        restoreFiles = ['all'] // or specific files: ['.env', 'docker-compose.yml']
      } = options;
      
      const backupPath = path.join(this.backupDir, backupId);
      const metadataPath = path.join(backupPath, 'backup-metadata.json');
      
      // Verify backup exists
      try {
        await fs.access(backupPath);
      } catch (error) {
        return {
          success: false,
          error: 'Backup not found'
        };
      }
      
      // Load backup metadata
      const metadataContent = await fs.readFile(metadataPath, 'utf8');
      const metadata = JSON.parse(metadataContent);
      
      // Create backup of current state before restoring
      let preRestoreBackup = null;
      if (createBackupBeforeRestore) {
        const backupResult = await this.createBackup(
          `Pre-restore backup (restoring from ${backupId})`,
          { restoringFrom: backupId }
        );
        
        if (backupResult.success) {
          preRestoreBackup = backupResult.backupId;
        }
      }
      
      // Determine which files to restore
      const filesToRestore = restoreFiles.includes('all') 
        ? metadata.files.map(f => f.file)
        : restoreFiles;
      
      const restoredFiles = [];
      const errors = [];
      
      // File mapping (backup filename -> destination path)
      const fileMapping = {
        '.env': '.env',
        'docker-compose.yml': 'docker-compose.yml',
        'docker-compose.override.yml': 'docker-compose.override.yml',
        'installation-state.json': '.kaspa-aio/installation-state.json',
        'wizard-state.json': '.kaspa-aio/wizard-state.json'
      };
      
      // Restore each file
      for (const file of filesToRestore) {
        const backupFilePath = path.join(backupPath, path.basename(file));
        const destPath = path.join(this.projectRoot, fileMapping[path.basename(file)] || file);
        
        try {
          // Verify backup file exists
          await fs.access(backupFilePath);
          
          // Ensure destination directory exists
          await fs.mkdir(path.dirname(destPath), { recursive: true });
          
          // Restore file
          await fs.copyFile(backupFilePath, destPath);
          
          restoredFiles.push(file);
        } catch (error) {
          errors.push({
            file,
            error: error.message
          });
        }
      }
      
      return {
        success: errors.length === 0,
        backupId,
        restoredFrom: metadata.date,
        restoredFiles,
        errors: errors.length > 0 ? errors : undefined,
        preRestoreBackup,
        requiresRestart: true,
        message: errors.length === 0 
          ? 'Configuration restored successfully'
          : 'Configuration partially restored with errors'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete a backup
   */
  async deleteBackup(backupId) {
    try {
      const backupPath = path.join(this.backupDir, backupId);
      
      // Verify backup exists
      try {
        await fs.access(backupPath);
      } catch (error) {
        return {
          success: false,
          error: 'Backup not found'
        };
      }
      
      // Delete backup directory
      await fs.rm(backupPath, { recursive: true, force: true });
      
      return {
        success: true,
        backupId,
        message: 'Backup deleted successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Cleanup old backups (keep only maxBackups most recent)
   */
  async cleanupOldBackups() {
    try {
      const entries = await fs.readdir(this.backupDir);
      
      // Filter for timestamp directories
      const backupDirs = entries.filter(entry => /^\d+$/.test(entry));
      
      // Sort by timestamp (oldest first)
      backupDirs.sort((a, b) => parseInt(a) - parseInt(b));
      
      // Delete old backups if we exceed maxBackups
      if (backupDirs.length > this.maxBackups) {
        const toDelete = backupDirs.slice(0, backupDirs.length - this.maxBackups);
        
        for (const dir of toDelete) {
          const backupPath = path.join(this.backupDir, dir);
          try {
            await fs.rm(backupPath, { recursive: true, force: true });
          } catch (error) {
            console.error(`Failed to delete old backup ${dir}:`, error);
          }
        }
        
        return {
          success: true,
          deleted: toDelete.length,
          remaining: this.maxBackups
        };
      }
      
      return {
        success: true,
        deleted: 0,
        remaining: backupDirs.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get storage usage for backups
   */
  async getStorageUsage() {
    try {
      await this.initialize();
      
      const entries = await fs.readdir(this.backupDir);
      const backupDirs = entries.filter(entry => /^\d+$/.test(entry));
      
      let totalSize = 0;
      let fileCount = 0;
      
      for (const dir of backupDirs) {
        const backupPath = path.join(this.backupDir, dir);
        const files = await fs.readdir(backupPath);
        
        for (const file of files) {
          try {
            const filePath = path.join(backupPath, file);
            const stats = await fs.stat(filePath);
            if (stats.isFile()) {
              totalSize += stats.size;
              fileCount++;
            }
          } catch (error) {
            // Ignore errors
          }
        }
      }
      
      return {
        success: true,
        totalSize,
        totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
        totalSizeGB: (totalSize / 1024 / 1024 / 1024).toFixed(2),
        fileCount,
        backupCount: backupDirs.length,
        backupDir: this.backupDir
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Compare two backups
   */
  async compareBackups(backupId1, backupId2) {
    try {
      const backup1 = await this.getBackup(backupId1);
      const backup2 = await this.getBackup(backupId2);
      
      if (!backup1.success || !backup2.success) {
        return {
          success: false,
          error: 'One or both backups not found'
        };
      }
      
      // Load .env files from both backups
      const env1Path = path.join(this.backupDir, backupId1, '.env');
      const env2Path = path.join(this.backupDir, backupId2, '.env');
      
      let config1 = {};
      let config2 = {};
      
      try {
        const env1Content = await fs.readFile(env1Path, 'utf8');
        config1 = this.parseEnvFile(env1Content);
      } catch (error) {
        // .env not in backup1
      }
      
      try {
        const env2Content = await fs.readFile(env2Path, 'utf8');
        config2 = this.parseEnvFile(env2Content);
      } catch (error) {
        // .env not in backup2
      }
      
      // Calculate differences
      const differences = this.findDifferences(config1, config2);
      
      return {
        success: true,
        backup1: {
          backupId: backupId1,
          date: backup1.backup.date,
          reason: backup1.backup.reason
        },
        backup2: {
          backupId: backupId2,
          date: backup2.backup.date,
          reason: backup2.backup.reason
        },
        differences
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Parse .env file content
   */
  parseEnvFile(content) {
    const config = {};
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }
      
      // Parse key=value
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        
        config[key] = value;
      }
    }
    
    return config;
  }

  /**
   * Find differences between two configurations
   */
  findDifferences(config1, config2) {
    const differences = {
      added: [],
      removed: [],
      changed: []
    };
    
    const keys1 = Object.keys(config1);
    const keys2 = Object.keys(config2);
    
    // Find added keys
    for (const key of keys2) {
      if (!keys1.includes(key)) {
        differences.added.push({
          key,
          value: config2[key]
        });
      }
    }
    
    // Find removed keys
    for (const key of keys1) {
      if (!keys2.includes(key)) {
        differences.removed.push({
          key,
          value: config1[key]
        });
      }
    }
    
    // Find changed keys
    for (const key of keys1) {
      if (keys2.includes(key) && config1[key] !== config2[key]) {
        differences.changed.push({
          key,
          oldValue: config1[key],
          newValue: config2[key]
        });
      }
    }
    
    return differences;
  }

  /**
   * Get age of timestamp in human-readable format
   */
  getAge(timestamp) {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
  }

  /**
   * Clean up all backups
   */
  async cleanupAll() {
    try {
      // Remove backup directory
      await fs.rm(this.backupDir, { recursive: true, force: true });
      
      return {
        success: true,
        message: 'All backups cleaned up'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = BackupManager;
