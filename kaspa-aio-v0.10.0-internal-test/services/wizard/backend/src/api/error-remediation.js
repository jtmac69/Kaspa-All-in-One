const express = require('express');
const ErrorRemediationManager = require('../utils/error-remediation-manager');
const ResourceChecker = require('../utils/resource-checker');

const router = express.Router();
const remediationManager = new ErrorRemediationManager();
const resourceChecker = new ResourceChecker();

/**
 * POST /api/error-remediation/analyze - Analyze an error
 * Body: { error: string | object }
 */
router.post('/analyze', async (req, res) => {
  try {
    const { error } = req.body;
    
    if (!error) {
      return res.status(400).json({
        success: false,
        error: 'Error message required',
        message: 'Please provide an error message to analyze'
      });
    }

    const analysis = await remediationManager.analyzeError(error);
    
    res.json({
      success: true,
      analysis
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Analysis failed',
      message: error.message
    });
  }
});

/**
 * POST /api/error-remediation/fix - Get fix suggestions for an error
 * Body: { error: string | object, context?: object }
 */
router.post('/fix', async (req, res) => {
  try {
    const { error, context } = req.body;
    
    if (!error) {
      return res.status(400).json({
        success: false,
        error: 'Error message required'
      });
    }

    // Analyze error
    const analysis = await remediationManager.analyzeError(error);
    
    // Get system resources if needed
    let systemResources = context?.systemResources;
    if (!systemResources && analysis.category === 'resource_limit') {
      systemResources = await resourceChecker.detectResources();
    }

    // Get fix suggestions based on category
    let fixResult;
    switch (analysis.category) {
      case 'port_conflict':
        fixResult = await remediationManager.fixPortConflict(analysis.details, context);
        break;
      
      case 'permission_error':
        fixResult = await remediationManager.fixPermissionError(analysis.details, context);
        break;
      
      case 'resource_limit':
        fixResult = await remediationManager.fixResourceLimit(analysis.details, systemResources);
        break;
      
      case 'docker_not_running':
        fixResult = await remediationManager.fixDockerNotRunning();
        break;
      
      default:
        fixResult = {
          success: false,
          message: `No automatic fix available for error category: ${analysis.category}`,
          suggestions: []
        };
    }

    res.json({
      success: true,
      analysis,
      fix: fixResult
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Fix generation failed',
      message: error.message
    });
  }
});

/**
 * POST /api/error-remediation/apply - Apply an auto-fix
 * Body: { analysis: object, suggestion: object, context?: object }
 */
router.post('/apply', async (req, res) => {
  try {
    const { analysis, suggestion, context } = req.body;
    
    if (!analysis || !suggestion) {
      return res.status(400).json({
        success: false,
        error: 'Analysis and suggestion required'
      });
    }

    const result = await remediationManager.applyAutoFix(analysis, suggestion, context);
    
    res.json({
      success: result.success,
      result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to apply fix',
      message: error.message
    });
  }
});

/**
 * POST /api/error-remediation/retry - Retry an operation with exponential backoff
 * Body: { operation: string, options?: object }
 */
router.post('/retry', async (req, res) => {
  try {
    const { operation, options } = req.body;
    
    if (!operation) {
      return res.status(400).json({
        success: false,
        error: 'Operation required'
      });
    }

    // This endpoint is more for documentation
    // Actual retry logic should be implemented in the client
    res.json({
      success: true,
      message: 'Retry configuration',
      config: {
        maxRetries: options?.maxRetries || 3,
        initialDelay: options?.initialDelay || 1000,
        maxDelay: options?.maxDelay || 10000,
        backoffMultiplier: options?.backoffMultiplier || 2
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Retry configuration failed',
      message: error.message
    });
  }
});

/**
 * GET /api/error-remediation/patterns - Get all error patterns
 */
router.get('/patterns', (req, res) => {
  try {
    const patterns = remediationManager.errorPatterns;
    
    // Convert patterns to a more readable format
    const formattedPatterns = {};
    for (const [key, value] of Object.entries(patterns)) {
      formattedPatterns[key] = {
        category: value.category,
        severity: value.severity,
        autoFixable: value.autoFixable,
        examplePatterns: value.patterns.map(p => p.source)
      };
    }
    
    res.json({
      success: true,
      patterns: formattedPatterns
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get patterns',
      message: error.message
    });
  }
});

module.exports = router;
