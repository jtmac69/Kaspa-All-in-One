const express = require('express');
const ContentManager = require('../utils/content-manager');
const ResourceChecker = require('../utils/resource-checker');

const router = express.Router();
const contentManager = new ContentManager();
const resourceChecker = new ResourceChecker();

/**
 * GET /api/content/profiles - Get all profile descriptions in plain language
 */
router.get('/profiles', (req, res) => {
  try {
    const profiles = contentManager.getAllProfileDescriptions();
    res.json({
      success: true,
      profiles
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get profile descriptions',
      message: error.message
    });
  }
});

/**
 * GET /api/content/profiles/:id - Get specific profile description
 */
router.get('/profiles/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { rating } = req.query;
    
    const profile = contentManager.getProfileDescription(id, rating);
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found',
        message: `Profile '${id}' does not exist`
      });
    }
    
    res.json({
      success: true,
      profile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get profile description',
      message: error.message
    });
  }
});

/**
 * POST /api/content/profiles/with-compatibility - Get profiles with compatibility ratings
 */
router.post('/profiles/with-compatibility', async (req, res) => {
  try {
    let resources = req.body.resources;
    
    // If resources not provided, detect them
    if (!resources) {
      resources = await resourceChecker.detectResources();
    }
    
    const profiles = contentManager.getAllProfileDescriptions();
    const profilesWithCompatibility = {};
    
    // Add compatibility rating for each profile
    for (const [profileId, profileData] of Object.entries(profiles)) {
      const compatibility = resourceChecker.checkProfileCompatibility(resources, profileId);
      
      profilesWithCompatibility[profileId] = {
        ...profileData,
        compatibility: {
          rating: compatibility.rating,
          message: profileData.compatibility[compatibility.rating],
          checks: compatibility.checks
        }
      };
    }
    
    res.json({
      success: true,
      resources,
      profiles: profilesWithCompatibility
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get profiles with compatibility',
      message: error.message
    });
  }
});

/**
 * GET /api/content/error/:type - Get error message in plain language
 */
router.get('/error/:type', (req, res) => {
  try {
    const { type } = req.params;
    const context = req.query;
    
    const errorMessage = contentManager.getErrorMessage(type, context);
    
    res.json({
      success: true,
      error: errorMessage
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get error message',
      message: error.message
    });
  }
});

/**
 * GET /api/content/progress/:step - Get progress step description
 */
router.get('/progress/:step', (req, res) => {
  try {
    const { step } = req.params;
    const progressStep = contentManager.getProgressStep(step);
    
    res.json({
      success: true,
      step: progressStep
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get progress step',
      message: error.message
    });
  }
});

/**
 * GET /api/content/glossary - Get all glossary terms
 */
router.get('/glossary', (req, res) => {
  try {
    const glossary = contentManager.getAllGlossaryTerms();
    
    res.json({
      success: true,
      glossary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get glossary',
      message: error.message
    });
  }
});

/**
 * GET /api/content/glossary/:term - Get specific glossary term
 */
router.get('/glossary/:term', (req, res) => {
  try {
    const { term } = req.params;
    const definition = contentManager.getGlossaryTerm(term);
    
    if (!definition) {
      return res.status(404).json({
        success: false,
        error: 'Term not found',
        message: `Glossary term '${term}' not found`
      });
    }
    
    res.json({
      success: true,
      term: definition
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get glossary term',
      message: error.message
    });
  }
});

/**
 * GET /api/content/help/:id - Get help text
 */
router.get('/help/:id', (req, res) => {
  try {
    const { id } = req.params;
    const helpText = contentManager.getHelpText(id);
    
    if (!helpText) {
      return res.status(404).json({
        success: false,
        error: 'Help text not found',
        message: `Help text '${id}' not found`
      });
    }
    
    res.json({
      success: true,
      help: helpText
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get help text',
      message: error.message
    });
  }
});

/**
 * POST /api/content/recommend - Get profile recommendation based on resources
 */
router.post('/recommend', async (req, res) => {
  try {
    let resources = req.body.resources;
    
    // If resources not provided, detect them
    if (!resources) {
      resources = await resourceChecker.detectResources();
    }
    
    const recommendation = contentManager.getProfileRecommendation(resources);
    
    res.json({
      success: true,
      resources,
      recommendation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get recommendation',
      message: error.message
    });
  }
});

module.exports = router;
