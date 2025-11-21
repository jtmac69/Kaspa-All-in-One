/**
 * Rollback Manager
 * Provides configuration versioning, rollback, checkpoints, and recovery functionality
 */

const fs = require('fs').promises;
const path = require('path');

class RollbackManager {
  constructor() {
    // Use PROJECT_ROOT env var, or go up 5 levels from backend/src/utils to project root
    // Path: backend/src/utils -> backend/src -> backend -> wizard -> services -> project root
    this.projectRoot = process.env.PROJECT_ROOT || path.resolve(__dirname, '../../../../..');
    this.backupDir = path.join(this.projectRoot, '.kaspa-backups');
    this.historyFile = path.join(this.backupDir, 'history.json');
    this.checkpointFile = path.join(this.backupDir, 'checkpoints.json');
    this.maxHistoryEntries = 50; // Keep last 50 configuration changes
    this.maxCheckpoints = 10; // Keep last 10 checkpoints
    
    console.log(`RollbackManager initialized with project root: ${this.projectRoot}`);
    console.log(`Backup directory: ${this.backupDir}`);
  }

  /**
   * Initialize backup directory and history
   */
  async initialize() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      
      // Initialize history file if it doesn't exist
      try {
        await fs.access(this.historyFile);
      } catch {
        await fs.writeFile(this.historyFile, JSON.stringify({ entries: [] }, null, 2));
      }
      
      // Initialize checkpoint file if it doesn't exist
      try {
        await fs.access(this.checkpointFile);
      } catch {
        await fs.writeFile(this.checkpointFile, JSON.stringify({ checkpoints: [] }, null, 2));
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Save configuration version to history
   */
  async saveVersion(config, profiles, metadata = {}) {
    try {
      await this.initialize();
      
      const timestamp = new Date().toISOString();
      const versionId = `v-${Date.now()}`;
      const backupFilename = `.env.${versionId}`;
      const backupPath = path.join(this.backupDir, backupFilename);
      
      // Read current .env file
      const envPath = path.join(this.projectRoot, '.env');
      let envContent = '';
      try {
        envContent = await fs.readFile(envPath, 'utf8');
      } catch (error) {
        // No existing .env file
        envContent = this.generateEnvContent(config, profiles);
      }
      
      // Save backup
      await fs.writeFile(backupPath, envContent);
      
      // Load history
      const historyData = await this.loadHistory();
      
      // Create history entry
      const entry = {
        versionId,
        timestamp,
        backupFilename,
        backupPath,
        profiles: profiles || [],
        metadata: {
          ...metadata,
          configKeys: Object.keys(config || {}),
          action: metadata.action || 'manual-save'
        }
      };
      
      // Add to history
      historyData.entries.unshift(entry);
      
      // Trim history to max entries
      if (historyData.entries.length > this.maxHistoryEntries) {
        const removed = historyData.entries.splice(this.maxHistoryEntries);
        // Delete old backup files
        for (const old of removed) {
          try {
            await fs.unlink(old.backupPath);
          } catch (error) {
            // Ignore errors deleting old backups
          }
        }
      }
      
      // Save history
      await fs.writeFile(this.historyFile, JSON.stringify(historyData, null, 2));
      
      return {
        success: true,
        versionId,
        timestamp,
        entry
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Load configuration history
   */
  async loadHistory() {
    try {
      const content = await fs.readFile(this.historyFile, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      return { entries: [] };
    }
  }

  /**
   * Get configuration history
   */
  async getHistory(limit = 20) {
    try {
      const historyData = await this.loadHistory();
      const entries = historyData.entries.slice(0, limit);
      
      // Enrich entries with additional info
      const enriched = await Promise.all(entries.map(async (entry) => {
        let size = 0;
        try {
          const stats = await fs.stat(entry.backupPath);
          size = stats.size;
        } catch (error) {
          // File might not exist
        }
        
        return {
          ...entry,
          size,
          age: this.getAge(entry.timestamp),
          canRestore: size > 0
        };
      }));
      
      return {
        success: true,
        entries: enriched,
        total: historyData.entries.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        entries: []
      };
    }
  }

  /**
   * Restore configuration from version
   */
  async restoreVersion(versionId) {
    try {
      const historyData = await this.loadHistory();
      const entry = historyData.entries.find(e => e.versionId === versionId);
      
      if (!entry) {
        return {
          success: false,
          error: 'Version not found'
        };
      }
      
      // Verify backup file exists
      try {
        await fs.access(entry.backupPath);
      } catch (error) {
        return {
          success: false,
          error: 'Backup file not found'
        };
      }
      
      // Save current config before restoring
      const envPath = path.join(this.projectRoot, '.env');
      try {
        const currentContent = await fs.readFile(envPath, 'utf8');
        const currentConfig = this.parseEnvContent(currentContent);
        await this.saveVersion(currentConfig, entry.profiles, {
          action: 'pre-restore-backup',
          restoringFrom: versionId
        });
      } catch (error) {
        // No current config to backup
      }
      
      // Restore backup
      await fs.copyFile(entry.backupPath, envPath);
      
      return {
        success: true,
        versionId,
        timestamp: entry.timestamp,
        profiles: entry.profiles,
        requiresRestart: true
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create installation checkpoint
   */
  async createCheckpoint(stage, data = {}) {
    try {
      await this.initialize();
      
      const timestamp = new Date().toISOString();
      const checkpointId = `cp-${Date.now()}`;
      
      // Load checkpoints
      const checkpointData = await this.loadCheckpoints();
      
      // Create checkpoint entry
      const checkpoint = {
        checkpointId,
        timestamp,
        stage,
        data: {
          ...data,
          timestamp
        }
      };
      
      // Save checkpoint data to file
      const checkpointFilename = `${checkpointId}.json`;
      const checkpointPath = path.join(this.backupDir, checkpointFilename);
      await fs.writeFile(checkpointPath, JSON.stringify(checkpoint, null, 2));
      
      // Add to checkpoint list
      checkpointData.checkpoints.unshift({
        checkpointId,
        timestamp,
        stage,
        checkpointPath
      });
      
      // Trim checkpoints to max
      if (checkpointData.checkpoints.length > this.maxCheckpoints) {
        const removed = checkpointData.checkpoints.splice(this.maxCheckpoints);
        // Delete old checkpoint files
        for (const old of removed) {
          try {
            await fs.unlink(old.checkpointPath);
          } catch (error) {
            // Ignore errors
          }
        }
      }
      
      // Save checkpoint list
      await fs.writeFile(this.checkpointFile, JSON.stringify(checkpointData, null, 2));
      
      return {
        success: true,
        checkpointId,
        timestamp,
        stage
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Load checkpoints
   */
  async loadCheckpoints() {
    try {
      const content = await fs.readFile(this.checkpointFile, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      return { checkpoints: [] };
    }
  }

  /**
   * Get checkpoints
   */
  async getCheckpoints() {
    try {
      const checkpointData = await this.loadCheckpoints();
      
      // Enrich checkpoints with additional info
      const enriched = await Promise.all(checkpointData.checkpoints.map(async (cp) => {
        let data = {};
        try {
          const content = await fs.readFile(cp.checkpointPath, 'utf8');
          const checkpoint = JSON.parse(content);
          data = checkpoint.data || {};
        } catch (error) {
          // File might not exist
        }
        
        return {
          ...cp,
          age: this.getAge(cp.timestamp),
          data
        };
      }));
      
      return {
        success: true,
        checkpoints: enriched
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        checkpoints: []
      };
    }
  }

  /**
   * Restore from checkpoint
   */
  async restoreCheckpoint(checkpointId) {
    try {
      const checkpointData = await this.loadCheckpoints();
      const checkpoint = checkpointData.checkpoints.find(cp => cp.checkpointId === checkpointId);
      
      if (!checkpoint) {
        return {
          success: false,
          error: 'Checkpoint not found'
        };
      }
      
      // Load checkpoint data
      const content = await fs.readFile(checkpoint.checkpointPath, 'utf8');
      const checkpointInfo = JSON.parse(content);
      
      return {
        success: true,
        checkpointId,
        stage: checkpoint.stage,
        data: checkpointInfo.data,
        timestamp: checkpoint.timestamp
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete checkpoint
   */
  async deleteCheckpoint(checkpointId) {
    try {
      const checkpointData = await this.loadCheckpoints();
      const index = checkpointData.checkpoints.findIndex(cp => cp.checkpointId === checkpointId);
      
      if (index === -1) {
        return {
          success: false,
          error: 'Checkpoint not found'
        };
      }
      
      const checkpoint = checkpointData.checkpoints[index];
      
      // Delete checkpoint file
      try {
        await fs.unlink(checkpoint.checkpointPath);
      } catch (error) {
        // Ignore errors
      }
      
      // Remove from list
      checkpointData.checkpoints.splice(index, 1);
      
      // Save updated list
      await fs.writeFile(this.checkpointFile, JSON.stringify(checkpointData, null, 2));
      
      return {
        success: true,
        checkpointId
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get the most recent version (for undo)
   */
  async getLatestVersion() {
    try {
      const historyData = await this.loadHistory();
      if (historyData.entries.length === 0) {
        return {
          success: false,
          error: 'No previous versions available'
        };
      }
      
      const latest = historyData.entries[0];
      return {
        success: true,
        version: latest
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Compare two versions
   */
  async compareVersions(versionId1, versionId2) {
    try {
      const historyData = await this.loadHistory();
      const version1 = historyData.entries.find(e => e.versionId === versionId1);
      const version2 = historyData.entries.find(e => e.versionId === versionId2);
      
      if (!version1 || !version2) {
        return {
          success: false,
          error: 'One or both versions not found'
        };
      }
      
      // Load both configs
      const config1 = await this.loadVersionConfig(version1.backupPath);
      const config2 = await this.loadVersionConfig(version2.backupPath);
      
      // Compare
      const differences = this.findDifferences(config1, config2);
      
      return {
        success: true,
        version1: {
          versionId: version1.versionId,
          timestamp: version1.timestamp,
          profiles: version1.profiles
        },
        version2: {
          versionId: version2.versionId,
          timestamp: version2.timestamp,
          profiles: version2.profiles
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
   * Load configuration from version backup
   */
  async loadVersionConfig(backupPath) {
    try {
      const content = await fs.readFile(backupPath, 'utf8');
      return this.parseEnvContent(content);
    } catch (error) {
      return {};
    }
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
   * Parse .env file content
   */
  parseEnvContent(content) {
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
   * Generate .env content from config
   */
  generateEnvContent(config, profiles) {
    let content = '# Kaspa All-in-One Configuration\n';
    content += `# Generated: ${new Date().toISOString()}\n`;
    content += `# Profiles: ${profiles.join(', ')}\n\n`;
    
    for (const [key, value] of Object.entries(config)) {
      content += `${key}=${value}\n`;
    }
    
    return content;
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
   * Clean up all backups and history
   */
  async cleanupAll() {
    try {
      // Remove backup directory
      await fs.rm(this.backupDir, { recursive: true, force: true });
      
      return {
        success: true,
        message: 'All backups and history cleaned up'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get storage usage
   */
  async getStorageUsage() {
    try {
      await this.initialize();
      
      const files = await fs.readdir(this.backupDir);
      let totalSize = 0;
      let fileCount = 0;
      
      for (const file of files) {
        try {
          const filePath = path.join(this.backupDir, file);
          const stats = await fs.stat(filePath);
          if (stats.isFile()) {
            totalSize += stats.size;
            fileCount++;
          }
        } catch (error) {
          // Ignore errors
        }
      }
      
      return {
        success: true,
        totalSize,
        fileCount,
        totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
        backupDir: this.backupDir
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = RollbackManager;
