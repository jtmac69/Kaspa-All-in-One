/**
 * ErrorDisplay - Consistent error display across both services
 * 
 * Provides user-friendly error messages and service unavailable placeholders
 * as specified in Requirements 9.1 and 9.6
 */

class ErrorDisplay {
  constructor() {
    this.errorCategories = {
      NO_INSTALLATION: {
        userMessage: "No installation detected. Click here to launch the Installation Wizard.",
        consoleLevel: "info",
        consoleMessage: "No state file found",
        recoveryAction: "show_wizard_link"
      },
      DOCKER_UNAVAILABLE: {
        userMessage: "Docker is not accessible. Please ensure Docker is running.",
        consoleLevel: "error", 
        consoleMessage: "Docker socket connection failed",
        recoveryAction: "retry_30s"
      },
      KASPA_NODE_UNAVAILABLE: {
        userMessage: "Kaspa Node: Not Available. Check if the container is running.",
        consoleLevel: "warn",
        consoleMessage: "All ports failed",
        recoveryAction: "retry_with_fallback"
      },
      SERVICE_NOT_FOUND: {
        userMessage: "Service not found in Docker",
        consoleLevel: "warn",
        consoleMessage: "Container not found",
        recoveryAction: "show_not_found_status"
      },
      STATE_FILE_CORRUPT: {
        userMessage: "Configuration file is corrupted. Please reconfigure.",
        consoleLevel: "error",
        consoleMessage: "JSON parse failed",
        recoveryAction: "offer_reconfiguration"
      },
      API_ERROR: {
        userMessage: "Unable to fetch data. Retrying...",
        consoleLevel: "error",
        consoleMessage: "API request failed",
        recoveryAction: "auto_retry_with_backoff"
      }
    };
  }

  /**
   * Show user-friendly error with optional action
   * @param {ErrorInfo} error - Error information
   * @returns {ErrorDisplayResult} Display result with message and actions
   */
  show(error) {
    const errorType = error.type || 'API_ERROR';
    const category = this.errorCategories[errorType];
    
    if (!category) {
      // Fallback for unknown error types
      this._logToConsole('error', `Unknown error type: ${errorType}`, error.details);
      return {
        userMessage: "An unexpected error occurred. Please try again.",
        recoveryAction: "retry",
        consoleLogged: true
      };
    }

    // Log detailed error to console for debugging (Requirement 9.4)
    this._logToConsole(category.consoleLevel, category.consoleMessage, error.details);

    return {
      userMessage: category.userMessage,
      recoveryAction: category.recoveryAction,
      consoleLogged: true,
      errorType: errorType
    };
  }

  /**
   * Show service unavailable placeholder
   * @param {string} serviceName - Name of unavailable service
   * @returns {ServiceUnavailableResult} Placeholder display result
   */
  showServiceUnavailable(serviceName) {
    const message = `${serviceName}: Service Unavailable`;
    const placeholder = this._createServicePlaceholder(serviceName);
    
    this._logToConsole('warn', `Service unavailable: ${serviceName}`, null);
    
    return {
      userMessage: message,
      placeholder: placeholder,
      serviceName: serviceName,
      consoleLogged: true
    };
  }

  /**
   * Show Docker unavailable message
   * @returns {DockerUnavailableResult} Docker unavailable display result
   */
  showDockerUnavailable() {
    const category = this.errorCategories.DOCKER_UNAVAILABLE;
    
    this._logToConsole(category.consoleLevel, category.consoleMessage, null);
    
    return {
      userMessage: category.userMessage,
      recoveryAction: category.recoveryAction,
      remediationSteps: [
        "Check if Docker is installed and running",
        "Verify Docker daemon is accessible",
        "Try restarting Docker service",
        "Check Docker permissions for current user"
      ],
      consoleLogged: true
    };
  }

  /**
   * Create a standardized error message for API failures
   * @param {string} operation - The operation that failed
   * @param {Error} originalError - The original error object
   * @returns {ErrorDisplayResult} API error display result
   */
  showApiError(operation, originalError) {
    const error = {
      type: 'API_ERROR',
      details: {
        operation: operation,
        error: originalError?.message || 'Unknown error',
        timestamp: new Date().toISOString()
      }
    };
    
    return this.show(error);
  }

  /**
   * Create a standardized error message for state file issues
   * @param {string} issue - The specific issue with the state file
   * @param {Error} originalError - The original error object
   * @returns {ErrorDisplayResult} State file error display result
   */
  showStateFileError(issue, originalError) {
    const errorType = issue === 'not_found' ? 'NO_INSTALLATION' : 'STATE_FILE_CORRUPT';
    
    const error = {
      type: errorType,
      details: {
        issue: issue,
        error: originalError?.message || 'Unknown error',
        timestamp: new Date().toISOString()
      }
    };
    
    return this.show(error);
  }

  /**
   * Create a service unavailable placeholder HTML/content
   * @param {string} serviceName - Name of the service
   * @returns {string} HTML placeholder content
   * @private
   */
  _createServicePlaceholder(serviceName) {
    return `
      <div class="service-placeholder">
        <div class="service-placeholder-icon">⚠️</div>
        <div class="service-placeholder-title">${serviceName}</div>
        <div class="service-placeholder-message">Service Unavailable</div>
        <div class="service-placeholder-hint">Check if the container is running</div>
      </div>
    `;
  }

  /**
   * Log error to console with appropriate level
   * @param {string} level - Console log level (info, warn, error)
   * @param {string} message - Message to log
   * @param {any} details - Additional error details
   * @private
   */
  _logToConsole(level, message, details) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ErrorDisplay: ${message}`;
    
    switch (level) {
      case 'info':
        console.info(logMessage, details || '');
        break;
      case 'warn':
        console.warn(logMessage, details || '');
        break;
      case 'error':
        console.error(logMessage, details || '');
        break;
      default:
        console.log(logMessage, details || '');
    }
  }

  /**
   * Get all available error categories for testing/validation
   * @returns {Object} Available error categories
   */
  getErrorCategories() {
    return { ...this.errorCategories };
  }
}

// Type definitions for JSDoc
/**
 * @typedef {Object} ErrorInfo
 * @property {string} type - Error type (NO_INSTALLATION, DOCKER_UNAVAILABLE, etc.)
 * @property {any} details - Additional error details
 */

/**
 * @typedef {Object} ErrorDisplayResult
 * @property {string} userMessage - User-friendly error message
 * @property {string} recoveryAction - Suggested recovery action
 * @property {boolean} consoleLogged - Whether error was logged to console
 * @property {string} [errorType] - The error type that was processed
 */

/**
 * @typedef {Object} ServiceUnavailableResult
 * @property {string} userMessage - User-friendly service unavailable message
 * @property {string} placeholder - HTML placeholder content
 * @property {string} serviceName - Name of the unavailable service
 * @property {boolean} consoleLogged - Whether error was logged to console
 */

/**
 * @typedef {Object} DockerUnavailableResult
 * @property {string} userMessage - User-friendly Docker unavailable message
 * @property {string} recoveryAction - Suggested recovery action
 * @property {string[]} remediationSteps - Step-by-step remediation guide
 * @property {boolean} consoleLogged - Whether error was logged to console
 */

module.exports = ErrorDisplay;