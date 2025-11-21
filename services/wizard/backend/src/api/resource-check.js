const express = require('express');
const ResourceChecker = require('../utils/resource-checker');

const router = express.Router();
const resourceChecker = new ResourceChecker();

/**
 * GET /api/resource-check - Run full resource check
 * Returns detected resources and compatibility analysis
 */
router.get('/', async (req, res) => {
  try {
    const resources = await resourceChecker.detectResources();
    res.json({
      success: true,
      resources,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Resource detection failed',
      message: error.message
    });
  }
});

/**
 * GET /api/resource-check/requirements - Get component and profile requirements
 * Returns the requirements database for all components and profiles
 */
router.get('/requirements', (req, res) => {
  try {
    const components = resourceChecker.getComponentRequirements();
    const profiles = resourceChecker.getProfileRequirements();
    
    res.json({
      success: true,
      components,
      profiles
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get requirements',
      message: error.message
    });
  }
});

/**
 * POST /api/resource-check/recommend - Get recommendations for detected resources
 * Body: { resources } (optional - will detect if not provided)
 * Returns profile recommendations and warnings
 */
router.post('/recommend', async (req, res) => {
  try {
    let resources = req.body.resources;
    
    // If resources not provided, detect them
    if (!resources) {
      resources = await resourceChecker.detectResources();
    }
    
    const recommendations = resourceChecker.generateRecommendations(resources);
    
    // Check compatibility for all profiles
    const profileCompatibility = {};
    const profiles = resourceChecker.getProfileRequirements();
    for (const profileKey in profiles) {
      profileCompatibility[profileKey] = resourceChecker.checkProfileCompatibility(resources, profileKey);
    }
    
    res.json({
      success: true,
      resources,
      recommendations,
      profileCompatibility
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate recommendations',
      message: error.message
    });
  }
});

/**
 * POST /api/resource-check/auto-configure - Generate auto-configuration
 * Body: { resources } (optional - will detect if not provided)
 * Returns optimal configuration based on system resources
 */
router.post('/auto-configure', async (req, res) => {
  try {
    let resources = req.body.resources;
    
    // If resources not provided, detect them
    if (!resources) {
      resources = await resourceChecker.detectResources();
    }
    
    const config = await resourceChecker.generateAutoConfiguration(resources);
    
    res.json({
      success: true,
      resources,
      config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate auto-configuration',
      message: error.message
    });
  }
});

/**
 * POST /api/resource-check/check-component - Check specific component compatibility
 * Body: { component, resources } (resources optional)
 * Returns compatibility analysis for a specific component
 */
router.post('/check-component', async (req, res) => {
  try {
    const { component } = req.body;
    
    if (!component) {
      return res.status(400).json({
        success: false,
        error: 'Component name required',
        message: 'Please provide a component name in the request body'
      });
    }
    
    let resources = req.body.resources;
    if (!resources) {
      resources = await resourceChecker.detectResources();
    }
    
    const compatibility = resourceChecker.checkComponentCompatibility(resources, component);
    
    res.json({
      success: true,
      component,
      resources,
      compatibility
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to check component compatibility',
      message: error.message
    });
  }
});

/**
 * POST /api/resource-check/check-profile - Check specific profile compatibility
 * Body: { profile, resources } (resources optional)
 * Returns compatibility analysis for a specific profile
 */
router.post('/check-profile', async (req, res) => {
  try {
    const { profile } = req.body;
    
    if (!profile) {
      return res.status(400).json({
        success: false,
        error: 'Profile name required',
        message: 'Please provide a profile name in the request body'
      });
    }
    
    let resources = req.body.resources;
    if (!resources) {
      resources = await resourceChecker.detectResources();
    }
    
    const compatibility = resourceChecker.checkProfileCompatibility(resources, profile);
    
    res.json({
      success: true,
      profile,
      resources,
      compatibility
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to check profile compatibility',
      message: error.message
    });
  }
});

module.exports = router;
