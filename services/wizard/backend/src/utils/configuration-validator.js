/**
 * Configuration Validator
 * 
 * Validates configuration values against field definitions and rules.
 * Includes port range validation, port conflict detection, network change validation,
 * and data directory path validation.
 */

const { PROFILE_CONFIG_FIELDS } = require('../config/configuration-fields');
const FieldVisibilityResolver = require('./field-visibility-resolver');
const path = require('path');

class ConfigurationValidator {
  constructor() {
    this.fieldResolver = new FieldVisibilityResolver();
  }

  /**
   * Validate complete configuration
   * @param {Object} config - Configuration object to validate
   * @param {string[]} selectedProfiles - Array of selected profile IDs
   * @returns {Object} Validation result with errors and warnings
   */
  validateConfiguration(config, selectedProfiles) {
    const errors = [];
    const warnings = [];

    if (!config || typeof config !== 'object') {
      return {
        valid: false,
        errors: [{ field: 'config', message: 'Configuration object is required' }],
        warnings: []
      };
    }

    if (!Array.isArray(selectedProfiles) || selectedProfiles.length === 0) {
      return {
        valid: false,
        errors: [{ field: 'profiles', message: 'At least one profile must be selected' }],
        warnings: []
      };
    }

    // Apply defaults for missing required fields
    const configWithDefaults = this._applyDefaults(config, selectedProfiles);

    // Get all visible fields for selected profiles
    const visibleFields = this.fieldResolver._collectVisibleFields(selectedProfiles);

    // Validate each field
    for (const field of visibleFields) {
      const value = configWithDefaults[field.key];
      const fieldErrors = this.validateField(field, value, configWithDefaults);
      errors.push(...fieldErrors);
    }

    // Validate port conflicts across all services
    const portConflicts = this.validatePortConflicts(configWithDefaults, selectedProfiles);
    errors.push(...portConflicts);

    // Validate network changes
    const networkWarnings = this.validateNetworkChange(configWithDefaults);
    warnings.push(...networkWarnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate a single field value
   * @param {Object} field - Field definition
   * @param {*} value - Value to validate
   * @param {Object} config - Full configuration (for context)
   * @returns {Object[]} Array of validation errors
   */
  validateField(field, value, config = {}) {
    const errors = [];

    // Check required fields
    if (field.required && (value === undefined || value === null || value === '')) {
      errors.push({
        field: field.key,
        message: `${field.label} is required`,
        type: 'required'
      });
      return errors; // Don't validate further if required field is missing
    }

    // Skip validation if field is optional and empty
    if (!field.required && (value === undefined || value === null || value === '')) {
      return errors;
    }

    // Run validation rules
    if (field.validation && Array.isArray(field.validation)) {
      for (const rule of field.validation) {
        const ruleError = this.validateRule(field, value, rule);
        if (ruleError) {
          errors.push(ruleError);
        }
      }
    }

    return errors;
  }

  /**
   * Validate a value against a specific rule
   * @param {Object} field - Field definition
   * @param {*} value - Value to validate
   * @param {Object} rule - Validation rule
   * @returns {Object|null} Error object or null if valid
   */
  validateRule(field, value, rule) {
    switch (rule.type) {
      case 'range':
        return this.validateRange(field, value, rule);
      
      case 'pattern':
        return this.validatePattern(field, value, rule);
      
      case 'enum':
        return this.validateEnum(field, value, rule);
      
      case 'minLength':
        return this.validateMinLength(field, value, rule);
      
      case 'path':
        return this.validatePath(field, value, rule);
      
      default:
        return null;
    }
  }

  /**
   * Validate port range (1024-65535)
   * @param {Object} field - Field definition
   * @param {*} value - Value to validate
   * @param {Object} rule - Validation rule
   * @returns {Object|null} Error object or null if valid
   */
  validateRange(field, value, rule) {
    const numValue = Number(value);
    
    if (isNaN(numValue)) {
      return {
        field: field.key,
        message: rule.message || `${field.label} must be a number`,
        type: 'range'
      };
    }

    if (rule.min !== undefined && numValue < rule.min) {
      return {
        field: field.key,
        message: rule.message || `${field.label} must be at least ${rule.min}`,
        type: 'range'
      };
    }

    if (rule.max !== undefined && numValue > rule.max) {
      return {
        field: field.key,
        message: rule.message || `${field.label} must be at most ${rule.max}`,
        type: 'range'
      };
    }

    return null;
  }

  /**
   * Validate pattern (regex)
   * @param {Object} field - Field definition
   * @param {*} value - Value to validate
   * @param {Object} rule - Validation rule
   * @returns {Object|null} Error object or null if valid
   */
  validatePattern(field, value, rule) {
    const strValue = String(value);
    
    if (!rule.pattern || !(rule.pattern instanceof RegExp)) {
      return null;
    }

    if (!rule.pattern.test(strValue)) {
      return {
        field: field.key,
        message: rule.message || `${field.label} format is invalid`,
        type: 'pattern'
      };
    }

    return null;
  }

  /**
   * Validate enum (allowed values)
   * @param {Object} field - Field definition
   * @param {*} value - Value to validate
   * @param {Object} rule - Validation rule
   * @returns {Object|null} Error object or null if valid
   */
  validateEnum(field, value, rule) {
    if (!rule.values || !Array.isArray(rule.values)) {
      return null;
    }

    if (!rule.values.includes(value)) {
      return {
        field: field.key,
        message: rule.message || `${field.label} must be one of: ${rule.values.join(', ')}`,
        type: 'enum'
      };
    }

    return null;
  }

  /**
   * Validate minimum length
   * @param {Object} field - Field definition
   * @param {*} value - Value to validate
   * @param {Object} rule - Validation rule
   * @returns {Object|null} Error object or null if valid
   */
  validateMinLength(field, value, rule) {
    const strValue = String(value);
    
    if (rule.min !== undefined && strValue.length < rule.min) {
      return {
        field: field.key,
        message: rule.message || `${field.label} must be at least ${rule.min} characters`,
        type: 'minLength'
      };
    }

    return null;
  }

  /**
   * Validate path format
   * @param {Object} field - Field definition
   * @param {*} value - Value to validate
   * @param {Object} rule - Validation rule
   * @returns {Object|null} Error object or null if valid
   */
  validatePath(field, value, rule) {
    const strValue = String(value);
    
    // Basic path validation - must start with / for absolute paths
    // or be a valid relative path
    if (!strValue || strValue.trim() === '') {
      return null; // Empty is handled by required check
    }

    // Check for invalid characters
    const invalidChars = /[<>"|?*]/;
    if (invalidChars.test(strValue)) {
      return {
        field: field.key,
        message: rule.message || `${field.label} contains invalid characters`,
        type: 'path'
      };
    }

    return null;
  }

  /**
   * Validate port conflicts across all services
   * @param {Object} config - Configuration object
   * @param {string[]} selectedProfiles - Array of selected profile IDs
   * @returns {Object[]} Array of port conflict errors
   */
  validatePortConflicts(config, selectedProfiles) {
    const errors = [];
    const portMap = new Map(); // port -> field key

    // Collect all port fields
    const portFields = [
      'KASPA_NODE_RPC_PORT',
      'KASPA_NODE_P2P_PORT',
      'TIMESCALEDB_PORT',
      'DASHBOARD_PORT',
      'KASIA_APP_PORT',
      'KSOCIAL_APP_PORT',
      'EXPLORER_PORT',
      'STRATUM_PORT'
    ];

    for (const fieldKey of portFields) {
      const value = config[fieldKey];
      
      if (value !== undefined && value !== null && value !== '') {
        const port = Number(value);
        
        if (!isNaN(port)) {
          if (portMap.has(port)) {
            errors.push({
              field: fieldKey,
              message: `Port ${port} is already used by ${portMap.get(port)}`,
              type: 'port_conflict',
              conflictsWith: portMap.get(port)
            });
          } else {
            portMap.set(port, fieldKey);
          }
        }
      }
    }

    return errors;
  }

  /**
   * Validate network change and generate warnings
   * @param {Object} config - Configuration object
   * @param {Object} [previousConfig] - Previous configuration for comparison
   * @returns {Object[]} Array of warnings
   */
  validateNetworkChange(config, previousConfig = null) {
    const warnings = [];

    // If no previous config, no network change to warn about
    if (!previousConfig) {
      return warnings;
    }

    const currentNetwork = config.KASPA_NETWORK;
    const previousNetwork = previousConfig.KASPA_NETWORK;

    // Check if network changed
    if (currentNetwork && previousNetwork && currentNetwork !== previousNetwork) {
      warnings.push({
        field: 'KASPA_NETWORK',
        message: `Changing network from ${previousNetwork} to ${currentNetwork} requires a fresh installation. Mainnet and testnet data are incompatible. Existing blockchain data will not work with the new network.`,
        type: 'network_change',
        severity: 'high',
        action: 'confirm',
        previousValue: previousNetwork,
        newValue: currentNetwork
      });
    }

    return warnings;
  }

  /**
   * Validate data directory paths
   * @param {Object} config - Configuration object
   * @returns {Object[]} Array of validation errors
   */
  validateDataDirectories(config) {
    const errors = [];
    const dataDirFields = [
      'KASPA_DATA_DIR',
      'KASPA_ARCHIVE_DATA_DIR',
      'TIMESCALEDB_DATA_DIR'
    ];

    for (const fieldKey of dataDirFields) {
      const value = config[fieldKey];
      
      if (value !== undefined && value !== null && value !== '') {
        const field = this.fieldResolver.getFieldByKey(fieldKey);
        if (field) {
          const pathErrors = this.validateField(field, value, config);
          errors.push(...pathErrors);
        }
      }
    }

    return errors;
  }

  /**
   * Get validation summary for configuration
   * @param {Object} config - Configuration object
   * @param {string[]} selectedProfiles - Array of selected profile IDs
   * @returns {Object} Validation summary
   */
  getValidationSummary(config, selectedProfiles) {
    const result = this.validateConfiguration(config, selectedProfiles);
    
    return {
      valid: result.valid,
      totalErrors: result.errors.length,
      totalWarnings: result.warnings.length,
      errorsByType: this._groupByType(result.errors),
      warningsByType: this._groupByType(result.warnings),
      criticalErrors: result.errors.filter(e => 
        e.type === 'required' || e.type === 'port_conflict'
      ).length
    };
  }

  /**
   * Apply default values for missing fields
   * @private
   * @param {Object} config - Configuration object
   * @param {string[]} selectedProfiles - Array of selected profile IDs
   * @returns {Object} Configuration with defaults applied
   */
  _applyDefaults(config, selectedProfiles) {
    const configWithDefaults = { ...config };
    const visibleFields = this.fieldResolver._collectVisibleFields(selectedProfiles);

    for (const field of visibleFields) {
      if (configWithDefaults[field.key] === undefined || configWithDefaults[field.key] === null) {
        if (field.defaultValue !== undefined) {
          configWithDefaults[field.key] = field.defaultValue;
        }
      }
    }

    return configWithDefaults;
  }

  /**
   * Group errors/warnings by type
   * @private
   * @param {Object[]} items - Array of errors or warnings
   * @returns {Object} Grouped items
   */
  _groupByType(items) {
    const grouped = {};
    
    for (const item of items) {
      const type = item.type || 'other';
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(item);
    }
    
    return grouped;
  }

  /**
   * Check if a specific field is valid
   * @param {string} fieldKey - Field key to check
   * @param {*} value - Value to validate
   * @param {Object} config - Full configuration
   * @returns {boolean} True if field is valid
   */
  isFieldValid(fieldKey, value, config = {}) {
    const field = this.fieldResolver.getFieldByKey(fieldKey);
    if (!field) {
      return true; // Unknown fields are considered valid
    }

    const errors = this.validateField(field, value, config);
    return errors.length === 0;
  }

  /**
   * Get validation errors for a specific field
   * @param {string} fieldKey - Field key to check
   * @param {*} value - Value to validate
   * @param {Object} config - Full configuration
   * @returns {Object[]} Array of validation errors
   */
  getFieldErrors(fieldKey, value, config = {}) {
    const field = this.fieldResolver.getFieldByKey(fieldKey);
    if (!field) {
      return [];
    }

    return this.validateField(field, value, config);
  }
}

module.exports = ConfigurationValidator;
