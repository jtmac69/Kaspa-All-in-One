/**
 * Wizard State API
 * Endpoints for managing wizard state persistence
 */

const express = require('express');
const router = express.Router();
const StateManager = require('../utils/state-manager');

const stateManager = new StateManager();

/**
 * POST /api/wizard/save-state
 * Save wizard state
 */
router.post('/save-state', async (req, res) => {
  try {
    const { state } = req.body;
    
    if (!state) {
      return res.status(400).json({
        success: false,
        error: 'Missing state'
      });
    }
    
    const result = await stateManager.saveState(state);
    res.json(result);
  } catch (error) {
    console.error('Error saving state:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save state',
      message: error.message
    });
  }
});

/**
 * GET /api/wizard/load-state
 * Load wizard state
 */
router.get('/load-state', async (req, res) => {
  try {
    const result = await stateManager.loadState();
    res.json(result);
  } catch (error) {
    console.error('Error loading state:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load state',
      message: error.message
    });
  }
});

/**
 * GET /api/wizard/can-resume
 * Check if wizard can be resumed
 */
router.get('/can-resume', async (req, res) => {
  try {
    const result = await stateManager.canResume();
    res.json(result);
  } catch (error) {
    console.error('Error checking resume:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check resume',
      message: error.message
    });
  }
});

/**
 * POST /api/wizard/update-step
 * Update current wizard step
 */
router.post('/update-step', async (req, res) => {
  try {
    const { stepNumber, stepName } = req.body;
    
    if (stepNumber === undefined || !stepName) {
      return res.status(400).json({
        success: false,
        error: 'Missing stepNumber or stepName'
      });
    }
    
    const result = await stateManager.updateStep(stepNumber, stepName);
    res.json(result);
  } catch (error) {
    console.error('Error updating step:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update step',
      message: error.message
    });
  }
});

/**
 * POST /api/wizard/update-profiles
 * Update selected profiles
 */
router.post('/update-profiles', async (req, res) => {
  try {
    const { profiles, configuration } = req.body;
    
    if (!profiles) {
      return res.status(400).json({
        success: false,
        error: 'Missing profiles'
      });
    }
    
    const result = await stateManager.updateProfiles(profiles, configuration || {});
    res.json(result);
  } catch (error) {
    console.error('Error updating profiles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profiles',
      message: error.message
    });
  }
});

/**
 * POST /api/wizard/update-service
 * Update service status
 */
router.post('/update-service', async (req, res) => {
  try {
    const { serviceName, status, details } = req.body;
    
    if (!serviceName || !status) {
      return res.status(400).json({
        success: false,
        error: 'Missing serviceName or status'
      });
    }
    
    const result = await stateManager.updateServiceStatus(serviceName, status, details || {});
    res.json(result);
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update service',
      message: error.message
    });
  }
});

/**
 * POST /api/wizard/add-sync-operation
 * Add sync operation
 */
router.post('/add-sync-operation', async (req, res) => {
  try {
    const { operation } = req.body;
    
    if (!operation || !operation.service || !operation.type) {
      return res.status(400).json({
        success: false,
        error: 'Missing operation details (service, type required)'
      });
    }
    
    const result = await stateManager.addSyncOperation(operation);
    res.json(result);
  } catch (error) {
    console.error('Error adding sync operation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add sync operation',
      message: error.message
    });
  }
});

/**
 * POST /api/wizard/update-sync-operation
 * Update sync operation
 */
router.post('/update-sync-operation', async (req, res) => {
  try {
    const { syncId, updates } = req.body;
    
    if (!syncId || !updates) {
      return res.status(400).json({
        success: false,
        error: 'Missing syncId or updates'
      });
    }
    
    const result = await stateManager.updateSyncOperation(syncId, updates);
    res.json(result);
  } catch (error) {
    console.error('Error updating sync operation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update sync operation',
      message: error.message
    });
  }
});

/**
 * POST /api/wizard/record-decision
 * Record user decision
 */
router.post('/record-decision', async (req, res) => {
  try {
    const { decision, context } = req.body;
    
    if (!decision) {
      return res.status(400).json({
        success: false,
        error: 'Missing decision'
      });
    }
    
    const result = await stateManager.recordDecision(decision, context || '');
    res.json(result);
  } catch (error) {
    console.error('Error recording decision:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record decision',
      message: error.message
    });
  }
});

/**
 * POST /api/wizard/add-background-task
 * Add background task
 */
router.post('/add-background-task', async (req, res) => {
  try {
    const { taskId, taskInfo } = req.body;
    
    if (!taskId) {
      return res.status(400).json({
        success: false,
        error: 'Missing taskId'
      });
    }
    
    const result = await stateManager.addBackgroundTask(taskId, taskInfo || {});
    res.json(result);
  } catch (error) {
    console.error('Error adding background task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add background task',
      message: error.message
    });
  }
});

/**
 * POST /api/wizard/remove-background-task
 * Remove background task
 */
router.post('/remove-background-task', async (req, res) => {
  try {
    const { taskId } = req.body;
    
    if (!taskId) {
      return res.status(400).json({
        success: false,
        error: 'Missing taskId'
      });
    }
    
    const result = await stateManager.removeBackgroundTask(taskId);
    res.json(result);
  } catch (error) {
    console.error('Error removing background task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove background task',
      message: error.message
    });
  }
});

/**
 * POST /api/wizard/update-phase
 * Update installation phase
 */
router.post('/update-phase', async (req, res) => {
  try {
    const { phase } = req.body;
    
    if (!phase) {
      return res.status(400).json({
        success: false,
        error: 'Missing phase'
      });
    }
    
    const validPhases = ['preparing', 'building', 'starting', 'syncing', 'validating', 'complete'];
    if (!validPhases.includes(phase)) {
      return res.status(400).json({
        success: false,
        error: `Invalid phase. Must be one of: ${validPhases.join(', ')}`
      });
    }
    
    const result = await stateManager.updatePhase(phase);
    res.json(result);
  } catch (error) {
    console.error('Error updating phase:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update phase',
      message: error.message
    });
  }
});

/**
 * POST /api/wizard/mark-complete
 * Mark installation as complete
 */
router.post('/mark-complete', async (req, res) => {
  try {
    const result = await stateManager.markComplete();
    res.json(result);
  } catch (error) {
    console.error('Error marking complete:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark complete',
      message: error.message
    });
  }
});

/**
 * POST /api/wizard/clear-state
 * Clear wizard state (start over)
 */
router.post('/clear-state', async (req, res) => {
  try {
    const result = await stateManager.clearState();
    res.json(result);
  } catch (error) {
    console.error('Error clearing state:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear state',
      message: error.message
    });
  }
});

/**
 * GET /api/wizard/state-history
 * Get state history (snapshots)
 */
router.get('/state-history', async (req, res) => {
  try {
    const result = await stateManager.getStateHistory();
    res.json(result);
  } catch (error) {
    console.error('Error getting state history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get state history',
      message: error.message
    });
  }
});

/**
 * GET /api/wizard/state-summary
 * Get state summary
 */
router.get('/state-summary', async (req, res) => {
  try {
    const result = await stateManager.getStateSummary();
    res.json(result);
  } catch (error) {
    console.error('Error getting state summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get state summary',
      message: error.message
    });
  }
});

module.exports = router;
