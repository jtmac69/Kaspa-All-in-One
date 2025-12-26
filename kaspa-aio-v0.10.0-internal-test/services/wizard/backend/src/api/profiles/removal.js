const express = require('express');
const router = express.Router();

/**
 * Profile Removal API Endpoints
 * Handles removing profiles from existing installations with data options
 */
function createRemovalRoutes(profileManager, dependencyValidator) {
  
  // POST /api/profiles/validate-removal - Validate profile removal
  router.post('/validate-removal', async (req, res) => {
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
      
      // Validate removal using dependency validator
      const validation = await dependencyValidator.validateRemoval(profileId, currentProfiles);
      res.json(validation);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to validate profile removal',
        message: error.message
      });
    }
  });

  // POST /api/profiles/remove/confirm - Confirm profile removal with impact explanation
  router.post('/remove/confirm', async (req, res) => {
    try {
      const { profileId, currentProfiles = [] } = req.body;
      
      if (!profileId) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'profileId is required'
        });
      }
      
      // Get profile definition
      const profile = profileManager.getProfile(profileId);
      if (!profile) {
        return res.status(404).json({
          error: 'Profile not found',
          message: `Profile '${profileId}' does not exist`
        });
      }
      
      // Get removal validation with detailed impact analysis
      const validation = await dependencyValidator.validateRemoval(profileId, currentProfiles);
      
      // Get data removal options
      const dataOptions = profileManager.getProfileDataTypes(profileId).map(dataType => ({
        id: `${profileId}-${dataType.type}`,
        type: dataType.type,
        label: dataType.description,
        location: dataType.location,
        estimatedSize: dataType.estimatedSize,
        recommended: dataType.type === 'app-data', // Remove app data by default
        description: `Data stored in ${dataType.location}`,
        impact: dataType.type === 'blockchain-data' ? 
          'Removing this data will require full blockchain sync if profile is reinstalled' :
          'This data can be regenerated if profile is reinstalled'
      }));
      
      // Get services that will be affected
      const servicesToRemove = profile.services.map(s => s.name);
      
      // Calculate downtime estimate
      const downtimeEstimate = servicesToRemove.length * 30; // 30 seconds per service
      
      // Get dependent services that will be affected
      const dependentServices = [];
      const remainingProfiles = currentProfiles.filter(p => p !== profileId);
      
      for (const otherProfileId of remainingProfiles) {
        const otherProfile = profileManager.getProfile(otherProfileId);
        if (otherProfile) {
          // Check if other profile depends on services from this profile
          const sharedServices = otherProfile.services.filter(s => 
            servicesToRemove.includes(s.name)
          );
          
          if (sharedServices.length > 0) {
            dependentServices.push({
              profileId: otherProfileId,
              profileName: otherProfile.name,
              affectedServices: sharedServices.map(s => s.name)
            });
          }
        }
      }
      
      res.json({
        profileId,
        profileName: profile.name,
        canRemove: validation.canRemove,
        impact: {
          servicesToRemove,
          dependentServices,
          dataTypes: dataOptions,
          estimatedDowntime: `${downtimeEstimate} seconds`,
          requiresBackup: true,
          warnings: validation.warnings || []
        },
        dataOptions,
        validation,
        recommendations: [
          {
            priority: 'high',
            title: 'Backup Before Removal',
            message: 'A backup will be created automatically before removing the profile',
            action: 'Backup includes configuration files and service data'
          },
          {
            priority: 'medium',
            title: 'Service Dependencies',
            message: dependentServices.length > 0 ? 
              `${dependentServices.length} other profiles may be affected` :
              'No other profiles will be affected',
            action: dependentServices.length > 0 ? 
              'Review dependent services before proceeding' :
              'Safe to proceed'
          },
          {
            priority: 'low',
            title: 'Data Recovery',
            message: 'Preserved data can be used if you reinstall this profile later',
            action: 'Choose which data to keep or remove'
          }
        ]
      });
      
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get removal confirmation details',
        message: error.message
      });
    }
  });

  // POST /api/profiles/remove - Remove profile from installation
  router.post('/remove', async (req, res) => {
    try {
      const { profileId, removeData = false, dataOptions = [], currentProfiles = [] } = req.body;
      
      if (!profileId) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'profileId is required'
        });
      }
      
      // Validate removal first
      const validation = await dependencyValidator.validateRemoval(profileId, currentProfiles);
      if (!validation.canRemove) {
        return res.status(400).json({
          success: false,
          error: 'Cannot remove profile',
          message: validation.errors.map(e => e.message).join(', '),
          validation
        });
      }
      
      // Perform removal
      const result = await profileManager.removeProfile(profileId, { 
        removeData, 
        dataOptions,
        currentProfiles
      });
      
      if (result.success) {
        res.json({
          success: true,
          message: `Profile '${profileId}' removed successfully`,
          removedServices: result.removedServices,
          preservedData: result.preservedData,
          backupId: result.backupId,
          removalSummary: result.removalSummary
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to remove profile',
          message: result.error
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to remove profile',
        message: error.message
      });
    }
  });

  // GET /api/profiles/:id/data-options - Get data removal options for profile
  router.get('/:id/data-options', async (req, res) => {
    try {
      const profileId = req.params.id;
      
      // Check if profile exists
      const profile = profileManager.getProfile(profileId);
      if (!profile) {
        return res.status(404).json({
          error: 'Profile not found',
          message: `Profile '${profileId}' does not exist`
        });
      }
      
      // Get data types for this profile
      const dataTypes = profileManager.getProfileDataTypes(profileId);
      
      // Convert to data removal options
      const dataOptions = dataTypes.map(dataType => ({
        id: `${profileId}-${dataType.type}`,
        type: dataType.type,
        label: dataType.description,
        location: dataType.location,
        estimatedSize: dataType.estimatedSize,
        recommended: dataType.type === 'app-data' ? true : false, // Remove app data by default
        description: `Data stored in ${dataType.location}`,
        impact: dataType.type === 'blockchain-data' ? 
          'Removing this data will require full blockchain sync if profile is reinstalled' :
          'This data can be regenerated if profile is reinstalled'
      }));
      
      res.json({
        profileId,
        profileName: profile.name,
        dataOptions,
        totalEstimatedSize: dataTypes.reduce((total, dt) => {
          // Simple size estimation (would need better logic in production)
          const sizeStr = dt.estimatedSize || '0';
          const match = sizeStr.match(/(\d+)/);
          return total + (match ? parseInt(match[1]) : 0);
        }, 0)
      });
      
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get data options',
        message: error.message
      });
    }
  });

  // GET /api/profiles/:id/removal-impact - Get detailed removal impact analysis
  router.get('/:id/removal-impact', async (req, res) => {
    try {
      const profileId = req.params.id;
      const currentProfiles = req.query.currentProfiles ? 
        req.query.currentProfiles.split(',') : [profileId];
      
      // Check if profile exists
      const profile = profileManager.getProfile(profileId);
      if (!profile) {
        return res.status(404).json({
          error: 'Profile not found',
          message: `Profile '${profileId}' does not exist`
        });
      }
      
      // Get removal validation
      const validation = await dependencyValidator.validateRemoval(profileId, currentProfiles);
      
      // Get services that will be affected
      const servicesToRemove = profile.services.map(s => s.name);
      
      // Get data that will be affected
      const dataTypes = profileManager.getProfileDataTypes(profileId);
      
      // Calculate downtime estimate
      const downtimeEstimate = servicesToRemove.length * 30; // 30 seconds per service
      
      res.json({
        profileId,
        profileName: profile.name,
        canRemove: validation.canRemove,
        impact: {
          servicesToRemove,
          dataTypes,
          dependentProfiles: validation.impact?.dependentProfiles || [],
          prerequisiteIssues: validation.impact?.prerequisiteIssues || [],
          estimatedDowntime: `${downtimeEstimate} seconds`,
          requiresBackup: true
        },
        validation,
        recommendations: validation.recommendations || []
      });
      
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get removal impact',
        message: error.message
      });
    }
  });

  return router;
}

module.exports = createRemovalRoutes;