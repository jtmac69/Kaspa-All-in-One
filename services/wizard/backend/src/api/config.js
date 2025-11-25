const express = require('express');
const ConfigGenerator = require('../utils/config-generator');

const router = express.Router();
const configGenerator = new ConfigGenerator();

// POST /api/config/validate - Validate configuration
router.post('/validate', async (req, res) => {
  try {
    const result = await configGenerator.validateConfig(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Validation failed',
      message: error.message
    });
  }
});

// POST /api/config/generate - Generate .env file content
router.post('/generate', async (req, res) => {
  try {
    const { config, profiles } = req.body;
    
    if (!config || !Array.isArray(profiles)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'config object and profiles array are required'
      });
    }
    
    // Validate config first
    const validation = await configGenerator.validateConfig(config);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Invalid configuration',
        errors: validation.errors
      });
    }
    
    const envContent = await configGenerator.generateEnvFile(validation.config, profiles);
    res.json({
      success: true,
      content: envContent
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to generate configuration',
      message: error.message
    });
  }
});

// POST /api/config/save - Save configuration to .env file
router.post('/save', async (req, res) => {
  try {
    const { config, profiles, path } = req.body;
    
    if (!config || !Array.isArray(profiles)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'config object and profiles array are required'
      });
    }
    
    // Apply developer mode if enabled
    let finalConfig = config;
    if (config.DEVELOPER_MODE === true || config.DEVELOPER_MODE === 'true') {
      finalConfig = configGenerator.applyDeveloperMode(config, true);
    }
    
    // Validate config first
    const validation = await configGenerator.validateConfig(finalConfig);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Invalid configuration',
        errors: validation.errors
      });
    }
    
    const envContent = await configGenerator.generateEnvFile(validation.config, profiles);
    const targetPath = path || require('path').resolve(__dirname, '../../../../.env');
    const result = await configGenerator.saveEnvFile(envContent, targetPath);
    
    // Generate docker-compose.override.yml if developer mode is enabled
    if (config.DEVELOPER_MODE === true || config.DEVELOPER_MODE === 'true') {
      const overrideContent = await configGenerator.generateDockerComposeOverride(validation.config, profiles);
      const overridePath = require('path').resolve(__dirname, '../../../../docker-compose.override.yml');
      const overrideResult = await configGenerator.saveDockerComposeOverride(overrideContent, overridePath);
      
      result.override = overrideResult;
    } else {
      // Remove override file if developer mode is disabled
      const overridePath = require('path').resolve(__dirname, '../../../../docker-compose.override.yml');
      await configGenerator.saveDockerComposeOverride(null, overridePath);
      result.override = { removed: true };
    }
    
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to save configuration',
      message: error.message
    });
  }
});

// GET /api/config/load - Load existing configuration
router.get('/load', async (req, res) => {
  try {
    const envPath = req.query.path || require('path').resolve(__dirname, '../../../../.env');
    const result = await configGenerator.loadEnvFile(envPath);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to load configuration',
      message: error.message
    });
  }
});

// POST /api/config/default - Generate default configuration for profiles
router.post('/default', (req, res) => {
  try {
    const { profiles } = req.body;
    
    if (!Array.isArray(profiles)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'profiles array is required'
      });
    }
    
    const config = configGenerator.generateDefaultConfig(profiles);
    res.json({ config });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to generate default configuration',
      message: error.message
    });
  }
});

// GET /api/config/password - Generate secure password
router.get('/password', (req, res) => {
  try {
    const length = parseInt(req.query.length, 10) || 32;
    const password = configGenerator.generateSecurePassword(length);
    res.json({ password });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to generate password',
      message: error.message
    });
  }
});

module.exports = router;
