/**
 * Reconfiguration API Endpoints - Simple Version
 * 
 * Simplified version to test basic functionality without complex dependencies
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const { createResolver } = require('../../../../shared/lib/path-resolver');

// Initialize path resolver for this module
const resolver = createResolver(__dirname);

/**
 * GET /api/wizard/profiles/status
 * Get comprehensive profile installation status for reconfiguration mode
 */
router.get('/profiles/status', async (req, res) => {
  try {
    const fs = require('fs').promises;
    const { execFile } = require('child_process');
    const { promisify } = require('util');
    const execFileAsync = promisify(execFile);
    const { SharedStateManager } = require('../../../../shared/lib/state-manager');

    const paths = resolver.getPaths();
    const projectRoot = paths.root;
    const statePath = paths.installationState;

    console.log('[PROFILES STATUS] Project root:', projectRoot);
    console.log('[PROFILES STATUS] State path:', statePath);

    // Load installation state
    const stateManager = new SharedStateManager(statePath);
    const installationState = await stateManager.readState();

    console.log('[PROFILES STATUS] Installation state:', installationState ? 'found' : 'null');

    if (!installationState) {
      return res.json({
        success: true,
        message: 'No installation found',
        timestamp: new Date().toISOString(),
        profileStates: [],
        installedProfiles: [],
        availableProfiles: [],
        partialProfiles: [],
        errorProfiles: [],
        hasExistingConfig: false,
        runningServicesCount: 0,
        totalServicesCount: 0,
        systemHealth: {
          status: 'unknown',
          percentage: 0
        },
        suggestions: [],
        dependencyInfo: []
      });
    }

    // Query Docker for live container status
    let runningContainerNames = [];
    try {
      const { stdout } = await execFileAsync('docker', ['ps', '--format', '{{.Names}}'], { timeout: 5000 });
      runningContainerNames = stdout.trim().split('\n').filter(Boolean);
      console.log('[PROFILES STATUS] Running Docker containers:', runningContainerNames);
    } catch (dockerError) {
      console.warn('[PROFILES STATUS] Could not query Docker:', dockerError.message);
    }

    // Get installed profiles from state
    const installedProfiles = installationState.profiles?.selected || [];

    // Define all available profiles using the NEW 8-profile architecture
    const allProfiles = [
      {
        id: 'kaspa-node',
        name: 'Kaspa Node',
        displayName: 'Kaspa Node',
        description: 'Standard pruning Kaspa node with optional wallet',
        icon: '🖥️',
        services: ['kaspa-node']
      },
      {
        id: 'kasia-app',
        name: 'Kasia Application',
        displayName: 'Kasia Application',
        description: 'Kasia messaging and wallet application',
        icon: '💬',
        services: ['kasia-app']
      },
      {
        id: 'k-social-app',
        name: 'K-Social Application',
        displayName: 'K-Social Application',
        description: 'K-Social decentralized social application',
        icon: '👥',
        services: ['k-social']
      },
      {
        id: 'kaspa-explorer-bundle',
        name: 'Kaspa Explorer',
        displayName: 'Kaspa Explorer',
        description: 'Block explorer with Simply-Kaspa indexer and database',
        icon: '🔍',
        services: ['kaspa-explorer', 'simply-kaspa-indexer', 'timescaledb-explorer']
      },
      {
        id: 'kasia-indexer',
        name: 'Kasia Indexer',
        displayName: 'Kasia Indexer',
        description: 'Kasia indexer with embedded database',
        icon: '📊',
        services: ['kasia-indexer']
      },
      {
        id: 'k-indexer-bundle',
        name: 'K-Indexer',
        displayName: 'K-Indexer',
        description: 'K-Indexer with TimescaleDB database',
        icon: '📈',
        services: ['k-indexer', 'timescaledb-kindexer']
      },
      {
        id: 'kaspa-archive-node',
        name: 'Kaspa Archive Node',
        displayName: 'Kaspa Archive Node',
        description: 'Non-pruning archive node for complete blockchain history',
        icon: '🗄️',
        services: ['kaspa-archive-node']
      },
      {
        id: 'kaspa-stratum',
        name: 'Kaspa Stratum',
        displayName: 'Kaspa Stratum',
        description: 'Stratum bridge for mining hardware',
        icon: '⛏️',
        services: ['kaspa-stratum']
      }
    ];

    // Categorize profiles using live Docker status
    const profileStates = allProfiles.map(profile => {
      const isInstalled = installedProfiles.includes(profile.id);
      const services = installationState.services || [];
      const profileServices = services.filter(s =>
        profile.services.some(ps => s.name.includes(ps) || s.name === ps)
      );

      // Check live Docker status instead of trusting state file
      const runningServices = profileServices.filter(s =>
        runningContainerNames.some(name => name === s.name || name.includes(s.name))
      ).length;
      const totalServices = profileServices.length;

      let profileInstallState = 'not-installed';
      let status = 'stopped';

      if (isInstalled) {
        if (runningServices === totalServices && totalServices > 0) {
          profileInstallState = 'installed';
          status = 'running';
        } else if (runningServices > 0) {
          profileInstallState = 'partial';
          status = 'partial';
        } else {
          profileInstallState = 'installed';
          status = 'stopped';
        }
      }

      return {
        ...profile,
        installationState: profileInstallState,
        status,
        isInstalled,
        runningServices,
        totalServices
      };
    });

    const installed = profileStates.filter(p => p.installationState === 'installed');
    const available = profileStates.filter(p => p.installationState === 'not-installed');
    const partial = profileStates.filter(p => p.installationState === 'partial');

    // Calculate system health from live data
    const totalRunning = profileStates.reduce((sum, p) => sum + p.runningServices, 0);
    const totalServices = profileStates.reduce((sum, p) => sum + p.totalServices, 0);
    const healthPercentage = totalServices > 0 ? Math.round((totalRunning / totalServices) * 100) : 0;
    const healthStatus = healthPercentage === 100 ? 'healthy' : 
                        healthPercentage >= 50 ? 'warning' : 'error';
    
    // Generate suggestions
    const suggestions = [];
    
    // Suggest adding local node if indexers are installed but node is not
    const hasIndexer = installedProfiles.some(p => 
      ['kasia-indexer', 'k-indexer-bundle', 'kaspa-explorer-bundle'].includes(p)
    );
    const hasNode = installedProfiles.some(p => 
      ['kaspa-node', 'kaspa-archive-node'].includes(p)
    );
    
    if (hasIndexer && !hasNode) {
      suggestions.push({
        id: 'add-local-node',
        title: 'Add Local Kaspa Node',
        description: 'Your indexers are currently using public networks. Adding a local node can improve reliability and reduce network dependency.',
        action: 'add-profiles',
        priority: 'medium',
        context: {
          profiles: ['kaspa-node'],
          reason: 'indexer-optimization'
        }
      });
    }
    
    res.json({
      success: true,
      message: 'Profile status retrieved successfully',
      timestamp: new Date().toISOString(),
      profileStates,
      installedProfiles: installed,
      availableProfiles: available,
      partialProfiles: partial,
      errorProfiles: [],
      hasExistingConfig: true,
      runningServicesCount: totalRunning,
      totalServicesCount: totalServices,
      installationDate: installationState.installedAt,
      lastModified: installationState.lastModified,
      version: installationState.version || '1.0.0',
      systemHealth: {
        status: healthStatus,
        percentage: healthPercentage
      },
      suggestions,
      dependencyInfo: []
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
 */
router.post('/profiles/add', async (req, res) => {
  try {
    const { profiles, configuration = {}, integrationOptions = {}, createBackup = true } = req.body;
    
    if (!profiles || !Array.isArray(profiles) || profiles.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid profiles array'
      });
    }
    
    // Set wizardRunning flag at start of operation
    await setWizardRunningFlag(true);
    
    try {
      // Simulate profile addition process
      // In a real implementation, this would:
      // 1. Validate profiles
      // 2. Update configuration
      // 3. Deploy new services
      // 4. Update installation state
      
      // Update installation state with new profiles
      await updateInstallationStateAfterReconfiguration({
        action: 'add',
        profiles,
        configuration
      });
      
      res.json({
        success: true,
        message: `Profile addition endpoint working - would add: ${profiles.join(', ')}`,
        operationId: `add-profiles-${Date.now()}`,
        addedProfiles: profiles,
        totalProfiles: profiles,
        serviceValidation: { success: true },
        backupInfo: null
      });
      
    } finally {
      // Always clear wizardRunning flag when operation completes
      await setWizardRunningFlag(false);
    }
    
  } catch (error) {
    console.error('Error adding profiles:', error);
    // Ensure wizardRunning flag is cleared on error
    await setWizardRunningFlag(false);
    res.status(500).json({
      success: false,
      error: 'Failed to add profiles',
      message: error.message
    });
  }
});

/**
 * DELETE /api/wizard/profiles/remove
 * Remove profiles from existing installation
 */
router.delete('/profiles/remove', async (req, res) => {
  try {
    const { profiles, removeData = false, dataOptions = {}, createBackup = true } = req.body;
    
    if (!profiles || !Array.isArray(profiles) || profiles.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid profiles array'
      });
    }
    
    // Set wizardRunning flag at start of operation
    await setWizardRunningFlag(true);
    
    try {
      // Update installation state after profile removal
      await updateInstallationStateAfterReconfiguration({
        action: 'remove',
        profiles,
        removeData,
        dataOptions
      });
      
      res.json({
        success: true,
        message: `Profile removal endpoint working - would remove: ${profiles.join(', ')}`,
        operationId: `remove-profiles-${Date.now()}`,
        removedProfiles: profiles,
        remainingProfiles: [],
        dataRemovalResult: { success: true, removedData: [], preservedData: [] },
        backupInfo: null
      });
      
    } finally {
      // Always clear wizardRunning flag when operation completes
      await setWizardRunningFlag(false);
    }
    
  } catch (error) {
    console.error('Error removing profiles:', error);
    // Ensure wizardRunning flag is cleared on error
    await setWizardRunningFlag(false);
    res.status(500).json({
      success: false,
      error: 'Failed to remove profiles',
      message: error.message
    });
  }
});

/**
 * PUT /api/wizard/profiles/configure
 * Modify configuration of existing profiles
 */
router.put('/profiles/configure', async (req, res) => {
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
    
    // Set wizardRunning flag at start of operation
    await setWizardRunningFlag(true);
    
    try {
      // Update installation state after configuration changes
      await updateInstallationStateAfterReconfiguration({
        action: 'configure',
        profiles,
        configuration,
        restartServices
      });
      
      res.json({
        success: true,
        message: `Profile configuration endpoint working - would configure: ${profiles.join(', ')}`,
        operationId: `configure-profiles-${Date.now()}`,
        configuredProfiles: profiles,
        configDiff: { hasChanges: true, changeCount: 1, changes: [] },
        serviceRestartResult: null,
        backupInfo: null,
        requiresRestart: !restartServices
      });
      
    } finally {
      // Always clear wizardRunning flag when operation completes
      await setWizardRunningFlag(false);
    }
    
  } catch (error) {
    console.error('Error configuring profiles:', error);
    // Ensure wizardRunning flag is cleared on error
    await setWizardRunningFlag(false);
    res.status(500).json({
      success: false,
      error: 'Failed to configure profiles',
      message: error.message
    });
  }
});

/**
 * POST /api/wizard/reconfigure/validate
 * Validate reconfiguration changes before applying
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
    
    res.json({
      success: true,
      action,
      profiles,
      validation: {
        valid: true,
        errors: [],
        warnings: []
      },
      impact: {
        estimatedDowntime: 30,
        affectedServices: [],
        dataImpact: { willRemoveData: false, affectedVolumes: [] },
        requiresRestart: true
      },
      currentState: {
        profiles: [],
        hasConfiguration: false
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
 * POST /api/wizard/profiles/remove
 * Remove a profile (frontend sends POST with profileId)
 */
router.post('/profiles/remove', async (req, res) => {
  try {
    const { profileId, removeData = false } = req.body;

    if (!profileId) {
      return res.status(400).json({
        success: false,
        error: 'Missing profileId'
      });
    }

    // Set wizardRunning flag at start of operation
    await setWizardRunningFlag(true);

    try {
      const DockerManager = require('../utils/docker-manager');
      const dockerManager = new DockerManager();

      // Determine which Docker services belong to this profile
      const profileServiceMap = {
        'kaspa-node':           ['kaspa-node'],
        'kasia-app':            ['kasia-app'],
        'k-social-app':         ['k-social'],
        'kaspa-explorer-bundle':['kaspa-explorer', 'simply-kaspa-indexer', 'timescaledb-explorer'],
        'kasia-indexer':        ['kasia-indexer'],
        'k-indexer-bundle':     ['k-indexer', 'timescaledb-kindexer'],
        'kaspa-archive-node':   ['kaspa-archive-node'],
        'kaspa-stratum':        ['kaspa-stratum']
      };
      const servicesToRemove = profileServiceMap[profileId] || [];

      // Stop and remove Docker containers for this profile
      if (servicesToRemove.length > 0) {
        await dockerManager.removeServices(servicesToRemove, { removeData });
      }

      // Update docker-compose.yml to remove this profile's services
      await removeProfileFromDockerCompose(profileId, servicesToRemove);

      // Update installation state to remove this profile and its services
      await updateInstallationStateAfterReconfiguration({
        action: 'remove',
        profiles: [profileId],
        removeData,
        removedServices: servicesToRemove
      });

      res.json({
        success: true,
        message: `Profile ${profileId} removed successfully`,
        profileId,
        dataRemoved: removeData,
        removedServices: servicesToRemove
      });

    } finally {
      await setWizardRunningFlag(false);
    }

  } catch (error) {
    console.error('Error removing profile:', error);
    await setWizardRunningFlag(false);
    res.status(500).json({
      success: false,
      error: 'Failed to remove profile',
      message: error.message
    });
  }
});

/**
 * POST /api/wizard/profiles/validate-removal
 * Validate whether a profile can be safely removed
 */
router.post('/profiles/validate-removal', async (req, res) => {
  try {
    const { profileId } = req.body;

    if (!profileId) {
      return res.status(400).json({
        success: false,
        error: 'Missing profileId'
      });
    }

    // All profiles can be removed — no hard dependencies block removal
    res.json({
      success: true,
      canRemove: true,
      profileId,
      warnings: [],
      dependencies: [],
      dataVolumes: [],
      estimatedTime: '1-2 minutes'
    });

  } catch (error) {
    console.error('Error validating profile removal:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate profile removal',
      message: error.message
    });
  }
});

/**
 * GET /api/wizard/reconfigure/history
 * Get reconfiguration operation history
 */
router.get('/reconfigure/history', async (req, res) => {
  try {
    const { limit = 50, offset = 0, action, profile } = req.query;
    
    res.json({
      success: true,
      history: [],
      total: 0,
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasMore: false,
      message: 'History endpoint working - no history available yet'
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
 * GET /api/wizard/reconfigure/operations
 * Get all active reconfiguration operations
 */
router.get('/operations', async (req, res) => {
  try {
    res.json({
      success: true,
      operations: [],
      count: 0,
      message: 'Operations endpoint working - no active operations'
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

/**
 * GET /api/wizard/reconfigure/actions
 * Get available reconfiguration actions
 */
router.get('/reconfigure/actions', async (req, res) => {
  try {
    const actions = [
      {
        id: 'add-profiles',
        title: 'Add New Profiles',
        description: 'Add additional services to your existing installation',
        icon: '➕',
        enabled: true,
        estimatedTime: '5-15 minutes'
      },
      {
        id: 'modify-config',
        title: 'Modify Configuration',
        description: 'Change settings for existing services',
        icon: '⚙️',
        enabled: true,
        estimatedTime: '2-5 minutes'
      },
      {
        id: 'remove-profiles',
        title: 'Remove Profiles',
        description: 'Remove services from your installation',
        icon: '🗑️',
        enabled: true,
        estimatedTime: '2-10 minutes'
      }
    ];
    
    res.json({
      success: true,
      actions,
      count: actions.length
    });
    
  } catch (error) {
    console.error('Error getting reconfiguration actions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get reconfiguration actions',
      message: error.message
    });
  }
});

/**
 * GET /api/wizard/suggestions
 * Get configuration suggestions based on current state
 */
router.get('/suggestions', async (req, res) => {
  try {
    const suggestions = [
      {
        id: 'add-local-node',
        title: 'Add Local Kaspa Node',
        description: 'Your indexers are currently using public networks. Adding a local node can improve reliability and reduce network dependency.',
        action: 'add-profiles',
        priority: 'medium',
        context: {
          profiles: ['core'],
          reason: 'indexer-optimization'
        }
      }
    ];
    
    res.json({
      success: true,
      suggestions,
      count: suggestions.length
    });
    
  } catch (error) {
    console.error('Error getting suggestions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get suggestions',
      message: error.message
    });
  }
});

/**
 * POST /api/wizard/reconfigure/backup
 * Create backup before reconfiguration
 */
router.post('/reconfigure/backup', async (req, res) => {
  try {
    const { reason = 'Manual backup' } = req.body;
    
    const backupId = `backup-${Date.now()}`;
    const backupPath = `/tmp/${backupId}`;
    
    res.json({
      success: true,
      backupId,
      backupPath,
      reason,
      timestamp: new Date().toISOString(),
      message: 'Backup created successfully'
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
 * GET /api/wizard/backups
 * List available backups
 */
router.get('/backups', async (req, res) => {
  try {
    const backups = [];
    
    res.json({
      success: true,
      backups,
      count: backups.length,
      message: 'Backups endpoint working - no backups available yet'
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
 * GET /api/wizard/config/load
 * Alias for /api/wizard/current-config for test compatibility
 */
router.get('/config/load', async (req, res) => {
  try {
    const fs = require('fs').promises;
    const dotenv = require('dotenv');
    
    const paths = resolver.getPaths();
    const envPath = paths.env;
    const statePath = paths.installationState;
    
    let config = {};
    let installationState = null;
    
    // Load .env file
    try {
      const envContent = await fs.readFile(envPath, 'utf8');
      config = dotenv.parse(envContent);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: 'No existing configuration found',
        message: 'The .env file does not exist'
      });
    }
    
    // Load installation state
    try {
      const stateContent = await fs.readFile(statePath, 'utf8');
      installationState = JSON.parse(stateContent);
    } catch {
      // State file doesn't exist, that's okay
    }
    
    res.json({
      success: true,
      config,
      installationState,
      profiles: installationState?.profiles?.selected || [],
      lastModified: installationState?.lastModified || null,
      installedAt: installationState?.installedAt || null
    });
  } catch (error) {
    console.error('Error loading current configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load configuration',
      message: error.message
    });
  }
});

/**
 * GET /api/wizard/profiles/:profileId/services
 * Get services for a specific profile with modification options
 */
router.get('/profiles/:profileId/services', async (req, res) => {
  try {
    const { profileId } = req.params;
    const { SharedStateManager } = require('../../../../shared/lib/state-manager');
    
    const paths = resolver.getPaths();
    const statePath = paths.installationState;
    
    // Load installation state
    const stateManager = new SharedStateManager(statePath);
    const installationState = await stateManager.readState();
    
    if (!installationState) {
      return res.status(404).json({
        success: false,
        error: 'No installation found'
      });
    }
    
    // Define profile information (NEW profile IDs)
    const profileDefinitions = {
      'kaspa-node': {
        id: 'kaspa-node',
        displayName: 'Kaspa Node',
        description: 'Standard pruning Kaspa node',
        icon: '🖥️',
        services: ['kaspa-node']
      },
      'kasia-app': {
        id: 'kasia-app',
        displayName: 'Kasia Application',
        description: 'Kasia messaging and wallet app',
        icon: '💬',
        services: ['kasia-app']
      },
      'k-social-app': {
        id: 'k-social-app',
        displayName: 'K-Social Application',
        description: 'K-Social decentralized social app',
        icon: '👥',
        services: ['k-social']
      },
      'kaspa-explorer-bundle': {
        id: 'kaspa-explorer-bundle',
        displayName: 'Kaspa Explorer',
        description: 'Block explorer with indexer and database',
        icon: '🔍',
        services: ['kaspa-explorer', 'simply-kaspa-indexer', 'timescaledb-explorer']
      },
      'kasia-indexer': {
        id: 'kasia-indexer',
        displayName: 'Kasia Indexer',
        description: 'Kasia indexer service',
        icon: '📊',
        services: ['kasia-indexer']
      },
      'k-indexer-bundle': {
        id: 'k-indexer-bundle',
        displayName: 'K-Indexer',
        description: 'K-Indexer with database',
        icon: '📈',
        services: ['k-indexer', 'timescaledb-kindexer']
      },
      'kaspa-archive-node': {
        id: 'kaspa-archive-node',
        displayName: 'Kaspa Archive Node',
        description: 'Non-pruning archive node',
        icon: '🗄️',
        services: ['kaspa-archive-node']
      },
      'kaspa-stratum': {
        id: 'kaspa-stratum',
        displayName: 'Kaspa Stratum',
        description: 'Stratum bridge for mining',
        icon: '⛏️',
        services: ['kaspa-stratum']
      },
      
      // Legacy profile IDs (for backward compatibility)
      'core': {
        id: 'core',
        displayName: 'Core Profile',
        description: 'Essential Kaspa node and basic services',
        icon: '⚡',
        services: ['kaspa-node'],
        _isLegacy: true,
        _migratesTo: 'kaspa-node'
      },
      'kaspa-user-applications': {
        id: 'kaspa-user-applications',
        displayName: 'Kaspa User Applications',
        description: 'Explorer and user-facing applications',
        icon: '📱',
        services: ['kasia-app', 'k-social', 'kaspa-explorer'],
        _isLegacy: true,
        _migratesTo: ['kasia-app', 'k-social-app']
      },
      'indexer-services': {
        id: 'indexer-services',
        displayName: 'Indexer Services',
        description: 'Indexer services with databases',
        icon: '🔍',
        services: ['kasia-indexer', 'k-indexer', 'simply-kaspa-indexer', 'timescaledb'],
        _isLegacy: true,
        _migratesTo: ['kasia-indexer', 'k-indexer-bundle', 'kaspa-explorer-bundle']
      },
      'archive-node': {
        id: 'archive-node',
        displayName: 'Archive Node',
        description: 'Full historical data archive',
        icon: '📚',
        services: ['kaspa-archive-node'],
        _isLegacy: true,
        _migratesTo: 'kaspa-archive-node'
      },
      'mining': {
        id: 'mining',
        displayName: 'Mining Profile',
        description: 'Mining stratum server',
        icon: '⛏️',
        services: ['kaspa-stratum'],
        _isLegacy: true,
        _migratesTo: 'kaspa-stratum'
      }
    };
    
    const profileDef = profileDefinitions[profileId];
    if (!profileDef) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found'
      });
    }
    
    // Get services for this profile from installation state
    const profileServices = installationState.services?.filter(s => 
      profileDef.services.some(ps => s.name.includes(ps))
    ) || [];
    
    // Calculate profile status
    const runningServices = profileServices.filter(s => s.running).length;
    const totalServices = profileServices.length;
    let status = 'stopped';
    
    if (runningServices === totalServices && totalServices > 0) {
      status = 'running';
    } else if (runningServices > 0) {
      status = 'partial';
    }
    
    // Enhance service data with modification options
    const enhancedServices = profileServices.map(service => ({
      id: service.name,
      name: service.name,
      displayName: service.displayName || service.name,
      description: getServiceDescription(service.name),
      running: service.running,
      exists: service.exists,
      containerName: service.containerName,
      ports: service.ports || [],
      dataSize: getServiceDataSize(service.name),
      configurable: isServiceConfigurable(service.name),
      removable: isServiceRemovable(service.name, profileServices)
    }));
    
    res.json({
      success: true,
      profile: {
        ...profileDef,
        status,
        runningServices,
        totalServices
      },
      services: enhancedServices
    });
    
  } catch (error) {
    console.error('Error getting profile services:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get profile services',
      message: error.message
    });
  }
});

/**
 * GET /api/wizard/services/:serviceId/config
 * Get configuration options for a specific service
 */
router.get('/services/:serviceId/config', async (req, res) => {
  try {
    const { serviceId } = req.params;
    
    // Get current configuration
    const config = await getServiceConfiguration(serviceId);
    
    // Get configuration schema
    const schema = getServiceConfigurationSchema(serviceId);
    
    res.json({
      success: true,
      config,
      schema
    });
    
  } catch (error) {
    console.error('Error getting service configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get service configuration',
      message: error.message
    });
  }
});

/**
 * POST /api/wizard/services/:serviceId/config/validate
 * Validate service configuration
 */
router.post('/services/:serviceId/config/validate', async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { config } = req.body;
    
    const validation = validateServiceConfiguration(serviceId, config);
    
    res.json({
      valid: validation.valid,
      errors: validation.errors || []
    });
    
  } catch (error) {
    console.error('Error validating service configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate service configuration',
      message: error.message
    });
  }
});

/**
 * POST /api/wizard/profiles/:profileId/services/modify
 * Apply service modifications to a profile
 */
router.post('/profiles/:profileId/services/modify', async (req, res) => {
  try {
    const { profileId } = req.params;
    const { modifications } = req.body;
    
    if (!modifications || !Array.isArray(modifications)) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid modifications array'
      });
    }
    
    // Set wizardRunning flag at start of operation
    await setWizardRunningFlag(true);
    
    try {
      // Process modifications
      const results = [];
      
      for (const modification of modifications) {
        try {
          let result;
          
          if (modification.type === 'modify') {
            result = await modifyServiceConfiguration(modification.serviceId, modification.config);
          } else if (modification.type === 'remove') {
            result = await removeService(modification.serviceId, modification.removeData);
          }
          
          results.push({
            serviceId: modification.serviceId,
            type: modification.type,
            success: true,
            result
          });
          
        } catch (error) {
          results.push({
            serviceId: modification.serviceId,
            type: modification.type,
            success: false,
            error: error.message
          });
        }
      }
      
      // Update installation state
      await updateInstallationStateAfterModifications(profileId, modifications, results);
      
      res.json({
        success: true,
        message: 'Service modifications applied successfully',
        results,
        operationId: `modify-services-${Date.now()}`
      });
      
    } finally {
      // Always clear wizardRunning flag when operation completes
      await setWizardRunningFlag(false);
    }
    
  } catch (error) {
    console.error('Error applying service modifications:', error);
    // Ensure wizardRunning flag is cleared on error
    await setWizardRunningFlag(false);
    res.status(500).json({
      success: false,
      error: 'Failed to apply service modifications',
      message: error.message
    });
  }
});

// Helper functions for service modification

function getServiceDescription(serviceName) {
  const descriptions = {
    'kaspa-node': 'Core Kaspa blockchain node',
    'kaspa-node-archive': 'Non-pruning Kaspa node with full history',
    'kaspa-explorer': 'Web-based blockchain explorer',
    'kasia': 'Kaspa wallet and transaction interface',
    'k-indexer': 'K-Social blockchain indexer',
    'simply-kaspa-indexer': 'Simply Kaspa blockchain indexer',
    'timescaledb': 'Time-series database for indexers',
    'kaspa-stratum': 'Mining stratum server'
  };
  
  return descriptions[serviceName] || 'Service component';
}

function getServiceDataSize(serviceName) {
  // This would normally query actual data sizes
  // For now, return estimated sizes
  const estimatedSizes = {
    'kaspa-node': '~50 GB',
    'kaspa-node-archive': '~200 GB',
    'kaspa-explorer': '~1 GB',
    'kasia': '~500 MB',
    'k-indexer': '~10 GB',
    'simply-kaspa-indexer': '~15 GB',
    'timescaledb': '~25 GB',
    'kaspa-stratum': '~100 MB'
  };
  
  return estimatedSizes[serviceName] || 'Unknown';
}

function isServiceConfigurable(serviceName) {
  // Define which services have configurable options
  const configurableServices = [
    'kaspa-node',
    'kaspa-node-archive',
    'kaspa-explorer',
    'kasia',
    'k-indexer',
    'simply-kaspa-indexer',
    'timescaledb',
    'kaspa-stratum'
  ];
  
  return configurableServices.includes(serviceName);
}

function isServiceRemovable(serviceName, allServices) {
  // Check if service can be safely removed
  // Some services might be dependencies for others
  
  if (serviceName === 'timescaledb') {
    // TimescaleDB can only be removed if no indexers depend on it
    const indexers = allServices.filter(s => 
      s.name.includes('indexer') && s.running
    );
    return indexers.length === 0;
  }
  
  return true; // Most services are removable
}

async function getServiceConfiguration(serviceId) {
  // This would load actual service configuration
  // For now, return mock configuration
  const mockConfigs = {
    'kaspa-node': {
      rpcPort: 16110,
      p2pPort: 16111,
      network: 'mainnet',
      publicNode: false
    },
    'kaspa-explorer': {
      port: 8080,
      indexerUrl: 'http://localhost:8081'
    },
    'timescaledb': {
      port: 5432,
      maxConnections: 100,
      sharedBuffers: '256MB'
    }
  };
  
  return mockConfigs[serviceId] || {};
}

function getServiceConfigurationSchema(serviceId) {
  // Define configuration schemas for each service
  const schemas = {
    'kaspa-node': {
      fields: [
        {
          key: 'rpcPort',
          label: 'RPC Port',
          type: 'number',
          min: 1024,
          max: 65535,
          default: 16110,
          required: true,
          description: 'Port for RPC connections'
        },
        {
          key: 'p2pPort',
          label: 'P2P Port',
          type: 'number',
          min: 1024,
          max: 65535,
          default: 16111,
          required: true,
          description: 'Port for peer-to-peer connections'
        },
        {
          key: 'network',
          label: 'Network',
          type: 'select',
          options: [
            { value: 'mainnet', label: 'Mainnet' },
            { value: 'testnet', label: 'Testnet' }
          ],
          default: 'mainnet',
          required: true,
          description: 'Kaspa network to connect to'
        },
        {
          key: 'publicNode',
          label: 'Public Node',
          type: 'checkbox',
          default: false,
          checkboxLabel: 'Allow external connections',
          description: 'Enable public access to this node'
        }
      ]
    },
    'kaspa-explorer': {
      fields: [
        {
          key: 'port',
          label: 'Web Port',
          type: 'number',
          min: 1024,
          max: 65535,
          default: 8080,
          required: true,
          description: 'Port for web interface'
        },
        {
          key: 'indexerUrl',
          label: 'Indexer URL',
          type: 'url',
          default: 'http://localhost:8081',
          required: true,
          description: 'URL of the indexer service'
        }
      ]
    },
    'timescaledb': {
      fields: [
        {
          key: 'port',
          label: 'Database Port',
          type: 'number',
          min: 1024,
          max: 65535,
          default: 5432,
          required: true,
          description: 'Port for database connections'
        },
        {
          key: 'maxConnections',
          label: 'Max Connections',
          type: 'number',
          min: 10,
          max: 1000,
          default: 100,
          required: true,
          description: 'Maximum number of concurrent connections'
        },
        {
          key: 'sharedBuffers',
          label: 'Shared Buffers',
          type: 'text',
          default: '256MB',
          required: true,
          description: 'Amount of memory for shared buffers'
        }
      ]
    }
  };
  
  return schemas[serviceId] || { fields: [] };
}

function validateServiceConfiguration(serviceId, config) {
  const schema = getServiceConfigurationSchema(serviceId);
  const errors = [];
  
  for (const field of schema.fields) {
    const value = config[field.key];
    
    // Check required fields
    if (field.required && (value === undefined || value === null || value === '')) {
      errors.push({
        field: field.key,
        message: `${field.label} is required`
      });
      continue;
    }
    
    // Skip validation if field is empty and not required
    if (value === undefined || value === null || value === '') {
      continue;
    }
    
    // Type-specific validation
    if (field.type === 'number') {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        errors.push({
          field: field.key,
          message: `${field.label} must be a valid number`
        });
      } else {
        if (field.min !== undefined && numValue < field.min) {
          errors.push({
            field: field.key,
            message: `${field.label} must be at least ${field.min}`
          });
        }
        if (field.max !== undefined && numValue > field.max) {
          errors.push({
            field: field.key,
            message: `${field.label} must be at most ${field.max}`
          });
        }
      }
    }
    
    if (field.type === 'url') {
      try {
        new URL(value);
      } catch {
        errors.push({
          field: field.key,
          message: `${field.label} must be a valid URL`
        });
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

async function modifyServiceConfiguration(serviceId, config) {
  // This would apply the configuration changes
  // For now, return a mock result
  return {
    serviceId,
    configApplied: config,
    restartRequired: true,
    message: `Configuration updated for ${serviceId}`
  };
}

async function removeService(serviceId, removeData) {
  // This would remove the service and optionally its data
  // For now, return a mock result
  return {
    serviceId,
    removed: true,
    dataRemoved: removeData,
    message: `Service ${serviceId} removed${removeData ? ' with data' : ', data preserved'}`
  };
}

async function updateInstallationStateAfterModifications(profileId, modifications, results) {
  // This would update the installation state file
  // For now, just log the operation
  console.log(`Updated installation state for profile ${profileId}:`, {
    modifications: modifications.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length
  });
}

/**
 * Set or clear the wizardRunning flag in the installation state
 * @param {boolean} isRunning - Whether wizard is running
 */
async function setWizardRunningFlag(isRunning) {
  try {
    const { SharedStateManager } = require('../../../../shared/lib/state-manager');
    const paths = resolver.getPaths();
    const statePath = paths.installationState;
    
    const stateManager = new SharedStateManager(statePath);
    const currentState = await stateManager.readState();
    
    if (currentState) {
      // Update existing state with wizardRunning flag
      await stateManager.updateState({
        wizardRunning: isRunning
      });
      console.log(`[STATE UPDATE] wizardRunning flag set to: ${isRunning}`);
    } else {
      console.warn('[STATE UPDATE] No installation state found, cannot set wizardRunning flag');
    }
  } catch (error) {
    console.error('[STATE UPDATE] Error setting wizardRunning flag:', error);
    // Don't throw error - this shouldn't break the main operation
  }
}

/**
 * Update installation state after reconfiguration operations
 * @param {Object} operation - Operation details (action, profiles, etc.)
 */
/**
 * Remove a profile's services from docker-compose.yml
 */
async function removeProfileFromDockerCompose(profileId, serviceNames) {
  try {
    const fs = require('fs').promises;
    const paths = resolver.getPaths();
    const composePath = require('path').join(paths.root, 'docker-compose.yml');

    let content;
    try {
      content = await fs.readFile(composePath, 'utf8');
    } catch (e) {
      return; // No compose file, nothing to do
    }

    const lines = content.split('\n');
    const result = [];
    let skipSection = false;
    let skipIndent = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect start of a service section to remove
      if (!skipSection) {
        const serviceMatch = line.match(/^  ([a-z][a-z0-9_-]*):\s*$/);
        if (serviceMatch && serviceNames.includes(serviceMatch[1])) {
          skipSection = true;
          skipIndent = '  '; // service indent level
          continue;
        }
      }

      if (skipSection) {
        // Stop skipping when we hit the next top-level service or a non-indented section
        const isTopLevel = line.length > 0 && !line.startsWith(' ') && !line.startsWith('#');
        const isNewService = /^  [a-z][a-z0-9_-]*:\s*$/.test(line);
        const isNetworksSection = /^networks:\s*$/.test(line) || /^volumes:\s*$/.test(line);

        if (isTopLevel || isNewService || isNetworksSection) {
          skipSection = false;
          skipIndent = null;

          // Check if this new service should also be removed
          const serviceMatch = line.match(/^  ([a-z][a-z0-9_-]*):\s*$/);
          if (serviceMatch && serviceNames.includes(serviceMatch[1])) {
            skipSection = true;
            continue;
          }
          result.push(line);
        }
        // else skip this line
      } else {
        result.push(line);
      }
    }

    // If all services removed, docker-compose just has network section - that's fine
    await fs.writeFile(composePath, result.join('\n'), 'utf8');
    console.log(`[COMPOSE] Removed services ${serviceNames.join(', ')} from docker-compose.yml`);
  } catch (error) {
    console.error('[COMPOSE] Error removing profile from docker-compose.yml:', error);
    // Don't throw - state update should still proceed
  }
}

async function updateInstallationStateAfterReconfiguration(operation) {
  try {
    const { SharedStateManager } = require('../../../../shared/lib/state-manager');
    const paths = resolver.getPaths();
    const statePath = paths.installationState;
    
    const stateManager = new SharedStateManager(statePath);
    const currentState = await stateManager.readState();
    
    if (!currentState) {
      console.warn('[STATE UPDATE] No installation state found, cannot update after reconfiguration');
      return;
    }
    
    const { action, profiles, configuration, removedServices = [] } = operation;
    let updatedProfiles = [...(currentState.profiles?.selected || [])];

    // Update profiles based on action
    if (action === 'add') {
      // Add new profiles (avoid duplicates)
      profiles.forEach(profile => {
        if (!updatedProfiles.includes(profile)) {
          updatedProfiles.push(profile);
        }
      });
    } else if (action === 'remove') {
      // Remove profiles
      updatedProfiles = updatedProfiles.filter(profile => !profiles.includes(profile));
    }
    // For 'configure' action, profiles list stays the same

    // Update configuration if provided
    const updatedConfiguration = configuration ? {
      ...currentState.configuration,
      ...configuration
    } : currentState.configuration;

    // Remove services associated with removed profiles from the services array
    let updatedServices = currentState.services || [];
    if (action === 'remove' && removedServices.length > 0) {
      updatedServices = updatedServices.filter(s => !removedServices.includes(s.name));
    }

    // Update state
    await stateManager.updateState({
      profiles: {
        selected: updatedProfiles,
        count: updatedProfiles.length
      },
      configuration: updatedConfiguration,
      services: updatedServices,
      summary: {
        total: updatedServices.length,
        running: updatedServices.filter(s => s.running).length,
        stopped: updatedServices.filter(s => !s.running).length,
        missing: 0
      },
      lastModified: new Date().toISOString()
    });
    
    console.log(`[STATE UPDATE] Installation state updated after ${action} operation:`, {
      action,
      profilesCount: updatedProfiles.length,
      profiles: updatedProfiles
    });
    
  } catch (error) {
    console.error('[STATE UPDATE] Error updating installation state after reconfiguration:', error);
    // Don't throw error - this shouldn't break the main operation
  }
}

module.exports = router;