/**
 * Fallback API
 * 
 * API endpoints for fallback strategy management:
 * - POST /api/config/configure-fallback - Configure fallback for failed services
 * - POST /api/config/detect-failures - Detect service failures
 * - POST /api/config/retry-health-check - Retry health checks
 * - GET /api/config/troubleshooting/:service - Get troubleshooting info
 * - GET /api/config/fallback-status - Get current fallback status
 * 
 * Requirements: 2, 6, 8, 14
 */

const express = require('express');
const router = express.Router();
const FallbackManager = require('../utils/fallback-manager');
const DockerManager = require('../utils/docker-manager');
const ProfileManager = require('../utils/profile-manager');

// Initialize managers
const dockerManager = new DockerManager();
const profileManager = new ProfileManager();
const fallbackManager = new FallbackManager(dockerManager, profileManager);

/**
 * POST /api/config/configure-fallback
 * Configure fallback for failed services
 */
router.post('/configure-fallback', async (req, res) => {
  try {
    const {
      failedService,
      strategy,
      dependentServices = [],
      currentConfig = {},
      profiles = []
    } = req.body;

    // Validate input
    if (!failedService) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: failedService'
      });
    }

    if (!strategy) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: strategy'
      });
    }

    let fallbackConfig = { ...currentConfig };
    let dockerComposeOverride = null;

    // Handle different fallback strategies
    switch (strategy) {
      case 'continue-public':
        // Configure public network fallback
        if (failedService.includes('node')) {
          fallbackConfig = await fallbackManager.configurePublicNetworkFallback(
            dependentServices,
            currentConfig
          );
          
          dockerComposeOverride = await fallbackManager.generateFallbackDockerCompose(
            fallbackConfig,
            profiles
          );
        } else if (failedService.includes('indexer')) {
          fallbackConfig = await fallbackManager.configureIndexerFallback(
            [failedService],
            currentConfig
          );
          
          dockerComposeOverride = await fallbackManager.generateFallbackDockerCompose(
            fallbackConfig,
            profiles
          );
        }
        break;

      case 'troubleshoot':
        // Get troubleshooting information
        const failureInfo = await fallbackManager.detectNodeFailure(
          failedService,
          dependentServices
        );
        
        const troubleshooting = await fallbackManager.getTroubleshootingInfo(
          failedService,
          failureInfo
        );
        
        return res.json({
          success: true,
          strategy: 'troubleshoot',
          troubleshooting
        });

      case 'retry':
        // Retry health check
        const retryResult = await fallbackManager.retryHealthCheck(failedService);
        
        if (retryResult.success) {
          return res.json({
            success: true,
            strategy: 'retry',
            message: `${failedService} is now healthy`,
            healthCheck: retryResult.result
          });
        } else {
          return res.json({
            success: false,
            strategy: 'retry',
            message: `${failedService} still unhealthy after ${retryResult.attempts} attempts`,
            healthCheck: retryResult.result,
            suggestFallback: true
          });
        }

      case 'skip-node':
        // Skip node entirely, use public network for everything
        fallbackConfig = await fallbackManager.configurePublicNetworkFallback(
          dependentServices,
          currentConfig
        );
        
        fallbackConfig.SKIP_LOCAL_NODE = 'true';
        
        dockerComposeOverride = await fallbackManager.generateFallbackDockerCompose(
          fallbackConfig,
          profiles
        );
        break;

      default:
        return res.status(400).json({
          success: false,
          error: `Unknown strategy: ${strategy}`
        });
    }

    // Save fallback configuration
    const saveResult = await fallbackManager.saveFallbackConfiguration(fallbackConfig);

    res.json({
      success: true,
      strategy,
      fallbackConfig,
      dockerComposeOverride,
      saved: saveResult.success,
      savedPath: saveResult.path,
      message: `Fallback configured successfully using strategy: ${strategy}`
    });

  } catch (error) {
    console.error('Error configuring fallback:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/config/detect-failures
 * Detect service failures and suggest fallback strategies
 */
router.post('/detect-failures', async (req, res) => {
  try {
    const { services, profiles = [] } = req.body;

    if (!services || !Array.isArray(services)) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid field: services (must be array)'
      });
    }

    const failures = [];
    const dialogs = [];

    for (const service of services) {
      // Detect failures for node services
      if (service.includes('node')) {
        const dependentServices = fallbackManager.getDependentServices(profiles, service);
        const failureInfo = await fallbackManager.detectNodeFailure(service, dependentServices);

        if (failureInfo.failed) {
          failures.push({
            service,
            ...failureInfo
          });

          // Generate user choice dialog
          const dialog = fallbackManager.generateNodeFailureDialog(service, failureInfo);
          dialogs.push(dialog);
        }
      } else {
        // For other services, do basic status check
        const status = await dockerManager.getServiceStatus(service);
        
        if (!status.running) {
          failures.push({
            service,
            failed: true,
            reason: status.exists ? 'container_not_running' : 'container_not_found',
            message: `${service} is not running`,
            severity: 'high'
          });
        }
      }
    }

    res.json({
      success: true,
      totalServices: services.length,
      failedServices: failures.length,
      failures,
      dialogs,
      hasFallbackOptions: dialogs.length > 0
    });

  } catch (error) {
    console.error('Error detecting failures:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/config/retry-health-check
 * Retry health check for a service
 */
router.post('/retry-health-check', async (req, res) => {
  try {
    const { service, maxRetries = 3 } = req.body;

    if (!service) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: service'
      });
    }

    const result = await fallbackManager.retryHealthCheck(service, maxRetries);

    res.json({
      success: result.success,
      service,
      attempts: result.attempt || result.attempts,
      healthCheck: result.result,
      message: result.success
        ? `${service} is healthy`
        : `${service} failed health check after ${result.attempts} attempts`
    });

  } catch (error) {
    console.error('Error retrying health check:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/config/troubleshooting/:service
 * Get troubleshooting information for a service
 */
router.get('/troubleshooting/:service', async (req, res) => {
  try {
    const { service } = req.params;
    const { profiles = [] } = req.query;

    // Detect failure
    const dependentServices = fallbackManager.getDependentServices(
      Array.isArray(profiles) ? profiles : [profiles],
      service
    );
    
    const failureInfo = await fallbackManager.detectNodeFailure(service, dependentServices);

    // Get troubleshooting info
    const troubleshooting = await fallbackManager.getTroubleshootingInfo(service, failureInfo);

    res.json({
      success: true,
      service,
      troubleshooting
    });

  } catch (error) {
    console.error('Error getting troubleshooting info:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/config/fallback-status
 * Get current fallback configuration status
 */
router.get('/fallback-status', async (req, res) => {
  try {
    // Load fallback configuration if it exists
    const loadResult = await fallbackManager.loadFallbackConfiguration();

    if (!loadResult.success) {
      return res.json({
        success: true,
        fallbackEnabled: false,
        message: 'No fallback configuration found'
      });
    }

    const config = loadResult.config;
    const fallbackEnabled = config._fallback?.enabled || config._indexerFallback?.enabled || false;

    res.json({
      success: true,
      fallbackEnabled,
      nodeFallback: config._fallback || null,
      indexerFallback: config._indexerFallback || null,
      publicEndpoints: {
        kaspaNode: config.KASPA_NODE_RPC_URL || null,
        indexers: {
          kasia: config.KASIA_INDEXER_URL || null,
          kSocial: config.K_INDEXER_URL || null,
          simplyKaspa: config.SIMPLY_KASPA_INDEXER_URL || null
        }
      },
      timestamp: loadResult.timestamp
    });

  } catch (error) {
    console.error('Error getting fallback status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/config/public-endpoints
 * Get available public endpoints
 */
router.get('/public-endpoints', async (req, res) => {
  try {
    res.json({
      success: true,
      endpoints: {
        kaspaNode: fallbackManager.publicEndpoints.kaspaNode,
        indexers: fallbackManager.publicEndpoints.indexers
      }
    });
  } catch (error) {
    console.error('Error getting public endpoints:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
