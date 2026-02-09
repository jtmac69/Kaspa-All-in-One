const express = require('express');
const router = express.Router();

/**
 * Basic Profile API Endpoints
 * Handles basic profile and template retrieval operations
 */
function createBasicRoutes(profileManager, dependencyValidator) {
  
  // GET /api/profiles - Get all profiles
  router.get('/', (req, res) => {
    try {
      const profiles = profileManager.getAllProfiles();
      
      // Transform to frontend-friendly format with metadata
      const profileData = profiles.map(profile => ({
        id: profile.id,
        name: profile.name,
        description: profile.description,
        icon: profile.icon || '📦',
        category: profile.category || 'Other',
        resources: {
          memory: profile.minMemoryGB || 2,
          disk: profile.minDiskGB || 10,
          cpu: profile.minCPUCores || 1
        },
        dependencies: profile.dependencies || [],
        conflicts: profile.conflicts || [],
        services: profile.services?.map(s => s.name || s) || []
      }));
      
      res.json({ 
        success: true,
        profiles: profileData,
        count: profileData.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
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

  // GET /api/profiles/developer-mode/features - Get developer mode features
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

  return router;
}

module.exports = createBasicRoutes;