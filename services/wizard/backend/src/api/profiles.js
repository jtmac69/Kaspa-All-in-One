const express = require('express');
const ProfileManager = require('../utils/profile-manager');

const router = express.Router();
const profileManager = new ProfileManager();

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

module.exports = router;
