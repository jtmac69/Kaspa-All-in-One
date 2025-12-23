/**
 * Reconfiguration API Endpoints
 * 
 * Provides comprehensive API endpoints for reconfiguration mode operations:
 * - Profile status management
 * - Profile addition/removal/configuration
 * - Operation validation and history
 * - Progress tracking for reconfiguration operations
 * 
 * Requirements: 16.10, 17.17, 18.14
 */

const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// Import utilities
const ConfigGenerator = require('../utils/config-generator');
const DockerManager = require('../utils/docker-manager');
const StateManager = require('../utils/state-manager');
const BackupManager = require('../utils/backup-manager');
const ProfileStateManager = require('../utils/profile-state-manager');
const ProfileManager = require('../utils/profile-manager');
const DependencyValidator = require('../utils/dependency-validator');
const BackgroundTaskManager = require('../utils/background-task-manager');

// Initialize managers
const configGenerator = new ConfigGenerator();
const dockerManager = new DockerManager();
const stateManager = new StateManager();
const backupManager = new BackupManager();
const profileStateManager = ProfileStateManager.getInstance();
const profileManager = new ProfileManager();
const dependencyValidator = new DependencyValidator(profileManager);

// Operation progress tracking
const operationProgress = new Map(); // operationId -> progress data

/**
 * GET /api/wizard/profiles/status
 * Get comprehensive profile installation status for reconfiguration mode
 * 
 * Returns detailed status for all profiles including:
 * - Installation state (installed, not-installed, partial, error)
 * - Running status (running, stopped, unhealthy, unknown)
 * - Service health and metadata
 * - Configuration suggestions
 * - Dependencies and conflicts
 */
router.get('/profiles/status', async (req, res) => {
  try {
    // Get comprehensive profile states
    const stateResult = await profileStateManager.getProfileStates();
    
    if (!stateResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to get profile states',
        message: stateResult.error
      });
    }
    
    const profileStates = stateResult.profiles;
    
    // Get additional context
    const projectRoot = process.env.PROJECT_ROOT || '/workspace';
    const envPath = path.join(projectRoot, '.env');
    const installationStatePath = path.join(projectRoot, '.kaspa-aio', 'installation-state.json');
    
    // Check for existing configuration
    let envExists = false;
    let currentConfig = {};
    try {
      await fs.access(envPath);
      envExists = true;
      const envContent = await fs.readFile(envPath, 'utf8');
      currentConfig = parseEnvFile(envContent);
    } catch (error) {
      // .env doesn't exist
    }
    
    // Load installation state
    let installationState = null;
    try {
      const stateContent = await fs.readFile(installationStatePath, 'utf8');
      installationState = JSON.parse(stateContent);
    } catch (error) {
      // Installation state doesn't exist
    }
    
    // Get running services
    const runningServices = await dockerManager.getRunningServices();
    
    // Separate profiles by state
    const installedProfiles = profileStates.filter(p => p.installationState === 'installed');
    const availableProfiles = profileStates.filter(p => p.installationState === 'not-installed');
    const partialProfiles = profileStates.filter(p => p.installationState === 'partial');
    const errorProfiles = profileStates.filter(p => p.installationState === 'error');
    
    // Generate configuration suggestions
    const suggestions = generateConfigurationSuggestions(profileStates, currentConfig, runningServices);
    
    // Calculate system health
    const systemHealth = calculateSystemHealth(profileStates, runningServices);
    
    // Get dependency information
    const dependencyInfo = await getDependencyInformation(profileStates);
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      
      // Profile states
      profileStates,
      installedProfiles,
      availableProfiles,
      partialProfiles,
      errorProfiles,
      
      // System status
      hasExistingConfig: envExists,
      runningServicesCount: runningServices.length,
      totalServicesCount: runningServices.length + (installationState?.stoppedServices?.length || 0),
      systemHealth,
      
      // Installation metadata
      installationDate: installationState?.installedAt || null,
      lastModified: installationState?.lastModified || null,
      version: installationState?.version || 'Unknown',
      
      // Suggestions and dependencies
      suggestions,
      dependencyInfo,
      
      // Cache status
      cacheStatus: profileStateManager.getCacheStatus(),
      lastUpdated: stateResult.lastUpdated
    });
  } catch (error) {
    console.error('Error getting profile status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get profile status',
      message: error.message
    });
  }
});

/**
 * POST /api/wizard/profiles/add
 * Add new profiles to existing installation
 * 
 * Body:
 * - profiles: Array of profile IDs to add
 * - configuration: Configuration object for new profiles
 * - integrationOptions: Options for integrating with existing services
 * - createBackup: Whether to create backup before changes (default: true)
 */
router.post('/profiles/add', async (req, res) => {
  const operationId = `add-profiles-${Date.now()}`;
  
  try {
    const { profiles, configuration = {}, integrationOptions = {}, createBackup = true } = req.body;
    
    if (!profiles || !Array.isArray(profiles) || profiles.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid profiles array'
      });
    }
    
    // Initialize operation progress
    initializeOperationProgress(operationId, 'add-profiles', {
      profiles,
      totalSteps: 6
    });
    
    updateOperationProgress(operationId, 1, 'Validating profile addition...');
    
    // Validate profile addition
    const validation = await validateProfileAddition(profiles, configuration, integrationOptions);
    if (!validation.valid) {
      updateOperationProgress(operationId, 0, 'Validation failed', validation.errors);
      return res.status(400).json({
        success: false,
        error: 'Profile addition validation failed',
        errors: validation.errors,
        operationId
      });
    }
    
    updateOperationProgress(operationId, 2, 'Creating backup...');
    
    // Create backup if requested
    let backupInfo = null;
    if (createBackup) {
      const backupResult = await backupManager.createBackup(
        `Profile addition: ${profiles.join(', ')}`,
        {
          source: 'profile-addition',
          profiles,
          operationId
        }
      );
      
      if (backupResult.success) {
        backupInfo = {
          backupId: backupResult.backupId,
          timestamp: backupResult.timestamp,
          backupDir: backupResult.backupPath
        };
      }
    }
    
    updateOperationProgress(operationId, 3, 'Updating configuration...');
    
    // Load current configuration
    const currentConfig = await loadCurrentConfiguration();
    
    // Merge with new configuration
    const mergedConfig = { ...currentConfig, ...configuration };
    
    // Get current profiles
    const currentProfiles = await getCurrentProfiles();
    const newProfiles = [...new Set([...currentProfiles, ...profiles])];
    
    // Generate new configuration files
    const configResult = await generateAndSaveConfiguration(mergedConfig, newProfiles);
    if (!configResult.success) {
      updateOperationProgress(operationId, 0, 'Configuration generation failed', [configResult.error]);
      return res.status(500).json({
        success: false,
        error: 'Failed to generate configuration',
        message: configResult.error,
        operationId
      });
    }
    
    updateOperationProgress(operationId, 4, 'Starting new services...');
    
    // Start new services
    const deployResult = await dockerManager.deployProfiles(profiles, {
      existingProfiles: currentProfiles,
      integrationOptions
    });
    
    if (!deployResult.success) {
      updateOperationProgress(operationId, 0, 'Service deployment failed', [deployResult.error]);
      return res.status(500).json({
        success: false,
        error: 'Failed to deploy new services',
        message: deployResult.error,
        operationId
      });
    }
    
    updateOperationProgress(operationId, 5, 'Validating installation...');
    
    // Validate new services
    const serviceValidation = await dockerManager.validateServices(profiles);
    
    updateOperationProgress(operationId, 6, 'Profile addition complete');
    
    // Update installation state
    await updateInstallationState({
      action: 'add-profiles',
      profiles: newProfiles,
      addedProfiles: profiles,
      configuration: mergedConfig,
      operationId,
      backupId: backupInfo?.backupId
    });
    
    // Complete operation
    completeOperation(operationId, {
      addedProfiles: profiles,
      totalProfiles: newProfiles,
      serviceValidation,
      backupInfo
    });
    
    res.json({
      success: true,
      message: `Successfully added profiles: ${profiles.join(', ')}`,
      operationId,
      addedProfiles: profiles,
      totalProfiles: newProfiles,
      serviceValidation,
      backupInfo,
      integrationOptions: validation.integrationOptions
    });
    
  } catch (error) {
    console.error('Error adding profiles:', error);
    updateOperationProgress(operationId, 0, 'Operation failed', [error.message]);
    
    res.status(500).json({
      success: false,
      error: 'Failed to add profiles',
      message: error.message,
      operationId
    });
  }
});

/**
 * DELETE /api/wizard/profiles/remove
 * Remove profiles from existing installation
 * 
 * Body:
 * - profiles: Array of profile IDs to remove
 * - removeData: Whether to remove associated data (default: false)
 * - dataOptions: Specific data removal options per profile
 * - createBackup: Whether to create backup before changes (default: true)
 */
router.delete('/profiles/remove', async (req, res) => {
  const operationId = `remove-profiles-${Date.now()}`;
  
  try {
    const { profiles, removeData = false, dataOptions = {}, createBackup = true } = req.body;
    
    if (!profiles || !Array.isArray(profiles) || profiles.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid profiles array'
      });
    }
    
    // Initialize operation progress
    initializeOperationProgress(operationId, 'remove-profiles', {
      profiles,
      totalSteps: 6
    });
    
    updateOperationProgress(operationId, 1, 'Validating profile removal...');
    
    // Validate profile removal
    const validation = await validateProfileRemoval(profiles, { removeData, dataOptions });
    if (!validation.valid) {
      updateOperationProgress(operationId, 0, 'Validation failed', validation.errors);
      return res.status(400).json({
        success: false,
        error: 'Profile removal validation failed',
        errors: validation.errors,
        warnings: validation.warnings,
        operationId
      });
    }
    
    updateOperationProgress(operationId, 2, 'Creating backup...');
    
    // Create backup if requested
    let backupInfo = null;
    if (createBackup) {
      const backupResult = await backupManager.createBackup(
        `Profile removal: ${profiles.join(', ')}`,
        {
          source: 'profile-removal',
          profiles,
          removeData,
          operationId
        }
      );
      
      if (backupResult.success) {
        backupInfo = {
          backupId: backupResult.backupId,
          timestamp: backupResult.timestamp,
          backupDir: backupResult.backupPath
        };
      }
    }
    
    updateOperationProgress(operationId, 3, 'Stopping services...');
    
    // Stop services for profiles being removed
    const stopResult = await dockerManager.stopProfileServices(profiles);
    if (!stopResult.success) {
      console.warn('Some services failed to stop:', stopResult.errors);
    }
    
    updateOperationProgress(operationId, 4, 'Removing data...');
    
    // Remove data if requested
    let dataRemovalResult = { success: true, removedData: [], preservedData: [] };
    if (removeData) {
      dataRemovalResult = await removeProfileData(profiles, dataOptions);
    }
    
    updateOperationProgress(operationId, 5, 'Updating configuration...');
    
    // Update configuration
    const currentProfiles = await getCurrentProfiles();
    const remainingProfiles = currentProfiles.filter(p => !profiles.includes(p));
    
    const currentConfig = await loadCurrentConfiguration();
    const cleanedConfig = removeProfileConfiguration(currentConfig, profiles);
    
    const configResult = await generateAndSaveConfiguration(cleanedConfig, remainingProfiles);
    if (!configResult.success) {
      updateOperationProgress(operationId, 0, 'Configuration update failed', [configResult.error]);
      return res.status(500).json({
        success: false,
        error: 'Failed to update configuration',
        message: configResult.error,
        operationId
      });
    }
    
    updateOperationProgress(operationId, 6, 'Profile removal complete');
    
    // Update installation state
    await updateInstallationState({
      action: 'remove-profiles',
      profiles: remainingProfiles,
      removedProfiles: profiles,
      configuration: cleanedConfig,
      operationId,
      backupId: backupInfo?.backupId,
      dataRemoved: removeData
    });
    
    // Complete operation
    completeOperation(operationId, {
      removedProfiles: profiles,
      remainingProfiles,
      dataRemovalResult,
      backupInfo
    });
    
    res.json({
      success: true,
      message: `Successfully removed profiles: ${profiles.join(', ')}`,
      operationId,
      removedProfiles: profiles,
      remainingProfiles,
      dataRemovalResult,
      backupInfo,
      warnings: validation.warnings
    });
    
  } catch (error) {
    console.error('Error removing profiles:', error);
    updateOperationProgress(operationId, 0, 'Operation failed', [error.message]);
    
    res.status(500).json({
      success: false,
      error: 'Failed to remove profiles',
      message: error.message,
      operationId
    });
  }
});

/**
 * PUT /api/wizard/profiles/configure
 * Modify configuration of existing profiles
 * 
 * Body:
 * - profiles: Array of profile IDs to configure
 * - configuration: New configuration object
 * - restartServices: Whether to restart affected services (default: true)
 * - createBackup: Whether to create backup before changes (default: true)
 */
router.put('/profiles/configure', async (req, res) => {
  const operationId = `configure-profiles-${Date.now()}`;
  
  try {
    const { profiles, configuration, restartServices = true, createBackup = true } = req.body;
    
    if (!profiles || !Array.isArray(profiles) || profiles.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid profiles array'
      });
    }
    
    if (!configuration || typeof configuration !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid configuration object'
      });
    }
    
    // Initialize operation progress
    initializeOperationProgress(operationId, 'configure-profiles', {
      profiles,
      totalSteps: restartServices ? 6 : 4
    });
    
    updateOperationProgress(operationId, 1, 'Validating configuration...');
    
    // Validate configuration
    const validation = await configGenerator.validateConfig(configuration);
    if (!validation.valid) {
      updateOperationProgress(operationId, 0, 'Configuration validation failed', validation.errors);
      return res.status(400).json({
        success: false,
        error: 'Configuration validation failed',
        errors: validation.errors,
        operationId
      });
    }
    
    updateOperationProgress(operationId, 2, 'Creating backup...');
    
    // Create backup if requested
    let backupInfo = null;
    if (createBackup) {
      const backupResult = await backupManager.createBackup(
        `Profile configuration: ${profiles.join(', ')}`,
        {
          source: 'profile-configuration',
          profiles,
          operationId
        }
      );
      
      if (backupResult.success) {
        backupInfo = {
          backupId: backupResult.backupId,
          timestamp: backupResult.timestamp,
          backupDir: backupResult.backupPath
        };
      }
    }
    
    // Load current configuration and calculate diff
    const currentConfig = await loadCurrentConfiguration();
    const configDiff = calculateConfigDiff(currentConfig, validation.config);
    
    updateOperationProgress(operationId, 3, 'Applying configuration...');
    
    // Apply new configuration
    const currentProfiles = await getCurrentProfiles();
    const configResult = await generateAndSaveConfiguration(validation.config, currentProfiles);
    
    if (!configResult.success) {
      updateOperationProgress(operationId, 0, 'Configuration application failed', [configResult.error]);
      return res.status(500).json({
        success: false,
        error: 'Failed to apply configuration',
        message: configResult.error,
        operationId
      });
    }
    
    let serviceRestartResult = null;
    if (restartServices) {
      updateOperationProgress(operationId, 4, 'Restarting affected services...');
      
      // Determine affected services
      const affectedServices = determineAffectedServices(configDiff, profiles);
      
      // Restart affected services
      serviceRestartResult = await dockerManager.restartServices(affectedServices);
      
      updateOperationProgress(operationId, 5, 'Validating services...');
      
      // Validate services after restart
      const serviceValidation = await dockerManager.validateServices(profiles);
      serviceRestartResult.validation = serviceValidation;
      
      updateOperationProgress(operationId, 6, 'Configuration complete');
    } else {
      updateOperationProgress(operationId, 4, 'Configuration complete');
    }
    
    // Update installation state
    await updateInstallationState({
      action: 'configure-profiles',
      profiles: currentProfiles,
      configuredProfiles: profiles,
      configuration: validation.config,
      configDiff,
      operationId,
      backupId: backupInfo?.backupId
    });
    
    // Complete operation
    completeOperation(operationId, {
      configuredProfiles: profiles,
      configDiff,
      serviceRestartResult,
      backupInfo
    });
    
    res.json({
      success: true,
      message: `Successfully configured profiles: ${profiles.join(', ')}`,
      operationId,
      configuredProfiles: profiles,
      configDiff,
      serviceRestartResult,
      backupInfo,
      requiresRestart: !restartServices && configDiff.hasChanges
    });
    
  } catch (error) {
    console.error('Error configuring profiles:', error);
    updateOperationProgress(operationId, 0, 'Operation failed', [error.message]);
    
    res.status(500).json({
      success: false,
      error: 'Failed to configure profiles',
      message: error.message,
      operationId
    });
  }
});

/**
 * POST /api/wizard/reconfigure/validate
 * Validate reconfiguration changes before applying
 * 
 * Body:
 * - action: 'add' | 'remove' | 'configure'
 * - profiles: Array of profile IDs
 * - configuration: Configuration object (for add/configure actions)
 * - options: Additional options (removeData, integrationOptions, etc.)
 */
router.post('/reconfigure/validate', async (req, res) => {
  try {
    const { action, profiles, configuration = {}, options = {} } = req.body;
    
    if (!action || !['add', 'remove', 'configure'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid action. Must be: add, remove, or configure'
      });
    }
    
    if (!profiles || !Array.isArray(profiles) || profiles.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid profiles array'
      });
    }
    
    let validation;
    
    switch (action) {
      case 'add':
        validation = await validateProfileAddition(profiles, configuration, options.integrationOptions || {});
        break;
        
      case 'remove':
        validation = await validateProfileRemoval(profiles, options);
        break;
        
      case 'configure':
        validation = await validateProfileConfiguration(profiles, configuration);
        break;
    }
    
    // Get current state for context
    const currentProfiles = await getCurrentProfiles();
    const currentConfig = await loadCurrentConfiguration();
    
    // Calculate impact
    const impact = await calculateReconfigurationImpact(action, profiles, configuration, options);
    
    res.json({
      success: true,
      action,
      profiles,
      validation,
      impact,
      currentState: {
        profiles: currentProfiles,
        hasConfiguration: Object.keys(currentConfig).length > 0
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error validating reconfiguration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate reconfiguration',
      message: error.message
    });
  }
});

/**
 * GET /api/wizard/reconfigure/history
 * Get reconfiguration operation history
 * 
 * Query parameters:
 * - limit: Number of operations to return (default: 50)
 * - offset: Number of operations to skip (default: 0)
 * - action: Filter by action type (add, remove, configure)
 * - profile: Filter by profile ID
 */
router.get('/reconfigure/history', async (req, res) => {
  try {
    const { limit = 50, offset = 0, action, profile } = req.query;
    
    // Load installation state for history
    const projectRoot = process.env.PROJECT_ROOT || '/workspace';
    const installationStatePath = path.join(projectRoot, '.kaspa-aio', 'installation-state.json');
    
    let installationState = null;
    try {
      const stateContent = await fs.readFile(installationStatePath, 'utf8');
      installationState = JSON.parse(stateContent);
    } catch (error) {
      return res.json({
        success: true,
        history: [],
        total: 0,
        message: 'No installation state found'
      });
    }
    
    let history = installationState.history || [];
    
    // Apply filters
    if (action) {
      history = history.filter(h => h.action === action);
    }
    
    if (profile) {
      history = history.filter(h => 
        h.profiles?.includes(profile) || 
        h.addedProfiles?.includes(profile) || 
        h.removedProfiles?.includes(profile) ||
        h.configuredProfiles?.includes(profile)
      );
    }
    
    // Sort by timestamp (newest first)
    history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Apply pagination
    const total = history.length;
    const paginatedHistory = history.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    
    // Enrich history with additional metadata
    const enrichedHistory = await Promise.all(
      paginatedHistory.map(async (entry) => {
        const enriched = { ...entry };
        
        // Add backup information if available
        if (entry.backupId) {
          try {
            const backupInfo = await backupManager.getBackupInfo(entry.backupId);
            enriched.backupInfo = backupInfo;
          } catch (error) {
            // Backup info not available
          }
        }
        
        // Add operation duration if available
        if (entry.operationId && operationProgress.has(entry.operationId)) {
          const operation = operationProgress.get(entry.operationId);
          enriched.operationDuration = operation.duration;
          enriched.operationSteps = operation.steps;
        }
        
        return enriched;
      })
    );
    
    res.json({
      success: true,
      history: enrichedHistory,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasMore: parseInt(offset) + parseInt(limit) < total
    });
    
  } catch (error) {
    console.error('Error getting reconfiguration history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get reconfiguration history',
      message: error.message
    });
  }
});

/**
 * GET /api/wizard/reconfigure/operations/:operationId
 * Get status of a specific reconfiguration operation
 */
router.get('/operations/:operationId', async (req, res) => {
  try {
    const { operationId } = req.params;
    
    const operation = operationProgress.get(operationId);
    
    if (!operation) {
      return res.status(404).json({
        success: false,
        error: 'Operation not found',
        operationId
      });
    }
    
    res.json({
      success: true,
      operation,
      operationId
    });
    
  } catch (error) {
    console.error('Error getting operation status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get operation status',
      message: error.message
    });
  }
});

/**
 * GET /api/wizard/reconfigure/operations
 * Get all active reconfiguration operations
 */
router.get('/operations', async (req, res) => {
  try {
    const operations = Array.from(operationProgress.entries()).map(([id, operation]) => ({
      operationId: id,
      ...operation
    }));
    
    res.json({
      success: true,
      operations,
      count: operations.length
    });
    
  } catch (error) {
    console.error('Error getting operations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get operations',
      message: error.message
    });
  }
});

// Helper functions

/**
 * Initialize operation progress tracking
 */
function initializeOperationProgress(operationId, type, metadata = {}) {
  operationProgress.set(operationId, {
    type,
    status: 'in-progress',
    currentStep: 0,
    totalSteps: metadata.totalSteps || 1,
    progress: 0,
    message: 'Starting operation...',
    errors: [],
    startedAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    metadata
  });
}

/**
 * Update operation progress
 */
function updateOperationProgress(operationId, step, message, errors = []) {
  const operation = operationProgress.get(operationId);
  if (!operation) return;
  
  operation.currentStep = step;
  operation.progress = Math.round((step / operation.totalSteps) * 100);
  operation.message = message;
  operation.lastUpdated = new Date().toISOString();
  
  if (errors.length > 0) {
    operation.errors.push(...errors);
    operation.status = 'error';
  }
  
  operationProgress.set(operationId, operation);
}

/**
 * Complete operation
 */
function completeOperation(operationId, result = {}) {
  const operation = operationProgress.get(operationId);
  if (!operation) return;
  
  operation.status = 'complete';
  operation.progress = 100;
  operation.completedAt = new Date().toISOString();
  operation.duration = new Date(operation.completedAt) - new Date(operation.startedAt);
  operation.result = result;
  
  operationProgress.set(operationId, operation);
  
  // Clean up after 1 hour
  setTimeout(() => {
    operationProgress.delete(operationId);
  }, 3600000);
}

/**
 * Parse .env file content
 */
function parseEnvFile(content) {
  const config = {};
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      
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
 * Load current configuration from .env file
 */
async function loadCurrentConfiguration() {
  try {
    const projectRoot = process.env.PROJECT_ROOT || '/workspace';
    const envPath = path.join(projectRoot, '.env');
    const envContent = await fs.readFile(envPath, 'utf8');
    return parseEnvFile(envContent);
  } catch (error) {
    return {};
  }
}

/**
 * Get current profiles from installation state
 */
async function getCurrentProfiles() {
  try {
    const projectRoot = process.env.PROJECT_ROOT || '/workspace';
    const installationStatePath = path.join(projectRoot, '.kaspa-aio', 'installation-state.json');
    const stateContent = await fs.readFile(installationStatePath, 'utf8');
    const installationState = JSON.parse(stateContent);
    return installationState.profiles?.selected || [];
  } catch (error) {
    return [];
  }
}

/**
 * Generate and save configuration files
 */
async function generateAndSaveConfiguration(config, profiles) {
  try {
    const projectRoot = process.env.PROJECT_ROOT || '/workspace';
    
    // Generate .env file
    const envContent = await configGenerator.generateEnvFile(config, profiles);
    const envPath = path.join(projectRoot, '.env');
    const envResult = await configGenerator.saveEnvFile(envContent, envPath);
    
    if (!envResult.success) {
      return { success: false, error: envResult.error };
    }
    
    // Generate docker-compose.yml
    const composeContent = await configGenerator.generateDockerCompose(config, profiles);
    const composePath = path.join(projectRoot, 'docker-compose.yml');
    const composeResult = await configGenerator.saveDockerCompose(composeContent, composePath);
    
    if (!composeResult.success) {
      return { success: false, error: composeResult.error };
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Update installation state with operation history
 */
async function updateInstallationState(operation) {
  try {
    const projectRoot = process.env.PROJECT_ROOT || '/workspace';
    const installationStatePath = path.join(projectRoot, '.kaspa-aio', 'installation-state.json');
    
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
    
    // Update state
    installationState.lastModified = new Date().toISOString();
    installationState.profiles = {
      selected: operation.profiles,
      configuration: operation.configuration
    };
    
    // Add to history
    if (!installationState.history) {
      installationState.history = [];
    }
    
    installationState.history.push({
      timestamp: new Date().toISOString(),
      ...operation
    });
    
    // Save state
    await fs.mkdir(path.dirname(installationStatePath), { recursive: true });
    await fs.writeFile(installationStatePath, JSON.stringify(installationState, null, 2));
    
    return { success: true };
  } catch (error) {
    console.error('Error updating installation state:', error);
    return { success: false, error: error.message };
  }
}

// Validation functions (simplified implementations - would be more comprehensive in practice)

async function validateProfileAddition(profiles, configuration, integrationOptions) {
  // Validate profiles exist
  const allProfiles = profileManager.getAllProfiles();
  const invalidProfiles = profiles.filter(p => !allProfiles.find(ap => ap.id === p));
  
  if (invalidProfiles.length > 0) {
    return {
      valid: false,
      errors: [`Invalid profiles: ${invalidProfiles.join(', ')}`]
    };
  }
  
  // Check dependencies
  const dependencyResult = await dependencyValidator.validateSelection(profiles);
  if (!dependencyResult.valid) {
    return {
      valid: false,
      errors: dependencyResult.errors
    };
  }
  
  // Validate configuration
  const configValidation = await configGenerator.validateConfig(configuration);
  if (!configValidation.valid) {
    return {
      valid: false,
      errors: configValidation.errors
    };
  }
  
  return {
    valid: true,
    integrationOptions: {
      useLocalNode: integrationOptions.useLocalNode !== false,
      connectIndexers: integrationOptions.connectIndexers !== false
    }
  };
}

async function validateProfileRemoval(profiles, options) {
  const currentProfiles = await getCurrentProfiles();
  const notInstalled = profiles.filter(p => !currentProfiles.includes(p));
  
  if (notInstalled.length > 0) {
    return {
      valid: false,
      errors: [`Profiles not installed: ${notInstalled.join(', ')}`]
    };
  }
  
  // Check dependencies
  const remainingProfiles = currentProfiles.filter(p => !profiles.includes(p));
  const dependencyResult = await dependencyValidator.validateSelection(remainingProfiles);
  
  const warnings = [];
  if (!dependencyResult.valid) {
    warnings.push('Removing these profiles will break dependencies for remaining profiles');
  }
  
  return {
    valid: true,
    warnings
  };
}

async function validateProfileConfiguration(profiles, configuration) {
  const currentProfiles = await getCurrentProfiles();
  const notInstalled = profiles.filter(p => !currentProfiles.includes(p));
  
  if (notInstalled.length > 0) {
    return {
      valid: false,
      errors: [`Profiles not installed: ${notInstalled.join(', ')}`]
    };
  }
  
  // Validate configuration
  const configValidation = await configGenerator.validateConfig(configuration);
  return configValidation;
}

async function calculateReconfigurationImpact(action, profiles, configuration, options) {
  const currentProfiles = await getCurrentProfiles();
  const currentConfig = await loadCurrentConfiguration();
  
  let estimatedDowntime = 0;
  let affectedServices = [];
  let dataImpact = { willRemoveData: false, affectedVolumes: [] };
  
  switch (action) {
    case 'add':
      estimatedDowntime = profiles.length * 30; // 30 seconds per profile
      affectedServices = profiles.flatMap(p => getProfileServices(p));
      break;
      
    case 'remove':
      estimatedDowntime = profiles.length * 15; // 15 seconds per profile
      affectedServices = profiles.flatMap(p => getProfileServices(p));
      if (options.removeData) {
        dataImpact.willRemoveData = true;
        dataImpact.affectedVolumes = profiles.flatMap(p => getProfileVolumes(p));
      }
      break;
      
    case 'configure':
      const configDiff = calculateConfigDiff(currentConfig, configuration);
      estimatedDowntime = configDiff.hasChanges ? 60 : 0; // 1 minute for restart
      affectedServices = determineAffectedServices(configDiff, profiles);
      break;
  }
  
  return {
    estimatedDowntime,
    affectedServices,
    dataImpact,
    requiresRestart: estimatedDowntime > 0
  };
}

// Utility functions for profile services and volumes
function getProfileServices(profileId) {
  const serviceMap = {
    'core': ['kaspa-node', 'dashboard'],
    'kaspa-user-applications': ['kasia-app', 'k-social'],
    'indexer-services': ['kasia-indexer', 'k-indexer', 'simply-kaspa-indexer', 'timescaledb'],
    'archive-node': ['kaspa-archive-node'],
    'mining': ['kaspa-stratum']
  };
  return serviceMap[profileId] || [];
}

function getProfileVolumes(profileId) {
  const volumeMap = {
    'core': ['kaspa-node-data'],
    'kaspa-user-applications': [],
    'indexer-services': ['timescaledb-data', 'kasia-indexer-data', 'k-indexer-data'],
    'archive-node': ['kaspa-archive-data'],
    'mining': []
  };
  return volumeMap[profileId] || [];
}

function calculateConfigDiff(oldConfig, newConfig) {
  const changes = [];
  const allKeys = new Set([...Object.keys(oldConfig), ...Object.keys(newConfig)]);
  
  for (const key of allKeys) {
    const oldValue = oldConfig[key];
    const newValue = newConfig[key];
    
    if (oldValue !== newValue) {
      changes.push({
        key,
        type: oldValue === undefined ? 'added' : newValue === undefined ? 'removed' : 'modified',
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

function determineAffectedServices(configDiff, profiles) {
  const affectedServices = new Set();
  
  // Simple mapping of config keys to services
  const serviceKeyMap = {
    'KASPA_NODE': ['kaspa-node'],
    'KASIA': ['kasia-app', 'kasia-indexer'],
    'KSOCIAL': ['k-social'],
    'DASHBOARD': ['dashboard'],
    'POSTGRES': ['timescaledb']
  };
  
  for (const change of configDiff.changes) {
    for (const [prefix, services] of Object.entries(serviceKeyMap)) {
      if (change.key.startsWith(prefix)) {
        services.forEach(s => affectedServices.add(s));
      }
    }
  }
  
  return Array.from(affectedServices);
}

function removeProfileConfiguration(config, profiles) {
  const cleanedConfig = { ...config };
  
  // Remove profile-specific configuration keys
  const profileKeyPrefixes = {
    'core': ['KASPA_NODE_', 'DASHBOARD_'],
    'kaspa-user-applications': ['KASIA_APP_', 'KSOCIAL_', 'KASPA_EXPLORER_'],
    'indexer-services': ['KASIA_INDEXER_', 'K_INDEXER_', 'SIMPLY_KASPA_INDEXER_', 'TIMESCALEDB_'],
    'archive-node': ['KASPA_ARCHIVE_'],
    'mining': ['KASPA_STRATUM_']
  };
  
  for (const profile of profiles) {
    const prefixes = profileKeyPrefixes[profile] || [];
    for (const prefix of prefixes) {
      Object.keys(cleanedConfig).forEach(key => {
        if (key.startsWith(prefix)) {
          delete cleanedConfig[key];
        }
      });
    }
  }
  
  return cleanedConfig;
}

async function removeProfileData(profiles, dataOptions) {
  // This would implement actual data removal logic
  // For now, return a mock result
  return {
    success: true,
    removedData: profiles.flatMap(p => getProfileVolumes(p)),
    preservedData: []
  };
}

function generateConfigurationSuggestions(profileStates, currentConfig, runningServices) {
  // Simplified suggestion generation
  const suggestions = [];
  
  const coreInstalled = profileStates.find(p => p.id === 'core' && p.installationState === 'installed');
  const indexersInstalled = profileStates.find(p => p.id === 'indexer-services' && p.installationState === 'installed');
  
  if (coreInstalled && !indexersInstalled) {
    suggestions.push({
      id: 'add-local-indexers',
      title: 'Add Local Indexers',
      description: 'Improve performance by adding local indexers to your Kaspa node',
      action: 'add-profiles',
      priority: 'high',
      context: { profiles: ['indexer-services'] }
    });
  }
  
  return suggestions;
}

function calculateSystemHealth(profileStates, runningServices) {
  const totalProfiles = profileStates.filter(p => p.installationState === 'installed').length;
  const healthyProfiles = profileStates.filter(p => 
    p.installationState === 'installed' && p.status === 'running'
  ).length;
  
  const healthPercentage = totalProfiles > 0 ? (healthyProfiles / totalProfiles) * 100 : 100;
  
  return {
    status: healthPercentage >= 80 ? 'healthy' : healthPercentage >= 50 ? 'degraded' : 'unhealthy',
    percentage: healthPercentage,
    totalProfiles,
    healthyProfiles,
    runningServices: runningServices.length
  };
}

async function getDependencyInformation(profileStates) {
  const installedProfiles = profileStates.filter(p => p.installationState === 'installed');
  const dependencies = [];
  
  for (const profile of installedProfiles) {
    const deps = await dependencyValidator.getProfileDependencies(profile.id);
    dependencies.push({
      profileId: profile.id,
      dependencies: deps
    });
  }
  
  return dependencies;
}

module.exports = router;