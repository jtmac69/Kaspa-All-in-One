const express = require('express');
const router = express.Router();

/**
 * Simple Template API - Bypasses ProfileManager circular reference issues
 * Provides direct template data without complex object relationships
 */

// Valid profile definitions (from ProfileManager)
const VALID_PROFILES = ['core', 'kaspa-user-applications', 'indexer-services', 'archive-node', 'mining'];

// Profile dependencies and conflicts (from ProfileManager)
const PROFILE_DEPENDENCIES = {
  'mining': ['core', 'archive-node'] // Mining requires either core or archive-node
};

const PROFILE_CONFLICTS = {
  'archive-node': ['core'], // Archive node conflicts with core
  'core': ['archive-node']  // Core conflicts with archive node
};

// Required configuration fields per profile
const PROFILE_CONFIG_REQUIREMENTS = {
  'core': ['KASPA_NODE_RPC_PORT', 'KASPA_NODE_P2P_PORT'],
  'archive-node': ['KASPA_NODE_RPC_PORT', 'KASPA_NODE_P2P_PORT'],
  'indexer-services': ['POSTGRES_USER', 'TIMESCALEDB_PORT'],
  'mining': ['STRATUM_PORT', 'MINING_ADDRESS'],
  'kaspa-user-applications': [] // No required config fields
};

/**
 * Comprehensive template validation function
 * @param {string} templateId - Template ID to validate
 * @param {Object} systemResources - Optional system resources for compatibility check
 * @returns {Object} Validation result with errors, warnings, and fallback options
 */
function validateTemplate(templateId, systemResources = null) {
  const template = templates[templateId];
  
  if (!template) {
    return {
      valid: false,
      errors: ['Template not found'],
      warnings: [],
      fallbackOptions: ['build-custom'],
      templateId
    };
  }
  
  const errors = [];
  const warnings = [];
  const fallbackOptions = [];
  
  // 1. Validate template structure
  if (!template.id || template.id !== templateId) {
    errors.push('Template ID mismatch or missing');
  }
  
  if (!template.name || typeof template.name !== 'string') {
    errors.push('Template name is required and must be a string');
  }
  
  if (!template.description || typeof template.description !== 'string') {
    errors.push('Template description is required and must be a string');
  }
  
  if (!template.profiles || !Array.isArray(template.profiles) || template.profiles.length === 0) {
    errors.push('Template must have at least one profile defined');
  }
  
  if (!template.config || typeof template.config !== 'object') {
    errors.push('Template configuration object is required');
  }
  
  if (!template.resources || typeof template.resources !== 'object') {
    errors.push('Template resources specification is required');
  }
  
  // 2. Validate profile references
  if (template.profiles && Array.isArray(template.profiles)) {
    const invalidProfiles = template.profiles.filter(p => !VALID_PROFILES.includes(p));
    if (invalidProfiles.length > 0) {
      errors.push(`Template references invalid profiles: ${invalidProfiles.join(', ')}`);
      errors.push(`Valid profiles are: ${VALID_PROFILES.join(', ')}`);
    }
    
    // Check for profile conflicts
    const profileConflicts = [];
    for (const profile of template.profiles) {
      if (PROFILE_CONFLICTS[profile]) {
        const conflicts = PROFILE_CONFLICTS[profile].filter(c => template.profiles.includes(c));
        if (conflicts.length > 0) {
          profileConflicts.push(`${profile} conflicts with: ${conflicts.join(', ')}`);
        }
      }
    }
    if (profileConflicts.length > 0) {
      errors.push(`Profile conflicts detected: ${profileConflicts.join('; ')}`);
    }
    
    // Check for missing dependencies
    const missingDependencies = [];
    for (const profile of template.profiles) {
      if (PROFILE_DEPENDENCIES[profile]) {
        const hasRequiredDep = PROFILE_DEPENDENCIES[profile].some(dep => template.profiles.includes(dep));
        if (!hasRequiredDep) {
          missingDependencies.push(`${profile} requires one of: ${PROFILE_DEPENDENCIES[profile].join(', ')}`);
        }
      }
    }
    if (missingDependencies.length > 0) {
      errors.push(`Missing profile dependencies: ${missingDependencies.join('; ')}`);
    }
  }
  
  // 3. Validate configuration requirements
  if (template.config && template.profiles) {
    const missingConfigFields = [];
    for (const profile of template.profiles) {
      const requiredFields = PROFILE_CONFIG_REQUIREMENTS[profile] || [];
      for (const field of requiredFields) {
        if (!template.config[field]) {
          missingConfigFields.push(`${profile} profile requires ${field} configuration`);
        }
      }
    }
    if (missingConfigFields.length > 0) {
      warnings.push(`Missing configuration fields: ${missingConfigFields.join('; ')}`);
    }
  }
  
  // 4. Validate resource requirements
  if (template.resources) {
    const { minMemory, minCpu, minDisk, recommendedMemory, recommendedCpu, recommendedDisk } = template.resources;
    
    // Check for reasonable resource values
    if (minMemory && (minMemory < 1 || minMemory > 1024)) {
      warnings.push(`Unusual minimum memory requirement: ${minMemory}GB`);
    }
    
    if (minCpu && (minCpu < 1 || minCpu > 128)) {
      warnings.push(`Unusual minimum CPU requirement: ${minCpu} cores`);
    }
    
    if (minDisk && (minDisk < 1 || minDisk > 100000)) {
      warnings.push(`Unusual minimum disk requirement: ${minDisk}GB`);
    }
    
    // Check recommended vs minimum
    if (recommendedMemory && minMemory && recommendedMemory < minMemory) {
      warnings.push('Recommended memory is less than minimum memory');
    }
    
    if (recommendedCpu && minCpu && recommendedCpu < minCpu) {
      warnings.push('Recommended CPU is less than minimum CPU');
    }
    
    if (recommendedDisk && minDisk && recommendedDisk < minDisk) {
      warnings.push('Recommended disk is less than minimum disk');
    }
    
    // Resource requirement warnings
    if (minMemory > 32) {
      warnings.push(`Template requires significant memory: ${minMemory}GB RAM`);
    }
    
    if (minDisk > 2000) {
      warnings.push(`Template requires significant disk space: ${minDisk}GB`);
    }
    
    if (minCpu > 16) {
      warnings.push(`Template requires significant CPU: ${minCpu} cores`);
    }
  }
  
  // 5. System compatibility check (if system resources provided)
  if (systemResources && template.resources) {
    const compatibility = [];
    
    if (systemResources.memory < template.resources.minMemory) {
      errors.push(`Insufficient memory: requires ${template.resources.minMemory}GB, available ${systemResources.memory}GB`);
      compatibility.push('insufficient-memory');
    } else if (systemResources.memory < template.resources.recommendedMemory) {
      warnings.push(`Below recommended memory: ${template.resources.recommendedMemory}GB recommended, ${systemResources.memory}GB available`);
    }
    
    if (systemResources.cpu < template.resources.minCpu) {
      errors.push(`Insufficient CPU: requires ${template.resources.minCpu} cores, available ${systemResources.cpu} cores`);
      compatibility.push('insufficient-cpu');
    } else if (systemResources.cpu < template.resources.recommendedCpu) {
      warnings.push(`Below recommended CPU: ${template.resources.recommendedCpu} cores recommended, ${systemResources.cpu} cores available`);
    }
    
    if (systemResources.disk < template.resources.minDisk) {
      errors.push(`Insufficient disk space: requires ${template.resources.minDisk}GB, available ${systemResources.disk}GB`);
      compatibility.push('insufficient-disk');
    } else if (systemResources.disk < template.resources.recommendedDisk) {
      warnings.push(`Below recommended disk space: ${template.resources.recommendedDisk}GB recommended, ${systemResources.disk}GB available`);
    }
    
    if (compatibility.length > 0) {
      fallbackOptions.push('build-custom', 'upgrade-system');
    }
  }
  
  // 6. Template-specific validations
  if (template.category && !['beginner', 'intermediate', 'advanced'].includes(template.category)) {
    warnings.push(`Unknown template category: ${template.category}`);
  }
  
  if (template.useCase && !['personal', 'development', 'mining', 'community', 'advanced'].includes(template.useCase)) {
    warnings.push(`Unknown use case: ${template.useCase}`);
  }
  
  // 7. Determine fallback options
  if (errors.length > 0) {
    fallbackOptions.push('build-custom');
    
    // Suggest alternative templates if this one fails
    const alternativeTemplates = Object.keys(templates).filter(id => 
      id !== templateId && 
      templates[id].category === 'beginner'
    );
    if (alternativeTemplates.length > 0) {
      fallbackOptions.push('try-alternative-template');
    }
  }
  
  const valid = errors.length === 0;
  
  console.log(`[TEMPLATE-VALIDATION] Template ${templateId} validation: ${valid ? 'PASSED' : 'FAILED'}`);
  if (errors.length > 0) {
    console.log(`[TEMPLATE-VALIDATION] Errors: ${errors.join('; ')}`);
  }
  if (warnings.length > 0) {
    console.log(`[TEMPLATE-VALIDATION] Warnings: ${warnings.join('; ')}`);
  }
  
  return {
    valid,
    template,
    errors,
    warnings,
    templateId,
    profiles: template.profiles || [],
    config: template.config || {},
    fallbackOptions: [...new Set(fallbackOptions)], // Remove duplicates
    systemCompatibility: systemResources ? {
      memoryOk: !systemResources || !template.resources || systemResources.memory >= template.resources.minMemory,
      cpuOk: !systemResources || !template.resources || systemResources.cpu >= template.resources.minCpu,
      diskOk: !systemResources || !template.resources || systemResources.disk >= template.resources.minDisk
    } : null
  };
}

/**
 * Enhanced template application function with validation and logging
 * @param {string} templateId - Template ID to apply
 * @param {Object} baseConfig - Base configuration to merge with
 * @param {Object} systemResources - Optional system resources for validation
 * @returns {Object} Application result with success status and merged config
 */
function applyTemplate(templateId, baseConfig = {}, systemResources = null) {
  console.log(`[TEMPLATE-APPLICATION] Starting application of template: ${templateId}`);
  
  // First validate the template
  const validationResult = validateTemplate(templateId, systemResources);
  
  if (!validationResult.valid) {
    console.error(`[TEMPLATE-APPLICATION] Template validation failed for ${templateId}:`, validationResult.errors);
    return {
      success: false,
      message: `Template validation failed: ${validationResult.errors.join(', ')}`,
      errors: validationResult.errors,
      warnings: validationResult.warnings,
      fallbackOptions: validationResult.fallbackOptions,
      validationResult
    };
  }
  
  const template = validationResult.template;
  
  try {
    // Enhanced configuration merging logic
    const mergedConfig = mergeConfigurations(baseConfig, template.config, template);
    
    // Add application metadata
    const finalConfig = {
      ...mergedConfig,
      // Template metadata for tracking
      appliedTemplate: templateId,
      appliedAt: new Date().toISOString(),
      templateName: template.name,
      templateCategory: template.category,
      templateProfiles: template.profiles,
      // Configuration source tracking
      configurationSource: 'template',
      baseConfigKeys: Object.keys(baseConfig),
      templateConfigKeys: Object.keys(template.config)
    };
    
    // Log successful application
    console.log(`[TEMPLATE-APPLICATION] Successfully applied template: ${templateId}`);
    console.log(`[TEMPLATE-APPLICATION] Template profiles: ${template.profiles.join(', ')}`);
    console.log(`[TEMPLATE-APPLICATION] Configuration keys: ${Object.keys(finalConfig).length}`);
    
    if (validationResult.warnings.length > 0) {
      console.warn(`[TEMPLATE-APPLICATION] Warnings for ${templateId}:`, validationResult.warnings);
    }
    
    return {
      success: true,
      config: finalConfig,
      profiles: template.profiles,
      template: {
        id: template.id,
        name: template.name,
        category: template.category,
        profiles: template.profiles,
        useCase: template.useCase
      },
      message: `Template "${template.name}" applied successfully`,
      warnings: validationResult.warnings,
      validationResult: {
        valid: true,
        warnings: validationResult.warnings,
        systemCompatibility: validationResult.systemCompatibility
      }
    };
  } catch (error) {
    console.error(`[TEMPLATE-APPLICATION] Error applying template ${templateId}:`, error);
    return {
      success: false,
      message: `Template application failed: ${error.message}`,
      errors: [error.message],
      fallbackOptions: ['build-custom'],
      template: template ? {
        id: template.id,
        name: template.name
      } : null
    };
  }
}

/**
 * Enhanced configuration merging with conflict resolution
 * @param {Object} baseConfig - Base configuration
 * @param {Object} templateConfig - Template configuration
 * @param {Object} template - Full template object for context
 * @returns {Object} Merged configuration
 */
function mergeConfigurations(baseConfig, templateConfig, template) {
  const merged = { ...baseConfig };
  const conflicts = [];
  const overrides = [];
  
  // Merge template config, tracking conflicts and overrides
  for (const [key, templateValue] of Object.entries(templateConfig)) {
    if (baseConfig.hasOwnProperty(key) && baseConfig[key] !== templateValue) {
      conflicts.push({
        key,
        baseValue: baseConfig[key],
        templateValue,
        resolved: 'template-wins'
      });
      overrides.push(`${key}: ${baseConfig[key]} → ${templateValue}`);
    }
    merged[key] = templateValue;
  }
  
  // Log configuration merging details
  if (conflicts.length > 0) {
    console.log(`[CONFIG-MERGE] Configuration conflicts resolved (template wins): ${overrides.join(', ')}`);
  }
  
  // Add profile-specific defaults if not present
  if (template.profiles) {
    for (const profile of template.profiles) {
      const profileDefaults = getProfileDefaults(profile);
      for (const [key, defaultValue] of Object.entries(profileDefaults)) {
        if (!merged.hasOwnProperty(key)) {
          merged[key] = defaultValue;
          console.log(`[CONFIG-MERGE] Added profile default for ${profile}: ${key} = ${defaultValue}`);
        }
      }
    }
  }
  
  // Store merge metadata
  merged._configMergeMetadata = {
    conflicts,
    overrides,
    mergedAt: new Date().toISOString(),
    baseConfigSize: Object.keys(baseConfig).length,
    templateConfigSize: Object.keys(templateConfig).length,
    finalConfigSize: Object.keys(merged).length
  };
  
  return merged;
}

/**
 * Get default configuration values for a profile
 * @param {string} profileId - Profile ID
 * @returns {Object} Default configuration values
 */
function getProfileDefaults(profileId) {
  const defaults = {
    'core': {
      KASPA_NODE_RPC_PORT: 16110,
      KASPA_NODE_P2P_PORT: 16111,
      KASPA_NETWORK: 'mainnet',
      PUBLIC_NODE: 'false',
      ENABLE_MONITORING: 'true'
    },
    'archive-node': {
      KASPA_NODE_RPC_PORT: 16110,
      KASPA_NODE_P2P_PORT: 16111,
      KASPA_NETWORK: 'mainnet',
      PUBLIC_NODE: 'false',
      ENABLE_MONITORING: 'true',
      PRUNING_ENABLED: 'false'
    },
    'kaspa-user-applications': {
      KASIA_APP_PORT: 3002,
      KSOCIAL_APP_PORT: 3003,
      EXPLORER_PORT: 3008,
      INDEXER_CHOICE: 'public'
    },
    'indexer-services': {
      TIMESCALEDB_PORT: 5433,
      POSTGRES_USER: 'kaspauser',
      ENABLE_INDEXER_MONITORING: 'true'
    },
    'mining': {
      STRATUM_PORT: 5555,
      POOL_MODE: 'false'
    }
  };
  
  return defaults[profileId] || {};
}

// Template definitions (no circular references)
const templates = {
  'beginner-setup': {
    id: 'beginner-setup',
    name: 'Beginner Setup',
    description: 'Simple setup for new users',
    longDescription: 'Perfect for users who want to get started quickly with Kaspa applications without running their own node.',
    profiles: ['kaspa-user-applications'],
    category: 'beginner',
    useCase: 'personal',
    estimatedSetupTime: '5 minutes',
    syncTime: 'Not required',
    icon: '🚀',
    config: {
      INDEXER_CHOICE: 'public',
      KASIA_APP_PORT: 3002,
      KSOCIAL_APP_PORT: 3003,
      EXPLORER_PORT: 3008,
      REMOTE_KASIA_INDEXER_URL: 'https://api.kaspa.org/kasia',
      REMOTE_KSOCIAL_INDEXER_URL: 'https://api.kaspa.org/ksocial',
      REMOTE_KASPA_NODE_WBORSH_URL: 'wss://api.kaspa.org/ws'
    },
    resources: {
      minMemory: 4,
      minCpu: 2,
      minDisk: 50,
      recommendedMemory: 8,
      recommendedCpu: 4,
      recommendedDisk: 200
    },
    features: [
      'Easy setup',
      'User applications',
      'Public indexers',
      'No node required'
    ],
    benefits: [
      'Quick start',
      'No complex configuration',
      'Low resource usage',
      'Immediate access'
    ],
    customizable: true,
    tags: ['beginner', 'personal', 'applications', 'public']
  },
  'full-node': {
    id: 'full-node',
    name: 'Full Node',
    description: 'Complete Kaspa node with all services',
    longDescription: 'Complete Kaspa setup with local node and indexers for maximum performance and privacy.',
    profiles: ['core', 'kaspa-user-applications', 'indexer-services'],
    category: 'advanced',
    useCase: 'advanced',
    estimatedSetupTime: '15 minutes',
    syncTime: '2-4 hours',
    icon: '⚡',
    config: {
      PUBLIC_NODE: 'false',
      ENABLE_MONITORING: 'true',
      KASPA_NODE_RPC_PORT: 16110,
      KASPA_NODE_P2P_PORT: 16111,
      KASPA_NETWORK: 'mainnet',
      POSTGRES_USER: 'kaspauser',
      TIMESCALEDB_PORT: 5433,
      KASIA_APP_PORT: 3002,
      KSOCIAL_APP_PORT: 3003,
      EXPLORER_PORT: 3008,
      K_SOCIAL_DB_PASSWORD: 'auto-generated-password-123',
      SIMPLY_KASPA_DB_PASSWORD: 'auto-generated-password-456'
    },
    resources: {
      minMemory: 16,
      minCpu: 4,
      minDisk: 500,
      recommendedMemory: 32,
      recommendedCpu: 8,
      recommendedDisk: 2000
    },
    features: [
      'Full node',
      'Local indexers',
      'All applications',
      'Complete privacy'
    ],
    benefits: [
      'Complete control',
      'Best performance',
      'Full privacy',
      'Network support'
    ],
    customizable: true,
    tags: ['advanced', 'node', 'indexers', 'applications']
  },
  'home-node': {
    id: 'home-node',
    name: 'Home Node',
    description: 'Basic Kaspa node for personal use',
    longDescription: 'A simple setup with just the Kaspa node running locally. Ideal for developers, enthusiasts, or anyone wanting to support the network.',
    profiles: ['core'],
    category: 'intermediate',
    useCase: 'personal',
    estimatedSetupTime: '10-15 minutes',
    syncTime: '2-4 hours',
    icon: '🏠',
    config: {
      PUBLIC_NODE: 'false',
      ENABLE_MONITORING: 'true',
      KASPA_NODE_RPC_PORT: 16110,
      KASPA_NODE_P2P_PORT: 16111,
      KASPA_NETWORK: 'mainnet'
    },
    resources: {
      minMemory: 4,
      minCpu: 2,
      minDisk: 100,
      recommendedMemory: 8,
      recommendedCpu: 4,
      recommendedDisk: 500
    },
    features: [
      'Local Kaspa node',
      'Web dashboard',
      'Basic monitoring',
      'Wallet support'
    ],
    benefits: [
      'Support the Kaspa network',
      'Learn about blockchain technology',
      'Private node access',
      'No external dependencies'
    ],
    customizable: true,
    tags: ['intermediate', 'personal', 'node', 'wallet']
  },
  'public-node': {
    id: 'public-node',
    name: 'Public Node',
    description: 'Public-facing Kaspa node with indexer services',
    longDescription: 'A robust setup that provides public access to your Kaspa node and indexer services. Perfect for contributing to the ecosystem.',
    profiles: ['core', 'indexer-services'],
    category: 'advanced',
    useCase: 'community',
    estimatedSetupTime: '20-30 minutes',
    syncTime: '4-8 hours',
    icon: '🌐',
    config: {
      PUBLIC_NODE: 'true',
      ENABLE_MONITORING: 'true',
      ENABLE_SSL: 'true',
      KASPA_NODE_RPC_PORT: 16110,
      KASPA_NODE_P2P_PORT: 16111,
      KASPA_NETWORK: 'mainnet',
      POSTGRES_USER: 'kaspauser',
      TIMESCALEDB_PORT: 5433
    },
    resources: {
      minMemory: 12,
      minCpu: 6,
      minDisk: 600,
      recommendedMemory: 24,
      recommendedCpu: 12,
      recommendedDisk: 2000
    },
    features: [
      'Public Kaspa node',
      'Local indexer services',
      'TimescaleDB database',
      'SSL/TLS encryption',
      'Advanced monitoring'
    ],
    benefits: [
      'Contribute to network infrastructure',
      'Provide reliable public endpoints',
      'Support dApp developers',
      'Enhanced data availability'
    ],
    customizable: true,
    tags: ['advanced', 'public', 'indexers', 'community']
  },
  'developer-setup': {
    id: 'developer-setup',
    name: 'Developer Setup',
    description: 'Complete development environment with debugging tools',
    longDescription: 'A comprehensive setup designed for Kaspa developers. Includes all services, development tools, and debugging features.',
    profiles: ['core', 'kaspa-user-applications', 'indexer-services'],
    category: 'advanced',
    useCase: 'development',
    estimatedSetupTime: '30-45 minutes',
    syncTime: '4-8 hours',
    icon: '👨‍💻',
    config: {
      PUBLIC_NODE: 'false',
      ENABLE_MONITORING: 'true',
      KASPA_NODE_RPC_PORT: 16110,
      KASPA_NODE_P2P_PORT: 16111,
      KASPA_NETWORK: 'testnet',
      POSTGRES_USER: 'devuser',
      TIMESCALEDB_PORT: 5433,
      KASIA_APP_PORT: 3002,
      KSOCIAL_APP_PORT: 3003,
      EXPLORER_PORT: 3008,
      LOG_LEVEL: 'debug',
      ENABLE_PORTAINER: 'true',
      ENABLE_PGADMIN: 'true',
      ENABLE_LOG_ACCESS: 'true'
    },
    resources: {
      minMemory: 16,
      minCpu: 8,
      minDisk: 650,
      recommendedMemory: 32,
      recommendedCpu: 16,
      recommendedDisk: 2500
    },
    features: [
      'All Kaspa services',
      'Development tools',
      'Debug logging',
      'Portainer (Docker UI)',
      'pgAdmin (Database UI)',
      'Testnet configuration'
    ],
    benefits: [
      'Complete development environment',
      'Easy debugging and inspection',
      'Test applications safely',
      'Rapid prototyping'
    ],
    developerMode: true,
    customizable: true,
    tags: ['advanced', 'development', 'debugging', 'testnet']
  },
  'mining-setup': {
    id: 'mining-setup',
    name: 'Mining Setup',
    description: 'Kaspa node with mining stratum for solo mining',
    longDescription: 'Complete mining setup with local Kaspa node and stratum server. Perfect for solo miners who want full control.',
    profiles: ['core', 'mining'],
    category: 'advanced',
    useCase: 'mining',
    estimatedSetupTime: '20-30 minutes',
    syncTime: '2-4 hours',
    icon: '⛏️',
    config: {
      PUBLIC_NODE: 'false',
      ENABLE_MONITORING: 'true',
      KASPA_NODE_RPC_PORT: 16110,
      KASPA_NODE_P2P_PORT: 16111,
      KASPA_NETWORK: 'mainnet',
      STRATUM_PORT: 5555,
      MINING_ADDRESS: '',
      POOL_MODE: 'false'
    },
    resources: {
      minMemory: 6,
      minCpu: 4,
      minDisk: 110,
      recommendedMemory: 12,
      recommendedCpu: 8,
      recommendedDisk: 550
    },
    features: [
      'Local Kaspa node',
      'Mining stratum server',
      'Solo mining support',
      'Mining monitoring'
    ],
    benefits: [
      'Full mining control',
      'No pool fees',
      'Direct block rewards',
      'Mining privacy'
    ],
    customizable: true,
    tags: ['advanced', 'mining', 'stratum', 'solo']
  }
};

// GET /api/simple-templates/all - Get all templates
router.get('/all', (req, res) => {
  try {
    console.log('[TEMPLATE-API] Fetching all templates');
    const templateList = Object.values(templates);
    console.log(`[TEMPLATE-API] Returning ${templateList.length} templates`);
    res.json({ 
      templates: templateList,
      count: templateList.length,
      categories: [...new Set(templateList.map(t => t.category))]
    });
  } catch (error) {
    console.error('[TEMPLATE-API] Error fetching all templates:', error);
    res.status(500).json({
      error: 'Failed to get templates',
      message: error.message,
      fallbackOptions: ['build-custom']
    });
  }
});

// GET /api/simple-templates/category/:category - Get templates by category
router.get('/category/:category', (req, res) => {
  try {
    const { category } = req.params;
    console.log(`[TEMPLATE-API] Fetching templates for category: ${category}`);
    
    const filteredTemplates = Object.values(templates).filter(template => 
      template.category === category
    );
    
    console.log(`[TEMPLATE-API] Found ${filteredTemplates.length} templates in category ${category}`);
    
    res.json({ 
      templates: filteredTemplates,
      category,
      count: filteredTemplates.length
    });
  } catch (error) {
    console.error(`[TEMPLATE-API] Error fetching templates for category ${req.params.category}:`, error);
    res.status(500).json({
      error: 'Failed to get templates by category',
      message: error.message,
      fallbackOptions: ['build-custom']
    });
  }
});

// GET /api/simple-templates/:templateId - Get specific template
router.get('/:templateId', (req, res) => {
  try {
    const { templateId } = req.params;
    console.log(`[TEMPLATE-API] Fetching template: ${templateId}`);
    
    const template = templates[templateId];
    
    if (!template) {
      console.warn(`[TEMPLATE-API] Template not found: ${templateId}`);
      return res.status(404).json({
        success: false,
        message: 'Template not found',
        templateId,
        availableTemplates: Object.keys(templates),
        fallbackOptions: ['build-custom']
      });
    }
    
    console.log(`[TEMPLATE-API] Successfully retrieved template: ${template.name}`);
    
    res.json({
      success: true,
      template,
      templateId
    });
  } catch (error) {
    console.error(`[TEMPLATE-API] Error fetching template ${req.params.templateId}:`, error);
    res.status(500).json({
      error: 'Failed to get template',
      message: error.message,
      templateId: req.params.templateId,
      fallbackOptions: ['build-custom']
    });
  }
});

// POST /api/simple-templates/recommendations - Get template recommendations
router.post('/recommendations', (req, res) => {
  try {
    const { systemResources, useCase } = req.body;
    console.log(`[TEMPLATE-API] Getting recommendations for use case: ${useCase}, resources:`, systemResources);
    
    if (!systemResources) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'System resources are required',
        fallbackOptions: ['build-custom']
      });
    }
    
    const recommendations = [];
    
    for (const template of Object.values(templates)) {
      let score = 0;
      let suitability = 'suitable';
      const reasons = [];

      // Check resource compatibility
      if (systemResources.memory >= template.resources.recommendedMemory) {
        score += 3;
        reasons.push('Meets recommended memory requirements');
      } else if (systemResources.memory >= template.resources.minMemory) {
        score += 1;
        reasons.push('Meets minimum memory requirements');
      } else {
        suitability = 'insufficient';
        reasons.push(`Requires ${template.resources.minMemory}GB RAM (you have ${systemResources.memory}GB)`);
      }

      if (systemResources.cpu >= template.resources.recommendedCpu) {
        score += 2;
      } else if (systemResources.cpu >= template.resources.minCpu) {
        score += 1;
      }

      if (systemResources.disk >= template.resources.recommendedDisk) {
        score += 2;
      } else if (systemResources.disk >= template.resources.minDisk) {
        score += 1;
      }

      // Use case matching
      if (template.useCase === useCase) {
        score += 5;
        reasons.push('Perfect match for your use case');
      }

      // Category bonus for beginners
      if (useCase === 'personal' && template.category === 'beginner') {
        score += 2;
        reasons.push('Beginner-friendly');
      }

      recommendations.push({
        template,
        score,
        suitability,
        reasons,
        recommended: score >= 5 && suitability === 'suitable'
      });
    }

    // Sort by score (highest first)
    recommendations.sort((a, b) => b.score - a.score);
    
    const topRecommendations = recommendations.filter(r => r.recommended);
    console.log(`[TEMPLATE-API] Generated ${recommendations.length} recommendations, ${topRecommendations.length} highly recommended`);
    
    res.json({ 
      recommendations,
      topRecommendations,
      useCase,
      systemResources
    });
  } catch (error) {
    console.error('[TEMPLATE-API] Error generating recommendations:', error);
    res.status(500).json({
      error: 'Failed to get template recommendations',
      message: error.message,
      fallbackOptions: ['build-custom']
    });
  }
});

// GET /api/simple-templates/:templateId/validate - Validate template (GET version for tests)
router.get('/:templateId/validate', (req, res) => {
  try {
    const { templateId } = req.params;
    const validationResult = validateTemplate(templateId);
    
    res.json(validationResult);
  } catch (error) {
    console.error(`[TEMPLATE-VALIDATION] Error validating template ${templateId}:`, error);
    res.status(500).json({
      valid: false,
      errors: ['Validation service error'],
      message: error.message,
      fallbackOptions: ['build-custom']
    });
  }
});

// POST /api/simple-templates/:templateId/validate - Validate template
router.post('/:templateId/validate', (req, res) => {
  try {
    const { templateId } = req.params;
    const { systemResources } = req.body;
    const validationResult = validateTemplate(templateId, systemResources);
    
    res.json(validationResult);
  } catch (error) {
    console.error(`[TEMPLATE-VALIDATION] Error validating template ${templateId}:`, error);
    // Always return JSON, never HTML
    res.status(500).json({
      valid: false,
      errors: [`Validation service error: ${error.message}`],
      fallbackOptions: ['build-custom']
    });
  }
});

// POST /api/simple-templates/:templateId/apply - Apply template
router.post('/:templateId/apply', (req, res) => {
  try {
    const { templateId } = req.params;
    const { baseConfig, systemResources } = req.body;
    
    console.log(`[TEMPLATE-API] Applying template ${templateId} with base config keys: ${Object.keys(baseConfig || {}).join(', ')}`);
    
    const applicationResult = applyTemplate(templateId, baseConfig || {}, systemResources);
    
    if (!applicationResult.success) {
      const statusCode = applicationResult.errors && applicationResult.errors.some(e => e.includes('not found')) ? 404 : 400;
      return res.status(statusCode).json(applicationResult);
    }
    
    res.json(applicationResult);
  } catch (error) {
    console.error(`[TEMPLATE-API] Error in apply endpoint for ${req.params.templateId}:`, error);
    res.status(500).json({
      success: false,
      message: `Template application failed: ${error.message}`,
      errors: [error.message],
      fallbackOptions: ['build-custom']
    });
  }
});

module.exports = router;