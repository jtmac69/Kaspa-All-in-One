const crypto = require('crypto');
const path = require('path');
const { getProjectRoot } = require('../../../../shared/lib/path-resolver');

/**
 * Security middleware for wizard API
 */

/**
 * Patterns that indicate sensitive wallet data
 * SECURITY: These should NEVER appear in API requests
 */
const SENSITIVE_DATA_PATTERNS = [
  // Mnemonic phrase (12 or 24 words)
  /\b[a-z]{3,8}(\s+[a-z]{3,8}){11,23}\b/i,
  
  // Private key (64 hex chars)
  /\b[a-fA-F0-9]{64}\b/,
  
  // Extended private key (128 hex chars)
  /\b[a-fA-F0-9]{128}\b/,
  
  // Seed phrase keywords
  /\b(seed|mnemonic|phrase|secret|private.?key)\s*[:=]/i,
  
  // BIP39 word list markers (common start/end words)
  /\b(abandon|ability|able|about|above)\b.*\b(zoo|zone|zero)\b/i,
];

/**
 * Field names that should never contain sensitive data
 */
const SENSITIVE_FIELD_NAMES = [
  'mnemonic',
  'seed',
  'seedPhrase',
  'seed_phrase',
  'privateKey',
  'private_key',
  'secretKey',
  'secret_key',
  'walletPassword',
  'wallet_password',
  'WALLET_SEED_PHRASE',
  'WALLET_PRIVATE_KEY',
  'WALLET_PASSWORD',
];

/**
 * Middleware to detect and reject requests containing sensitive wallet data
 * SECURITY CRITICAL: Defense-in-depth against accidental data leaks
 */
function rejectSensitiveData(req, res, next) {
  const checkForSensitiveData = (obj, path = '') => {
    if (!obj || typeof obj !== 'object') return null;
    
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      // Check field name
      if (SENSITIVE_FIELD_NAMES.some(name => key.toLowerCase().includes(name.toLowerCase()))) {
        return {
          type: 'field_name',
          path: currentPath,
          message: `Sensitive field name detected: ${key}`
        };
      }
      
      // Check string values for patterns
      if (typeof value === 'string') {
        for (const pattern of SENSITIVE_DATA_PATTERNS) {
          if (pattern.test(value)) {
            return {
              type: 'pattern_match',
              path: currentPath,
              message: `Sensitive data pattern detected in: ${key}`
            };
          }
        }
      }
      
      // Recurse into nested objects
      if (typeof value === 'object' && value !== null) {
        const nestedResult = checkForSensitiveData(value, currentPath);
        if (nestedResult) return nestedResult;
      }
    }
    
    return null;
  };
  
  // Check request body
  if (req.body) {
    const bodyCheck = checkForSensitiveData(req.body);
    if (bodyCheck) {
      console.error(`[SECURITY] Sensitive data in request body: ${bodyCheck.message}`);
      return res.status(400).json({
        error: 'SENSITIVE_DATA_REJECTED',
        message: 'Request contains sensitive wallet data that should not be sent to the server. ' +
                 'Wallet operations should be performed client-side only.',
        details: {
          type: bodyCheck.type,
          path: bodyCheck.path
        }
      });
    }
  }
  
  // Check query parameters
  if (req.query) {
    const queryCheck = checkForSensitiveData(req.query);
    if (queryCheck) {
      console.error(`[SECURITY] Sensitive data in query params: ${queryCheck.message}`);
      return res.status(400).json({
        error: 'SENSITIVE_DATA_REJECTED',
        message: 'Request contains sensitive wallet data in URL parameters.',
        details: {
          type: queryCheck.type,
          path: queryCheck.path
        }
      });
    }
  }
  
  next();
}

/**
 * Token-based authentication middleware
 * Validates security token from environment or request header
 */
function authenticateToken(req, res, next) {
  // Skip authentication in development mode
  if (process.env.NODE_ENV === 'development') {
    return next();
  }

  const securityToken = process.env.WIZARD_SECURITY_TOKEN;
  
  // If no token is configured, skip authentication (first run)
  if (!securityToken) {
    return next();
  }

  // Check for token in header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'Missing security token'
    });
  }

  // Constant-time comparison to prevent timing attacks
  const tokenBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(securityToken);

  if (tokenBuffer.length !== expectedBuffer.length) {
    return res.status(403).json({
      success: false,
      error: 'Invalid token',
      message: 'Authentication failed'
    });
  }

  if (!crypto.timingSafeEqual(tokenBuffer, expectedBuffer)) {
    return res.status(403).json({
      success: false,
      error: 'Invalid token',
      message: 'Authentication failed'
    });
  }

  next();
}

/**
 * Input validation middleware
 * Sanitizes and validates request data
 */
function validateInput(req, res, next) {
  // Validate content type for POST/PUT requests
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid content type',
        message: 'Content-Type must be application/json'
      });
    }
  }

  // Validate request body size (already handled by express.json limit)
  // Additional validation can be added here

  next();
}

/**
 * Sanitize string input to prevent injection attacks
 */
function sanitizeString(str) {
  if (typeof str !== 'string') {
    return str;
  }

  // Remove null bytes
  str = str.replace(/\0/g, '');

  // Remove control characters except newline and tab
  str = str.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

  return str.trim();
}

/**
 * Validate environment variable name
 */
function isValidEnvVarName(name) {
  // Environment variable names should only contain uppercase letters, numbers, and underscores
  return /^[A-Z_][A-Z0-9_]*$/.test(name);
}

/**
 * Validate port number
 */
function isValidPort(port) {
  const portNum = parseInt(port, 10);
  return !isNaN(portNum) && portNum >= 1 && portNum <= 65535;
}

/**
 * Validate profile name
 */
function isValidProfile(profile) {
  const validProfiles = ['core', 'prod', 'explorer', 'archive', 'mining', 'development', 'wizard'];
  return validProfiles.includes(profile);
}

/**
 * Sanitize configuration object
 */
function sanitizeConfig(config) {
  const sanitized = {};

  for (const [key, value] of Object.entries(config)) {
    // Validate key
    if (!isValidEnvVarName(key)) {
      continue; // Skip invalid keys
    }

    // Sanitize value
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value;
    }
    // Skip other types
  }

  return sanitized;
}

/**
 * Error handler middleware with security considerations
 * Updated to use shared error patterns (Requirements 9.7, 9.8)
 */
function secureErrorHandler(err, req, res, next) {
  // Import error handler utilities
  const { handleApiError } = require('../utils/error-handler');
  
  // Use shared error handling patterns
  const context = {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  };
  
  // Handle the error using shared patterns
  handleApiError(res, err, context);
}

/**
 * Request timeout middleware
 */
function requestTimeout(timeoutMs = 30000) {
  return (req, res, next) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          error: 'Request timeout',
          message: 'The request took too long to process'
        });
      }
    }, timeoutMs);

    // Clear timeout when response is sent
    res.on('finish', () => {
      clearTimeout(timeout);
    });

    next();
  };
}

/**
 * Validate Docker socket access with user-friendly error messages
 * Updated to use shared error patterns (Requirements 9.7, 9.8)
 */
async function validateDockerAccess(req, res, next) {
  try {
    const Docker = require('dockerode');
    const docker = new Docker();
    
    // Try to ping Docker
    await docker.ping();
    next();
  } catch (error) {
    // Use shared error handling
    const { createUserFriendlyError } = require('../utils/error-handler');
    const userFriendlyError = createUserFriendlyError('DOCKER_UNAVAILABLE', error);
    
    res.status(503).json(userFriendlyError);
  }
}

/**
 * Prevent path traversal attacks
 */
function preventPathTraversal(filePath) {
  const projectRoot = getProjectRoot(__dirname);
  
  // Resolve the path
  const resolvedPath = path.resolve(projectRoot, filePath);
  
  // Ensure the resolved path is within project root
  if (!resolvedPath.startsWith(projectRoot)) {
    throw new Error('Path traversal detected');
  }
  
  return resolvedPath;
}

module.exports = {
  authenticateToken,
  validateInput,
  sanitizeString,
  sanitizeConfig,
  isValidEnvVarName,
  isValidPort,
  isValidProfile,
  secureErrorHandler,
  requestTimeout,
  validateDockerAccess,
  preventPathTraversal,
  rejectSensitiveData
};
