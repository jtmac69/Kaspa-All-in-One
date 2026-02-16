/**
 * Configuration Validator
 * 
 * Validates configuration values against field definitions and rules.
 * Includes wallet field validation, conditional requirements, and migration support.
 */

const { PROFILE_CONFIG_FIELDS, migrateWalletConfiguration } = require('../config/configuration-fields');
const { validateKaspaAddress, detectNetworkFromAddress } = require('../validators/kaspa-address-validator');
const FieldVisibilityResolver = require('./field-visibility-resolver');
const path = require('path');
const fs = require('fs');

class ConfigurationValidator {
  constructor() {
    this.fieldResolver = new FieldVisibilityResolver();
  }

  /**
   * Validate complete configuration
   * @param {Object} config - Configuration object to validate
   * @param {string[]} selectedProfiles - Array of selected profile IDs
   * @param {Object} [options] - Validation options
   * @returns {Object} Validation result with errors and warnings
   */
  validateConfiguration(config, selectedProfiles, options = {}) {
    const errors = [];
    const warnings = [];

    if (!config || typeof config !== 'object') {
      return {
        valid: false,
        errors: [{ field: 'config', message: 'Configuration object is required' }],
        warnings: [],
        migratedConfig: config
      };
    }

    if (!Array.isArray(selectedProfiles) || selectedProfiles.length === 0) {
      return {
        valid: false,
        errors: [{ field: 'profiles', message: 'At least one profile must be selected' }],
        warnings: [],
        migratedConfig: config
      };
    }

    // Migrate deprecated fields first
    const { config: migratedConfig, warnings: migrationWarnings } = migrateWalletConfiguration(config);
    warnings.push(...migrationWarnings.map(w => ({
      field: w.field,
      message: w.message,
      type: 'deprecation'
    })));

    // Get backend-relevant fields only
    const resolver = new FieldVisibilityResolver();
    const backendFields = resolver.getBackendFields(selectedProfiles);

    // Validate each field
    for (const field of backendFields) {
      const value = migratedConfig[field.key];
      const fieldErrors = this._validateField(field, value, migratedConfig, selectedProfiles);
      errors.push(...fieldErrors);
    }

    // Run wallet-specific cross-field validation
    const walletValidation = this._validateWalletConfiguration(migratedConfig, selectedProfiles);
    errors.push(...walletValidation.errors);
    warnings.push(...walletValidation.warnings);

    // Validate port conflicts
    const portConflicts = this.validatePortConflicts(migratedConfig, selectedProfiles);
    errors.push(...portConflicts);

    // Validate network changes if previous config provided
    if (options.previousConfig) {
      const networkWarnings = this.validateNetworkChange(migratedConfig, options.previousConfig);
      warnings.push(...networkWarnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      migratedConfig
    };
  }

  /**
   * Validate a single field
   * @private
   */
  _validateField(field, value, config, selectedProfiles) {
    const errors = [];

    // Handle conditional required
    if (field.conditionalRequired) {
      const condition = field.conditionalRequired;
      const conditionMet = config[condition.field] === condition.value;

      if (conditionMet && (value === undefined || value === null || value === '')) {
        errors.push({
          field: field.key,
          message: condition.message || `${field.label} is required`,
          type: 'required'
        });
        return errors; // Don't continue validation if required field is missing
      }
    }

    // Skip validation if field is empty and not required
    if (!field.required && (value === undefined || value === null || value === '')) {
      return errors;
    }

    // Standard required check
    if (field.required && (value === undefined || value === null || value === '')) {
      errors.push({
        field: field.key,
        message: `${field.label} is required`,
        type: 'required'
      });
      return errors;
    }

    // Run validation rules
    for (const rule of (field.validation || [])) {
      const ruleError = this._applyValidationRule(field, value, rule, config);
      if (ruleError) {
        errors.push(ruleError);
      }
    }

    return errors;
  }

  /**
   * Apply a single validation rule
   * @private
   */
  _applyValidationRule(field, value, rule, config) {
    switch (rule.type) {
      case 'kaspaAddress':
        const addressValidation = validateKaspaAddress(value, {
          network: config.KASPA_NETWORK || 'mainnet',
          networkAware: rule.networkAware || false
        });

        if (!addressValidation.valid) {
          return {
            field: field.key,
            message: addressValidation.error || rule.message,
            type: 'kaspaAddress',
            network: addressValidation.network
          };
        }
        break;

      case 'range':
        const numValue = Number(value);
        if (isNaN(numValue) || numValue < rule.min || numValue > rule.max) {
          return {
            field: field.key,
            message: rule.message || `Must be between ${rule.min} and ${rule.max}`,
            type: 'range'
          };
        }
        break;

      case 'enum':
        if (!rule.values.includes(value)) {
          return {
            field: field.key,
            message: rule.message || `Must be one of: ${rule.values.join(', ')}`,
            type: 'enum'
          };
        }
        break;

      case 'pattern':
        if (!rule.pattern || !(rule.pattern instanceof RegExp)) {
          return null;
        }
        if (!rule.pattern.test(String(value))) {
          return {
            field: field.key,
            message: rule.message || `${field.label} format is invalid`,
            type: 'pattern'
          };
        }
        break;

      case 'minLength':
        if (String(value).length < rule.min) {
          return {
            field: field.key,
            message: rule.message || `${field.label} must be at least ${rule.min} characters`,
            type: 'minLength'
          };
        }
        break;

      case 'path':
        const pathError = this._validatePath(field, value, rule);
        if (pathError) return pathError;
        break;

      case 'url':
        const urlError = this._validateUrl(field, value, rule);
        if (urlError) return urlError;
        break;
    }

    return null;
  }

  /**
   * Wallet-specific cross-field validation
   * @private
   */
  _validateWalletConfiguration(config, selectedProfiles) {
    const errors = [];
    const warnings = [];

    // If wallet connectivity is enabled
    if (config.WALLET_CONNECTIVITY_ENABLED) {
      // Check for wRPC port conflicts with other ports
      const wrpcBorshPort = config.KASPA_NODE_WRPC_BORSH_PORT || 17110;
      const wrpcJsonPort = config.KASPA_NODE_WRPC_JSON_PORT || 18110;
      const rpcPort = config.KASPA_NODE_RPC_PORT || 16110;
      const p2pPort = config.KASPA_NODE_P2P_PORT || 16111;

      const allPorts = [wrpcBorshPort, wrpcJsonPort, rpcPort, p2pPort];
      const uniquePorts = new Set(allPorts);

      if (uniquePorts.size !== allPorts.length) {
        errors.push({
          field: 'KASPA_NODE_WRPC_BORSH_PORT',
          message: 'Port conflict detected: wRPC Borsh, wRPC JSON, RPC, and P2P ports must all be different',
          type: 'portConflict'
        });
      }

      // Warning if mining address doesn't match selected network
      if (config.MINING_ADDRESS) {
        const detectedNetwork = detectNetworkFromAddress(config.MINING_ADDRESS);
        const configuredNetwork = config.KASPA_NETWORK || 'mainnet';

        if (detectedNetwork && detectedNetwork !== configuredNetwork && 
            !(detectedNetwork === 'testnet' && configuredNetwork.startsWith('testnet'))) {
          warnings.push({
            field: 'MINING_ADDRESS',
            message: `Mining address appears to be for ${detectedNetwork}, but node is configured for ${configuredNetwork}`,
            type: 'networkMismatch'
          });
        }
      }

      // Warning if stratum profile but no mining address
      if (selectedProfiles.includes('kaspa-stratum') && !config.MINING_ADDRESS) {
        warnings.push({
          field: 'MINING_ADDRESS',
          message: 'Mining profile selected but no mining address configured. You will need to set this before mining.',
          type: 'missingRecommended'
        });
      }
    }

    return { errors, warnings };
  }

  /**
   * Validate path format
   * @private
   */
  _validatePath(field, value, rule) {
    const strValue = String(value);
    
    if (!strValue || strValue.trim() === '') {
      return null;
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
   * Validate URL format
   * @private
   */
  _validateUrl(field, value, rule) {
    const strValue = String(value);
    
    if (!strValue || strValue.trim() === '') {
      return null;
    }

    try {
      const url = new URL(strValue);
      
      if (rule.protocols && !rule.protocols.includes(url.protocol.slice(0, -1))) {
        return {
          field: field.key,
          message: rule.message || `${field.label} must use one of these protocols: ${rule.protocols.join(', ')}`,
          type: 'url_protocol'
        };
      }
      
      return null;
    } catch (e) {
      return {
        field: field.key,
        message: rule.message || `${field.label} must be a valid URL`,
        type: 'url_format'
      };
    }
  }

  /**
   * Validate port conflicts across all services
   * @param {Object} config - Configuration object
   * @param {string[]} selectedProfiles - Array of selected profile IDs
   * @returns {Object[]} Array of port conflict errors
   */
  validatePortConflicts(config, selectedProfiles) {
    const errors = [];
    const portMap = new Map();

    const portFields = [
      'KASPA_NODE_RPC_PORT',
      'KASPA_NODE_P2P_PORT',
      'KASPA_NODE_WRPC_BORSH_PORT',
      'KASPA_NODE_WRPC_JSON_PORT',
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

    if (!previousConfig) {
      return warnings;
    }

    const currentNetwork = config.KASPA_NETWORK || 'mainnet';
    const previousNetwork = previousConfig.KASPA_NETWORK || 'mainnet';

    if (currentNetwork !== previousNetwork) {
      const hasExistingData = this._checkForExistingNetworkData(previousNetwork);
      
      const warning = {
        field: 'KASPA_NETWORK',
        message: `Changing network from ${previousNetwork} to ${currentNetwork} requires a fresh installation. Mainnet and testnet data are incompatible.`,
        type: 'network_change',
        severity: hasExistingData ? 'critical' : 'high',
        previousValue: previousNetwork,
        newValue: currentNetwork
      };

      warnings.push(warning);
    }

    return warnings;
  }

  /**
   * Check for existing network-specific data
   * @private
   */
  _checkForExistingNetworkData(network) {
    try {
      const projectRoot = path.resolve(__dirname, '../../../../');
      const dockerComposePath = path.join(projectRoot, 'docker-compose.yml');
      const envPath = path.join(projectRoot, '.env');
      
      return fs.existsSync(dockerComposePath) || fs.existsSync(envPath);
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate a single field value (legacy method for backward compatibility)
   * @param {Object} field - Field definition
   * @param {*} value - Value to validate
   * @param {Object} config - Full configuration (for context)
   * @returns {Object[]} Array of validation errors
   */
  validateField(field, value, config = {}) {
    return this._validateField(field, value, config, []);
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
   * Group errors/warnings by type
   * @private
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
      return true;
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
