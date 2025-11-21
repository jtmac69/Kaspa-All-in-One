const express = require('express');
const InstallationGuideManager = require('../utils/installation-guide-manager');

const router = express.Router();
const guideManager = new InstallationGuideManager();

/**
 * GET /api/installation-guides/system - Detect system and return info
 */
router.get('/system', async (req, res) => {
  try {
    const system = await guideManager.detectSystem();
    res.json({
      success: true,
      system
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to detect system',
      message: error.message
    });
  }
});

/**
 * GET /api/installation-guides/docker - Get Docker installation guide
 */
router.get('/docker', async (req, res) => {
  try {
    const guide = await guideManager.getInstallationGuide('docker');
    res.json({
      success: true,
      guide
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get Docker installation guide',
      message: error.message
    });
  }
});

/**
 * GET /api/installation-guides/docker-compose - Get Docker Compose installation guide
 */
router.get('/docker-compose', async (req, res) => {
  try {
    const guide = await guideManager.getInstallationGuide('docker-compose');
    res.json({
      success: true,
      guide
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get Docker Compose installation guide',
      message: error.message
    });
  }
});

/**
 * GET /api/installation-guides/:component - Get installation guide for any component
 */
router.get('/:component', async (req, res) => {
  try {
    const { component } = req.params;
    const guide = await guideManager.getInstallationGuide(component);
    
    if (!guide) {
      return res.status(404).json({
        success: false,
        error: 'Guide not found',
        message: `No installation guide available for ${component}`
      });
    }
    
    res.json({
      success: true,
      guide
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get installation guide',
      message: error.message
    });
  }
});

module.exports = router;
