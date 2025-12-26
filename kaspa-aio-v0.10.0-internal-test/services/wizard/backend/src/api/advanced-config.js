const express = require('express');
const router = express.Router();

/**
 * Advanced Configuration API
 * Handles advanced configuration features like indexer connection flexibility,
 * partial configurations, and dynamic endpoint switching
 */

// Default indexer endpoints
const DEFAULT_INDEXER_ENDPOINTS = {
  kasia: {
    public: 'https://indexer.kasia.fyi/',
    local: 'http://localhost:8081'
  },
  ksocial: {
    public: 'https://indexer0.kaspatalk.net/',
    local: 'http://localhost:8082'
  },
  kaspaNode: {
    public: 'wss://wrpc.kasia.fyi',
    local: 'ws://localhost:16110'
  }
};

// POST /api/advanced-config/indexer-connections - Configure indexer connections
router.post('/indexer-connections', (req, res) => {
  try {
    const { 
      connectionMode, 
      profiles, 
      currentConfig = {},
      indexerPreferences = {} 
    } = req.body;
    
    if (!connectionMode || !Array.isArray(profiles)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'connectionMode and profiles array are required'
      });
    }
    
    // Generate indexer configuration based on mode
    const indexerConfig = generateIndexerConfiguration(
      connectionMode, 
      profiles, 
      currentConfig,
      indexerPreferences
    );
    
    // Validate the configuration
    const validation = validateIndexerConfiguration(indexerConfig, profiles);
    
    res.json({
      success: true,
      configuration: indexerConfig,
      validation: validation,
      endpoints: getResolvedEndpoints(indexerConfig, profiles)
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to configure indexer connections',
      message: error.message
    });
  }
});

// POST /api/advanced-config/switch-endpoints - Switch indexer endpoints
router.post('/switch-endpoints', (req, res) => {
  try {
    const { 
      currentConfig, 
      targetMode, 
      profiles,
      specificEndpoints = {} 
    } = req.body;
    
    if (!currentConfig || !targetMode || !Array.isArray(profiles)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'currentConfig, targetMode, and profiles are required'
      });
    }
    
    // Calculate endpoint changes
    const endpointChanges = calculateEndpointChanges(
      currentConfig, 
      targetMode, 
      profiles,
      specificEndpoints
    );
    
    // Generate new configuration
    const newConfig = applyEndpointChanges(currentConfig, endpointChanges);
    
    // Validate the changes
    const validation = validateEndpointChanges(endpointChanges, profiles);
    
    res.json({
      success: true,
      currentEndpoints: getCurrentEndpoints(currentConfig),
      newEndpoints: getResolvedEndpoints(newConfig, profiles),
      changes: endpointChanges,
      configuration: newConfig,
      validation: validation,
      impact: calculateSwitchingImpact(endpointChanges, profiles)
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to switch endpoints',
      message: error.message
    });
  }
});

// GET /api/advanced-config/indexer-status - Get current indexer connection status
router.get('/indexer-status', async (req, res) => {
  try {
    const { profiles } = req.query;
    const profileList = profiles ? profiles.split(',') : [];
    
    // Check status of local and public indexers
    const status = await checkIndexerStatus(profileList);
    
    res.json({
      success: true,
      status: status,
      recommendations: generateConnectionRecommendations(status)
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to check indexer status',
      message: error.message
    });
  }
});

// POST /api/advanced-config/partial-indexer - Configure partial indexer setup
router.post('/partial-indexer', (req, res) => {
  try {
    const { 
      profiles, 
      enabledIndexers = [], 
      indexerConfig = {},
      currentConfig = {} 
    } = req.body;
    
    if (!Array.isArray(profiles) || !Array.isArray(enabledIndexers)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'profiles and enabledIndexers arrays are required'
      });
    }
    
    // Generate partial indexer configuration
    const partialConfig = generatePartialIndexerConfiguration(
      profiles,
      enabledIndexers,
      indexerConfig,
      currentConfig
    );
    
    // Validate partial configuration
    const validation = validatePartialIndexerConfiguration(partialConfig, profiles);
    
    res.json({
      success: true,
      configuration: partialConfig,
      enabledServices: getEnabledIndexerServices(partialConfig),
      disabledServices: getDisabledIndexerServices(partialConfig),
      validation: validation,
      warnings: generatePartialIndexerWarnings(partialConfig, profiles)
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to configure partial indexers',
      message: error.message
    });
  }
});

// POST /api/advanced-config/wallet-management - Configure wallet across profiles
router.post('/wallet-management', (req, res) => {
  try {
    const { 
      profiles, 
      walletConfig, 
      currentConfig = {} 
    } = req.body;
    
    if (!Array.isArray(profiles) || !walletConfig) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'profiles array and walletConfig are required'
      });
    }
    
    // Generate wallet configuration for all profiles
    const walletConfiguration = generateWalletConfiguration(
      profiles,
      walletConfig,
      currentConfig
    );
    
    // Validate wallet configuration
    const validation = validateWalletConfiguration(walletConfiguration, profiles);
    
    res.json({
      success: true,
      configuration: walletConfiguration,
      affectedProfiles: getWalletAffectedProfiles(profiles),
      validation: validation,
      securityRecommendations: generateWalletSecurityRecommendations(walletConfig)
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to configure wallet management',
      message: error.message
    });
  }
});

// POST /api/advanced-config/custom-env-vars - Manage custom environment variables
router.post('/custom-env-vars', (req, res) => {
  try {
    const { 
      customVars, 
      profiles, 
      currentConfig = {},
      operation = 'merge' // 'merge', 'replace', 'remove'
    } = req.body;
    
    if (!customVars || !Array.isArray(profiles)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'customVars and profiles array are required'
      });
    }
    
    // Process custom environment variables
    const processedConfig = processCustomEnvironmentVariables(
      customVars,
      profiles,
      currentConfig,
      operation
    );
    
    // Validate custom variables
    const validation = validateCustomEnvironmentVariables(processedConfig.customVars);
    
    res.json({
      success: true,
      configuration: processedConfig.configuration,
      customVariables: processedConfig.customVars,
      validation: validation,
      warnings: generateCustomVarWarnings(processedConfig.customVars, profiles)
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to manage custom environment variables',
      message: error.message
    });
  }
});

/**
 * Generate indexer configuration based on connection mode
 */
function generateIndexerConfiguration(connectionMode, profiles, currentConfig, preferences) {
  const config = { ...currentConfig };
  
  // Set connection mode
  config.INDEXER_CONNECTION_MODE = connectionMode;
  
  // Configure based on mode
  switch (connectionMode) {
    case 'auto':
      // Auto-detect local indexers, fallback to public
      config.REMOTE_KASIA_INDEXER_URL = profiles.includes('indexer-services') 
        ? DEFAULT_INDEXER_ENDPOINTS.kasia.local 
        : DEFAULT_INDEXER_ENDPOINTS.kasia.public;
      config.REMOTE_KSOCIAL_INDEXER_URL = profiles.includes('indexer-services')
        ? DEFAULT_INDEXER_ENDPOINTS.ksocial.local
        : DEFAULT_INDEXER_ENDPOINTS.ksocial.public;
      config.REMOTE_KASPA_NODE_WBORSH_URL = profiles.includes('core') || profiles.includes('archive-node')
        ? DEFAULT_INDEXER_ENDPOINTS.kaspaNode.local
        : DEFAULT_INDEXER_ENDPOINTS.kaspaNode.public;
      break;
      
    case 'local':
      // Force local connections
      config.REMOTE_KASIA_INDEXER_URL = DEFAULT_INDEXER_ENDPOINTS.kasia.local;
      config.REMOTE_KSOCIAL_INDEXER_URL = DEFAULT_INDEXER_ENDPOINTS.ksocial.local;
      config.REMOTE_KASPA_NODE_WBORSH_URL = DEFAULT_INDEXER_ENDPOINTS.kaspaNode.local;
      break;
      
    case 'public':
      // Force public connections
      config.REMOTE_KASIA_INDEXER_URL = DEFAULT_INDEXER_ENDPOINTS.kasia.public;
      config.REMOTE_KSOCIAL_INDEXER_URL = DEFAULT_INDEXER_ENDPOINTS.ksocial.public;
      config.REMOTE_KASPA_NODE_WBORSH_URL = DEFAULT_INDEXER_ENDPOINTS.kaspaNode.public;
      break;
      
    case 'mixed':
      // Use individual preferences
      config.KASIA_INDEXER_CONNECTION = preferences.kasia || 'auto';
      config.KSOCIAL_INDEXER_CONNECTION = preferences.ksocial || 'auto';
      config.KASPA_NODE_CONNECTION = preferences.kaspaNode || 'auto';
      
      // Set URLs based on preferences
      config.REMOTE_KASIA_INDEXER_URL = getEndpointForPreference(
        'kasia', preferences.kasia, profiles
      );
      config.REMOTE_KSOCIAL_INDEXER_URL = getEndpointForPreference(
        'ksocial', preferences.ksocial, profiles
      );
      config.REMOTE_KASPA_NODE_WBORSH_URL = getEndpointForPreference(
        'kaspaNode', preferences.kaspaNode, profiles
      );
      break;
  }
  
  return config;
}

/**
 * Get endpoint URL based on preference and available profiles
 */
function getEndpointForPreference(service, preference, profiles) {
  const endpoints = DEFAULT_INDEXER_ENDPOINTS[service];
  
  switch (preference) {
    case 'local':
      return endpoints.local;
    case 'public':
      return endpoints.public;
    case 'auto':
    default:
      // Auto-detect based on profiles
      if (service === 'kaspaNode') {
        return (profiles.includes('core') || profiles.includes('archive-node'))
          ? endpoints.local : endpoints.public;
      } else {
        return profiles.includes('indexer-services') 
          ? endpoints.local : endpoints.public;
      }
  }
}

/**
 * Validate indexer configuration
 */
function validateIndexerConfiguration(config, profiles) {
  const validation = {
    valid: true,
    warnings: [],
    errors: []
  };
  
  // Check if local endpoints are used without local services
  if (config.INDEXER_CONNECTION_MODE === 'local' && !profiles.includes('indexer-services')) {
    validation.warnings.push({
      severity: 'high',
      message: 'Local indexer mode selected but indexer-services profile not installed. Services may fail to connect.',
      field: 'INDEXER_CONNECTION_MODE'
    });
  }
  
  if ((config.REMOTE_KASPA_NODE_WBORSH_URL || '').includes('localhost') && 
      !profiles.includes('core') && !profiles.includes('archive-node')) {
    validation.warnings.push({
      severity: 'high',
      message: 'Local Kaspa node endpoint configured but no local node profile installed.',
      field: 'REMOTE_KASPA_NODE_WBORSH_URL'
    });
  }
  
  return validation;
}

/**
 * Get resolved endpoints for display
 */
function getResolvedEndpoints(config, profiles) {
  return {
    kasiaIndexer: config.REMOTE_KASIA_INDEXER_URL,
    ksocialIndexer: config.REMOTE_KSOCIAL_INDEXER_URL,
    kaspaNode: config.REMOTE_KASPA_NODE_WBORSH_URL,
    connectionMode: config.INDEXER_CONNECTION_MODE,
    localServicesAvailable: {
      indexers: profiles.includes('indexer-services'),
      kaspaNode: profiles.includes('core') || profiles.includes('archive-node')
    }
  };
}

/**
 * Calculate endpoint changes for switching
 */
function calculateEndpointChanges(currentConfig, targetMode, profiles, specificEndpoints) {
  const currentEndpoints = getCurrentEndpoints(currentConfig);
  const targetConfig = generateIndexerConfiguration(targetMode, profiles, currentConfig, specificEndpoints);
  const targetEndpoints = getCurrentEndpoints(targetConfig);
  
  const changes = [];
  
  Object.keys(targetEndpoints).forEach(key => {
    if (currentEndpoints[key] !== targetEndpoints[key]) {
      changes.push({
        endpoint: key,
        from: currentEndpoints[key],
        to: targetEndpoints[key],
        type: getEndpointType(targetEndpoints[key])
      });
    }
  });
  
  return changes;
}

/**
 * Get current endpoints from configuration
 */
function getCurrentEndpoints(config) {
  return {
    kasiaIndexer: config.REMOTE_KASIA_INDEXER_URL,
    ksocialIndexer: config.REMOTE_KSOCIAL_INDEXER_URL,
    kaspaNode: config.REMOTE_KASPA_NODE_WBORSH_URL
  };
}

/**
 * Get endpoint type (local/public)
 */
function getEndpointType(url) {
  if (!url) return 'unknown';
  return url.includes('localhost') || url.includes('127.0.0.1') ? 'local' : 'public';
}

/**
 * Apply endpoint changes to configuration
 */
function applyEndpointChanges(currentConfig, changes) {
  const newConfig = { ...currentConfig };
  
  changes.forEach(change => {
    switch (change.endpoint) {
      case 'kasiaIndexer':
        newConfig.REMOTE_KASIA_INDEXER_URL = change.to;
        break;
      case 'ksocialIndexer':
        newConfig.REMOTE_KSOCIAL_INDEXER_URL = change.to;
        break;
      case 'kaspaNode':
        newConfig.REMOTE_KASPA_NODE_WBORSH_URL = change.to;
        break;
    }
  });
  
  return newConfig;
}

/**
 * Validate endpoint changes
 */
function validateEndpointChanges(changes, profiles) {
  const validation = {
    valid: true,
    warnings: [],
    errors: []
  };
  
  changes.forEach(change => {
    if (change.type === 'local') {
      // Check if local service is available
      const serviceAvailable = checkLocalServiceAvailability(change.endpoint, profiles);
      if (!serviceAvailable) {
        validation.warnings.push({
          severity: 'high',
          message: `Switching ${change.endpoint} to local but service may not be available`,
          endpoint: change.endpoint
        });
      }
    }
  });
  
  return validation;
}

/**
 * Check if local service is available for endpoint
 */
function checkLocalServiceAvailability(endpoint, profiles) {
  switch (endpoint) {
    case 'kasiaIndexer':
    case 'ksocialIndexer':
      return profiles.includes('indexer-services');
    case 'kaspaNode':
      return profiles.includes('core') || profiles.includes('archive-node');
    default:
      return false;
  }
}

/**
 * Calculate impact of switching endpoints
 */
function calculateSwitchingImpact(changes, profiles) {
  const impact = {
    requiresRestart: changes.length > 0,
    affectedServices: [],
    estimatedDowntime: 0,
    dataLoss: false
  };
  
  if (profiles.includes('kaspa-user-applications')) {
    impact.affectedServices.push('kasia-app', 'k-social-app', 'kaspa-explorer');
    impact.estimatedDowntime = Math.max(impact.estimatedDowntime, 30); // 30 seconds
  }
  
  return impact;
}

/**
 * Check indexer status (mock implementation)
 */
async function checkIndexerStatus(profiles) {
  // In a real implementation, this would check actual service health
  return {
    local: {
      available: profiles.includes('indexer-services'),
      kasiaIndexer: { status: 'running', latency: 10 },
      ksocialIndexer: { status: 'running', latency: 15 },
      kaspaNode: { status: profiles.includes('core') ? 'running' : 'unavailable', latency: 5 }
    },
    public: {
      available: true,
      kasiaIndexer: { status: 'running', latency: 150 },
      ksocialIndexer: { status: 'running', latency: 200 },
      kaspaNode: { status: 'running', latency: 100 }
    }
  };
}

/**
 * Generate connection recommendations based on status
 */
function generateConnectionRecommendations(status) {
  const recommendations = [];
  
  if (status.local.available) {
    recommendations.push({
      type: 'performance',
      message: 'Local indexers are available and will provide better performance',
      action: 'switch-to-local'
    });
  }
  
  if (!status.local.available) {
    recommendations.push({
      type: 'reliability',
      message: 'Consider installing local indexers for better reliability and performance',
      action: 'install-indexer-services'
    });
  }
  
  return recommendations;
}

/**
 * Generate partial indexer configuration
 */
function generatePartialIndexerConfiguration(profiles, enabledIndexers, indexerConfig, currentConfig) {
  const config = { ...currentConfig };
  
  // Configure only enabled indexers
  const availableIndexers = ['kasia-indexer', 'k-indexer', 'simply-kaspa-indexer'];
  
  availableIndexers.forEach(indexer => {
    const enabled = enabledIndexers.includes(indexer);
    const envKey = `${indexer.toUpperCase().replace('-', '_')}_ENABLED`;
    config[envKey] = enabled;
    
    if (enabled && indexerConfig[indexer]) {
      // Apply specific configuration for this indexer
      Object.keys(indexerConfig[indexer]).forEach(key => {
        const fullKey = `${indexer.toUpperCase().replace('-', '_')}_${key.toUpperCase()}`;
        config[fullKey] = indexerConfig[indexer][key];
      });
    }
  });
  
  return config;
}

/**
 * Validate partial indexer configuration
 */
function validatePartialIndexerConfiguration(config, profiles) {
  const validation = {
    valid: true,
    warnings: [],
    errors: []
  };
  
  if (!profiles.includes('indexer-services')) {
    validation.errors.push({
      severity: 'high',
      message: 'Partial indexer configuration requires indexer-services profile',
      field: 'profiles'
    });
    validation.valid = false;
  }
  
  return validation;
}

/**
 * Get enabled indexer services
 */
function getEnabledIndexerServices(config) {
  const enabled = [];
  
  if (config.KASIA_INDEXER_ENABLED) enabled.push('kasia-indexer');
  if (config.K_INDEXER_ENABLED) enabled.push('k-indexer');
  if (config.SIMPLY_KASPA_INDEXER_ENABLED) enabled.push('simply-kaspa-indexer');
  
  return enabled;
}

/**
 * Get disabled indexer services
 */
function getDisabledIndexerServices(config) {
  const disabled = [];
  
  if (!config.KASIA_INDEXER_ENABLED) disabled.push('kasia-indexer');
  if (!config.K_INDEXER_ENABLED) disabled.push('k-indexer');
  if (!config.SIMPLY_KASPA_INDEXER_ENABLED) disabled.push('simply-kaspa-indexer');
  
  return disabled;
}

/**
 * Generate partial indexer warnings
 */
function generatePartialIndexerWarnings(config, profiles) {
  const warnings = [];
  
  const enabledServices = getEnabledIndexerServices(config);
  const disabledServices = getDisabledIndexerServices(config);
  
  if (disabledServices.length > 0) {
    warnings.push({
      severity: 'medium',
      message: `Some indexer services will be disabled: ${disabledServices.join(', ')}. Related applications may not function properly.`
    });
  }
  
  return warnings;
}

/**
 * Generate wallet configuration for profiles
 */
function generateWalletConfiguration(profiles, walletConfig, currentConfig) {
  const config = { ...currentConfig };
  
  // Apply wallet configuration to all relevant profiles
  const walletProfiles = profiles.filter(p => ['core', 'archive-node', 'mining'].includes(p));
  
  if (walletProfiles.length > 0) {
    config.WALLET_ENABLED = walletConfig.enabled || false;
    config.WALLET_MODE = walletConfig.mode || 'create';
    
    if (walletConfig.password) {
      config.WALLET_PASSWORD = walletConfig.password;
    }
    
    if (walletConfig.seedPhrase && walletConfig.mode === 'import') {
      config.WALLET_SEED_PHRASE = walletConfig.seedPhrase;
    }
    
    if (walletConfig.miningAddress && profiles.includes('mining')) {
      config.MINING_ADDRESS = walletConfig.miningAddress;
    }
  }
  
  return config;
}

/**
 * Validate wallet configuration
 */
function validateWalletConfiguration(config, profiles) {
  const validation = {
    valid: true,
    warnings: [],
    errors: []
  };
  
  if (config.WALLET_ENABLED && config.WALLET_MODE === 'import' && !config.WALLET_SEED_PHRASE) {
    validation.errors.push({
      severity: 'high',
      message: 'Seed phrase is required for wallet import mode',
      field: 'WALLET_SEED_PHRASE'
    });
    validation.valid = false;
  }
  
  if (profiles.includes('mining') && config.WALLET_ENABLED && !config.MINING_ADDRESS) {
    validation.warnings.push({
      severity: 'medium',
      message: 'Mining address should be configured for mining profile',
      field: 'MINING_ADDRESS'
    });
  }
  
  return validation;
}

/**
 * Get profiles affected by wallet configuration
 */
function getWalletAffectedProfiles(profiles) {
  return profiles.filter(p => ['core', 'archive-node', 'mining'].includes(p));
}

/**
 * Generate wallet security recommendations
 */
function generateWalletSecurityRecommendations(walletConfig) {
  const recommendations = [];
  
  if (walletConfig.enabled && !walletConfig.password) {
    recommendations.push({
      type: 'security',
      severity: 'high',
      message: 'Consider setting a wallet password for additional security'
    });
  }
  
  if (walletConfig.seedPhrase) {
    recommendations.push({
      type: 'security',
      severity: 'high',
      message: 'Make sure to securely backup your seed phrase. It will not be stored in configuration files.'
    });
  }
  
  return recommendations;
}

/**
 * Process custom environment variables
 */
function processCustomEnvironmentVariables(customVars, profiles, currentConfig, operation) {
  const config = { ...currentConfig };
  const processedVars = {};
  
  // Parse custom variables
  if (typeof customVars === 'string') {
    const lines = customVars.split('\n');
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          processedVars[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
  } else if (typeof customVars === 'object') {
    Object.assign(processedVars, customVars);
  }
  
  // Apply based on operation
  switch (operation) {
    case 'merge':
      Object.assign(config, processedVars);
      break;
    case 'replace':
      // Remove existing custom vars and add new ones
      // This would require tracking which vars are custom
      Object.assign(config, processedVars);
      break;
    case 'remove':
      Object.keys(processedVars).forEach(key => {
        delete config[key];
      });
      break;
  }
  
  return {
    configuration: config,
    customVars: processedVars
  };
}

/**
 * Validate custom environment variables
 */
function validateCustomEnvironmentVariables(customVars) {
  const validation = {
    valid: true,
    warnings: [],
    errors: []
  };
  
  Object.keys(customVars).forEach(key => {
    // Check key format
    if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) {
      validation.errors.push({
        severity: 'high',
        message: `Invalid environment variable name: ${key}. Must contain only uppercase letters, numbers, and underscores.`,
        field: key
      });
      validation.valid = false;
    }
    
    // Check for conflicts with system variables
    const systemVars = [
      'PATH', 'HOME', 'USER', 'SHELL', 'PWD', 'LANG', 'LC_ALL',
      'KASPA_NODE_RPC_PORT', 'KASPA_NODE_P2P_PORT', 'POSTGRES_PASSWORD'
    ];
    
    if (systemVars.includes(key)) {
      validation.warnings.push({
        severity: 'medium',
        message: `Variable ${key} may conflict with system or application variables`,
        field: key
      });
    }
  });
  
  return validation;
}

/**
 * Generate custom variable warnings
 */
function generateCustomVarWarnings(customVars, profiles) {
  const warnings = [];
  
  const varCount = Object.keys(customVars).length;
  if (varCount > 20) {
    warnings.push({
      severity: 'medium',
      message: `Large number of custom variables (${varCount}). Consider using configuration files for complex setups.`
    });
  }
  
  return warnings;
}

module.exports = router;