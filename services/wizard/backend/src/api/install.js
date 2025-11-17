const express = require('express');
const DockerManager = require('../utils/docker-manager');
const ConfigGenerator = require('../utils/config-generator');

const router = express.Router();
const dockerManager = new DockerManager();
const configGenerator = new ConfigGenerator();

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
    const { profiles } = req.body;
    
    if (!Array.isArray(profiles)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'profiles array is required'
      });
    }
    
    const result = await dockerManager.validateServices(profiles);
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

module.exports = router;
