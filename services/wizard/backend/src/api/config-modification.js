const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const ConfigGenerator = require('../utils/config-generator');
const ProfileStateManager = require('../utils/profile-state-manager');
const BackupManager = require('../utils/backup-manager');
const DockerManager = require('../utils/docker-manager');

const configGenerator = new ConfigGenerator();
const profileStateManager = ProfileStateManager.getInstance();
const backupManager = new BackupManager();
const dockerManager = new DockerManager();

/**
 * GET /api/wizard/config/current/:profileId
 * Get current configuration for a specific profile
 * Validates: Requirements 17.13, 17.14
 */
router.get('/current/:profileId', async (req, res) => {
  try {
    const { profileId } = req.params;
    
    // Load current configuration
    const projectRoot = process.env.PROJECT_ROOT || '/workspace';
    const envPath = path.join(projectRoot, '.env');
    const configPath = path.join(projectRoot, '.kaspa-aio', 'installation-state.json');
    
    // Get profile state to ensure it's installed
    const profileState = await profileStateManager.getProfileState(profileId);
    if (!profileState.success || profileState.profile.installationState !== 'installed') {
      return res.status(404).json({
        success: false,
        error: 'Profile not installed',
        message: `Profile ${profileId} is not currently installed`
      });
    }
    
    // Load current configuration
    const configResult = await configGenerator.loadCompleteConfiguration(envPath, configPath);
    if (!configResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to load configuration',
        message: configResult.error
      });
    }
    
    // Extract profile-specific configuration
    const profileConfig = extractProfileConfiguration(profileId, configResult.config);
    
    // Get profile-specific fields
    const profileFields = getProfileConfigurationFields(profileId);
    
    // Get current service status
    const serviceStatus = await getProfileServiceStatus(profileId);
    
    res.json({
      success: true,
      profileId,
      profileName: getProfileName(profileId),
      currentConfig: profileConfig,
      availableFields: profileFields,
      serviceStatus,
      canModify: profileState.profile.canModify,
      lastModified: configResult.installationState?.lastModified
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
 * POST /api/wizard/config/validate-changes
 * Validate configuration changes against existing setup
 * Validates: Requirements 17.15, 18.7
 */
router.post('/validate-changes', async (req, res) => {
  try {
    const { profileId, newConfig, currentConfig } = req.body;
    
    if (!profileId || !newConfig || !currentConfig) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'profileId, newConfig, and currentConfig are required'
      });
    }
    
    // Calculate configuration diff
    const diff = calculateConfigurationDiff(currentConfig, newConfig);
    
    // Validate new configuration
    const validation = await configGenerator.validateConfig(newConfig);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid configuration',
        errors: validation.errors,
        diff
      });
    }
    
    // Check for conflicts with other services
    const conflicts = await checkConfigurationConflicts(profileId, newConfig);
    
    // Determine affected services and restart requirements
    const impact = await calculateConfigurationImpact(profileId, diff);
    
    // Check for network changes that require special handling
    const networkChanges = checkNetworkChanges(currentConfig, newConfig);
    
    res.json({
      success: true,
      valid: validation.valid,
      diff,
      conflicts,
      impact,
      networkChanges,
      warnings: [
        ...validation.warnings || [],
        ...conflicts.warnings || [],
        ...networkChanges.warnings || []
      ]
    });
    
  } catch (error) {
    console.error('Error validating configuration changes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate changes',
      message: error.message
    });
  }
});

/**
 * POST /api/wizard/config/apply-changes
 * Apply configuration changes with minimal service disruption
 * Validates: Requirements 17.13, 17.14, 18.5, 18.6, 18.8
 */
router.post('/apply-changes', async (req, res) => {
  try {
    const { profileId, newConfig, createBackup = true, restartServices = true } = req.body;
    
    if (!profileId || !newConfig) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'profileId and newConfig are required'
      });
    }
    
    const projectRoot = process.env.PROJECT_ROOT || '/workspace';
    const envPath = path.join(projectRoot, '.env');
    const configPath = path.join(projectRoot, '.kaspa-aio', 'installation-state.json');
    
    // Create backup if requested
    let backupInfo = null;
    if (createBackup) {
      const backupResult = await backupManager.createBackup(
        `Configuration modification for ${profileId}`,
        { source: 'config-modification', profileId }
      );
      
      if (backupResult.success) {
        backupInfo = {
          backupId: backupResult.backupId,
          timestamp: backupResult.timestamp,
          backupDir: backupResult.backupPath
        };
      }
    }
    
    // Load current complete configuration
    const currentConfigResult = await configGenerator.loadCompleteConfiguration(envPath, configPath);
    if (!currentConfigResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to load current configuration',
        message: currentConfigResult.error
      });
    }
    
    // Merge new configuration with existing
    const mergedConfig = mergeProfileConfiguration(
      profileId, 
      currentConfigResult.config, 
      newConfig
    );
    
    // Get current profiles
    const currentProfiles = currentConfigResult.installationState?.profiles?.selected || [];
    
    // Validate merged configuration
    const validation = await configGenerator.validateConfig(mergedConfig);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid merged configuration',
        errors: validation.errors
      });
    }
    
    // Generate new .env content
    const newEnvContent = await configGenerator.generateEnvFile(validation.config, currentProfiles);
    
    // Save new configuration
    const saveResult = await configGenerator.saveEnvFile(newEnvContent, envPath);
    if (!saveResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to save configuration',
        message: saveResult.error
      });
    }
    
    // Update installation state
    await updateInstallationState(configPath, profileId, validation.config, backupInfo);
    
    // Determine which services need restart
    const servicesToRestart = getServicesForProfile(profileId);
    
    // Restart services if requested
    let restartResult = null;
    if (restartServices && servicesToRestart.length > 0) {
      restartResult = await restartProfileServices(profileId, servicesToRestart);
    }
    
    res.json({
      success: true,
      message: 'Configuration updated successfully',
      profileId,
      backup: backupInfo,
      servicesRestarted: restartResult?.success ? servicesToRestart : [],
      restartErrors: restartResult?.errors || [],
      requiresManualRestart: !restartServices
    });
    
  } catch (error) {
    console.error('Error applying configuration changes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to apply changes',
      message: error.message
    });
  }
});

/**
 * GET /api/wizard/config/indexer-endpoints
 * Get available indexer endpoints for configuration
 * Validates: Requirements 18.1, 18.2
 */
router.get('/indexer-endpoints', async (req, res) => {
  try {
    // Get current installation state to check for local indexers
    const profileStates = await profileStateManager.getProfileStates();
    const hasLocalIndexers = profileStates.success && 
      profileStates.profiles.some(p => p.id === 'indexer-services' && p.installationState === 'installed');
    
    // Define available endpoints
    const endpoints = {
      kasia: {
        public: 'https://api.kasia.io',
        local: hasLocalIndexers ? 'http://localhost:8081' : null
      },
      kSocial: {
        public: 'https://indexer0.kaspatalk.net',
        local: hasLocalIndexers ? 'http://localhost:8082' : null
      },
      simplyKaspa: {
        public: 'https://api.simplykaspa.io',
        local: hasLocalIndexers ? 'http://localhost:8083' : null
      },
      kaspaNode: {
        public: 'wss://api.kasia.io/ws',
        local: hasLocalIndexers ? 'ws://localhost:16110/ws' : null
      }
    };
    
    // Get current configuration to show what's currently selected
    const projectRoot = process.env.PROJECT_ROOT || '/workspace';
    const envPath = path.join(projectRoot, '.env');
    const configResult = await configGenerator.loadCompleteConfiguration(envPath);
    
    let currentEndpoints = {};
    if (configResult.success) {
      currentEndpoints = {
        kasia: configResult.config.REMOTE_KASIA_INDEXER_URL || configResult.config.KASIA_INDEXER_URL,
        kSocial: configResult.config.REMOTE_KSOCIAL_INDEXER_URL || configResult.config.KSOCIAL_INDEXER_URL,
        simplyKaspa: configResult.config.REMOTE_SIMPLY_KASPA_INDEXER_URL,
        kaspaNode: configResult.config.REMOTE_KASPA_NODE_WBORSH_URL
      };
    }
    
    res.json({
      success: true,
      hasLocalIndexers,
      availableEndpoints: endpoints,
      currentEndpoints,
      recommendations: generateEndpointRecommendations(hasLocalIndexers, currentEndpoints)
    });
    
  } catch (error) {
    console.error('Error getting indexer endpoints:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get indexer endpoints',
      message: error.message
    });
  }
});

/**
 * POST /api/wizard/config/update-endpoints
 * Update indexer endpoints configuration
 * Validates: Requirements 17.1, 17.2, 18.1, 18.2
 */
router.post('/update-endpoints', async (req, res) => {
  try {
    const { endpoints, createBackup = true } = req.body;
    
    if (!endpoints || typeof endpoints !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid endpoints configuration',
        message: 'endpoints object is required'
      });
    }
    
    // Validate endpoint URLs
    const validationErrors = validateEndpointUrls(endpoints);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid endpoint URLs',
        errors: validationErrors
      });
    }
    
    // Apply endpoint changes using the general configuration modification flow
    const newConfig = {
      REMOTE_KASIA_INDEXER_URL: endpoints.kasia,
      REMOTE_KSOCIAL_INDEXER_URL: endpoints.kSocial,
      REMOTE_SIMPLY_KASPA_INDEXER_URL: endpoints.simplyKaspa,
      REMOTE_KASPA_NODE_WBORSH_URL: endpoints.kaspaNode
    };
    
    // Use the apply-changes endpoint logic
    const result = await applyConfigurationChanges('kaspa-user-applications', newConfig, createBackup);
    
    res.json(result);
    
  } catch (error) {
    console.error('Error updating endpoints:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update endpoints',
      message: error.message
    });
  }
});

/**
 * GET /api/wizard/config/wallet-options
 * Get wallet configuration options
 * Validates: Requirements 17.3, 18.5, 18.6
 */
router.get('/wallet-options', async (req, res) => {
  try {
    // Check if Core profile is installed (required for wallet)
    const profileStates = await profileStateManager.getProfileStates();
    const coreProfile = profileStates.success && 
      profileStates.profiles.find(p => p.id === 'core' && p.installationState === 'installed');
    
    if (!coreProfile) {
      return res.status(400).json({
        success: false,
        error: 'Core profile required',
        message: 'Wallet configuration requires Core profile to be installed'
      });
    }
    
    // Get current wallet configuration
    const projectRoot = process.env.PROJECT_ROOT || '/workspace';
    const envPath = path.join(projectRoot, '.env');
    const configResult = await configGenerator.loadCompleteConfiguration(envPath);
    
    let currentWalletConfig = {};
    if (configResult.success) {
      currentWalletConfig = {
        enabled: configResult.config.KASPA_WALLET_ENABLED === 'true',
        miningAddress: configResult.config.KASPA_MINING_ADDRESS,
        rpcUser: configResult.config.KASPA_WALLET_RPC_USER,
        rpcPassword: configResult.config.KASPA_WALLET_RPC_PASSWORD,
        walletFile: configResult.config.KASPA_WALLET_FILE
      };
    }
    
    // Get wallet status from running services
    const walletStatus = await getWalletStatus();
    
    res.json({
      success: true,
      coreProfileInstalled: true,
      currentConfig: currentWalletConfig,
      walletStatus,
      availableActions: [
        'create-new-wallet',
        'import-existing-wallet',
        'configure-mining-address',
        'update-rpc-settings',
        'enable-disable-wallet'
      ]
    });
    
  } catch (error) {
    console.error('Error getting wallet options:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get wallet options',
      message: error.message
    });
  }
});

/**
 * POST /api/wizard/config/update-wallet
 * Update wallet configuration
 * Validates: Requirements 17.3, 18.5, 18.6
 */
router.post('/update-wallet', async (req, res) => {
  try {
    const { action, config, createBackup = true } = req.body;
    
    if (!action || !config) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'action and config are required'
      });
    }
    
    // Validate wallet configuration based on action
    const validationResult = validateWalletConfig(action, config);
    if (!validationResult.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid wallet configuration',
        errors: validationResult.errors
      });
    }
    
    // Convert wallet config to environment variables
    const walletEnvConfig = convertWalletConfigToEnv(action, config);
    
    // Apply wallet configuration changes
    const result = await applyConfigurationChanges('core', walletEnvConfig, createBackup);
    
    // If successful and action involves wallet creation/import, provide next steps
    if (result.success && ['create-new-wallet', 'import-existing-wallet'].includes(action)) {
      result.nextSteps = getWalletNextSteps(action);
    }
    
    res.json(result);
    
  } catch (error) {
    console.error('Error updating wallet configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update wallet configuration',
      message: error.message
    });
  }
});

// Helper functions

/**
 * Extract profile-specific configuration from complete config
 */
function extractProfileConfiguration(profileId, completeConfig) {
  const profileConfig = {};
  
  switch (profileId) {
    case 'core':
      profileConfig.KASPA_NODE_RPC_PORT = completeConfig.KASPA_NODE_RPC_PORT;
      profileConfig.KASPA_NODE_P2P_PORT = completeConfig.KASPA_NODE_P2P_PORT;
      profileConfig.KASPA_NETWORK = completeConfig.KASPA_NETWORK;
      profileConfig.KASPA_DATA_DIR = completeConfig.KASPA_DATA_DIR;
      profileConfig.PUBLIC_NODE = completeConfig.PUBLIC_NODE;
      profileConfig.EXTERNAL_IP = completeConfig.EXTERNAL_IP;
      profileConfig.KASPA_WALLET_ENABLED = completeConfig.KASPA_WALLET_ENABLED;
      profileConfig.KASPA_MINING_ADDRESS = completeConfig.KASPA_MINING_ADDRESS;
      break;
      
    case 'kaspa-user-applications':
      profileConfig.REMOTE_KASIA_INDEXER_URL = completeConfig.REMOTE_KASIA_INDEXER_URL;
      profileConfig.REMOTE_KSOCIAL_INDEXER_URL = completeConfig.REMOTE_KSOCIAL_INDEXER_URL;
      profileConfig.REMOTE_SIMPLY_KASPA_INDEXER_URL = completeConfig.REMOTE_SIMPLY_KASPA_INDEXER_URL;
      profileConfig.REMOTE_KASPA_NODE_WBORSH_URL = completeConfig.REMOTE_KASPA_NODE_WBORSH_URL;
      profileConfig.KASIA_APP_PORT = completeConfig.KASIA_APP_PORT;
      profileConfig.KSOCIAL_APP_PORT = completeConfig.KSOCIAL_APP_PORT;
      break;
      
    case 'indexer-services':
      profileConfig.TIMESCALEDB_DATA_DIR = completeConfig.TIMESCALEDB_DATA_DIR;
      profileConfig.K_SOCIAL_DB_PASSWORD = completeConfig.K_SOCIAL_DB_PASSWORD;
      profileConfig.SIMPLY_KASPA_DB_PASSWORD = completeConfig.SIMPLY_KASPA_DB_PASSWORD;
      profileConfig.KASIA_INDEXER_PORT = completeConfig.KASIA_INDEXER_PORT;
      profileConfig.K_INDEXER_PORT = completeConfig.K_INDEXER_PORT;
      profileConfig.SIMPLY_KASPA_INDEXER_PORT = completeConfig.SIMPLY_KASPA_INDEXER_PORT;
      break;
      
    case 'archive-node':
      profileConfig.KASPA_ARCHIVE_DATA_DIR = completeConfig.KASPA_ARCHIVE_DATA_DIR;
      profileConfig.KASPA_NODE_RPC_PORT = completeConfig.KASPA_NODE_RPC_PORT;
      profileConfig.KASPA_NODE_P2P_PORT = completeConfig.KASPA_NODE_P2P_PORT;
      profileConfig.KASPA_NETWORK = completeConfig.KASPA_NETWORK;
      break;
      
    case 'mining':
      profileConfig.KASPA_STRATUM_PORT = completeConfig.KASPA_STRATUM_PORT;
      profileConfig.KASPA_MINING_ADDRESS = completeConfig.KASPA_MINING_ADDRESS;
      break;
  }
  
  return profileConfig;
}

/**
 * Local migration helper for profile IDs
 * @param {string} profileId - Profile ID (may be legacy)
 * @returns {string|string[]} New profile ID(s)
 */
function migrateProfileIdLocal(profileId) {
  const migration = {
    'core': 'kaspa-node',
    'kaspa-user-applications': ['kasia-app', 'k-social-app'],
    'indexer-services': ['kasia-indexer', 'k-indexer-bundle'],
    'archive-node': 'kaspa-archive-node',
    'mining': 'kaspa-stratum'
  };
  
  return migration[profileId] || profileId;
}

/**
 * Get profile-specific configuration field definitions
 * @param {string} profileId - Profile ID (supports legacy IDs via migration)
 * @returns {Array} Array of field definitions
 */
function getProfileFieldDefinitions(profileId) {
  // Migrate legacy profile ID if needed
  const migratedId = migrateProfileIdLocal(profileId);
  const effectiveId = Array.isArray(migratedId) ? migratedId[0] : migratedId;
  
  const fieldDefinitions = {
    // Kaspa Node Profile
    'kaspa-node': [
      { key: 'KASPA_NODE_RPC_PORT', label: 'gRPC Port', type: 'number', min: 1024, max: 65535, default: 16110 },
      { key: 'KASPA_NODE_P2P_PORT', label: 'P2P Port', type: 'number', min: 1024, max: 65535, default: 16111 },
      { key: 'KASPA_NODE_WRPC_PORT', label: 'wRPC Port', type: 'number', min: 1024, max: 65535, default: 17110 },
      { key: 'KASPA_NETWORK', label: 'Network', type: 'select', options: ['mainnet', 'testnet-10', 'testnet-11'], default: 'mainnet' },
      { key: 'PUBLIC_NODE', label: 'Public Node', type: 'boolean', default: false },
      { key: 'WALLET_ENABLED', label: 'Enable Wallet', type: 'boolean', default: false },
      { key: 'UTXO_INDEX', label: 'UTXO Index', type: 'boolean', default: true }
    ],
    
    // Kasia App Profile
    'kasia-app': [
      { key: 'KASIA_APP_PORT', label: 'App Port', type: 'number', min: 1024, max: 65535, default: 3001 },
      { key: 'KASIA_INDEXER_MODE', label: 'Indexer Mode', type: 'select', options: ['auto', 'local', 'public'], default: 'auto' },
      { key: 'REMOTE_KASIA_INDEXER_URL', label: 'Remote Indexer URL', type: 'text', default: 'https://api.kasia.io' }
    ],
    
    // K-Social App Profile
    'k-social-app': [
      { key: 'KSOCIAL_APP_PORT', label: 'App Port', type: 'number', min: 1024, max: 65535, default: 3003 },
      { key: 'KSOCIAL_INDEXER_MODE', label: 'Indexer Mode', type: 'select', options: ['auto', 'local', 'public'], default: 'auto' },
      { key: 'REMOTE_KSOCIAL_INDEXER_URL', label: 'Remote Indexer URL', type: 'text', default: 'https://indexer0.kaspatalk.net/' }
    ],
    
    // Kaspa Explorer Bundle Profile
    'kaspa-explorer-bundle': [
      { key: 'KASPA_EXPLORER_PORT', label: 'Explorer Port', type: 'number', min: 1024, max: 65535, default: 3004 },
      { key: 'SIMPLY_KASPA_INDEXER_PORT', label: 'Indexer Port', type: 'number', min: 1024, max: 65535, default: 3005 },
      { key: 'TIMESCALEDB_EXPLORER_PORT', label: 'Database Port', type: 'number', min: 1024, max: 65535, default: 5434 },
      { key: 'POSTGRES_USER_EXPLORER', label: 'DB Username', type: 'text', default: 'kaspa_explorer' },
      { key: 'POSTGRES_PASSWORD_EXPLORER', label: 'DB Password', type: 'password' },
      { key: 'SIMPLY_KASPA_NODE_MODE', label: 'Node Mode', type: 'select', options: ['local', 'remote'], default: 'local' }
    ],
    
    // Kasia Indexer Profile
    'kasia-indexer': [
      { key: 'KASIA_INDEXER_PORT', label: 'Indexer Port', type: 'number', min: 1024, max: 65535, default: 3002 },
      { key: 'KASIA_NODE_MODE', label: 'Node Mode', type: 'select', options: ['local', 'remote'], default: 'local' },
      { key: 'KASIA_NODE_WRPC_URL', label: 'Node wRPC URL', type: 'text', default: 'ws://kaspa-node:17110' }
    ],
    
    // K-Indexer Bundle Profile
    'k-indexer-bundle': [
      { key: 'K_INDEXER_PORT', label: 'Indexer Port', type: 'number', min: 1024, max: 65535, default: 3006 },
      { key: 'TIMESCALEDB_KINDEXER_PORT', label: 'Database Port', type: 'number', min: 1024, max: 65535, default: 5433 },
      { key: 'POSTGRES_USER_KINDEXER', label: 'DB Username', type: 'text', default: 'k_indexer' },
      { key: 'POSTGRES_PASSWORD_KINDEXER', label: 'DB Password', type: 'password' },
      { key: 'K_INDEXER_NODE_MODE', label: 'Node Mode', type: 'select', options: ['local', 'remote'], default: 'local' }
    ],
    
    // Kaspa Archive Node Profile
    'kaspa-archive-node': [
      { key: 'KASPA_NODE_RPC_PORT', label: 'gRPC Port', type: 'number', min: 1024, max: 65535, default: 16110 },
      { key: 'KASPA_NODE_P2P_PORT', label: 'P2P Port', type: 'number', min: 1024, max: 65535, default: 16111 },
      { key: 'KASPA_NODE_WRPC_PORT', label: 'wRPC Port', type: 'number', min: 1024, max: 65535, default: 17110 },
      { key: 'KASPA_NETWORK', label: 'Network', type: 'select', options: ['mainnet', 'testnet-10', 'testnet-11'], default: 'mainnet' },
      { key: 'PUBLIC_NODE', label: 'Public Node', type: 'boolean', default: true },
      { key: 'EXTERNAL_IP', label: 'External IP', type: 'text' }
    ],
    
    // Kaspa Stratum Profile
    'kaspa-stratum': [
      { key: 'STRATUM_PORT', label: 'Stratum Port', type: 'number', min: 1024, max: 65535, default: 5555 },
      { key: 'MINING_ADDRESS', label: 'Mining Address', type: 'text', required: true },
      { key: 'MIN_SHARE_DIFF', label: 'Min Share Difficulty', type: 'number', min: 1, default: 4 },
      { key: 'VAR_DIFF', label: 'Variable Difficulty', type: 'boolean', default: true },
      { key: 'SHARES_PER_MIN', label: 'Shares Per Minute', type: 'number', min: 1, default: 20 },
      { key: 'POOL_MODE', label: 'Pool Mode', type: 'boolean', default: false }
    ]
  };
  
  return fieldDefinitions[effectiveId] || [];
}

/**
 * Get configuration fields available for a profile
 * @param {string} profileId - Profile ID (supports legacy IDs)
 * @returns {Object[]} Array of field definitions
 * @deprecated Use getProfileFieldDefinitions() instead
 */
function getProfileConfigurationFields(profileId) {
  // Delegate to new function for consistency
  return getProfileFieldDefinitions(profileId);
}

/**
 * Get profile display name
 * @param {string} profileId - Profile ID (supports legacy IDs)
 * @returns {string} Display name
 */
function getProfileName(profileId) {
  const names = {
    // New profile IDs
    'kaspa-node': 'Kaspa Node',
    'kasia-app': 'Kasia Application',
    'k-social-app': 'K-Social Application',
    'kaspa-explorer-bundle': 'Kaspa Explorer',
    'kasia-indexer': 'Kasia Indexer',
    'k-indexer-bundle': 'K-Indexer',
    'kaspa-archive-node': 'Kaspa Archive Node',
    'kaspa-stratum': 'Kaspa Stratum',
    
    // Legacy profile IDs
    'core': 'Core Profile',
    'kaspa-user-applications': 'Kaspa User Applications',
    'indexer-services': 'Indexer Services',
    'archive-node': 'Archive Node Profile',
    'mining': 'Mining Profile'
  };
  
  return names[profileId] || profileId;
}

/**
 * Get service status for a profile
 */
async function getProfileServiceStatus(profileId) {
  try {
    const services = getServicesForProfile(profileId);
    const runningServices = await dockerManager.getRunningServices();
    
    const status = services.map(serviceName => {
      const runningService = runningServices.find(s => s.name === serviceName);
      return {
        name: serviceName,
        running: !!runningService,
        status: runningService?.status || 'stopped',
        uptime: runningService?.uptime
      };
    });
    
    return {
      services: status,
      allRunning: status.every(s => s.running),
      runningCount: status.filter(s => s.running).length,
      totalCount: status.length
    };
    
  } catch (error) {
    console.error('Error getting service status:', error);
    return {
      services: [],
      allRunning: false,
      runningCount: 0,
      totalCount: 0,
      error: error.message
    };
  }
}

/**
 * Get services for a profile
 * @param {string} profileId - Profile ID (supports legacy IDs)
 * @returns {string[]} Array of service names
 */
function getServicesForProfile(profileId) {
  const serviceMap = {
    // New profile IDs
    'kaspa-node': ['kaspa-node'],
    'kasia-app': ['kasia-app'],
    'k-social-app': ['k-social'],
    'kaspa-explorer-bundle': ['kaspa-explorer', 'simply-kaspa-indexer', 'timescaledb-explorer'],
    'kasia-indexer': ['kasia-indexer'],
    'k-indexer-bundle': ['k-indexer', 'timescaledb-kindexer'],
    'kaspa-archive-node': ['kaspa-archive-node'],
    'kaspa-stratum': ['kaspa-stratum'],
    
    // Legacy profile IDs
    'core': ['kaspa-node'],
    'kaspa-user-applications': ['kasia-app', 'k-social', 'kaspa-explorer'],
    'indexer-services': ['kasia-indexer', 'k-indexer', 'simply-kaspa-indexer', 'timescaledb'],
    'archive-node': ['kaspa-archive-node'],
    'mining': ['kaspa-stratum']
  };
  
  return serviceMap[profileId] || [];
}

/**
 * Calculate configuration diff
 */
function calculateConfigurationDiff(currentConfig, newConfig) {
  const changes = [];
  const allKeys = new Set([...Object.keys(currentConfig), ...Object.keys(newConfig)]);
  
  for (const key of allKeys) {
    const currentValue = currentConfig[key];
    const newValue = newConfig[key];
    
    if (currentValue !== newValue) {
      changes.push({
        key,
        currentValue,
        newValue,
        type: currentValue === undefined ? 'added' : 
              newValue === undefined ? 'removed' : 'modified'
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
 * Check for configuration conflicts
 */
async function checkConfigurationConflicts(profileId, newConfig) {
  const conflicts = [];
  const warnings = [];
  
  // Check port conflicts
  const portFields = Object.keys(newConfig).filter(key => key.includes('PORT'));
  const usedPorts = [];
  
  for (const field of portFields) {
    const port = parseInt(newConfig[field]);
    if (usedPorts.includes(port)) {
      conflicts.push({
        type: 'port_conflict',
        field,
        value: port,
        message: `Port ${port} is already in use by another service`
      });
    } else {
      usedPorts.push(port);
    }
  }
  
  // Check network changes
  if (newConfig.KASPA_NETWORK) {
    // Load current network
    const projectRoot = process.env.PROJECT_ROOT || '/workspace';
    const envPath = path.join(projectRoot, '.env');
    const currentConfigResult = await configGenerator.loadCompleteConfiguration(envPath);
    
    if (currentConfigResult.success && 
        currentConfigResult.config.KASPA_NETWORK && 
        currentConfigResult.config.KASPA_NETWORK !== newConfig.KASPA_NETWORK) {
      warnings.push({
        type: 'network_change',
        field: 'KASPA_NETWORK',
        currentValue: currentConfigResult.config.KASPA_NETWORK,
        newValue: newConfig.KASPA_NETWORK,
        message: 'Changing networks requires fresh installation and will invalidate existing data'
      });
    }
  }
  
  return {
    hasConflicts: conflicts.length > 0,
    conflicts,
    warnings
  };
}

/**
 * Calculate configuration impact
 */
async function calculateConfigurationImpact(profileId, diff) {
  const affectedServices = getServicesForProfile(profileId);
  const requiresRestart = diff.hasChanges;
  
  // Determine restart type based on changes
  let restartType = 'service'; // service, container, or full
  
  // Check if changes require container recreation
  const containerRecreationFields = ['KASPA_DATA_DIR', 'TIMESCALEDB_DATA_DIR', 'KASPA_ARCHIVE_DATA_DIR'];
  const needsContainerRecreation = diff.changes.some(change => 
    containerRecreationFields.includes(change.key)
  );
  
  if (needsContreationFields) {
    restartType = 'container';
  }
  
  // Check if changes require full restart
  const fullRestartFields = ['KASPA_NETWORK'];
  const needsFullRestart = diff.changes.some(change => 
    fullRestartFields.includes(change.key)
  );
  
  if (needsFullRestart) {
    restartType = 'full';
  }
  
  // Estimate downtime
  let estimatedDowntime = 0; // seconds
  if (requiresRestart) {
    switch (restartType) {
      case 'service':
        estimatedDowntime = 30;
        break;
      case 'container':
        estimatedDowntime = 60;
        break;
      case 'full':
        estimatedDowntime = 300; // 5 minutes for full restart
        break;
    }
  }
  
  return {
    affectedServices,
    requiresRestart,
    restartType,
    estimatedDowntime,
    canApplyWithoutRestart: !requiresRestart,
    changes: diff.changes.map(change => ({
      ...change,
      impact: determineChangeImpact(change.key, change.type)
    }))
  };
}

/**
 * Determine impact level for a configuration change
 */
function determineChangeImpact(key, changeType) {
  const highImpactFields = ['KASPA_NETWORK', 'KASPA_DATA_DIR', 'TIMESCALEDB_DATA_DIR'];
  const mediumImpactFields = ['KASPA_NODE_RPC_PORT', 'KASPA_NODE_P2P_PORT'];
  
  if (highImpactFields.includes(key)) {
    return 'high';
  } else if (mediumImpactFields.includes(key)) {
    return 'medium';
  } else {
    return 'low';
  }
}

/**
 * Check for network changes
 */
function checkNetworkChanges(currentConfig, newConfig) {
  const warnings = [];
  
  if (currentConfig.KASPA_NETWORK && newConfig.KASPA_NETWORK && 
      currentConfig.KASPA_NETWORK !== newConfig.KASPA_NETWORK) {
    warnings.push({
      type: 'network_change',
      message: `Changing from ${currentConfig.KASPA_NETWORK} to ${newConfig.KASPA_NETWORK} requires fresh installation`,
      severity: 'high',
      requiresConfirmation: true
    });
  }
  
  return { warnings };
}

/**
 * Merge profile configuration with existing configuration
 */
function mergeProfileConfiguration(profileId, currentConfig, newProfileConfig) {
  const mergedConfig = { ...currentConfig };
  
  // Update only the fields that belong to this profile
  Object.keys(newProfileConfig).forEach(key => {
    mergedConfig[key] = newProfileConfig[key];
  });
  
  return mergedConfig;
}

/**
 * Update installation state with modification info
 */
async function updateInstallationState(configPath, profileId, newConfig, backupInfo) {
  try {
    let installationState = {};
    
    try {
      const stateContent = await fs.readFile(configPath, 'utf8');
      installationState = JSON.parse(stateContent);
    } catch (error) {
      // Create new state if doesn't exist
      installationState = {
        version: '1.0.0',
        installedAt: new Date().toISOString()
      };
    }
    
    // Update modification info
    installationState.lastModified = new Date().toISOString();
    installationState.mode = 'reconfiguration';
    
    // Add to history
    if (!installationState.history) {
      installationState.history = [];
    }
    
    installationState.history.push({
      timestamp: new Date().toISOString(),
      action: 'modify-configuration',
      profileId,
      backupTimestamp: backupInfo?.timestamp
    });
    
    // Save updated state
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(configPath, JSON.stringify(installationState, null, 2));
    
  } catch (error) {
    console.error('Error updating installation state:', error);
    // Don't fail the whole operation if state update fails
  }
}

/**
 * Restart services for a profile
 */
async function restartProfileServices(profileId, services) {
  try {
    const results = {
      success: true,
      restartedServices: [],
      errors: []
    };
    
    // Stop services first
    for (const serviceName of services) {
      try {
        await dockerManager.stopService(serviceName);
        results.restartedServices.push(serviceName);
      } catch (error) {
        results.errors.push({
          service: serviceName,
          action: 'stop',
          error: error.message
        });
      }
    }
    
    // Wait a bit for services to stop
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Start services
    for (const serviceName of services) {
      try {
        await dockerManager.startService(serviceName);
      } catch (error) {
        results.success = false;
        results.errors.push({
          service: serviceName,
          action: 'start',
          error: error.message
        });
      }
    }
    
    return results;
    
  } catch (error) {
    return {
      success: false,
      restartedServices: [],
      errors: [{ error: error.message }]
    };
  }
}

/**
 * Apply configuration changes (helper function)
 */
async function applyConfigurationChanges(profileId, newConfig, createBackup) {
  const projectRoot = process.env.PROJECT_ROOT || '/workspace';
  const envPath = path.join(projectRoot, '.env');
  const configPath = path.join(projectRoot, '.kaspa-aio', 'installation-state.json');
  
  // Create backup if requested
  let backupInfo = null;
  if (createBackup) {
    const backupResult = await backupManager.createBackup(
      `Configuration modification for ${profileId}`,
      { source: 'config-modification', profileId }
    );
    
    if (backupResult.success) {
      backupInfo = {
        backupId: backupResult.backupId,
        timestamp: backupResult.timestamp,
        backupDir: backupResult.backupPath
      };
    }
  }
  
  // Load current configuration
  const currentConfigResult = await configGenerator.loadCompleteConfiguration(envPath, configPath);
  if (!currentConfigResult.success) {
    throw new Error('Failed to load current configuration');
  }
  
  // Merge configurations
  const mergedConfig = mergeProfileConfiguration(
    profileId, 
    currentConfigResult.config, 
    newConfig
  );
  
  // Get current profiles
  const currentProfiles = currentConfigResult.installationState?.profiles?.selected || [];
  
  // Validate merged configuration
  const validation = await configGenerator.validateConfig(mergedConfig);
  if (!validation.valid) {
    throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
  }
  
  // Generate and save new .env content
  const newEnvContent = await configGenerator.generateEnvFile(validation.config, currentProfiles);
  const saveResult = await configGenerator.saveEnvFile(newEnvContent, envPath);
  
  if (!saveResult.success) {
    throw new Error('Failed to save configuration');
  }
  
  // Update installation state
  await updateInstallationState(configPath, profileId, validation.config, backupInfo);
  
  return {
    success: true,
    message: 'Configuration updated successfully',
    profileId,
    backup: backupInfo
  };
}

/**
 * Generate endpoint recommendations
 */
function generateEndpointRecommendations(hasLocalIndexers, currentEndpoints) {
  const recommendations = [];
  
  if (hasLocalIndexers) {
    // Check if user is still using public endpoints when local are available
    const usingPublicEndpoints = Object.values(currentEndpoints).some(url => 
      url && (url.includes('api.kasia.io') || url.includes('kaspatalk.net') || url.includes('simplykaspa.io'))
    );
    
    if (usingPublicEndpoints) {
      recommendations.push({
        type: 'switch-to-local',
        priority: 'high',
        title: 'Switch to Local Indexers',
        description: 'You have local indexers running. Switching to local endpoints can improve performance and reduce external dependencies.',
        action: 'switch-to-local-endpoints'
      });
    }
  } else {
    recommendations.push({
      type: 'consider-local',
      priority: 'medium',
      title: 'Consider Local Indexers',
      description: 'Installing local indexers can improve performance and reduce reliance on external services.',
      action: 'add-indexer-services-profile'
    });
  }
  
  return recommendations;
}

/**
 * Validate endpoint URLs
 */
function validateEndpointUrls(endpoints) {
  const errors = [];
  
  Object.entries(endpoints).forEach(([key, url]) => {
    if (url && typeof url === 'string') {
      try {
        new URL(url);
        
        // Check protocol
        if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('ws://') && !url.startsWith('wss://')) {
          errors.push(`${key}: Invalid protocol. Must be http, https, ws, or wss`);
        }
      } catch (error) {
        errors.push(`${key}: Invalid URL format`);
      }
    }
  });
  
  return errors;
}

/**
 * Get wallet status
 */
async function getWalletStatus() {
  try {
    // This would check the actual wallet status from the running Kaspa node
    // For now, return a placeholder
    return {
      enabled: false,
      connected: false,
      balance: null,
      address: null,
      synced: false
    };
  } catch (error) {
    return {
      enabled: false,
      connected: false,
      error: error.message
    };
  }
}

/**
 * Validate wallet configuration
 */
function validateWalletConfig(action, config) {
  const errors = [];
  
  switch (action) {
    case 'create-new-wallet':
      if (!config.password || config.password.length < 8) {
        errors.push('Wallet password must be at least 8 characters long');
      }
      break;
      
    case 'import-existing-wallet':
      if (!config.walletFile && !config.mnemonic) {
        errors.push('Either wallet file or mnemonic phrase is required');
      }
      if (!config.password) {
        errors.push('Wallet password is required');
      }
      break;
      
    case 'configure-mining-address':
      if (!config.miningAddress) {
        errors.push('Mining address is required');
      }
      // Add Kaspa address validation here
      break;
      
    case 'update-rpc-settings':
      if (config.rpcUser && config.rpcUser.length < 3) {
        errors.push('RPC username must be at least 3 characters long');
      }
      if (config.rpcPassword && config.rpcPassword.length < 8) {
        errors.push('RPC password must be at least 8 characters long');
      }
      break;
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Convert wallet config to environment variables
 */
function convertWalletConfigToEnv(action, config) {
  const envConfig = {};
  
  switch (action) {
    case 'create-new-wallet':
    case 'import-existing-wallet':
      envConfig.KASPA_WALLET_ENABLED = 'true';
      if (config.password) {
        envConfig.KASPA_WALLET_PASSWORD = config.password;
      }
      if (config.walletFile) {
        envConfig.KASPA_WALLET_FILE = config.walletFile;
      }
      break;
      
    case 'configure-mining-address':
      if (config.miningAddress) {
        envConfig.KASPA_MINING_ADDRESS = config.miningAddress;
      }
      break;
      
    case 'update-rpc-settings':
      if (config.rpcUser) {
        envConfig.KASPA_WALLET_RPC_USER = config.rpcUser;
      }
      if (config.rpcPassword) {
        envConfig.KASPA_WALLET_RPC_PASSWORD = config.rpcPassword;
      }
      break;
      
    case 'enable-disable-wallet':
      envConfig.KASPA_WALLET_ENABLED = config.enabled ? 'true' : 'false';
      break;
  }
  
  return envConfig;
}

/**
 * Get wallet next steps
 */
function getWalletNextSteps(action) {
  switch (action) {
    case 'create-new-wallet':
      return [
        'Restart the Kaspa node service to enable the wallet',
        'Access the wallet through the dashboard',
        'Backup your wallet file and password securely',
        'Configure mining address if you plan to mine'
      ];
      
    case 'import-existing-wallet':
      return [
        'Restart the Kaspa node service to load the wallet',
        'Verify wallet balance and transactions',
        'Update mining address if needed',
        'Ensure wallet file is backed up securely'
      ];
      
    default:
      return [];
  }
}

module.exports = router;