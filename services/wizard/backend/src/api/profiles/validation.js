const express = require('express');
const router = express.Router();

/**
 * Profile Validation API Endpoints
 * Handles profile selection validation, dependency checking, and resource calculations
 */
function createValidationRoutes(profileManager, dependencyValidator) {
  
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
      
      // Transform the startup order to match expected test format
      const formattedStartupOrder = startupOrder.map(service => ({
        name: service.name || service.service,
        startupOrder: service.startupOrder || service.order || 1,
        profile: service.profile,
        dependencies: service.dependencies || []
      }));
      
      res.json({ 
        success: true,
        startupOrder: formattedStartupOrder,
        services: startupOrder // Keep backward compatibility
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get startup order',
        message: error.message
      });
    }
  });

  return router;
}

module.exports = createValidationRoutes;