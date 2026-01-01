const express = require('express');
const DockerManager = require('../utils/docker-manager');
const ConfigGenerator = require('../utils/config-generator');
const InfrastructureValidator = require('../utils/infrastructure-validator');

const router = express.Router();
const dockerManager = new DockerManager();
const configGenerator = new ConfigGenerator();
const infrastructureValidator = new InfrastructureValidator();

// POST /api/install/start - Start installation process
router.post('/start', async (req, res) => {
  try {
    const { config, profiles } = req.body;
    
    if (!config || !Array.isArray(profiles) || profiles.length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'config object and profiles array are required'
      });
    }
    
    // Validate configuration
    const validation = await configGenerator.validateConfig(config);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Invalid configuration',
        errors: validation.errors
      });
    }
    
    // Save configuration
    const envContent = await configGenerator.generateEnvFile(validation.config, profiles);
    const envPath = require('path').resolve(__dirname, '../../../../.env');
    const saveResult = await configGenerator.saveEnvFile(envContent, envPath);
    
    if (!saveResult.success) {
      return res.status(500).json({
        error: 'Failed to save configuration',
        message: saveResult.error
      });
    }
    
    res.json({
      success: true,
      message: 'Installation started',
      installId: Date.now().toString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to start installation',
      message: error.message
    });
  }
});

// POST /api/install/pull - Pull Docker images
router.post('/pull', async (req, res) => {
  try {
    const { profiles } = req.body;
    
    if (!Array.isArray(profiles)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'profiles array is required'
      });
    }
    
    const results = await dockerManager.pullImages(profiles);
    const allSuccess = results.every(r => r.success);
    
    res.json({
      success: allSuccess,
      results
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to pull images',
      message: error.message
    });
  }
});

// POST /api/install/build - Build services
router.post('/build', async (req, res) => {
  try {
    const { profiles } = req.body;
    
    if (!Array.isArray(profiles)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'profiles array is required'
      });
    }
    
    const result = await dockerManager.buildServices(profiles);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to build services',
      message: error.message
    });
  }
});

// POST /api/install/deploy - Start services
router.post('/deploy', async (req, res) => {
  try {
    const { profiles } = req.body;
    
    if (!Array.isArray(profiles)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'profiles array is required'
      });
    }
    
    const result = await dockerManager.startServices(profiles);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to deploy services',
      message: error.message
    });
  }
});

// POST /api/install/validate - Validate installation
router.post('/validate', async (req, res) => {
  try {
    const { profiles, includeInfrastructure = false } = req.body;
    
    if (!Array.isArray(profiles)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'profiles array is required'
      });
    }
    
    // Basic service validation
    const serviceValidation = await dockerManager.validateServices(profiles);
    
    const result = {
      services: serviceValidation,
      timestamp: new Date().toISOString()
    };
    
    // Include infrastructure validation if requested
    if (includeInfrastructure) {
      try {
        const infrastructureValidation = await infrastructureValidator.validateInfrastructure(profiles);
        result.infrastructure = infrastructureValidation;
        result.infrastructureSummary = infrastructureValidator.getValidationSummary(infrastructureValidation);
      } catch (error) {
        console.error('Infrastructure validation error:', error);
        result.infrastructure = {
          error: 'Infrastructure validation failed',
          message: error.message
        };
      }
    }
    
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to validate installation',
      message: error.message
    });
  }
});

// GET /api/install/status/:service - Get service status
router.get('/status/:service', async (req, res) => {
  try {
    const status = await dockerManager.getServiceStatus(req.params.service);
    res.json(status);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get service status',
      message: error.message
    });
  }
});

// GET /api/install/logs/:service - Get service logs
router.get('/logs/:service', async (req, res) => {
  try {
    const lines = parseInt(req.query.lines, 10) || 100;
    const result = await dockerManager.getLogs(req.params.service, lines);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get logs',
      message: error.message
    });
  }
});

// POST /api/install/stop - Stop all services
router.post('/stop', async (req, res) => {
  try {
    const result = await dockerManager.stopServices();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to stop services',
      message: error.message
    });
  }
});

// POST /api/install/prepare - Prepare template configurations for installation (task 6.2)
router.post('/prepare', async (req, res) => {
  try {
    const { config, profiles } = req.body;
    
    if (!config || !Array.isArray(profiles) || profiles.length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'config object and profiles array are required'
      });
    }
    
    // Validate configuration
    const validation = await configGenerator.validateConfig(config);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Invalid configuration',
        errors: validation.errors
      });
    }
    
    // Check if this is a template-based configuration
    const isTemplateConfig = config.appliedTemplate !== undefined;
    
    // Prepare installation metadata
    const installationMetadata = {
      profiles,
      config: validation.config,
      isTemplateConfig,
      templateId: config.appliedTemplate || null,
      preparedAt: new Date().toISOString(),
      installationId: `install_${Date.now()}`
    };
    
    // Validate that all required services are available for the profiles
    const requiredServices = getRequiredServicesForProfiles(profiles);
    const serviceValidation = await validateServicesAvailability(requiredServices);
    
    if (!serviceValidation.allAvailable) {
      return res.status(400).json({
        error: 'Service validation failed',
        message: 'Some required services are not available',
        missingServices: serviceValidation.missing,
        availableServices: serviceValidation.available
      });
    }
    
    res.json({
      success: true,
      installationMetadata,
      requiredServices,
      message: 'Installation preparation completed successfully'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to prepare installation',
      message: error.message
    });
  }
});

/**
 * Get required services for profiles
 */
function getRequiredServicesForProfiles(profiles) {
  const serviceMap = {
    'core': ['kaspa-node'],
    'kaspa-user-applications': ['kasia-app', 'k-social-app', 'kaspa-explorer'],
    'indexer-services': ['timescaledb', 'kasia-indexer', 'k-indexer', 'simply-kaspa-indexer'],
    'archive-node': ['kaspa-archive-node'],
    'mining': ['kaspa-stratum']
  };
  
  const services = [];
  profiles.forEach(profile => {
    if (serviceMap[profile]) {
      services.push(...serviceMap[profile]);
    }
  });
  
  return [...new Set(services)]; // Remove duplicates
}

/**
 * Validate services availability
 */
async function validateServicesAvailability(requiredServices) {
  // For now, assume all services are available
  // In a real implementation, this would check Docker images, service definitions, etc.
  return {
    allAvailable: true,
    available: requiredServices,
    missing: []
  };
}

module.exports = router;
