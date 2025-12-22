/**
 * Infrastructure Validation API
 * 
 * Provides endpoints for comprehensive infrastructure testing after installation.
 * Integrates test-nginx.sh and test-timescaledb.sh execution with detailed results.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.7
 */

const express = require('express');
const InfrastructureValidator = require('../utils/infrastructure-validator');
const { validateInput } = require('../middleware/security');

const router = express.Router();
const infrastructureValidator = new InfrastructureValidator();

/**
 * POST /api/infrastructure/validate
 * Execute comprehensive infrastructure validation tests
 */
router.post('/validate', validateInput, async (req, res) => {
  try {
    const { profiles } = req.body;

    // Validate input
    if (!Array.isArray(profiles) || profiles.length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'profiles array is required and must not be empty'
      });
    }

    // Validate profile names
    const validProfiles = ['core', 'kaspa-user-applications', 'indexer-services', 'archive-node', 'mining'];
    const invalidProfiles = profiles.filter(p => !validProfiles.includes(p));
    
    if (invalidProfiles.length > 0) {
      return res.status(400).json({
        error: 'Invalid profiles',
        message: `Invalid profile(s): ${invalidProfiles.join(', ')}`,
        validProfiles
      });
    }

    // Execute infrastructure validation
    const results = await infrastructureValidator.validateInfrastructure(profiles);
    
    // Add summary for easier consumption
    const summary = infrastructureValidator.getValidationSummary(results);

    res.json({
      success: true,
      results,
      summary,
      profiles: profiles,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Infrastructure validation error:', error);
    res.status(500).json({
      error: 'Infrastructure validation failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/infrastructure/retry
 * Retry failed infrastructure tests
 */
router.post('/retry', validateInput, async (req, res) => {
  try {
    const { profiles, failedTests = [] } = req.body;

    // Validate input
    if (!Array.isArray(profiles) || profiles.length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'profiles array is required and must not be empty'
      });
    }

    // Execute retry
    const results = await infrastructureValidator.retryFailedTests(profiles, failedTests);
    const summary = infrastructureValidator.getValidationSummary(results);

    res.json({
      success: true,
      results,
      summary,
      profiles: profiles,
      retriedTests: failedTests,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Infrastructure retry error:', error);
    res.status(500).json({
      error: 'Infrastructure retry failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/infrastructure/test-scripts
 * Get information about available test scripts
 */
router.get('/test-scripts', (req, res) => {
  try {
    const scripts = {
      nginx: {
        name: 'Nginx Infrastructure Tests',
        description: 'Tests nginx configuration, routing, security headers, rate limiting, and SSL/TLS',
        categories: ['configuration', 'security', 'performance', 'routing'],
        requiredFor: ['all profiles'],
        estimatedDuration: '30-60 seconds'
      },
      timescaledb: {
        name: 'TimescaleDB Infrastructure Tests',
        description: 'Tests TimescaleDB initialization, hypertables, compression, continuous aggregates, and backup capability',
        categories: ['configuration', 'database', 'performance', 'backup'],
        requiredFor: ['indexer-services', 'archive-node'],
        estimatedDuration: '60-120 seconds'
      }
    };

    res.json({
      success: true,
      scripts,
      totalScripts: Object.keys(scripts).length
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to get test script information',
      message: error.message
    });
  }
});

/**
 * GET /api/infrastructure/categories
 * Get test categories and their descriptions
 */
router.get('/categories', (req, res) => {
  try {
    const categories = {
      configuration: {
        name: 'Configuration Tests',
        description: 'Validate service configuration files, syntax, and initialization',
        examples: ['nginx.conf syntax', 'database initialization', 'extension installation']
      },
      security: {
        name: 'Security Tests',
        description: 'Verify security headers, SSL/TLS configuration, and access controls',
        examples: ['security headers', 'SSL certificates', 'rate limiting']
      },
      performance: {
        name: 'Performance Tests',
        description: 'Check compression, caching, resource usage, and query performance',
        examples: ['gzip compression', 'database performance', 'resource monitoring']
      },
      database: {
        name: 'Database Tests',
        description: 'Validate database features like hypertables, compression, and aggregates',
        examples: ['hypertable configuration', 'compression policies', 'continuous aggregates']
      },
      routing: {
        name: 'Routing Tests',
        description: 'Test request routing, upstream connectivity, and load balancing',
        examples: ['API routing', 'upstream health', 'WebSocket support']
      },
      backup: {
        name: 'Backup Tests',
        description: 'Verify backup and restore capabilities',
        examples: ['pg_dump availability', 'backup creation', 'restore procedures']
      }
    };

    res.json({
      success: true,
      categories,
      totalCategories: Object.keys(categories).length
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to get test categories',
      message: error.message
    });
  }
});

/**
 * GET /api/infrastructure/remediation/:testName
 * Get remediation steps for a specific failed test
 */
router.get('/remediation/:testName', (req, res) => {
  try {
    const { testName } = req.params;
    const { type = 'nginx' } = req.query;

    if (!testName) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'testName parameter is required'
      });
    }

    if (!['nginx', 'timescaledb'].includes(type)) {
      return res.status(400).json({
        error: 'Invalid type',
        message: 'type must be either "nginx" or "timescaledb"'
      });
    }

    const remediation = infrastructureValidator.getRemediation(testName, type);
    const category = infrastructureValidator.categorizeTest(testName, type);

    res.json({
      success: true,
      testName,
      type,
      category,
      remediation,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to get remediation steps',
      message: error.message
    });
  }
});

module.exports = router;