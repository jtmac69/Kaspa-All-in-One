/**
 * Error handling utilities for wizard
 * Updated to use shared error patterns with Dashboard (Requirements 9.7, 9.8)
 */

// Import shared ErrorDisplay for consistent error patterns
const ErrorDisplay = require('../../../../shared/lib/error-display');

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
 * Parse Docker error messages using shared error patterns
 * Updated to match Dashboard error handling (Requirement 9.7)
 */
function parseDockerError(error) {
  const errorDisplay = new ErrorDisplay();
  
  // Use shared error display for Docker unavailable errors
  if (error.message && error.message.includes('Cannot connect to the Docker daemon')) {
    const result = errorDisplay.showDockerUnavailable();
    return {
      type: 'connection',
      message: result.userMessage,
      suggestion: result.remediationSteps.join('. '),
      documentationLink: 'https://docs.docker.com/get-started/',
      remediationSteps: result.remediationSteps
    };
  }
  
  const message = error.message || error.toString();
  
  if (message.includes('permission denied')) {
    return {
      type: 'permission',
      message: 'Permission denied accessing Docker.',
      suggestion: 'Ensure the wizard has access to Docker socket',
      documentationLink: 'https://docs.docker.com/engine/install/linux-postinstall/#manage-docker-as-a-non-root-user'
    };
  }
  
  if (message.includes('port is already allocated')) {
    const portMatch = message.match(/port (\d+)/);
    const port = portMatch ? portMatch[1] : 'unknown';
    return {
      type: 'port_conflict',
      message: `Port ${port} is already in use.`,
      suggestion: `Stop the service using port ${port} or choose a different port`,
      documentationLink: 'https://docs.docker.com/config/containers/container-networking/',
      port
    };
  }
  
  if (message.includes('no space left on device')) {
    return {
      type: 'disk_space',
      message: 'Insufficient disk space.',
      suggestion: 'Free up disk space and try again',
      documentationLink: 'https://docs.docker.com/config/pruning/'
    };
  }
  
  if (message.includes('image') && message.includes('not found')) {
    return {
      type: 'image_not_found',
      message: 'Docker image not found.',
      suggestion: 'Check your internet connection and try again',
      documentationLink: 'https://docs.docker.com/engine/reference/commandline/pull/'
    };
  }
  
  // Generic error with documentation link
  return {
    type: 'unknown',
    message: 'Docker operation failed',
    suggestion: 'Check Docker logs for more details',
    documentationLink: 'https://docs.docker.com/config/troubleshooting/',
    originalError: message
  };
}

/**
 * Format error response using shared error patterns
 * Updated to match Dashboard error handling (Requirement 9.7)
 */
function formatErrorResponse(error, isDevelopment = false) {
  const errorDisplay = new ErrorDisplay();
  
  // Use shared error display for consistent formatting
  let errorResult;
  
  if (error instanceof DockerError) {
    errorResult = errorDisplay.showDockerUnavailable();
  } else if (error instanceof ConfigurationError) {
    errorResult = errorDisplay.showStateFileError('corrupt', error);
  } else {
    errorResult = errorDisplay.showApiError('wizard_operation', error);
  }
  
  const response = {
    success: false,
    error: error.name || 'Error',
    message: errorResult.userMessage,
    timestamp: new Date().toISOString(),
    statusCode: error.statusCode || 500
  };
  
  // Add details if available
  if (error.details) {
    response.details = error.details;
  }
  
  // Add documentation links for common issues (Requirement 9.8)
  if (error instanceof DockerError) {
    response.documentationLink = 'https://docs.docker.com/get-started/';
    response.troubleshootingGuide = 'https://docs.docker.com/config/troubleshooting/';
  } else if (error instanceof ValidationError) {
    response.documentationLink = 'https://github.com/kaspanet/kaspa-all-in-one/blob/main/docs/guides/troubleshooting.md';
  } else if (error instanceof ConfigurationError) {
    response.documentationLink = 'https://github.com/kaspanet/kaspa-all-in-one/blob/main/docs/guides/wizard-configuration-guide.md';
  }
  
  // Add stack trace in development
  if (isDevelopment && error.stack) {
    response.stack = error.stack;
  }
  
  return response;
}

/**
 * Log error with context using shared error patterns
 * Updated to match Dashboard error handling (Requirement 9.7)
 */
function logError(error, context = {}) {
  const errorDisplay = new ErrorDisplay();
  
  // Use shared error display for consistent logging
  const timestamp = new Date().toISOString();
  const errorInfo = {
    timestamp,
    name: error.name,
    message: error.message,
    statusCode: error.statusCode,
    ...context
  };
  
  // Log using shared error display patterns
  console.error('[WIZARD ERROR]', JSON.stringify(errorInfo, null, 2));
  
  if (error.stack) {
    console.error('[WIZARD STACK]', error.stack);
  }
  
  // Log additional troubleshooting information for common errors
  if (error instanceof DockerError) {
    console.info('[WIZARD HELP] Docker troubleshooting: https://docs.docker.com/config/troubleshooting/');
  } else if (error instanceof ConfigurationError) {
    console.info('[WIZARD HELP] Configuration guide: https://github.com/kaspanet/kaspa-all-in-one/blob/main/docs/guides/wizard-configuration-guide.md');
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

/**
 * Create user-friendly error response with documentation links
 * Implements Requirements 9.7 and 9.8
 */
function createUserFriendlyError(errorType, originalError, context = {}) {
  const errorDisplay = new ErrorDisplay();
  
  let errorResult;
  let documentationLink;
  let troubleshootingSteps = [];
  
  switch (errorType) {
    case 'DOCKER_UNAVAILABLE':
      errorResult = errorDisplay.showDockerUnavailable();
      documentationLink = 'https://docs.docker.com/get-started/';
      troubleshootingSteps = errorResult.remediationSteps;
      break;
      
    case 'KASPA_NODE_UNAVAILABLE':
      errorResult = errorDisplay.show({ type: 'KASPA_NODE_UNAVAILABLE', details: originalError });
      documentationLink = 'https://github.com/kaspanet/kaspa-all-in-one/blob/main/docs/guides/troubleshooting.md#kaspa-node-issues';
      troubleshootingSteps = [
        'Check if the Kaspa node container is running',
        'Verify port configuration (16110 or 16111)',
        'Check container logs for errors',
        'Ensure sufficient system resources'
      ];
      break;
      
    case 'SERVICE_NOT_FOUND':
      errorResult = errorDisplay.showServiceUnavailable(context.serviceName || 'Unknown Service');
      documentationLink = 'https://github.com/kaspanet/kaspa-all-in-one/blob/main/docs/guides/troubleshooting.md#service-issues';
      troubleshootingSteps = [
        'Verify the service was installed correctly',
        'Check if Docker containers are running',
        'Review installation logs for errors',
        'Try restarting the service'
      ];
      break;
      
    case 'STATE_FILE_CORRUPT':
      errorResult = errorDisplay.showStateFileError('corrupt', originalError);
      documentationLink = 'https://github.com/kaspanet/kaspa-all-in-one/blob/main/docs/guides/wizard-error-recovery-guide.md';
      troubleshootingSteps = [
        'Backup the corrupted state file',
        'Run the wizard in reconfiguration mode',
        'Restore from a backup if available',
        'Contact support if the issue persists'
      ];
      break;
      
    case 'INSTALLATION_FAILED':
      errorResult = errorDisplay.showApiError('installation', originalError);
      documentationLink = 'https://github.com/kaspanet/kaspa-all-in-one/blob/main/docs/guides/troubleshooting.md#installation-issues';
      troubleshootingSteps = [
        'Check system requirements',
        'Verify Docker is running and accessible',
        'Ensure sufficient disk space and memory',
        'Review installation logs for specific errors'
      ];
      break;
      
    default:
      errorResult = errorDisplay.showApiError('wizard_operation', originalError);
      documentationLink = 'https://github.com/kaspanet/kaspa-all-in-one/blob/main/docs/guides/troubleshooting.md';
      troubleshootingSteps = [
        'Check the console logs for detailed error information',
        'Verify system requirements are met',
        'Try restarting the wizard',
        'Contact support if the issue persists'
      ];
  }
  
  return {
    success: false,
    error: errorType,
    message: errorResult.userMessage,
    timestamp: new Date().toISOString(),
    documentationLink,
    troubleshootingSteps,
    originalError: originalError?.message || originalError,
    context
  };
}

/**
 * Handle API errors with consistent patterns
 * Implements Requirements 9.7 and 9.8
 */
function handleApiError(res, error, context = {}) {
  // Log detailed error for debugging (Requirement 9.4)
  logError(error, context);
  
  let errorType = 'API_ERROR';
  let statusCode = 500;
  
  // Determine error type based on error instance or message
  if (error instanceof DockerError || (error.message && error.message.includes('Docker'))) {
    errorType = 'DOCKER_UNAVAILABLE';
    statusCode = 503;
  } else if (error instanceof ValidationError) {
    errorType = 'VALIDATION_ERROR';
    statusCode = 400;
  } else if (error instanceof ConfigurationError) {
    errorType = 'STATE_FILE_CORRUPT';
    statusCode = 400;
  } else if (error.message && error.message.includes('Kaspa node')) {
    errorType = 'KASPA_NODE_UNAVAILABLE';
    statusCode = 503;
  } else if (error.message && error.message.includes('not found')) {
    errorType = 'SERVICE_NOT_FOUND';
    statusCode = 404;
  }
  
  const userFriendlyError = createUserFriendlyError(errorType, error, context);
  userFriendlyError.statusCode = statusCode;
  
  res.status(statusCode).json(userFriendlyError);
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
  withTimeout,
  createUserFriendlyError,
  handleApiError
};
