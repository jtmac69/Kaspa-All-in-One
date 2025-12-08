const express = require('express');
const ConfigGenerator = require('../utils/config-generator');
const FieldVisibilityResolver = require('../utils/field-visibility-resolver');
const ConfigurationValidator = require('../utils/configuration-validator');
const { FIELD_CATEGORIES, FIELD_GROUPS } = require('../config/configuration-fields');

const router = express.Router();
const configGenerator = new ConfigGenerator();
const fieldResolver = new FieldVisibilityResolver();
const configValidator = new ConfigurationValidator();

// POST /api/config/validate - Validate configuration (enhanced for task 4.1)
router.post('/validate', async (req, res) => {
  try {
    const { config, profiles, previousConfig } = req.body;
    
    if (!config || !Array.isArray(profiles)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'config object and profiles array are required'
      });
    }
    
    // Use the comprehensive validator (task 4.1)
    const result = configValidator.validateConfiguration(config, profiles);
    
    // Add network change warnings if previous config provided (task 4.1)
    if (previousConfig) {
      const networkWarnings = configValidator.validateNetworkChange(config, previousConfig);
      result.warnings.push(...networkWarnings);
    }
    
    // Add validation summary (task 4.1)
    const summary = configValidator.getValidationSummary(config, profiles);
    
    res.json({
      ...result,
      summary
    });
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

// POST /api/config/save - Save configuration to .env file and installation-config.json
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
    
    // Create backup before saving (task 3.3)
    const targetPath = path || require('path').resolve(__dirname, '../../../../.env');
    const configPath = require('path').resolve(__dirname, '../../../../installation-config.json');
    const backupDir = require('path').resolve(__dirname, '../../../../.kaspa-backups');
    
    const backupResult = await configGenerator.createConfigurationBackup(targetPath, configPath, backupDir);
    
    // Save .env file (task 3.2)
    const envContent = await configGenerator.generateEnvFile(validation.config, profiles);
    const result = await configGenerator.saveEnvFile(envContent, targetPath);
    
    // Save installation-config.json (task 3.2)
    const configResult = await configGenerator.saveInstallationConfig(validation.config, profiles, configPath);
    result.installationConfig = configResult;
    
    // Include backup information in response (task 3.3)
    result.backup = backupResult;
    
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

// GET /api/config/load - Load existing configuration (task 3.2)
// Loads from installation-config.json if available, falls back to .env
router.get('/load', async (req, res) => {
  try {
    const envPath = req.query.path || require('path').resolve(__dirname, '../../../../.env');
    const configPath = require('path').resolve(__dirname, '../../../../installation-config.json');
    
    const result = await configGenerator.loadCompleteConfiguration(envPath, configPath);
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

// POST /api/config/fields - Get visible configuration fields for selected profiles
router.post('/fields', (req, res) => {
  try {
    const { profiles } = req.body;
    
    if (!Array.isArray(profiles)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'profiles array is required'
      });
    }
    
    const fields = fieldResolver.getVisibleFields(profiles);
    const summary = fieldResolver.getSummary(profiles);
    
    res.json({
      fields,
      summary,
      categories: FIELD_CATEGORIES,
      groups: FIELD_GROUPS
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get configuration fields',
      message: error.message
    });
  }
});

// GET /api/config/fields/:key - Get specific field definition
router.get('/fields/:key', (req, res) => {
  try {
    const { key } = req.params;
    const field = fieldResolver.getFieldByKey(key);
    
    if (!field) {
      return res.status(404).json({
        error: 'Field not found',
        message: `No field found with key: ${key}`
      });
    }
    
    res.json({ field });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get field',
      message: error.message
    });
  }
});

// POST /api/config/validate-field - Validate a single field value
router.post('/validate-field', (req, res) => {
  try {
    const { key, value, config } = req.body;
    
    if (!key) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'key is required'
      });
    }
    
    const errors = configValidator.getFieldErrors(key, value, config || {});
    const valid = errors.length === 0;
    
    res.json({
      valid,
      errors
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to validate field',
      message: error.message
    });
  }
});

// POST /api/config/validate-complete - Validate complete configuration with new validator
router.post('/validate-complete', (req, res) => {
  try {
    const { config, profiles, previousConfig } = req.body;
    
    if (!config || !Array.isArray(profiles)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'config object and profiles array are required'
      });
    }
    
    const result = configValidator.validateConfiguration(config, profiles);
    
    // Add network change warnings if previous config provided
    if (previousConfig) {
      const networkWarnings = configValidator.validateNetworkChange(config, previousConfig);
      result.warnings.push(...networkWarnings);
    }
    
    const summary = configValidator.getValidationSummary(config, profiles);
    
    res.json({
      ...result,
      summary
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to validate configuration',
      message: error.message
    });
  }
});

// POST /api/config/check-port-conflicts - Check for port conflicts
router.post('/check-port-conflicts', (req, res) => {
  try {
    const { config, profiles } = req.body;
    
    if (!config || !Array.isArray(profiles)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'config object and profiles array are required'
      });
    }
    
    const conflicts = configValidator.validatePortConflicts(config, profiles);
    
    res.json({
      hasConflicts: conflicts.length > 0,
      conflicts
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to check port conflicts',
      message: error.message
    });
  }
});

// GET /api/config/backups - List configuration backups (task 3.3)
router.get('/backups', async (req, res) => {
  try {
    const backupDir = require('path').resolve(__dirname, '../../../../.kaspa-backups');
    const result = await configGenerator.listConfigurationBackups(backupDir);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to list backups',
      message: error.message
    });
  }
});

// POST /api/config/backup - Create configuration backup (task 3.3)
router.post('/backup', async (req, res) => {
  try {
    const envPath = require('path').resolve(__dirname, '../../../../.env');
    const configPath = require('path').resolve(__dirname, '../../../../installation-config.json');
    const backupDir = require('path').resolve(__dirname, '../../../../.kaspa-backups');
    
    const result = await configGenerator.createConfigurationBackup(envPath, configPath, backupDir);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to create backup',
      message: error.message
    });
  }
});

// POST /api/config/restore - Restore configuration from backup (task 3.3)
router.post('/restore', async (req, res) => {
  try {
    const { timestamp } = req.body;
    
    if (!timestamp) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'timestamp is required'
      });
    }
    
    const backupDir = require('path').resolve(__dirname, '../../../../.kaspa-backups');
    const envPath = require('path').resolve(__dirname, '../../../../.env');
    const configPath = require('path').resolve(__dirname, '../../../../installation-config.json');
    
    const result = await configGenerator.restoreConfigurationBackup(
      timestamp,
      backupDir,
      envPath,
      configPath
    );
    
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to restore backup',
      message: error.message
    });
  }
});

// POST /api/config/generate-docker-compose - Generate docker-compose.yml with dynamic configuration (task 5)
router.post('/generate-docker-compose', async (req, res) => {
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
    
    // Generate docker-compose.yml content
    const composeContent = await configGenerator.generateDockerCompose(validation.config, profiles);
    
    res.json({
      success: true,
      content: composeContent
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to generate docker-compose.yml',
      message: error.message
    });
  }
});

// POST /api/config/save-docker-compose - Save docker-compose.yml file (task 5)
router.post('/save-docker-compose', async (req, res) => {
  try {
    const { config, profiles, path } = req.body;
    
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
    
    // Generate docker-compose.yml content
    const composeContent = await configGenerator.generateDockerCompose(validation.config, profiles);
    
    // Save docker-compose.yml file
    const targetPath = path || require('path').resolve(__dirname, '../../../../docker-compose.yml');
    const result = await configGenerator.saveDockerCompose(composeContent, targetPath);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to save docker-compose.yml',
      message: error.message
    });
  }
});

module.exports = router;
