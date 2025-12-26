const express = require('express');
const router = express.Router();

/**
 * Profile Addition API Endpoints
 * Handles adding profiles to existing installations with integration options
 */
function createAdditionRoutes(profileManager, dependencyValidator) {
  
  // POST /api/profiles/validate-addition - Validate profile addition
  router.post('/validate-addition', async (req, res) => {
    try {
      const { profileId, currentProfiles = [] } = req.body;
      
      if (!profileId) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'profileId is required'
        });
      }
      
      // Check if profile exists
      const profile = profileManager.getProfile(profileId);
      if (!profile) {
        return res.status(404).json({
          error: 'Profile not found',
          message: `Profile '${profileId}' does not exist`
        });
      }
      
      // Validate addition using dependency validator
      const validation = await dependencyValidator.validateAddition(profileId, currentProfiles);
      res.json(validation);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to validate profile addition',
        message: error.message
      });
    }
  });

  // POST /api/profiles/integration-options - Get integration options for adding profile
  router.post('/integration-options', async (req, res) => {
    try {
      const { profileId, currentProfiles = [] } = req.body;
      
      if (!profileId) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'profileId is required'
        });
      }
      
      // Check if profile exists
      const profile = profileManager.getProfile(profileId);
      if (!profile) {
        return res.status(404).json({
          error: 'Profile not found',
          message: `Profile '${profileId}' does not exist`
        });
      }
      
      // Get integration options
      const options = await profileManager.getIntegrationOptions(profileId, currentProfiles);
      res.json(options);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get integration options',
        message: error.message
      });
    }
  });

  // POST /api/profiles/add - Add profile to existing installation
  router.post('/add', async (req, res) => {
    try {
      const { profileId, currentProfiles = [], integrationOptions = {} } = req.body;
      
      if (!profileId) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'profileId is required'
        });
      }
      
      // Validate addition first
      const validation = await dependencyValidator.validateAddition(profileId, currentProfiles);
      if (!validation.canAdd) {
        return res.status(400).json({
          success: false,
          error: 'Cannot add profile',
          message: validation.errors.map(e => e.message).join(', '),
          validation
        });
      }
      
      // Perform addition
      const result = await profileManager.addProfile(profileId, { 
        currentProfiles, 
        integrationOptions 
      });
      
      if (result.success) {
        res.json({
          success: true,
          message: `Profile '${profileId}' added successfully`,
          addedServices: result.addedServices,
          integrationChanges: result.integrationChanges,
          requiresRestart: result.requiresRestart
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to add profile',
          message: result.error
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to add profile',
        message: error.message
      });
    }
  });

  return router;
}

module.exports = createAdditionRoutes;