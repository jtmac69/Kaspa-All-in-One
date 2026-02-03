const express = require('express');
const router = express.Router();

/**
 * Configuration Templates API
 * Provides pre-configured templates and presets for common use cases
 */

/**
 * Configuration Templates
 * Pre-configured setups with profile selections and configurations
 * UPDATED: Now uses new 8-profile architecture
 */
const CONFIGURATION_TEMPLATES = {
  'beginner-setup': {
    id: 'beginner-setup',
    name: 'Beginner Setup',
    description: 'Quick start with Kaspa apps using public infrastructure',
    profiles: ['kasia-app', 'k-social-app'],  // UPDATED: Split from kaspa-user-applications
    configuration: {
      KASPA_NETWORK: 'mainnet',
      KASIA_APP_PORT: 3001,
      KASIA_INDEXER_MODE: 'public',
      REMOTE_KASIA_INDEXER_URL: 'https://api.kasia.io',
      KSOCIAL_APP_PORT: 3003,
      KSOCIAL_INDEXER_MODE: 'public',
      REMOTE_KSOCIAL_INDEXER_URL: 'https://indexer0.kaspatalk.net/',
      INDEXER_CONNECTION_MODE: 'public'
    },
    resources: {
      minCpu: 1,
      minMemory: 2,
      minDisk: 10
    }
  },
  
  'home-node': {
    id: 'home-node',
    name: 'Home Node',
    description: 'Personal Kaspa node for home use',
    profiles: ['kaspa-node'],  // UPDATED: Renamed from 'core'
    configuration: {
      KASPA_NETWORK: 'mainnet',
      KASPA_NODE_RPC_PORT: 16110,
      KASPA_NODE_P2P_PORT: 16111,
      KASPA_NODE_WRPC_PORT: 17110,
      PUBLIC_NODE: false,
      WALLET_ENABLED: true,
      WALLET_MODE: 'create',
      UTXO_INDEX: true,
      INDEXER_CONNECTION_MODE: 'public'
    },
    resources: {
      minCpu: 2,
      minMemory: 4,
      minDisk: 100
    }
  },
  
  'archive-node': {
    id: 'archive-node',
    name: 'Archive Node',
    description: 'Full history archive node for data analysis',
    profiles: ['kaspa-archive-node'],  // UPDATED: Renamed from 'archive-node'
    configuration: {
      KASPA_NETWORK: 'mainnet',
      KASPA_NODE_RPC_PORT: 16110,
      KASPA_NODE_P2P_PORT: 16111,
      KASPA_NODE_WRPC_PORT: 17110,
      PUBLIC_NODE: true,
      EXTERNAL_IP: '',
      INDEXER_CONNECTION_MODE: 'local'
    },
    resources: {
      minCpu: 4,
      minMemory: 12,
      minDisk: 1000
    }
  },
  
  'mining-rig': {
    id: 'mining-rig',
    name: 'Mining Rig',
    description: 'Optimized setup for mining with local node and wallet',
    profiles: ['kaspa-node', 'kaspa-stratum'],  // UPDATED: Renamed from 'core', 'mining'
    configuration: {
      KASPA_NETWORK: 'mainnet',
      KASPA_NODE_RPC_PORT: 16110,
      KASPA_NODE_P2P_PORT: 16111,
      KASPA_NODE_WRPC_PORT: 17110,
      PUBLIC_NODE: false,
      WALLET_ENABLED: true,
      WALLET_MODE: 'create',
      MINING_ADDRESS: '', // User must provide
      STRATUM_PORT: 5555,
      INDEXER_CONNECTION_MODE: 'public'
    },
    resources: {
      minCpu: 4,
      minMemory: 8,
      minDisk: 200
    }
  },
  
  'full-stack': {
    id: 'full-stack',
    name: 'Full Stack',
    description: 'Complete Kaspa ecosystem with all services',
    profiles: ['kaspa-node', 'kasia-app', 'k-social-app', 'kasia-indexer'],  // UPDATED: New profile IDs
    configuration: {
      KASPA_NETWORK: 'mainnet',
      KASPA_NODE_RPC_PORT: 16110,
      KASPA_NODE_P2P_PORT: 16111,
      KASPA_NODE_WRPC_PORT: 17110,
      PUBLIC_NODE: true,
      WALLET_ENABLED: true,
      WALLET_MODE: 'create',
      KASIA_APP_PORT: 3001,
      KASIA_INDEXER_MODE: 'local',
      KSOCIAL_APP_PORT: 3003,
      KSOCIAL_INDEXER_MODE: 'public',  // K-Social uses public indexer
      REMOTE_KSOCIAL_INDEXER_URL: 'https://indexer0.kaspatalk.net/',
      KASIA_INDEXER_PORT: 3002,
      POSTGRES_PASSWORD_KINDEXER: '',  // User must provide
      TIMESCALEDB_KINDEXER_PORT: 5433,
      INDEXER_CONNECTION_MODE: 'local',
      EXTERNAL_IP: '' // Will be auto-detected
    },
    resources: {
      minCpu: 8,
      minMemory: 32,
      minDisk: 1000
    }
  }
};

// GET /api/config-templates - List all available templates
router.get('/', (req, res) => {
  try {
    const templates = Object.values(CONFIGURATION_TEMPLATES).map(template => ({
      id: template.id,
      name: template.name,
      description: template.description,
      profiles: template.profiles,
      resources: template.resources
    }));
    
    res.json({
      success: true,
      templates
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to load templates',
      message: error.message
    });
  }
});

// GET /api/config-templates/:id - Get specific template
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const template = CONFIGURATION_TEMPLATES[id];
    
    if (!template) {
      return res.status(404).json({
        error: 'Template not found',
        message: `No template found with ID: ${id}`
      });
    }
    
    res.json({
      success: true,
      template
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to load template',
      message: error.message
    });
  }
});

// POST /api/config-templates/apply - Apply template to current configuration
router.post('/apply', (req, res) => {
  try {
    const { templateId, currentConfig = {}, overrides = {} } = req.body;
    
    if (!templateId) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'templateId is required'
      });
    }
    
    const template = CONFIGURATION_TEMPLATES[templateId];
    if (!template) {
      return res.status(404).json({
        error: 'Template not found',
        message: `No template found with ID: ${templateId}`
      });
    }
    
    // Merge template configuration with current config and overrides
    const mergedConfig = {
      ...currentConfig,
      ...template.configuration,
      ...overrides
    };
    
    // Calculate configuration changes
    const changes = calculateConfigurationChanges(currentConfig, mergedConfig);
    
    res.json({
      success: true,
      template: template,
      configuration: mergedConfig,
      profiles: template.profiles,
      changes: changes,
      warnings: generateTemplateWarnings(template, currentConfig)
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to apply template',
      message: error.message
    });
  }
});

// POST /api/config-templates/save - Save current configuration as custom template
router.post('/save', (req, res) => {
  try {
    const { name, description, profiles, configuration } = req.body;
    
    if (!name || !profiles || !configuration) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'name, profiles, and configuration are required'
      });
    }
    
    // Generate template ID from name
    const templateId = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    // Create custom template
    const customTemplate = {
      id: templateId,
      name: name,
      description: description || `Custom template: ${name}`,
      profiles: profiles,
      configuration: configuration,
      custom: true,
      createdAt: new Date().toISOString()
    };
    
    // In a real implementation, this would be saved to a database or file
    // For now, we'll just return the template structure
    
    res.json({
      success: true,
      template: customTemplate,
      message: 'Custom template created successfully'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to save template',
      message: error.message
    });
  }
});

// POST /api/config-templates/validate - Validate template compatibility
router.post('/validate', (req, res) => {
  try {
    const { templateId, currentProfiles = [], currentConfig = {} } = req.body;
    
    if (!templateId) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'templateId is required'
      });
    }
    
    const template = CONFIGURATION_TEMPLATES[templateId];
    if (!template) {
      return res.status(404).json({
        error: 'Template not found',
        message: `No template found with ID: ${templateId}`
      });
    }
    
    // Validate template compatibility
    const validation = validateTemplateCompatibility(template, currentProfiles, currentConfig);
    
    res.json({
      success: true,
      valid: validation.valid,
      warnings: validation.warnings,
      errors: validation.errors,
      changes: validation.changes
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to validate template',
      message: error.message
    });
  }
});

/**
 * Calculate configuration changes between current and new config
 */
function calculateConfigurationChanges(currentConfig, newConfig) {
  const changes = [];
  
  // Find added/modified fields
  Object.keys(newConfig).forEach(key => {
    if (!(key in currentConfig)) {
      changes.push({
        type: 'added',
        key: key,
        newValue: newConfig[key]
      });
    } else if (currentConfig[key] !== newConfig[key]) {
      changes.push({
        type: 'modified',
        key: key,
        currentValue: currentConfig[key],
        newValue: newConfig[key]
      });
    }
  });
  
  // Find removed fields
  Object.keys(currentConfig).forEach(key => {
    if (!(key in newConfig)) {
      changes.push({
        type: 'removed',
        key: key,
        currentValue: currentConfig[key]
      });
    }
  });
  
  return changes;
}

/**
 * Generate warnings when applying template
 */
function generateTemplateWarnings(template, currentConfig) {
  const warnings = [];
  
  // Network change warning
  if (currentConfig.KASPA_NETWORK && 
      template.configuration.KASPA_NETWORK && 
      currentConfig.KASPA_NETWORK !== template.configuration.KASPA_NETWORK) {
    warnings.push({
      severity: 'high',
      message: `Network will change from ${currentConfig.KASPA_NETWORK} to ${template.configuration.KASPA_NETWORK}. This requires a fresh installation.`,
      requiresConfirmation: true
    });
  }
  
  // Port change warning
  if (currentConfig.KASPA_NODE_RPC_PORT && 
      template.configuration.KASPA_NODE_RPC_PORT && 
      currentConfig.KASPA_NODE_RPC_PORT !== template.configuration.KASPA_NODE_RPC_PORT) {
    warnings.push({
      severity: 'medium',
      message: `RPC port will change from ${currentConfig.KASPA_NODE_RPC_PORT} to ${template.configuration.KASPA_NODE_RPC_PORT}. Services will need to restart.`,
      requiresConfirmation: false
    });
  }
  
  // Wallet mode change warning
  if (currentConfig.WALLET_ENABLED && template.configuration.WALLET_ENABLED === false) {
    warnings.push({
      severity: 'medium',
      message: 'Wallet will be disabled. Make sure to backup your wallet data.',
      requiresConfirmation: true
    });
  }
  
  return warnings;
}

/**
 * Validate template compatibility with current installation
 */
function validateTemplateCompatibility(template, currentProfiles, currentConfig) {
  const validation = {
    valid: true,
    warnings: [],
    errors: [],
    changes: []
  };
  
  // Check profile compatibility
  const newProfiles = template.profiles;
  const profileChanges = {
    added: newProfiles.filter(p => !currentProfiles.includes(p)),
    removed: currentProfiles.filter(p => !newProfiles.includes(p))
  };
  
  if (profileChanges.added.length > 0) {
    validation.warnings.push({
      severity: 'medium',
      message: `Template will add profiles: ${profileChanges.added.join(', ')}`
    });
  }
  
  if (profileChanges.removed.length > 0) {
    validation.warnings.push({
      severity: 'high',
      message: `Template will remove profiles: ${profileChanges.removed.join(', ')}`,
      requiresConfirmation: true
    });
  }
  
  // Check configuration changes
  validation.changes = calculateConfigurationChanges(currentConfig, template.configuration);
  
  // Add template-specific warnings
  validation.warnings.push(...generateTemplateWarnings(template, currentConfig));
  
  return validation;
}

module.exports = router;