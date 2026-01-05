/**
 * Kaspa All-in-One Shared Module
 * 
 * This module provides shared utilities and resources for the
 * Installation Wizard and Management Dashboard.
 */

// Export implemented modules
const { SharedStateManager } = require('./state-manager.js');
const PortFallbackService = require('./port-fallback.js');
const { ServiceDetector } = require('./service-detector.js');
const CrossLaunchNavigator = require('./cross-launch.js');
const ErrorDisplay = require('./error-display.js');

module.exports = {
  SharedStateManager,
  PortFallbackService,
  ServiceDetector,
  CrossLaunchNavigator,
  ErrorDisplay
};

// Version information
module.exports.VERSION = '1.0.0';
module.exports.MODULE_NAME = '@kaspa-aio/shared';