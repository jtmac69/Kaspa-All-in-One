/**
 * Build Information API
 * Exposes build configuration to frontend
 */

const express = require('express');
const router = express.Router();
const buildConfig = require('../config/build-config');

/**
 * GET /api/build-info
 * Get build configuration information
 */
router.get('/', (req, res) => {
    res.json({
        mode: buildConfig.mode,
        isTest: buildConfig.isTest,
        isProduction: buildConfig.isProduction,
        features: {
            // Only expose safe feature flags to frontend
            autoEnableContinueButtons: buildConfig.features.autoEnableContinueButtons,
            showDebugInfo: buildConfig.features.showDebugInfo,
            allowSkipSteps: buildConfig.features.allowSkipSteps,
        },
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
