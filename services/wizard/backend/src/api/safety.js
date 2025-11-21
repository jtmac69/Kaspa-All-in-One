/**
 * Safety API
 * Endpoints for safety confirmations, warnings, and risk assessment
 */

const express = require('express');
const router = express.Router();
const SafetyManager = require('../utils/safety-manager');

const safetyManager = new SafetyManager();

/**
 * POST /api/safety/assess-profile-risk
 * Assess risk level for a profile selection
 */
router.post('/assess-profile-risk', async (req, res) => {
  try {
    const { profile, systemResources } = req.body;

    if (!profile || !systemResources) {
      return res.status(400).json({
        error: 'Missing required fields: profile, systemResources'
      });
    }

    const riskAssessment = safetyManager.assessProfileRisk(profile, systemResources);

    res.json({
      success: true,
      riskAssessment: riskAssessment
    });
  } catch (error) {
    console.error('Error assessing profile risk:', error);
    res.status(500).json({
      error: 'Failed to assess profile risk',
      details: error.message
    });
  }
});

/**
 * POST /api/safety/generate-confirmation
 * Generate confirmation dialog for an action
 */
router.post('/generate-confirmation', async (req, res) => {
  try {
    const { action, riskAssessment } = req.body;

    if (!action) {
      return res.status(400).json({
        error: 'Missing required field: action'
      });
    }

    const confirmation = safetyManager.generateConfirmation(action, riskAssessment);

    res.json({
      success: true,
      confirmation: confirmation
    });
  } catch (error) {
    console.error('Error generating confirmation:', error);
    res.status(500).json({
      error: 'Failed to generate confirmation',
      details: error.message
    });
  }
});

/**
 * POST /api/safety/check-confirmation-required
 * Check if an action requires confirmation
 */
router.post('/check-confirmation-required', async (req, res) => {
  try {
    const { action, context } = req.body;

    if (!action) {
      return res.status(400).json({
        error: 'Missing required field: action'
      });
    }

    const required = safetyManager.requiresConfirmation(action, context || {});

    res.json({
      success: true,
      required: required
    });
  } catch (error) {
    console.error('Error checking confirmation requirement:', error);
    res.status(500).json({
      error: 'Failed to check confirmation requirement',
      details: error.message
    });
  }
});

/**
 * POST /api/safety/record-confirmation
 * Record that user acknowledged a confirmation
 */
router.post('/record-confirmation', async (req, res) => {
  try {
    const { action, userId, acknowledged } = req.body;

    if (!action || !userId) {
      return res.status(400).json({
        error: 'Missing required fields: action, userId'
      });
    }

    safetyManager.recordConfirmation(action, userId, acknowledged !== false);

    res.json({
      success: true,
      message: 'Confirmation recorded'
    });
  } catch (error) {
    console.error('Error recording confirmation:', error);
    res.status(500).json({
      error: 'Failed to record confirmation',
      details: error.message
    });
  }
});

/**
 * GET /api/safety/safe-mode-recommendation
 * Get safe mode recommendation based on failure count
 */
router.get('/safe-mode-recommendation', async (req, res) => {
  try {
    const { failureCount, systemResources } = req.query;

    const recommendation = safetyManager.generateSafeModeRecommendation(
      parseInt(failureCount) || 0,
      systemResources ? JSON.parse(systemResources) : null
    );

    res.json({
      success: true,
      recommendation: recommendation
    });
  } catch (error) {
    console.error('Error generating safe mode recommendation:', error);
    res.status(500).json({
      error: 'Failed to generate safe mode recommendation',
      details: error.message
    });
  }
});

/**
 * GET /api/safety/backup-info
 * Get information about configuration backup
 */
router.get('/backup-info', async (req, res) => {
  try {
    const { hasBackup } = req.query;

    const backupInfo = safetyManager.generateBackupInfo(hasBackup === 'true');

    res.json({
      success: true,
      backupInfo: backupInfo
    });
  } catch (error) {
    console.error('Error getting backup info:', error);
    res.status(500).json({
      error: 'Failed to get backup info',
      details: error.message
    });
  }
});

module.exports = router;
