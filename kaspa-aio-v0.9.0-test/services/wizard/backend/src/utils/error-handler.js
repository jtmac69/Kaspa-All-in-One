/**
 * Error handling utilities for wizard
 */

class WizardError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = 'WizardError';
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends WizardError {
  constructor(message, errors = []) {
    super(message, 400, { errors });
    this.name = 'ValidationError';
  }
}

class DockerError extends WizardError {
  constructor(message, details = null) {
    super(message, 500, details);
    this.name = 'DockerError';
  }
}

class ConfigurationError extends WizardError {
  constructor(message, details = null) {
    super(message, 400, details);
    this.name = 'ConfigurationError';
  }
}

class AuthenticationError extends WizardError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends WizardError {
  constructor(message = 'Access denied') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

/**
 * Async error wrapper for route handlers
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Parse Docker error messages
 */
function parseDockerError(error) {
  const message = error.message || error.toString();
  
  // Common Docker errors
  if (message.includes('Cannot connect to the Docker daemon')) {
    return {
      type: 'connection',
      message: 'Cannot connect to Docker. Ensure Docker is running.',
      suggestion: 'Start Docker Desktop or Docker service'
    };
  }
  
  if (message.includes('permission denied')) {
    return {
      type: 'permission',
      message: 'Permission denied accessing Docker.',
      suggestion: 'Ensure the wizard has access to Docker socket'
    };
  }
  
  if (message.includes('port is already allocated')) {
    const portMatch = message.match(/port (\d+)/);
    const port = portMatch ? portMatch[1] : 'unknown';
    return {
      type: 'port_conflict',
      message: `Port ${port} is already in use.`,
      suggestion: `Stop the service using port ${port} or choose a different port`,
      port
    };
  }
  
  if (message.includes('no space left on device')) {
    return {
      type: 'disk_space',
      message: 'Insufficient disk space.',
      suggestion: 'Free up disk space and try again'
    };
  }
  
  if (message.includes('image') && message.includes('not found')) {
    return {
      type: 'image_not_found',
      message: 'Docker image not found.',
      suggestion: 'Check your internet connection and try again'
    };
  }
  
  // Generic error
  return {
    type: 'unknown',
    message: 'Docker operation failed',
    suggestion: 'Check Docker logs for more details',
    originalError: message
  };
}

/**
 * Format error response
 */
function formatErrorResponse(error, isDevelopment = false) {
  const response = {
    success: false,
    error: error.name || 'Error',
    message: error.message,
    timestamp: new Date().toISOString()
  };
  
  // Add details if available
  if (error.details) {
    response.details = error.details;
  }
  
  // Add stack trace in development
  if (isDevelopment && error.stack) {
    response.stack = error.stack;
  }
  
  // Add status code
  response.statusCode = error.statusCode || 500;
  
  return response;
}

/**
 * Log error with context
 */
function logError(error, context = {}) {
  const timestamp = new Date().toISOString();
  const errorInfo = {
    timestamp,
    name: error.name,
    message: error.message,
    statusCode: error.statusCode,
    ...context
  };
  
  console.error('[ERROR]', JSON.stringify(errorInfo, null, 2));
  
  if (error.stack) {
    console.error('[STACK]', error.stack);
  }
}

/**
 * Retry operation with exponential backoff
 */
async function retryOperation(operation, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    onRetry = null
  } = options;
  
  let lastError;
  let delay = initialDelay;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        break;
      }
      
      if (onRetry) {
        onRetry(attempt, maxRetries, error);
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Increase delay for next retry
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }
  
  throw lastError;
}

/**
 * Validate operation timeout
 */
function withTimeout(promise, timeoutMs, errorMessage = 'Operation timed out') {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new WizardError(errorMessage, 408));
      }, timeoutMs);
    })
  ]);
}

module.exports = {
  WizardError,
  ValidationError,
  DockerError,
  ConfigurationError,
  AuthenticationError,
  AuthorizationError,
  asyncHandler,
  parseDockerError,
  formatErrorResponse,
  logError,
  retryOperation,
  withTimeout
};
