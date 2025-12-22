const express = require('express');
const ProfileManager = require('../utils/profile-manager');
const DependencyValidator = require('../utils/dependency-validator');

const router = express.Router();
const profileManager = new ProfileManager();
const dependencyValidator = new DependencyValidator(profileManager);

// GET /api/profiles - Get all profiles
router.get('/', (req, res) => {
  try {
    const profiles = profileManager.getAllProfiles();
    res.json({ profiles });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get profiles',
      message: error.message
    });
  }
});

// GET /api/profiles/:id - Get specific profile
router.get('/:id', (req, res) => {
  try {
    const profile = profileManager.getProfile(req.params.id);
    
    if (!profile) {
      return res.status(404).json({
        error: 'Profile not found',
        message: `Profile '${req.params.id}' does not exist`
      });
    }
    
    res.json(profile);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get profile',
      message: error.message
    });
  }
});

// GET /api/profiles/templates - Get all templates
router.get('/templates/all', (req, res) => {
  try {
    const templates = profileManager.getAllTemplates();
    res.json({ templates });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get templates',
      message: error.message
    });
  }
});

// GET /api/profiles/templates/category/:category - Get templates by category
router.get('/templates/category/:category', (req, res) => {
  try {
    const templates = profileManager.getTemplatesByCategory(req.params.category);
    res.json({ templates });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get templates by category',
      message: error.message
    });
  }
});

// GET /api/profiles/templates/usecase/:useCase - Get templates by use case
router.get('/templates/usecase/:useCase', (req, res) => {
  try {
    const templates = profileManager.getTemplatesByUseCase(req.params.useCase);
    res.json({ templates });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get templates by use case',
      message: error.message
    });
  }
});

// POST /api/profiles/templates/search - Search templates by tags
router.post('/templates/search', (req, res) => {
  try {
    const { tags } = req.body;
    
    if (!tags || !Array.isArray(tags)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Tags array is required'
      });
    }
    
    const templates = profileManager.searchTemplatesByTags(tags);
    res.json({ templates });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to search templates',
      message: error.message
    });
  }
});

// POST /api/profiles/templates/recommendations - Get template recommendations
router.post('/templates/recommendations', (req, res) => {
  try {
    const { systemResources, useCase } = req.body;
    
    if (!systemResources) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'System resources are required'
      });
    }
    
    const recommendations = profileManager.getTemplateRecommendations(systemResources, useCase);
    res.json({ recommendations });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get template recommendations',
      message: error.message
    });
  }
});

// GET /api/profiles/templates/:id - Get specific template
router.get('/templates/:id', (req, res) => {
  try {
    const template = profileManager.getTemplate(req.params.id);
    
    if (!template) {
      return res.status(404).json({
        error: 'Template not found',
        message: `Template '${req.params.id}' does not exist`
      });
    }
    
    res.json(template);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get template',
      message: error.message
    });
  }
});

// POST /api/profiles/templates/:id/apply - Apply template configuration
router.post('/templates/:id/apply', (req, res) => {
  try {
    const { baseConfig = {} } = req.body;
    const config = profileManager.applyTemplate(req.params.id, baseConfig);
    
    res.json({ config });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to apply template',
      message: error.message
    });
  }
});

// POST /api/profiles/templates/:id/validate - Validate template
router.post('/templates/:id/validate', (req, res) => {
  try {
    const validation = profileManager.validateTemplate(req.params.id);
    res.json(validation);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to validate template',
      message: error.message
    });
  }
});

// POST /api/profiles/templates - Create custom template
router.post('/templates', (req, res) => {
  try {
    const template = profileManager.createCustomTemplate(req.body);
    const saved = profileManager.saveCustomTemplate(template);
    
    if (saved) {
      res.status(201).json({ 
        success: true, 
        template,
        message: 'Template created successfully'
      });
    } else {
      res.status(500).json({
        error: 'Failed to save template',
        message: 'Template creation failed'
      });
    }
  } catch (error) {
    res.status(400).json({
      error: 'Failed to create template',
      message: error.message
    });
  }
});

// DELETE /api/profiles/templates/:id - Delete custom template
router.delete('/templates/:id', (req, res) => {
  try {
    const deleted = profileManager.deleteCustomTemplate(req.params.id);
    
    if (deleted) {
      res.json({ 
        success: true,
        message: 'Template deleted successfully'
      });
    } else {
      res.status(500).json({
        error: 'Failed to delete template',
        message: 'Template deletion failed'
      });
    }
  } catch (error) {
    res.status(400).json({
      error: 'Failed to delete template',
      message: error.message
    });
  }
});

// POST /api/profiles/validate - Validate profile selection
router.post('/validate', (req, res) => {
  try {
    const { profiles } = req.body;
    
    if (!Array.isArray(profiles)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'profiles must be an array of profile IDs'
      });
    }
    
    const validation = profileManager.validateProfileSelection(profiles);
    res.json(validation);
  } catch (error) {
    res.status(500).json({
      error: 'Validation failed',
      message: error.message
    });
  }
});

// POST /api/profiles/requirements - Calculate resource requirements
router.post('/requirements', (req, res) => {
  try {
    const { profiles } = req.body;
    
    if (!Array.isArray(profiles)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'profiles must be an array of profile IDs'
      });
    }
    
    const requirements = profileManager.calculateResourceRequirements(profiles);
    res.json(requirements);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to calculate requirements',
      message: error.message
    });
  }
});

// POST /api/profiles/dependencies - Resolve profile dependencies
router.post('/dependencies', (req, res) => {
  try {
    const { profiles } = req.body;
    
    if (!Array.isArray(profiles)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'profiles must be an array of profile IDs'
      });
    }
    
    const resolved = profileManager.resolveProfileDependencies(profiles);
    res.json({ profiles: resolved });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to resolve dependencies',
      message: error.message
    });
  }
});

// POST /api/profiles/startup-order - Get service startup order
router.post('/startup-order', (req, res) => {
  try {
    const { profiles } = req.body;
    
    if (!Array.isArray(profiles)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'profiles must be an array of profile IDs'
      });
    }
    
    const startupOrder = profileManager.getStartupOrder(profiles);
    res.json({ services: startupOrder });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get startup order',
      message: error.message
    });
  }
});

// GET /api/profiles/developer-mode - Get developer mode features
router.get('/developer-mode/features', (req, res) => {
  try {
    const features = profileManager.getDeveloperModeFeatures();
    res.json(features);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get developer mode features',
      message: error.message
    });
  }
});

// POST /api/profiles/developer-mode/apply - Apply developer mode to configuration
router.post('/developer-mode/apply', (req, res) => {
  try {
    const { config, enabled } = req.body;
    
    if (!config || typeof config !== 'object') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'config must be an object'
      });
    }
    
    const updatedConfig = profileManager.applyDeveloperMode(config, enabled);
    res.json({ config: updatedConfig });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to apply developer mode',
      message: error.message
    });
  }
});

// POST /api/profiles/circular-dependencies - Detect circular dependencies
router.post('/circular-dependencies', (req, res) => {
  try {
    const { profiles } = req.body;
    
    if (!Array.isArray(profiles)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'profiles must be an array of profile IDs'
      });
    }
    
    const cycles = profileManager.detectCircularDependencies(profiles);
    res.json({ 
      hasCycles: cycles.length > 0,
      cycles 
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to detect circular dependencies',
      message: error.message
    });
  }
});

// POST /api/profiles/validate-selection - Comprehensive validation using DependencyValidator
router.post('/validate-selection', (req, res) => {
  try {
    const { profiles } = req.body;
    
    if (!Array.isArray(profiles)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'profiles must be an array of profile IDs'
      });
    }
    
    // Use the new DependencyValidator for comprehensive validation
    const validation = dependencyValidator.validateSelection(profiles);
    res.json(validation);
  } catch (error) {
    res.status(500).json({
      error: 'Validation failed',
      message: error.message
    });
  }
});

// POST /api/profiles/validation-report - Get detailed validation report
router.post('/validation-report', (req, res) => {
  try {
    const { profiles } = req.body;
    
    if (!Array.isArray(profiles)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'profiles must be an array of profile IDs'
      });
    }
    
    const report = dependencyValidator.getValidationReport(profiles);
    res.json(report);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to generate validation report',
      message: error.message
    });
  }
});

// POST /api/profiles/dependency-graph - Build dependency graph
router.post('/dependency-graph', (req, res) => {
  try {
    const { profiles } = req.body;
    
    if (!Array.isArray(profiles)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'profiles must be an array of profile IDs'
      });
    }
    
    const graph = dependencyValidator.buildDependencyGraph(profiles);
    res.json(graph);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to build dependency graph',
      message: error.message
    });
  }
});

module.exports = router;
