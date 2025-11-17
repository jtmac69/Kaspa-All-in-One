const express = require('express');
const SystemChecker = require('../utils/system-checker');

const router = express.Router();
const systemChecker = new SystemChecker();

// GET /api/system-check - Run full system check
router.get('/', async (req, res) => {
  try {
    const requiredPorts = req.query.ports 
      ? req.query.ports.split(',').map(p => parseInt(p, 10))
      : [];
    
    const results = await systemChecker.runFullCheck(requiredPorts);
    res.json(results);
  } catch (error) {
    res.status(500).json({
      error: 'System check failed',
      message: error.message
    });
  }
});

// GET /api/system-check/docker - Check Docker only
router.get('/docker', async (req, res) => {
  try {
    const result = await systemChecker.checkDocker();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Docker check failed',
      message: error.message
    });
  }
});

// GET /api/system-check/docker-compose - Check Docker Compose only
router.get('/docker-compose', async (req, res) => {
  try {
    const result = await systemChecker.checkDockerCompose();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Docker Compose check failed',
      message: error.message
    });
  }
});

// GET /api/system-check/resources - Check system resources only
router.get('/resources', async (req, res) => {
  try {
    const result = await systemChecker.checkSystemResources();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Resource check failed',
      message: error.message
    });
  }
});

// POST /api/system-check/ports - Check specific ports
router.post('/ports', async (req, res) => {
  try {
    const { ports } = req.body;
    
    if (!Array.isArray(ports)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'ports must be an array of port numbers'
      });
    }
    
    const result = await systemChecker.checkPortAvailability(ports);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Port check failed',
      message: error.message
    });
  }
});

module.exports = router;
