/**
 * Dependency Validation API Routes
 * 
 * Provides endpoints for validating external dependencies during startup,
 * health checks for external resources, and guidance when dependencies are unavailable.
 * 
 * Requirements: 2.3, 3.5
 */

const express = require('express');
const DependencyValidator = require('../utils/dependency-validator');

const router = express.Router();
const dependencyValidator = new DependencyValidator();

/**
 * GET /api/dependencies/validate/:service
 * Validate external dependencies for a specific service
 */
router.get('/validate/:service', async (req, res) => {
  try {
    const { service } = req.params;
    const options = {
      timeoutMultiplier: parseInt(req.query.timeoutMultiplier) || 1,
      includeGuidance: req.query.includeGuidance !== 'false'
    };

    console.log(`Validating dependencies for service: ${service}`);
    
    const result = await dependencyValidator.validateServiceDependencies(service, options);
    
    res.json({
      success: true,
      service,
      validation: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error validating service dependencies:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate service dependencies',
      message: error.message,
      service: req.params.service
    });
  }
});

/**
 * POST /api/dependencies/validate-multiple
 * Validate external dependencies for multiple services
 */
router.post('/validate-multiple', async (req, res) => {
  try {
    const { services, options = {} } = req.body;

    if (!Array.isArray(services) || services.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Services array is required and must not be empty'
      });
    }

    console.log(`Validating dependencies for ${services.length} services: ${services.join(', ')}`);
    
    const result = await dependencyValidator.validateMultipleServices(services, options);
    
    res.json({
      success: true,
      services,
      validation: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error validating multiple service dependencies:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate multiple service dependencies',
      message: error.message,
      services: req.body.services || []
    });
  }
});

/**
 * GET /api/dependencies/connectivity
 * Test basic internet connectivity and CDN accessibility
 */
router.get('/connectivity', async (req, res) => {
  try {
    console.log('Testing internet connectivity...');
    
    const result = await dependencyValidator.testInternetConnectivity();
    
    res.json({
      success: true,
      connectivity: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error testing internet connectivity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test internet connectivity',
      message: error.message
    });
  }
});

/**
 * GET /api/dependencies/summary/:service
 * Get quick dependency validation summary for a service
 */
router.get('/summary/:service', async (req, res) => {
  try {
    const { service } = req.params;
    
    console.log(`Getting dependency summary for service: ${service}`);
    
    const result = await dependencyValidator.getServiceDependencySummary(service);
    
    res.json({
      success: true,
      service,
      summary: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting service dependency summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get service dependency summary',
      message: error.message,
      service: req.params.service
    });
  }
});

/**
 * GET /api/dependencies/health
 * Health check endpoint for dependency validation service
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'dependency-validation',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

/**
 * POST /api/dependencies/startup-check
 * Perform startup dependency validation for selected profiles
 */
router.post('/startup-check', async (req, res) => {
  try {
    const { profiles = [], config = {} } = req.body;

    if (!Array.isArray(profiles) || profiles.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Profiles array is required and must not be empty'
      });
    }

    console.log(`Performing startup dependency check for profiles: ${profiles.join(', ')}`);

    // Map profiles to services that need dependency validation
    const servicesToValidate = [];
    
    if (profiles.includes('kaspa-user-applications')) {
      servicesToValidate.push('kaspa-explorer', 'kasia-app', 'k-social');
    }
    
    if (profiles.includes('indexer-services')) {
      servicesToValidate.push('simply-kaspa-indexer', 'kasia-indexer');
    }

    if (servicesToValidate.length === 0) {
      return res.json({
        success: true,
        message: 'No services require external dependency validation for selected profiles',
        profiles,
        services: [],
        validation: {
          valid: true,
          summary: {
            services_tested: 0,
            services_valid: 0,
            total_critical_failures: 0,
            internet_connected: true,
            cdn_available: true
          }
        }
      });
    }

    const result = await dependencyValidator.validateMultipleServices(servicesToValidate);
    
    res.json({
      success: true,
      profiles,
      services: servicesToValidate,
      validation: result,
      recommendations: result.recommendations,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error performing startup dependency check:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform startup dependency check',
      message: error.message,
      profiles: req.body.profiles || []
    });
  }
});

/**
 * GET /api/dependencies/guidance/:service
 * Get detailed guidance for a service's dependency issues
 */
router.get('/guidance/:service', async (req, res) => {
  try {
    const { service } = req.params;
    
    console.log(`Getting dependency guidance for service: ${service}`);
    
    const result = await dependencyValidator.validateServiceDependencies(service);
    
    // Extract guidance from unavailable dependencies
    const guidance = result.dependencies
      .filter(dep => !dep.available && dep.guidance)
      .map(dep => ({
        dependency: dep.name,
        url: dep.url,
        type: dep.type,
        critical: dep.critical,
        error: dep.error,
        guidance: dep.guidance
      }));

    res.json({
      success: true,
      service,
      valid: result.valid,
      guidance,
      summary: result.summary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting dependency guidance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get dependency guidance',
      message: error.message,
      service: req.params.service
    });
  }
});

module.exports = router;