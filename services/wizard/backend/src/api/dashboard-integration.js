const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const StateManager = require('../utils/state-manager');
const DockerManager = require('../utils/docker-manager');

const stateManager = new StateManager();
const dockerManager = new DockerManager();

// In-memory token store (in production, use Redis or database)
const tokenStore = new Map();
const TOKEN_EXPIRY = 15 * 60 * 1000; // 15 minutes

/**
 * Generate a secure token for wizard access
 */
function generateSecureToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Store token with expiry
 */
function storeToken(token, data) {
  tokenStore.set(token, {
    ...data,
    createdAt: Date.now(),
    expiresAt: Date.now() + TOKEN_EXPIRY
  });
  
  // Clean up expired tokens
  cleanupExpiredTokens();
}

/**
 * Validate and retrieve token data
 */
function validateToken(token) {
  const data = tokenStore.get(token);
  
  if (!data) {
    return { valid: false, error: 'Token not found' };
  }
  
  if (Date.now() > data.expiresAt) {
    tokenStore.delete(token);
    return { valid: false, error: 'Token expired' };
  }
  
  return { valid: true, data };
}

/**
 * Clean up expired tokens
 */
function cleanupExpiredTokens() {
  const now = Date.now();
  for (const [token, data] of tokenStore.entries()) {
    if (now > data.expiresAt) {
      tokenStore.delete(token);
    }
  }
}

/**
 * GET /api/wizard/reconfigure-link
 * Generate a secure link for dashboard to launch wizard in reconfiguration mode
 * 
 * Response:
 * {
 *   success: true,
 *   url: "http://localhost:3000/wizard?mode=reconfigure&token=abc123",
 *   token: "abc123",
 *   expiresIn: 900000,
 *   expiresAt: "2024-01-01T12:00:00.000Z"
 * }
 */
router.get('/reconfigure-link', async (req, res) => {
  try {
    const projectRoot = process.env.PROJECT_ROOT || '/workspace';
    const envPath = path.join(projectRoot, '.env');
    const installationStatePath = path.join(projectRoot, '.kaspa-aio', 'installation-state.json');
    
    // Check if configuration exists
    let hasConfig = false;
    try {
      await fs.access(envPath);
      hasConfig = true;
    } catch (error) {
      // No config exists
    }
    
    if (!hasConfig) {
      return res.status(404).json({
        success: false,
        error: 'No existing configuration found',
        message: 'Cannot reconfigure without an existing installation'
      });
    }
    
    // Load current configuration
    let currentConfig = {};
    let installationState = null;
    
    try {
      const envContent = await fs.readFile(envPath, 'utf8');
      currentConfig = parseEnvFile(envContent);
    } catch (error) {
      console.error('Error reading .env:', error);
    }
    
    try {
      const stateContent = await fs.readFile(installationStatePath, 'utf8');
      installationState = JSON.parse(stateContent);
    } catch (error) {
      console.error('Error reading installation state:', error);
    }
    
    // Generate secure token
    const token = generateSecureToken();
    
    // Store token with configuration data
    storeToken(token, {
      mode: 'reconfigure',
      currentConfig,
      installationState,
      purpose: 'reconfiguration'
    });
    
    // Generate URL
    const wizardHost = process.env.WIZARD_HOST || 'localhost';
    const wizardPort = process.env.WIZARD_PORT || 3000;
    const url = `http://${wizardHost}:${wizardPort}/?mode=reconfigure&token=${token}`;
    
    res.json({
      success: true,
      url,
      token,
      expiresIn: TOKEN_EXPIRY,
      expiresAt: new Date(Date.now() + TOKEN_EXPIRY).toISOString(),
      message: 'Reconfiguration link generated successfully'
    });
  } catch (error) {
    console.error('Error generating reconfigure link:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate reconfigure link',
      message: error.message
    });
  }
});

/**
 * GET /api/wizard/update-link
 * Generate a secure link for dashboard to launch wizard in update mode
 * 
 * Query params:
 * - updates: JSON array of available updates
 * 
 * Response:
 * {
 *   success: true,
 *   url: "http://localhost:3000/wizard?mode=update&token=abc123",
 *   token: "abc123",
 *   updates: [...],
 *   expiresIn: 900000,
 *   expiresAt: "2024-01-01T12:00:00.000Z"
 * }
 */
router.get('/update-link', async (req, res) => {
  try {
    const { updates } = req.query;
    
    if (!updates) {
      return res.status(400).json({
        success: false,
        error: 'Missing updates parameter',
        message: 'Updates array is required'
      });
    }
    
    // Parse updates
    let updatesList;
    try {
      updatesList = JSON.parse(updates);
      
      if (!Array.isArray(updatesList)) {
        throw new Error('Updates must be an array');
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid updates format',
        message: 'Updates must be a valid JSON array'
      });
    }
    
    // Validate update objects
    for (const update of updatesList) {
      if (!update.service || !update.currentVersion || !update.availableVersion) {
        return res.status(400).json({
          success: false,
          error: 'Invalid update object',
          message: 'Each update must have service, currentVersion, and availableVersion'
        });
      }
    }
    
    // Generate secure token
    const token = generateSecureToken();
    
    // Store token with update data
    storeToken(token, {
      mode: 'update',
      updates: updatesList,
      purpose: 'service-updates'
    });
    
    // Generate URL
    const wizardHost = process.env.WIZARD_HOST || 'localhost';
    const wizardPort = process.env.WIZARD_PORT || 3000;
    const url = `http://${wizardHost}:${wizardPort}/?mode=update&token=${token}`;
    
    res.json({
      success: true,
      url,
      token,
      updates: updatesList,
      expiresIn: TOKEN_EXPIRY,
      expiresAt: new Date(Date.now() + TOKEN_EXPIRY).toISOString(),
      message: 'Update link generated successfully'
    });
  } catch (error) {
    console.error('Error generating update link:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate update link',
      message: error.message
    });
  }
});

/**
 * GET /api/wizard/token-data
 * Retrieve data associated with a token
 * Used by wizard frontend to load configuration/update data
 * 
 * Query params:
 * - token: Security token
 * 
 * Response:
 * {
 *   success: true,
 *   mode: "reconfigure" | "update",
 *   data: { ... }
 * }
 */
router.get('/token-data', async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Missing token parameter'
      });
    }
    
    // Validate token
    const validation = validateToken(token);
    
    if (!validation.valid) {
      return res.status(401).json({
        success: false,
        error: validation.error,
        message: 'Invalid or expired token'
      });
    }
    
    // Return token data
    const { mode, purpose, ...data } = validation.data;
    
    res.json({
      success: true,
      mode,
      purpose,
      data,
      expiresAt: new Date(validation.data.expiresAt).toISOString()
    });
  } catch (error) {
    console.error('Error retrieving token data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve token data',
      message: error.message
    });
  }
});

/**
 * POST /api/wizard/sync-status
 * Synchronize service status between wizard and dashboard
 * Dashboard can call this to get current wizard state
 * Wizard can call this to notify dashboard of changes
 * 
 * Request body:
 * {
 *   source: "wizard" | "dashboard",
 *   services?: [...],  // Service status updates
 *   wizardState?: {...} // Current wizard state
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   services: [...],
 *   wizardState: {...},
 *   timestamp: "2024-01-01T12:00:00.000Z"
 * }
 */
router.post('/sync-status', async (req, res) => {
  try {
    const { source, services, wizardState } = req.body;
    
    if (!source || !['wizard', 'dashboard'].includes(source)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or missing source',
        message: 'Source must be "wizard" or "dashboard"'
      });
    }
    
    // Get current wizard state
    const currentStateResult = await stateManager.loadState();
    const currentState = currentStateResult.success ? currentStateResult.state : null;
    
    // Get running services from Docker
    const runningServices = await dockerManager.getRunningServices();
    
    // If wizard is providing updates, save them
    if (source === 'wizard' && wizardState) {
      await stateManager.saveState(wizardState);
    }
    
    // Build response with current status
    const response = {
      success: true,
      services: runningServices.map(service => ({
        name: service.name,
        status: service.status,
        state: service.state,
        containerId: service.containerId,
        uptime: service.uptime
      })),
      wizardState: currentState,
      timestamp: new Date().toISOString()
    };
    
    // If dashboard provided service updates, include them
    if (source === 'dashboard' && services) {
      response.dashboardServices = services;
    }
    
    res.json(response);
  } catch (error) {
    console.error('Error syncing status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync status',
      message: error.message
    });
  }
});

/**
 * POST /api/wizard/launcher
 * Launch wizard from dashboard with specific mode
 * This endpoint can be used to programmatically start the wizard
 * 
 * Request body:
 * {
 *   mode: "install" | "reconfigure" | "update",
 *   updates?: [...],  // For update mode
 *   autoOpen?: boolean // Whether to auto-open browser
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   url: "http://localhost:3000/wizard?mode=...",
 *   token: "abc123",
 *   message: "Wizard launched successfully"
 * }
 */
router.post('/launcher', async (req, res) => {
  try {
    const { mode, updates, autoOpen = false } = req.body;
    
    if (!mode || !['install', 'reconfigure', 'update'].includes(mode)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid mode',
        message: 'Mode must be "install", "reconfigure", or "update"'
      });
    }
    
    // Generate token based on mode
    const token = generateSecureToken();
    let tokenData = { mode, purpose: `wizard-${mode}` };
    
    if (mode === 'reconfigure') {
      // Load current configuration
      const projectRoot = process.env.PROJECT_ROOT || '/workspace';
      const envPath = path.join(projectRoot, '.env');
      const installationStatePath = path.join(projectRoot, '.kaspa-aio', 'installation-state.json');
      
      try {
        const envContent = await fs.readFile(envPath, 'utf8');
        tokenData.currentConfig = parseEnvFile(envContent);
      } catch (error) {
        console.error('Error reading .env:', error);
      }
      
      try {
        const stateContent = await fs.readFile(installationStatePath, 'utf8');
        tokenData.installationState = JSON.parse(stateContent);
      } catch (error) {
        console.error('Error reading installation state:', error);
      }
    } else if (mode === 'update') {
      if (!updates || !Array.isArray(updates)) {
        return res.status(400).json({
          success: false,
          error: 'Updates required for update mode',
          message: 'Updates array is required when mode is "update"'
        });
      }
      tokenData.updates = updates;
    }
    
    // Store token
    storeToken(token, tokenData);
    
    // Generate URL
    const wizardHost = process.env.WIZARD_HOST || 'localhost';
    const wizardPort = process.env.WIZARD_PORT || 3000;
    const url = `http://${wizardHost}:${wizardPort}/?mode=${mode}&token=${token}`;
    
    // If autoOpen is true, attempt to open browser (host-based only)
    if (autoOpen) {
      try {
        const { exec } = require('child_process');
        const platform = process.platform;
        
        let command;
        if (platform === 'darwin') {
          command = `open "${url}"`;
        } else if (platform === 'win32') {
          command = `start "${url}"`;
        } else {
          command = `xdg-open "${url}"`;
        }
        
        exec(command, (error) => {
          if (error) {
            console.error('Error opening browser:', error);
          }
        });
      } catch (error) {
        console.error('Error auto-opening browser:', error);
      }
    }
    
    res.json({
      success: true,
      url,
      token,
      mode,
      expiresIn: TOKEN_EXPIRY,
      expiresAt: new Date(Date.now() + TOKEN_EXPIRY).toISOString(),
      message: `Wizard launched in ${mode} mode`
    });
  } catch (error) {
    console.error('Error launching wizard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to launch wizard',
      message: error.message
    });
  }
});

/**
 * GET /api/wizard/health
 * Health check endpoint for dashboard to verify wizard is running
 * 
 * Response:
 * {
 *   success: true,
 *   status: "healthy",
 *   version: "1.0.0",
 *   uptime: 12345,
 *   timestamp: "2024-01-01T12:00:00.000Z"
 * }
 */
router.get('/health', async (req, res) => {
  try {
    const uptime = process.uptime();
    const version = process.env.WIZARD_VERSION || '1.0.0';
    
    res.json({
      success: true,
      status: 'healthy',
      version,
      uptime: Math.floor(uptime),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message
    });
  }
});

/**
 * DELETE /api/wizard/token/:token
 * Invalidate a token (logout/cleanup)
 * 
 * Response:
 * {
 *   success: true,
 *   message: "Token invalidated"
 * }
 */
router.delete('/token/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Missing token parameter'
      });
    }
    
    // Delete token
    const existed = tokenStore.has(token);
    tokenStore.delete(token);
    
    res.json({
      success: true,
      message: existed ? 'Token invalidated' : 'Token not found (may have already expired)',
      existed
    });
  } catch (error) {
    console.error('Error invalidating token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to invalidate token',
      message: error.message
    });
  }
});

// Helper functions

/**
 * Parse .env file into key-value object
 */
function parseEnvFile(content) {
  const config = {};
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    
    // Parse key=value
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      config[key] = value;
    }
  }
  
  return config;
}

/**
 * POST /api/wizard/ensure-running
 * Ensure wizard is running (for dashboard to call before making requests)
 * This is a no-op endpoint that just confirms wizard is responsive
 * Dashboard can call this and if it fails, run start-wizard-if-needed.sh
 * 
 * Response:
 * {
 *   success: true,
 *   status: "running",
 *   message: "Wizard is running and ready"
 * }
 */
router.post('/ensure-running', async (req, res) => {
  try {
    res.json({
      success: true,
      status: 'running',
      message: 'Wizard is running and ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Wizard health check failed',
      message: error.message
    });
  }
});

// Periodic cleanup of expired tokens (every 5 minutes)
setInterval(() => {
  cleanupExpiredTokens();
}, 5 * 60 * 1000);

module.exports = router;
