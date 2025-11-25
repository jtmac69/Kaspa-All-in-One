const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const ConfigGenerator = require('../utils/config-generator');
const DockerManager = require('../utils/docker-manager');
const StateManager = require('../utils/state-manager');

const configGenerator = new ConfigGenerator();
const dockerManager = new DockerManager();
const stateManager = new StateManager();

/**
 * GET /api/wizard/current-config
 * Get current configuration for reconfiguration
 * Loads from .env, installation-state.json, and wizard-state.json
 */
router.get('/current-config', async (req, res) => {
  try {
    const projectRoot = process.env.PROJECT_ROOT || '/workspace';
    const envPath = path.join(projectRoot, '.env');
    const installationStatePath = path.join(projectRoot, '.kaspa-aio', 'installation-state.json');
    
    // Load .env file
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
    
    // Load installation state
    let installationState = null;
    try {
      const stateContent = await fs.readFile(installationStatePath, 'utf8');
      installationState = JSON.parse(stateContent);
    } catch (error) {
      // Installation state doesn't exist
    }
    
    // Load wizard state
    const wizardStateResult = await stateManager.loadState();
    const wizardState = wizardStateResult.success ? wizardStateResult.state : null;
    
    // Get current running services
    const runningServices = await dockerManager.getRunningServices();
    
    // Determine active profiles from running services and state
    const activeProfiles = determineActiveProfiles(runningServices, installationState, wizardState);
    
    res.json({
      success: true,
      hasExistingConfig: envExists,
      currentConfig,
      installationState,
      wizardState,
      runningServices,
      activeProfiles,
      mode: 'reconfiguration'
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
 * POST /api/wizard/reconfigure/backup
 * Create comprehensive backup of current configuration
 * Backs up to .kaspa-backups/[timestamp]/
 */
router.post('/reconfigure/backup', async (req, res) => {
  try {
    const { reason = 'Manual backup before reconfiguration' } = req.body;
    
    const projectRoot = process.env.PROJECT_ROOT || '/workspace';
    const timestamp = Date.now();
    const backupDir = path.join(projectRoot, '.kaspa-backups', timestamp.toString());
    
    // Create backup directory
    await fs.mkdir(backupDir, { recursive: true });
    
    const backedUpFiles = [];
    const errors = [];
    
    // Files to backup
    const filesToBackup = [
      { src: '.env', dest: '.env' },
      { src: 'docker-compose.yml', dest: 'docker-compose.yml' },
      { src: 'docker-compose.override.yml', dest: 'docker-compose.override.yml', optional: true },
      { src: '.kaspa-aio/installation-state.json', dest: 'installation-state.json', optional: true },
      { src: '.kaspa-aio/wizard-state.json', dest: 'wizard-state.json', optional: true }
    ];
    
    // Backup each file
    for (const file of filesToBackup) {
      const srcPath = path.join(projectRoot, file.src);
      const destPath = path.join(backupDir, file.dest);
      
      try {
        await fs.access(srcPath);
        await fs.copyFile(srcPath, destPath);
        backedUpFiles.push(file.src);
      } catch (error) {
        if (!file.optional) {
          errors.push({ file: file.src, error: error.message });
        }
      }
    }
    
    // Create backup metadata
    const metadata = {
      timestamp,
      date: new Date(timestamp).toISOString(),
      reason,
      files: backedUpFiles,
      errors: errors.length > 0 ? errors : undefined
    };
    
    await fs.writeFile(
      path.join(backupDir, 'backup-metadata.json'),
      JSON.stringify(metadata, null, 2)
    );
    
    res.json({
      success: true,
      backupDir,
      timestamp,
      backedUpFiles,
      errors: errors.length > 0 ? errors : undefined
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
 * POST /api/wizard/reconfigure
 * Apply new configuration with comprehensive backup and diff
 */
router.post('/reconfigure', async (req, res) => {
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
    const installationStatePath = path.join(projectRoot, '.kaspa-aio', 'installation-state.json');
    
    // Load current configuration for diff
    let currentConfig = {};
    let currentEnvContent = '';
    try {
      currentEnvContent = await fs.readFile(envPath, 'utf8');
      currentConfig = parseEnvFile(currentEnvContent);
    } catch (error) {
      // No existing config
    }
    
    // Create comprehensive backup if requested
    let backupInfo = null;
    if (createBackup) {
      const timestamp = Date.now();
      const backupDir = path.join(projectRoot, '.kaspa-backups', timestamp.toString());
      
      try {
        await fs.mkdir(backupDir, { recursive: true });
        
        const backedUpFiles = [];
        
        // Backup .env
        try {
          await fs.copyFile(envPath, path.join(backupDir, '.env'));
          backedUpFiles.push('.env');
        } catch (error) {
          // File doesn't exist
        }
        
        // Backup docker-compose files
        try {
          await fs.copyFile(
            path.join(projectRoot, 'docker-compose.yml'),
            path.join(backupDir, 'docker-compose.yml')
          );
          backedUpFiles.push('docker-compose.yml');
        } catch (error) {
          // File doesn't exist
        }
        
        try {
          await fs.copyFile(
            path.join(projectRoot, 'docker-compose.override.yml'),
            path.join(backupDir, 'docker-compose.override.yml')
          );
          backedUpFiles.push('docker-compose.override.yml');
        } catch (error) {
          // File doesn't exist
        }
        
        // Backup installation state
        try {
          await fs.copyFile(
            installationStatePath,
            path.join(backupDir, 'installation-state.json')
          );
          backedUpFiles.push('installation-state.json');
        } catch (error) {
          // File doesn't exist
        }
        
        // Create backup metadata
        const metadata = {
          timestamp,
          date: new Date(timestamp).toISOString(),
          reason: 'Reconfiguration',
          files: backedUpFiles,
          previousProfiles: await determineActiveProfilesFromConfig(currentConfig),
          newProfiles: profiles
        };
        
        await fs.writeFile(
          path.join(backupDir, 'backup-metadata.json'),
          JSON.stringify(metadata, null, 2)
        );
        
        backupInfo = {
          timestamp,
          backupDir,
          files: backedUpFiles
        };
      } catch (error) {
        console.error('Error creating backup:', error);
        // Continue anyway, but note the error
        backupInfo = { error: error.message };
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
    
    // Generate new .env content
    const newEnvContent = await configGenerator.generateEnvFile(validation.config, profiles);
    
    // Calculate diff
    const diff = calculateConfigDiff(currentConfig, validation.config);
    
    // Save new .env file
    const saveResult = await configGenerator.saveEnvFile(newEnvContent, envPath);
    
    if (!saveResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to save configuration',
        message: saveResult.error
      });
    }
    
    // Update installation state
    let installationState = {};
    try {
      const stateContent = await fs.readFile(installationStatePath, 'utf8');
      installationState = JSON.parse(stateContent);
    } catch (error) {
      // Create new state
      installationState = {
        version: '1.0.0',
        installedAt: new Date().toISOString()
      };
    }
    
    // Update state with reconfiguration info
    installationState.lastModified = new Date().toISOString();
    installationState.mode = 'reconfiguration';
    installationState.profiles = {
      selected: profiles,
      configuration: validation.config
    };
    
    // Add to history
    if (!installationState.history) {
      installationState.history = [];
    }
    
    installationState.history.push({
      timestamp: new Date().toISOString(),
      action: 'reconfigure',
      changes: diff.changes.map(c => `${c.key}: ${c.type}`),
      profiles: profiles,
      backupTimestamp: backupInfo?.timestamp
    });
    
    // Save installation state
    await fs.mkdir(path.dirname(installationStatePath), { recursive: true });
    await fs.writeFile(installationStatePath, JSON.stringify(installationState, null, 2));
    
    // Determine which services need restart
    const affectedServices = determineAffectedServices(diff, profiles);
    
    res.json({
      success: true,
      message: 'Configuration applied successfully',
      backup: backupInfo,
      diff,
      affectedServices,
      requiresRestart: true
    });
  } catch (error) {
    console.error('Error applying reconfiguration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to apply reconfiguration',
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
 * Determine active profiles from running services and state
 */
function determineActiveProfiles(services, installationState, wizardState) {
  const profiles = new Set();
  
  // First, try to get profiles from installation state (most reliable)
  if (installationState?.profiles?.selected) {
    return installationState.profiles.selected;
  }
  
  // Second, try wizard state
  if (wizardState?.profiles?.selected) {
    return wizardState.profiles.selected;
  }
  
  // Fall back to detecting from running services
  // Core services (always present)
  if (services.some(s => s.name === 'kaspa-node' || s.name === 'dashboard')) {
    profiles.add('core');
  }
  
  // Kaspa User Applications profile
  if (services.some(s => ['kasia-app', 'k-social'].includes(s.name))) {
    profiles.add('kaspa-user-applications');
  }
  
  // Indexer Services profile
  if (services.some(s => ['kasia-indexer', 'k-indexer', 'simply-kaspa-indexer', 'timescaledb'].includes(s.name))) {
    profiles.add('indexer-services');
  }
  
  // Archive Node profile
  if (services.some(s => s.name === 'kaspa-archive-node')) {
    profiles.add('archive-node');
  }
  
  // Mining profile
  if (services.some(s => s.name === 'kaspa-stratum')) {
    profiles.add('mining');
  }
  
  return Array.from(profiles);
}

/**
 * Determine active profiles from configuration
 */
async function determineActiveProfilesFromConfig(config) {
  const profiles = new Set();
  
  // Detect profiles based on configuration keys
  if (config.KASPA_NODE_RPC_PORT || config.KASPA_NODE_P2P_PORT) {
    profiles.add('core');
  }
  
  if (config.KASIA_APP_PORT || config.KSOCIAL_APP_PORT) {
    profiles.add('kaspa-user-applications');
  }
  
  if (config.KASIA_INDEXER_PORT || config.K_INDEXER_PORT || config.SIMPLY_KASPA_INDEXER_PORT) {
    profiles.add('indexer-services');
  }
  
  if (config.KASPA_STRATUM_PORT) {
    profiles.add('mining');
  }
  
  return Array.from(profiles);
}

/**
 * Calculate diff between old and new configuration
 */
function calculateConfigDiff(oldConfig, newConfig) {
  const changes = [];
  const allKeys = new Set([...Object.keys(oldConfig), ...Object.keys(newConfig)]);
  
  for (const key of allKeys) {
    const oldValue = oldConfig[key];
    const newValue = newConfig[key];
    
    if (oldValue === undefined && newValue !== undefined) {
      changes.push({
        key,
        type: 'added',
        oldValue: null,
        newValue
      });
    } else if (oldValue !== undefined && newValue === undefined) {
      changes.push({
        key,
        type: 'removed',
        oldValue,
        newValue: null
      });
    } else if (oldValue !== newValue) {
      changes.push({
        key,
        type: 'modified',
        oldValue,
        newValue
      });
    }
  }
  
  return {
    hasChanges: changes.length > 0,
    changeCount: changes.length,
    changes
  };
}

/**
 * Determine which services are affected by configuration changes
 */
function determineAffectedServices(diff, profiles) {
  const affectedServices = new Set();
  
  // Map configuration keys to services
  const serviceKeyMap = {
    'KASPA_NODE': ['kaspa-node'],
    'KASIA': ['kasia-app', 'kasia-indexer'],
    'KSOCIAL': ['k-social'],
    'K_INDEXER': ['k-indexer'],
    'SIMPLY_KASPA': ['simply-kaspa-indexer'],
    'POSTGRES': ['timescaledb'],
    'DASHBOARD': ['dashboard'],
    'KASPA_STRATUM': ['kaspa-stratum']
  };
  
  // Check each change
  for (const change of diff.changes) {
    for (const [prefix, services] of Object.entries(serviceKeyMap)) {
      if (change.key.startsWith(prefix)) {
        services.forEach(s => affectedServices.add(s));
      }
    }
  }
  
  // If no specific services detected, assume all services in selected profiles need restart
  if (affectedServices.size === 0) {
    // Add all services from profiles
    const profileServiceMap = {
      'core': ['kaspa-node', 'dashboard'],
      'kaspa-user-applications': ['kasia-app', 'k-social'],
      'indexer-services': ['kasia-indexer', 'k-indexer', 'simply-kaspa-indexer', 'timescaledb'],
      'archive-node': ['kaspa-archive-node'],
      'mining': ['kaspa-stratum']
    };
    
    for (const profile of profiles) {
      const services = profileServiceMap[profile] || [];
      services.forEach(s => affectedServices.add(s));
    }
  }
  
  return Array.from(affectedServices);
}

module.exports = router;
