/**
 * CrossLaunchNavigator - Manages navigation between Wizard and Dashboard
 * 
 * This module handles URL generation and context parsing for seamless navigation
 * between the Installation Wizard and Management Dashboard.
 */

class CrossLaunchNavigator {
  constructor(options = {}) {
    this.wizardPort = options.wizardPort || 3000;
    this.dashboardPort = options.dashboardPort || 8080;
    this.wizardHost = options.wizardHost || 'localhost';
    this.dashboardHost = options.dashboardHost || 'localhost';
  }

  /**
   * Generate URL to launch Wizard with context
   * @param {LaunchContext} context - Context to pass
   * @returns {string} URL with encoded context
   */
  getWizardUrl(context = {}) {
    const baseUrl = `http://${this.wizardHost}:${this.wizardPort}`;
    
    if (!context || Object.keys(context).length === 0) {
      return baseUrl;
    }

    // Encode context as URL parameters
    const params = new URLSearchParams();
    
    if (context.action) {
      params.set('action', context.action);
    }
    
    if (context.profile) {
      params.set('profile', context.profile);
    }
    
    if (context.service) {
      params.set('service', context.service);
    }
    
    if (context.returnUrl) {
      params.set('returnUrl', encodeURIComponent(context.returnUrl));
    }

    // Encode current state if provided (for context passing)
    if (context.currentState) {
      try {
        const stateJson = JSON.stringify(context.currentState);
        // Only include state if it's not too large for URL
        if (stateJson.length < 2000) {
          params.set('currentState', encodeURIComponent(stateJson));
        } else {
          console.warn('Current state too large for URL parameter, skipping');
        }
      } catch (error) {
        console.warn('Failed to serialize current state for URL:', error);
      }
    }

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Generate URL to Dashboard
   * @returns {string} Dashboard URL
   */
  getDashboardUrl() {
    return `http://${this.dashboardHost}:${this.dashboardPort}`;
  }

  /**
   * Parse context from URL parameters
   * @param {string} [url] - URL to parse (defaults to current window.location)
   * @returns {LaunchContext|null} Parsed context or null
   */
  parseContext(url) {
    try {
      let urlToParse;
      
      if (url) {
        urlToParse = new URL(url);
      } else if (typeof window !== 'undefined' && window.location) {
        urlToParse = new URL(window.location.href);
      } else {
        return null;
      }

      const params = urlToParse.searchParams;
      const context = {};

      // Parse action
      const action = params.get('action');
      if (action && ['add', 'modify', 'remove', 'view'].includes(action)) {
        context.action = action;
      }

      // Parse profile
      const profile = params.get('profile');
      if (profile) {
        context.profile = profile;
      }

      // Parse service
      const service = params.get('service');
      if (service) {
        context.service = service;
      }

      // Parse return URL
      const returnUrl = params.get('returnUrl');
      if (returnUrl) {
        context.returnUrl = decodeURIComponent(returnUrl);
      }

      // Parse current state
      const currentStateParam = params.get('currentState');
      if (currentStateParam) {
        try {
          const stateJson = decodeURIComponent(currentStateParam);
          context.currentState = JSON.parse(stateJson);
        } catch (error) {
          console.warn('Failed to parse current state from URL:', error);
        }
      }

      // Return null if no context found
      return Object.keys(context).length > 0 ? context : null;
    } catch (error) {
      console.warn('Failed to parse launch context:', error);
      return null;
    }
  }

  /**
   * Generate URL with context for specific actions
   * @param {string} action - Action type ('add', 'modify', 'remove', 'view')
   * @param {object} options - Additional options
   * @returns {string} URL with context
   */
  getWizardUrlForAction(action, options = {}) {
    const context = {
      action,
      ...options
    };
    return this.getWizardUrl(context);
  }

  /**
   * Generate URL to add a specific profile
   * @param {string} profileName - Name of profile to add
   * @returns {string} URL with add context
   */
  getAddProfileUrl(profileName) {
    return this.getWizardUrlForAction('add', { 
      profile: profileName,
      returnUrl: this.getDashboardUrl()
    });
  }

  /**
   * Generate URL to modify a specific profile
   * @param {string} profileName - Name of profile to modify
   * @returns {string} URL with modify context
   */
  getModifyProfileUrl(profileName) {
    return this.getWizardUrlForAction('modify', { 
      profile: profileName,
      returnUrl: this.getDashboardUrl()
    });
  }

  /**
   * Generate URL to remove a specific profile
   * @param {string} profileName - Name of profile to remove
   * @returns {string} URL with remove context
   */
  getRemoveProfileUrl(profileName) {
    return this.getWizardUrlForAction('remove', { 
      profile: profileName,
      returnUrl: this.getDashboardUrl()
    });
  }

  /**
   * Generate URL for general reconfiguration
   * @returns {string} URL for reconfiguration
   */
  getReconfigureUrl() {
    return this.getWizardUrlForAction('modify', {
      returnUrl: this.getDashboardUrl()
    });
  }

  /**
   * Check if current URL has launch context
   * @param {string} [url] - URL to check (defaults to current window.location)
   * @returns {boolean} True if context exists
   */
  hasContext(url) {
    return this.parseContext(url) !== null;
  }

  /**
   * Clear context from URL (for cleanup after processing)
   * @returns {string} Clean URL without context parameters
   */
  getCleanUrl() {
    if (typeof window === 'undefined' || !window.location) {
      return '';
    }

    const url = new URL(window.location.href);
    const contextParams = ['action', 'profile', 'service', 'returnUrl', 'currentState'];
    
    contextParams.forEach(param => {
      url.searchParams.delete(param);
    });

    return url.toString();
  }
}

module.exports = CrossLaunchNavigator;