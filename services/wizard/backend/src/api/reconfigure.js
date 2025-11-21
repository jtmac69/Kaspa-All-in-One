const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const ConfigGenerator = require('../utils/config-generator');
const DockerManager = require('../utils/docker-manager');

const configGenerator = new ConfigGenerator();
const dockerManager = new DockerManager();

/**
 * GET /api/reconfigure/current
 * Get current configuration for reconfiguration
 */
router.get('/current', async (req, res) => {
  try {
    const projectRoot = process.env.PROJECT_ROOT || '/workspace';
    const envPath = path.join(projectRoot, '.env');
    const configPath = path.join(projectRoot, '.wizard-config.json');
    
    // Check if .env exists
    let envExists = false;
    let currentConfig = {};
    
    try {
      await fs.access(envPath);
      envExists = true;
      
      // Parse .env file
      const envContent = await fs.readFile(envPath, 'utf8');
      currentConfig = parseEnvFile(envContent);
    } catch (error) {
      // .env doesn't exist, return empty config
    }
    
    // Check if wizard config exists
    let wizardConfig = null;
    try {
      const configContent = await fs.readFile(configPath, 'utf8');
      wizardConfig = JSON.parse(configContent);
    } catch (error) {
      // Wizard config doesn't exist
    }
    
    // Get current running services
    const runningServices = await dockerManager.getRunningServices();
    
    // Determine active profiles from running services
    const activeProfiles = determineActiveProfiles(runningServices);
    
    res.json({
      success: true,
      hasExistingConfig: envExists,
      currentConfig,
      wizardConfig,
      runningServices,
      activeProfiles
    });
  } catch (error) {
    console.error('Error getting current configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get current configuration',
      message: error.message
    });
  }
});

/**
 * POST /api/reconfigure/backup
 * Create backup of current configuration
 */
router.post('/backup', async (req, res) => {
  try {
    const projectRoot = process.env.PROJECT_ROOT || '/workspace';
    const envPath = path.join(projectRoot, '.env');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(projectRoot, `.env.backup.${timestamp}`);
    
    // Check if .env exists
    try {
      await fs.access(envPath);
      
      // Create backup
      await fs.copyFile(envPath, backupPath);
      
      res.json({
        success: true,
        backupPath: backupPath,
        timestamp
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        error: 'No configuration file to backup'
      });
    }
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
 * POST /api/reconfigure/apply
 * Apply new configuration (with backup)
 */
router.post('/apply', async (req, res) => {
  try {
    const { config, profiles, createBackup = true } = req.body;
    
    if (!config || !profiles) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: config and profiles'
      });
    }
    
    const projectRoot = process.env.PROJECT_ROOT || '/workspace';
    const envPath = path.join(projectRoot, '.env');
    
    // Create backup if requested
    if (createBackup) {
      try {
        await fs.access(envPath);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(projectRoot, `.env.backup.${timestamp}`);
        await fs.copyFile(envPath, backupPath);
      } catch (error) {
        // No existing file to backup
      }
    }
    
    // Validate configuration
    const validation = await configGenerator.validateConfig(config);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid configuration',
        errors: validation.errors
      });
    }
    
    // Generate and save new .env file
    const envContent = await configGenerator.generateEnvFile(validation.config, profiles);
    const saveResult = await configGenerator.saveEnvFile(envContent, envPath);
    
    if (!saveResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to save configuration',
        message: saveResult.error
      });
    }
    
    // Save wizard config
    const configPath = path.join(projectRoot, '.wizard-config.json');
    const wizardConfig = {
      timestamp: new Date().toISOString(),
      profiles,
      config: validation.config
    };
    await fs.writeFile(configPath, JSON.stringify(wizardConfig, null, 2));
    
    res.json({
      success: true,
      message: 'Configuration applied successfully',
      requiresRestart: true
    });
  } catch (error) {
    console.error('Error applying configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to apply configuration',
      message: error.message
    });
  }
});

/**
 * POST /api/reconfigure/restart
 * Restart services with new configuration
 */
router.post('/restart', async (req, res) => {
  try {
    const { profiles } = req.body;
    
    if (!profiles || !Array.isArray(profiles)) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid profiles array'
      });
    }
    
    // Stop current services
    await dockerManager.stopAllServices();
    
    // Wait a bit for services to stop
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Start services with new profiles
    const result = await dockerManager.startServices(profiles);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to restart services',
        message: result.error
      });
    }
    
    res.json({
      success: true,
      message: 'Services restarted successfully'
    });
  } catch (error) {
    console.error('Error restarting services:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to restart services',
      message: error.message
    });
  }
});

/**
 * GET /api/reconfigure/backups
 * List available configuration backups
 */
router.get('/backups', async (req, res) => {
  try {
    const projectRoot = process.env.PROJECT_ROOT || '/workspace';
    const files = await fs.readdir(projectRoot);
    
    const backups = files
      .filter(f => f.startsWith('.env.backup.'))
      .map(f => {
        const timestamp = f.replace('.env.backup.', '');
        return {
          filename: f,
          path: path.join(projectRoot, f),
          timestamp: timestamp.replace(/-/g, ':')
        };
      })
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    
    res.json({
      success: true,
      backups
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
 * POST /api/reconfigure/restore
 * Restore configuration from backup
 */
router.post('/restore', async (req, res) => {
  try {
    const { backupFilename } = req.body;
    
    if (!backupFilename) {
      return res.status(400).json({
        success: false,
        error: 'Missing backupFilename'
      });
    }
    
    const projectRoot = process.env.PROJECT_ROOT || '/workspace';
    const backupPath = path.join(projectRoot, backupFilename);
    const envPath = path.join(projectRoot, '.env');
    
    // Verify backup exists
    try {
      await fs.access(backupPath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: 'Backup file not found'
      });
    }
    
    // Create backup of current .env before restoring
    try {
      await fs.access(envPath);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const currentBackupPath = path.join(projectRoot, `.env.backup.${timestamp}`);
      await fs.copyFile(envPath, currentBackupPath);
    } catch (error) {
      // No current .env to backup
    }
    
    // Restore backup
    await fs.copyFile(backupPath, envPath);
    
    res.json({
      success: true,
      message: 'Configuration restored successfully',
      requiresRestart: true
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

// Helper functions

/**
 * Parse .env file into key-value object
 */
function parseEnvFile(content) {
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
 * Determine active profiles from running services
 */
function determineActiveProfiles(services) {
  const profiles = new Set();
  
  // Core services (always present)
  if (services.some(s => s.name === 'kaspa-node' || s.name === 'dashboard')) {
    profiles.add('core');
  }
  
  // Production profile
  if (services.some(s => ['kasia-app', 'k-social', 'kaspa-stratum'].includes(s.name))) {
    profiles.add('prod');
  }
  
  // Explorer profile
  if (services.some(s => ['kasia-indexer', 'k-indexer', 'simply-kaspa-indexer', 'indexer-db'].includes(s.name))) {
    profiles.add('explorer');
  }
  
  // Archive profile
  if (services.some(s => ['archive-indexer', 'archive-db'].includes(s.name))) {
    profiles.add('archive');
  }
  
  // Mining profile
  if (services.some(s => s.name === 'kaspa-stratum')) {
    profiles.add('mining');
  }
  
  // Development profile
  if (services.some(s => ['portainer', 'pgadmin'].includes(s.name))) {
    profiles.add('development');
  }
  
  return Array.from(profiles);
}

module.exports = router;
