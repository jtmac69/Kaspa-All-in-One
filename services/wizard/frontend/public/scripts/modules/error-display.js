/**
 * Frontend Error Display Module
 * Provides consistent error display patterns matching Dashboard (Requirements 9.7, 9.8)
 */

class WizardErrorDisplay {
  constructor() {
    this.errorContainer = null;
    this.initializeErrorContainer();
  }

  /**
   * Initialize error container in the DOM
   */
  initializeErrorContainer() {
    // Create error container if it doesn't exist
    this.errorContainer = document.getElementById('error-container');
    if (!this.errorContainer) {
      this.errorContainer = document.createElement('div');
      this.errorContainer.id = 'error-container';
      this.errorContainer.className = 'error-container';
      document.body.appendChild(this.errorContainer);
    }
  }

  /**
   * Display user-friendly error with documentation links
   * @param {Object} error - Error object from API
   * @param {string} context - Additional context for the error
   */
  showError(error, context = '') {
    const errorElement = this.createErrorElement(error, context);
    this.errorContainer.appendChild(errorElement);
    
    // Auto-hide after 10 seconds for non-critical errors
    if (!this.isCriticalError(error)) {
      setTimeout(() => {
        this.hideError(errorElement);
      }, 10000);
    }
    
    // Log detailed error to console for debugging
    console.error('[WIZARD ERROR]', error);
  }

  /**
   * Create error element with documentation links and troubleshooting steps
   * @param {Object} error - Error object
   * @param {string} context - Additional context
   * @returns {HTMLElement} Error element
   */
  createErrorElement(error, context) {
    const errorDiv = document.createElement('div');
    errorDiv.className = `error-message ${this.getErrorClass(error)}`;
    
    // Error icon and message
    const messageDiv = document.createElement('div');
    messageDiv.className = 'error-message-content';
    messageDiv.innerHTML = `
      <div class="error-icon">${this.getErrorIcon(error)}</div>
      <div class="error-text">
        <h4>${error.error || 'Error'}</h4>
        <p>${error.message}</p>
        ${context ? `<p class="error-context">${context}</p>` : ''}
      </div>
    `;
    
    errorDiv.appendChild(messageDiv);
    
    // Add troubleshooting steps if available
    if (error.troubleshootingSteps && error.troubleshootingSteps.length > 0) {
      const troubleshootingDiv = this.createTroubleshootingSection(error.troubleshootingSteps);
      errorDiv.appendChild(troubleshootingDiv);
    }
    
    // Add documentation link if available
    if (error.documentationLink) {
      const docLinkDiv = this.createDocumentationLink(error.documentationLink);
      errorDiv.appendChild(docLinkDiv);
    }
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.className = 'error-close-btn';
    closeButton.innerHTML = '×';
    closeButton.onclick = () => this.hideError(errorDiv);
    errorDiv.appendChild(closeButton);
    
    return errorDiv;
  }

  /**
   * Create troubleshooting steps section
   * @param {Array} steps - Array of troubleshooting steps
   * @returns {HTMLElement} Troubleshooting section
   */
  createTroubleshootingSection(steps) {
    const troubleshootingDiv = document.createElement('div');
    troubleshootingDiv.className = 'error-troubleshooting';
    
    const title = document.createElement('h5');
    title.textContent = 'Troubleshooting Steps:';
    troubleshootingDiv.appendChild(title);
    
    const stepsList = document.createElement('ol');
    steps.forEach(step => {
      const listItem = document.createElement('li');
      listItem.textContent = step;
      stepsList.appendChild(listItem);
    });
    
    troubleshootingDiv.appendChild(stepsList);
    return troubleshootingDiv;
  }

  /**
   * Create documentation link section
   * @param {string} link - Documentation URL
   * @returns {HTMLElement} Documentation link section
   */
  createDocumentationLink(link) {
    const docDiv = document.createElement('div');
    docDiv.className = 'error-documentation';
    
    const docLink = document.createElement('a');
    docLink.href = link;
    docLink.target = '_blank';
    docLink.rel = 'noopener noreferrer';
    docLink.className = 'error-doc-link';
    docLink.innerHTML = `
      <span class="doc-icon">📖</span>
      <span>View Documentation</span>
      <span class="external-icon">↗</span>
    `;
    
    docDiv.appendChild(docLink);
    return docDiv;
  }

  /**
   * Get error class based on error type
   * @param {Object} error - Error object
   * @returns {string} CSS class name
   */
  getErrorClass(error) {
    const errorType = error.error || 'unknown';
    
    switch (errorType) {
      case 'DOCKER_UNAVAILABLE':
        return 'error-critical';
      case 'KASPA_NODE_UNAVAILABLE':
        return 'error-warning';
      case 'SERVICE_NOT_FOUND':
        return 'error-warning';
      case 'VALIDATION_ERROR':
        return 'error-info';
      case 'STATE_FILE_CORRUPT':
        return 'error-critical';
      case 'INSTALLATION_FAILED':
        return 'error-critical';
      default:
        return 'error-info';
    }
  }

  /**
   * Get error icon based on error type
   * @param {Object} error - Error object
   * @returns {string} Icon HTML
   */
  getErrorIcon(error) {
    const errorType = error.error || 'unknown';
    
    switch (errorType) {
      case 'DOCKER_UNAVAILABLE':
        return '🐳';
      case 'KASPA_NODE_UNAVAILABLE':
        return '⚠️';
      case 'SERVICE_NOT_FOUND':
        return '🔍';
      case 'VALIDATION_ERROR':
        return 'ℹ️';
      case 'STATE_FILE_CORRUPT':
        return '💾';
      case 'INSTALLATION_FAILED':
        return '❌';
      default:
        return '⚠️';
    }
  }

  /**
   * Check if error is critical (should not auto-hide)
   * @param {Object} error - Error object
   * @returns {boolean} True if critical
   */
  isCriticalError(error) {
    const criticalTypes = ['DOCKER_UNAVAILABLE', 'STATE_FILE_CORRUPT', 'INSTALLATION_FAILED'];
    return criticalTypes.includes(error.error);
  }

  /**
   * Hide error element
   * @param {HTMLElement} errorElement - Error element to hide
   */
  hideError(errorElement) {
    if (errorElement && errorElement.parentNode) {
      errorElement.style.opacity = '0';
      setTimeout(() => {
        if (errorElement.parentNode) {
          errorElement.parentNode.removeChild(errorElement);
        }
      }, 300);
    }
  }

  /**
   * Clear all errors
   */
  clearAllErrors() {
    if (this.errorContainer) {
      this.errorContainer.innerHTML = '';
    }
  }

  /**
   * Show service unavailable placeholder
   * @param {string} serviceName - Name of unavailable service
   * @param {string} containerId - Container ID for the placeholder
   */
  showServiceUnavailable(serviceName, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `
      <div class="service-placeholder">
        <div class="service-placeholder-icon">⚠️</div>
        <div class="service-placeholder-title">${serviceName}</div>
        <div class="service-placeholder-message">Service Unavailable</div>
        <div class="service-placeholder-hint">Check if the container is running</div>
        <a href="https://github.com/kaspanet/kaspa-all-in-one/blob/main/docs/guides/troubleshooting.md#service-issues" 
           target="_blank" 
           rel="noopener noreferrer" 
           class="service-placeholder-link">
          Troubleshooting Guide ↗
        </a>
      </div>
    `;
  }

  /**
   * Handle WebSocket errors with user-friendly messages
   * @param {Object} errorData - Error data from WebSocket
   */
  handleWebSocketError(errorData) {
    // Add documentation links to WebSocket errors
    const enhancedError = {
      ...errorData,
      documentationLink: errorData.documentationLink || 'https://github.com/kaspanet/kaspa-all-in-one/blob/main/docs/guides/troubleshooting.md',
      troubleshootingSteps: errorData.troubleshootingSteps || [
        'Check your internet connection',
        'Verify the wizard service is running',
        'Try refreshing the page',
        'Contact support if the issue persists'
      ]
    };
    
    this.showError(enhancedError, 'WebSocket Communication Error');
  }
}

// Export for use in other modules
window.WizardErrorDisplay = WizardErrorDisplay;

// Create global instance
window.wizardErrorDisplay = new WizardErrorDisplay();