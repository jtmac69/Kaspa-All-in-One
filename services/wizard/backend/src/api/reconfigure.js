const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const ConfigGenerator = require('../utils/config-generator');
const DockerManager = require('../utils/docker-manager');
const StateManager = require('../utils/state-manager');
const BackupManager = require('../utils/backup-manager');
const ProfileStateManager = require('../utils/profile-state-manager');
const { createResolver } = require('../../../../shared/lib/path-resolver');

// Initialize path resolver for this module
const resolver = createResolver(__dirname);

const configGenerator = new ConfigGenerator();
const dockerManager = new DockerManager();
const stateManager = new StateManager();
const backupManager = new BackupManager();
const profileStateManager = ProfileStateManager.getInstance();

/**
 * GET /api/wizard/profiles/state
 * Get profile installation state for reconfiguration mode
 * Uses ProfileStateManager for comprehensive state detection
 */
router.get('/profiles/state', async (req, res) => {
  try {
    // Use ProfileStateManager for comprehensive state detection
    const forceRefresh = req.query.refresh === 'true';
    const stateResult = await profileStateManager.getProfileStates(forceRefresh);
    
    if (!stateResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to get profile states',
        message: stateResult.error
      });
    }
    
    const profileStates = stateResult.profiles;
    
    // Separate profiles by installation state
    const installedProfiles = profileStates.filter(p => p.installationState === 'installed');
    const availableProfiles = profileStates.filter(p => p.installationState === 'not-installed');
    const partialProfiles = profileStates.filter(p => p.installationState === 'partial');
    
    // Get additional context
    const paths = resolver.getPaths();
    const envPath = paths.env;
    let envExists = false;
    
    try {
      await fs.access(envPath);
      envExists = true;
    } catch (error) {
      // .env doesn't exist
    }
    
    // Load installation state for metadata
    const installationStatePath = paths.installationState;
    let installationState = null;
    try {
      const stateContent = await fs.readFile(installationStatePath, 'utf8');
      installationState = JSON.parse(stateContent);
    } catch (error) {
      // Installation state doesn't exist
    }
    
    // Get running services count
    const runningServices = await dockerManager.getRunningServices();
    
    // Generate configuration suggestions based on current state
    const currentConfig = await profileStateManager.loadCurrentConfiguration();
    const suggestions = generateConfigurationSuggestions(profileStates, currentConfig, runningServices);
    
    res.json({
      success: true,
      profiles: profileStates,  // Changed from profileStates to profiles
      hasExistingConfig: envExists,
      installedProfiles,
      availableProfiles,
      partialProfiles,
      suggestions,
      runningServicesCount: runningServices.length,
      totalServicesCount: runningServices.length + (installationState?.stoppedServices?.length || 0),
      installationDate: installationState?.installedAt || null,
      lastModified: installationState?.lastModified || null,
      version: installationState?.version || 'Unknown',
      cacheStatus: profileStateManager.getCacheStatus(),
      lastUpdated: stateResult.lastUpdated
    });
  } catch (error) {
    console.error('Error getting profile states:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get profile states',
      message: error.message
    });
  }
});

/**
 * GET /api/wizard/profiles/state/:profileId
 * Get installation state for a specific profile
 */
router.get('/profiles/state/:profileId', async (req, res) => {
  try {
    const { profileId } = req.params;
    
    const result = await profileStateManager.getProfileState(profileId);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error getting profile state:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get profile state',
      message: error.message
    });
  }
});

/**
 * GET /api/wizard/profiles/grouped
 * Get profiles grouped by installation state
 */
router.get('/profiles/grouped', async (req, res) => {
  try {
    const result = await profileStateManager.getProfilesByState();
    
    if (!result.success) {
      return res.status(500).json(result);
    }
    
    // Flatten the structure to match test expectations
    res.json({
      success: true,
      installed: result.grouped.installed,
      partial: result.grouped.partial,
      available: result.grouped['not-installed'],  // Map 'not-installed' to 'available'
      summary: result.summary,
      lastUpdated: result.lastUpdated
    });
  } catch (error) {
    console.error('Error getting grouped profiles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get grouped profiles',
      message: error.message
    });
  }
});

/**
 * POST /api/wizard/profiles/refresh
 * Force refresh of profile states
 */
router.post('/profiles/refresh', async (req, res) => {
  try {
    const result = await profileStateManager.forceRefresh();
    
    if (!result.success) {
      return res.status(500).json(result);
    }
    
    res.json({
      success: true,
      message: 'Profile states refreshed successfully',
      profiles: result.profiles,
      lastUpdated: result.lastUpdated
    });
  } catch (error) {
    console.error('Error refreshing profile states:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh profile states',
      message: error.message
    });
  }
});

/**
 * GET /api/wizard/profiles/cache-status
 * Get profile state cache status
 */
router.get('/profiles/cache-status', async (req, res) => {
  try {
    const cacheStatus = profileStateManager.getCacheStatus();
    
    res.json({
      success: true,
      cacheStatus
    });
  } catch (error) {
    console.error('Error getting cache status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache status',
      message: error.message
    });
  }
});

/**
 * GET /api/wizard/current-config
 * Get current configuration for reconfiguration
 * Loads from .env, installation-state.json, and wizard-state.json
 */
router.get('/current-config', async (req, res) => {
  try {
    const paths = resolver.getPaths();
    const envPath = paths.env;
    const installationStatePath = paths.installationState;
    
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
 * Uses BackupManager for consistent backup handling
 */
router.post('/reconfigure/backup', async (req, res) => {
  try {
    const { reason = 'Manual backup before reconfiguration' } = req.body;
    
    const result = await backupManager.createBackup(reason, { source: 'reconfigure-api' });
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create backup',
        message: result.error
      });
    }
    
    res.json({
      success: true,
      backupDir: result.backupPath,
      backupId: result.backupId,
      timestamp: result.timestamp,
      backedUpFiles: result.backedUpFiles.map(f => f.file),
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
    
    const paths = resolver.getPaths();
    const envPath = paths.env;
    const installationStatePath = paths.installationState;
    
    // Load current configuration for diff
    let currentConfig = {};
    let currentEnvContent = '';
    try {
      currentEnvContent = await fs.readFile(envPath, 'utf8');
      currentConfig = parseEnvFile(currentEnvContent);
    } catch (error) {
      // No existing config
    }
    
    // Create comprehensive backup if requested using BackupManager
    let backupInfo = null;
    if (createBackup) {
      try {
        const previousProfiles = await determineActiveProfilesFromConfig(currentConfig);
        
        const backupResult = await backupManager.createBackup(
          'Reconfiguration',
          {
            source: 'reconfigure',
            previousProfiles,
            newProfiles: profiles
          }
        );
        
        if (backupResult.success) {
          backupInfo = {
            backupId: backupResult.backupId,
            timestamp: backupResult.timestamp,
            backupDir: backupResult.backupPath,
            files: backupResult.backedUpFiles.map(f => f.file)
          };
        } else {
          console.error('Error creating backup:', backupResult.error);
          backupInfo = { error: backupResult.error };
        }
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
    const paths = resolver.getPaths();
    const projectRoot = paths.root;
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
    
    const paths = resolver.getPaths();
    const projectRoot = paths.root;
    const backupPath = path.join(projectRoot, backupFilename);
    const envPath = paths.env;
    
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

/**
 * Determine the installation state of a profile
 */
function determineProfileState(profile, runningServices, installationState, currentConfig) {
  const runningServiceNames = runningServices.map(s => s.name);
  const profileServices = profile.services;
  
  // Check how many of the profile's services are running
  const runningCount = profileServices.filter(service => 
    runningServiceNames.includes(service)
  ).length;
  
  let installationState_result = 'not-installed';
  let status = 'unknown';
  let runningServices_count = runningCount;
  let totalServices_count = profileServices.length;
  
  // First, check if profile is in installation state (most reliable)
  if (installationState && installationState.profiles && installationState.profiles.selected) {
    const isInInstallationState = installationState.profiles.selected.includes(profile.id);
    if (isInInstallationState) {
      installationState_result = 'installed';
      status = runningCount === profileServices.length ? 'running' : 
               runningCount > 0 ? 'partial' : 'stopped';
    }
  }
  
  // If not found in installation state, check configuration
  if (installationState_result === 'not-installed') {
    const isConfigured = checkProfileConfiguration(profile.id, currentConfig);
    if (isConfigured) {
      installationState_result = 'installed';
      status = runningCount === profileServices.length ? 'running' : 
               runningCount > 0 ? 'partial' : 'stopped';
    }
  }
  
  // If still not found, check running services
  if (installationState_result === 'not-installed') {
    if (runningCount === profileServices.length) {
      installationState_result = 'installed';
      status = 'running';
    } else if (runningCount > 0) {
      installationState_result = 'partial';
      status = 'partial';
    }
  }
  
  // Get additional metadata from installation state
  let version = null;
  let lastModified = null;
  let dataSize = null;
  
  if (installationState && installationState.profiles && installationState.profiles.configuration) {
    // installationState.profiles is an object with selected array and configuration object
    version = installationState.version || '1.0.0';
    lastModified = installationState.lastModified;
    // dataSize would need to be calculated separately if needed
  }
  
  return {
    installationState: installationState_result,
    status,
    runningServices: runningServices_count,
    totalServices: totalServices_count,
    version,
    lastModified,
    dataSize,
    canModify: installationState_result === 'installed',
    canRemove: installationState_result === 'installed' || installationState_result === 'partial',
    canAdd: installationState_result === 'not-installed'
  };
}

/**
 * Check if a profile is configured in the current config
 */
function checkProfileConfiguration(profileId, config) {
  const configKeys = Object.keys(config);
  
  switch (profileId) {
    case 'core':
      return configKeys.some(key => 
        key.startsWith('KASPA_NODE_') || 
        key.startsWith('DASHBOARD_')
      );
    
    case 'kaspa-user-applications':
      return configKeys.some(key => 
        key.startsWith('KASIA_APP_') || 
        key.startsWith('KSOCIAL_') ||
        key.startsWith('KASPA_EXPLORER_')
      );
    
    case 'indexer-services':
      return configKeys.some(key => 
        key.startsWith('KASIA_INDEXER_') || 
        key.startsWith('K_INDEXER_') ||
        key.startsWith('SIMPLY_KASPA_INDEXER_') ||
        key.startsWith('TIMESCALEDB_')
      );
    
    case 'archive-node':
      return configKeys.some(key => 
        key.startsWith('KASPA_ARCHIVE_')
      );
    
    case 'mining':
      return configKeys.some(key => 
        key.startsWith('KASPA_STRATUM_')
      );
    
    default:
      return false;
  }
}

/**
 * Generate configuration suggestions based on current state
 */
function generateConfigurationSuggestions(profileStates, currentConfig, runningServices) {
  const suggestions = [];
  
  // Check if user has Core profile but no indexers
  const coreInstalled = profileStates.find(p => p.id === 'core' && p.installationState === 'installed');
  const indexersInstalled = profileStates.find(p => p.id === 'indexer-services' && p.installationState === 'installed');
  const appsInstalled = profileStates.find(p => p.id === 'kaspa-user-applications' && p.installationState === 'installed');
  
  if (coreInstalled && !indexersInstalled && appsInstalled) {
    suggestions.push({
      id: 'add-local-indexers',
      title: 'Add Local Indexers',
      description: 'You have a local Kaspa node and user applications. Adding local indexers can reduce external dependencies and improve performance.',
      action: 'add-profiles',
      priority: 'high',
      context: {
        profiles: ['indexer-services'],
        reason: 'local-node-optimization'
      }
    });
  }
  
  // Check if user has indexers but no local node
  if (indexersInstalled && !coreInstalled) {
    suggestions.push({
      id: 'add-local-node',
      title: 'Add Local Kaspa Node',
      description: 'Your indexers are currently using public networks. Adding a local node can improve reliability and reduce network dependency.',
      action: 'add-profiles',
      priority: 'medium',
      context: {
        profiles: ['core'],
        reason: 'indexer-optimization'
      }
    });
  }
  
  // Check for mining opportunities
  if (coreInstalled && !profileStates.find(p => p.id === 'mining' && p.installationState === 'installed')) {
    suggestions.push({
      id: 'add-mining',
      title: 'Enable Mining',
      description: 'You have a local Kaspa node. You can add mining capabilities to participate in the network and earn rewards.',
      action: 'add-profiles',
      priority: 'low',
      context: {
        profiles: ['mining'],
        reason: 'mining-opportunity'
      }
    });
  }
  
  // Check for partial installations
  const partialProfiles = profileStates.filter(p => p.installationState === 'partial');
  if (partialProfiles.length > 0) {
    suggestions.push({
      id: 'fix-partial-installations',
      title: 'Fix Partial Installations',
      description: `Some profiles (${partialProfiles.map(p => p.name).join(', ')}) are partially installed. You can complete or remove them.`,
      action: 'modify-config',
      priority: 'high',
      context: {
        profiles: partialProfiles.map(p => p.id),
        reason: 'partial-installation'
      }
    });
  }
  
  // Check for configuration optimization opportunities
  if (currentConfig.KASPA_NETWORK === 'testnet' && coreInstalled) {
    suggestions.push({
      id: 'switch-to-mainnet',
      title: 'Switch to Mainnet',
      description: 'You are currently running on testnet. Consider switching to mainnet for production use.',
      action: 'modify-config',
      priority: 'medium',
      context: {
        configChanges: { KASPA_NETWORK: 'mainnet' },
        reason: 'network-optimization'
      }
    });
  }
  
  return suggestions;
}

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
  if (services.some(s => ['kasia-indexer', 'k-indexer', 'simply-kaspa-indexer', 'k-social-db', 'simply-kaspa-db'].includes(s.name))) {
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
    'POSTGRES': ['timescaledb-kindexer', 'timescaledb-explorer'],
    'DASHBOARD': ['dashboard'],
    'KASPA_STRATUM': ['kaspa-stratum'],
    'STRATUM': ['kaspa-stratum'],
    'KASPA_EXPLORER': ['kaspa-explorer']
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
    // Add all services from profiles (NEW profile IDs)
    const profileServiceMap = {
      // New profile IDs
      'kaspa-node': ['kaspa-node'],
      'kasia-app': ['kasia-app'],
      'k-social-app': ['k-social'],
      'kaspa-explorer-bundle': ['kaspa-explorer', 'simply-kaspa-indexer', 'timescaledb-explorer'],
      'kasia-indexer': ['kasia-indexer'],
      'k-indexer-bundle': ['k-indexer', 'timescaledb-kindexer'],
      'kaspa-archive-node': ['kaspa-archive-node'],
      'kaspa-stratum': ['kaspa-stratum'],
      
      // Legacy profile IDs (for backward compatibility)
      'core': ['kaspa-node'],
      'kaspa-user-applications': ['kasia-app', 'k-social', 'kaspa-explorer'],
      'indexer-services': ['kasia-indexer', 'k-indexer', 'simply-kaspa-indexer', 'timescaledb-kindexer', 'timescaledb-explorer'],
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

/**
 * GET /api/wizard/installation-state
 * Get installation summary for reconfiguration landing page
 * Requirements: 16.1-16.4, 18.1
 */
router.get('/installation-state', async (req, res) => {
  try {
    // Get profile states
    const profileStates = await profileStateManager.getProfileStates();
    
    if (!profileStates.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to get profile states',
        message: profileStates.error
      });
    }
    
    // Load installation state metadata
    const projectRoot = process.env.PROJECT_ROOT || path.resolve(__dirname, '../../../../..');
    const installationStatePath = path.join(projectRoot, '.kaspa-aio', 'installation-state.json');
    let installationState = null;
    
    try {
      const stateContent = await fs.readFile(installationStatePath, 'utf8');
      installationState = JSON.parse(stateContent);
    } catch (error) {
      // Installation state doesn't exist, that's okay
    }
    
    // Get running services
    const runningServices = await dockerManager.getRunningServices();
    
    // Calculate summary statistics
    const installedProfiles = profileStates.profiles.filter(p => p.installationState === 'installed');
    const partialProfiles = profileStates.profiles.filter(p => p.installationState === 'partial');
    const availableProfiles = profileStates.profiles.filter(p => p.installationState === 'not-installed');
    
    // Determine available actions based on current state
    const availableActions = [];
    
    if (availableProfiles.length > 0) {
      availableActions.push({
        id: 'add-profiles',
        title: 'Add New Profiles',
        description: `Add ${availableProfiles.length} available profile(s) to your installation`,
        icon: 'plus',
        profiles: availableProfiles.map(p => p.id)
      });
    }
    
    if (installedProfiles.length > 0) {
      availableActions.push({
        id: 'modify-configuration',
        title: 'Modify Configuration',
        description: `Update settings for ${installedProfiles.length} installed profile(s)`,
        icon: 'settings',
        profiles: installedProfiles.map(p => p.id)
      });
      
      availableActions.push({
        id: 'remove-profiles',
        title: 'Remove Profiles',
        description: `Remove ${installedProfiles.length} installed profile(s)`,
        icon: 'trash',
        profiles: installedProfiles.map(p => p.id)
      });
    }
    
    // Check for .env file
    const envPath = path.join(projectRoot, '.env');
    let hasConfiguration = false;
    try {
      await fs.access(envPath);
      hasConfiguration = true;
    } catch (error) {
      // .env doesn't exist
    }
    
    res.json({
      success: true,
      version: installationState?.version || 'Unknown',
      profiles: profileStates.profiles,
      summary: {
        installed: installedProfiles.length,
        partial: partialProfiles.length,
        available: availableProfiles.length,
        total: profileStates.profiles.length
      },
      installedAt: installationState?.installedAt || null,
      lastModified: installationState?.lastModified || null,
      hasConfiguration,
      runningServicesCount: runningServices.length,
      availableActions,
      systemStatus: {
        dockerAvailable: await dockerManager.isDockerAvailable(),
        servicesRunning: runningServices.length > 0,
        configurationExists: hasConfiguration
      },
      lastUpdated: profileStates.lastUpdated
    });
  } catch (error) {
    console.error('Error getting installation state:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get installation state',
      message: error.message
    });
  }
});

module.exports = router;
