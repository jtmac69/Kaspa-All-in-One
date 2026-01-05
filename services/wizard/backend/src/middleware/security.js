const crypto = require('crypto');
const path = require('path');
const { getProjectRoot } = require('../../../../shared/lib/path-resolver');

/**
 * Security middleware for wizard API
 */

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
 */
function secureErrorHandler(err, req, res, next) {
  console.error('Error:', err);

  // Don't leak sensitive information in production
  const isDevelopment = process.env.NODE_ENV !== 'production';

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  // Generic error response
  const response = {
    success: false,
    error: 'An error occurred',
    timestamp: new Date().toISOString()
  };

  // Add details in development mode
  if (isDevelopment) {
    response.message = err.message;
    response.stack = err.stack;
  } else {
    // In production, only show safe error messages
    if (statusCode === 400) {
      response.error = 'Bad request';
    } else if (statusCode === 401) {
      response.error = 'Unauthorized';
    } else if (statusCode === 403) {
      response.error = 'Forbidden';
    } else if (statusCode === 404) {
      response.error = 'Not found';
    } else if (statusCode === 429) {
      response.error = 'Too many requests';
    } else {
      response.error = 'Internal server error';
    }
  }

  res.status(statusCode).json(response);
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
 * Validate Docker socket access
 */
async function validateDockerAccess(req, res, next) {
  try {
    const Docker = require('dockerode');
    const docker = new Docker();
    
    // Try to ping Docker
    await docker.ping();
    next();
  } catch (error) {
    res.status(503).json({
      success: false,
      error: 'Docker unavailable',
      message: 'Cannot connect to Docker daemon. Ensure Docker is running and accessible.'
    });
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
  preventPathTraversal
};
