/**
 * Configuration Validator
 * 
 * Validates configuration values against field definitions and rules.
 * Includes port range validation, port conflict detection, network change validation,
 * data directory path validation, mixed indexer configuration validation,
 * wallet creation/import validation, and mining wallet validation.
 */

const { PROFILE_CONFIG_FIELDS } = require('../config/configuration-fields');
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
   * @param {Object} [previousConfig] - Previous configuration for network change detection
   * @returns {Object} Validation result with errors and warnings
   */
  validateConfiguration(config, selectedProfiles, previousConfig = null) {
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

    // Validate port availability (system-level check)
    const portAvailabilityErrors = this.validatePortAvailability(configWithDefaults, selectedProfiles);
    errors.push(...portAvailabilityErrors);

    // Validate mixed indexer configuration
    const indexerErrors = this.validateMixedIndexerConfiguration(configWithDefaults, selectedProfiles);
    errors.push(...indexerErrors);

    // Validate wallet configuration
    const walletErrors = this.validateWalletConfiguration(configWithDefaults, selectedProfiles);
    errors.push(...walletErrors);

    // Validate mining wallet configuration
    const miningWalletErrors = this.validateMiningWalletConfiguration(configWithDefaults, selectedProfiles);
    errors.push(...miningWalletErrors);

    // Validate network changes (only if previous config is provided)
    if (previousConfig) {
      const networkWarnings = this.validateNetworkChange(configWithDefaults, previousConfig);
      warnings.push(...networkWarnings);
    }

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
      
      case 'walletPassword':
        return this.validateWalletPasswordRule(field, value, rule);
      
      case 'kaspaAddress':
        return this.validateKaspaAddressRule(field, value, rule);
      
      case 'url':
        return this.validateUrl(field, value, rule);
      
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
   * Validate wallet password rule
   * @param {Object} field - Field definition
   * @param {*} value - Value to validate
   * @param {Object} rule - Validation rule
   * @returns {Object|null} Error object or null if valid
   */
  validateWalletPasswordRule(field, value, rule) {
    const errors = this.validateWalletPasswordStrength(value);
    return errors.length > 0 ? errors[0] : null;
  }

  /**
   * Validate Kaspa address rule
   * @param {Object} field - Field definition
   * @param {*} value - Value to validate
   * @param {Object} rule - Validation rule
   * @returns {Object|null} Error object or null if valid
   */
  validateKaspaAddressRule(field, value, rule) {
    const errors = this.validateKaspaAddress(value);
    return errors.length > 0 ? errors[0] : null;
  }

  /**
   * Validate URL format
   * @param {Object} field - Field definition
   * @param {*} value - Value to validate
   * @param {Object} rule - Validation rule
   * @returns {Object|null} Error object or null if valid
   */
  validateUrl(field, value, rule) {
    const strValue = String(value);
    
    if (!strValue || strValue.trim() === '') {
      return null; // Empty is handled by required check
    }

    try {
      const url = new URL(strValue);
      
      // Check protocol if specified in rule
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

    const currentNetwork = config.KASPA_NETWORK || 'mainnet';
    const previousNetwork = previousConfig.KASPA_NETWORK || 'mainnet';

    // Check if network changed
    if (currentNetwork !== previousNetwork) {
      // Check for existing data that would be incompatible
      const hasExistingData = this._checkForExistingNetworkData(previousNetwork);
      
      const warning = {
        field: 'KASPA_NETWORK',
        message: `Changing network from ${previousNetwork} to ${currentNetwork} requires a fresh installation. Mainnet and testnet data are incompatible. ${hasExistingData ? 'Existing blockchain data will not work with the new network and must be removed.' : 'Any existing blockchain data will not work with the new network.'}`,
        type: 'network_change',
        severity: 'high',
        action: 'confirm',
        previousValue: previousNetwork,
        newValue: currentNetwork,
        requiresFreshInstall: true,
        dataIncompatible: true
      };

      // If existing data is detected, make this an error instead of warning
      if (hasExistingData) {
        warning.severity = 'critical';
        warning.message = `Cannot change network from ${previousNetwork} to ${currentNetwork} with existing data. Mainnet and testnet blockchain data are incompatible. Please backup and remove existing data before changing networks, or perform a fresh installation.`;
        warning.preventChange = true;
      }

      warnings.push(warning);
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
   * Validate port availability (system-level check)
   * @param {Object} config - Configuration object
   * @param {string[]} selectedProfiles - Array of selected profile IDs
   * @returns {Object[]} Array of port availability errors
   */
  validatePortAvailability(config, selectedProfiles) {
    const errors = [];
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

    // Note: In a real implementation, this would check actual port availability
    // For now, we'll validate against common reserved ports
    const reservedPorts = [
      22, 23, 25, 53, 80, 110, 143, 443, 993, 995, // Common system ports
      3306, 5432, 6379, 27017 // Common database/service ports
    ];

    for (const fieldKey of portFields) {
      const value = config[fieldKey];
      
      if (value !== undefined && value !== null && value !== '') {
        const port = Number(value);
        
        if (!isNaN(port) && reservedPorts.includes(port)) {
          errors.push({
            field: fieldKey,
            message: `Port ${port} is commonly reserved by system services. Consider using a different port.`,
            type: 'port_reserved',
            severity: 'warning'
          });
        }
      }
    }

    return errors;
  }

  /**
   * Validate mixed indexer configuration (local + public combinations)
   * @param {Object} config - Configuration object
   * @param {string[]} selectedProfiles - Array of selected profile IDs
   * @returns {Object[]} Array of validation errors
   */
  validateMixedIndexerConfiguration(config, selectedProfiles) {
    const errors = [];

    // Check if both Kaspa User Applications and Indexer Services are selected
    const hasUserApps = selectedProfiles.includes('kaspa-user-applications');
    const hasIndexerServices = selectedProfiles.includes('indexer-services');

    if (hasUserApps && hasIndexerServices) {
      // Validate indexer endpoint configurations
      const indexerEndpoints = {
        'KASIA_INDEXER_URL': config.KASIA_INDEXER_URL,
        'K_INDEXER_URL': config.K_INDEXER_URL,
        'SIMPLY_KASPA_INDEXER_URL': config.SIMPLY_KASPA_INDEXER_URL
      };

      let localCount = 0;
      let publicCount = 0;

      for (const [fieldKey, url] of Object.entries(indexerEndpoints)) {
        if (url) {
          if (url.includes('localhost') || url.includes('127.0.0.1') || url.includes('host.docker.internal')) {
            localCount++;
          } else if (url.startsWith('http://') || url.startsWith('https://')) {
            publicCount++;
          } else {
            errors.push({
              field: fieldKey,
              message: `Invalid indexer URL format. Must be a valid HTTP/HTTPS URL.`,
              type: 'indexer_url_format'
            });
          }
        }
      }

      // Validate mixed configuration makes sense
      if (localCount > 0 && publicCount > 0) {
        // Mixed configuration - validate it's intentional
        if (!config.MIXED_INDEXER_CONFIRMED) {
          errors.push({
            field: 'indexer_configuration',
            message: 'Mixed indexer configuration detected (some local, some public). Please confirm this is intentional.',
            type: 'mixed_indexer_confirmation',
            severity: 'warning',
            action: 'confirm'
          });
        }
      }
    }

    // Validate indexer service dependencies
    if (hasIndexerServices) {
      const hasLocalNode = selectedProfiles.includes('core') || selectedProfiles.includes('archive-node');
      
      if (!hasLocalNode && !config.USE_PUBLIC_KASPA_NETWORK) {
        errors.push({
          field: 'indexer_node_connection',
          message: 'Indexer services require either a local Kaspa node or explicit confirmation to use public network.',
          type: 'indexer_node_dependency',
          action: 'confirm'
        });
      }
    }

    return errors;
  }

  /**
   * Validate wallet creation configuration
   * @param {Object} config - Configuration object
   * @param {string[]} selectedProfiles - Array of selected profile IDs
   * @returns {Object[]} Array of validation errors
   */
  validateWalletConfiguration(config, selectedProfiles) {
    const errors = [];

    // Check if wallet creation is requested
    if (config.CREATE_WALLET === true || config.CREATE_WALLET === 'true') {
      // Validate wallet password strength
      const walletPassword = config.WALLET_PASSWORD;
      if (!walletPassword) {
        errors.push({
          field: 'WALLET_PASSWORD',
          message: 'Wallet password is required when creating a wallet.',
          type: 'wallet_password_required'
        });
      } else {
        const passwordErrors = this.validateWalletPasswordStrength(walletPassword);
        errors.push(...passwordErrors);
      }

      // Validate wallet path
      const walletPath = config.WALLET_PATH;
      if (walletPath) {
        const pathErrors = this.validateWalletPath(walletPath);
        errors.push(...pathErrors);
      }
    }

    // Check if wallet import is requested
    if (config.IMPORT_WALLET === true || config.IMPORT_WALLET === 'true') {
      const walletFile = config.WALLET_FILE;
      const walletKey = config.WALLET_PRIVATE_KEY;

      if (!walletFile && !walletKey) {
        errors.push({
          field: 'wallet_import',
          message: 'Either wallet file or private key is required for wallet import.',
          type: 'wallet_import_required'
        });
      }

      if (walletFile) {
        const fileErrors = this.validateWalletFile(walletFile);
        errors.push(...fileErrors);
      }

      if (walletKey) {
        const keyErrors = this.validateWalletPrivateKey(walletKey);
        errors.push(...keyErrors);
      }
    }

    return errors;
  }

  /**
   * Validate wallet password strength
   * @param {string} password - Password to validate
   * @returns {Object[]} Array of validation errors
   */
  validateWalletPasswordStrength(password) {
    const errors = [];

    if (!password || typeof password !== 'string') {
      return [{
        field: 'WALLET_PASSWORD',
        message: 'Wallet password must be a string.',
        type: 'wallet_password_type'
      }];
    }

    // Minimum length
    if (password.length < 12) {
      errors.push({
        field: 'WALLET_PASSWORD',
        message: 'Wallet password must be at least 12 characters long.',
        type: 'wallet_password_length'
      });
    }

    // Character requirements
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    const missingRequirements = [];
    if (!hasUppercase) missingRequirements.push('uppercase letter');
    if (!hasLowercase) missingRequirements.push('lowercase letter');
    if (!hasNumbers) missingRequirements.push('number');
    if (!hasSpecialChars) missingRequirements.push('special character');

    if (missingRequirements.length > 0) {
      errors.push({
        field: 'WALLET_PASSWORD',
        message: `Wallet password must contain at least one: ${missingRequirements.join(', ')}.`,
        type: 'wallet_password_complexity'
      });
    }

    // Common password patterns
    const commonPatterns = [
      /^(.)\1+$/, // All same character
      /^(012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i, // Sequential
      /^(password|123456|qwerty|admin|root|wallet)/i // Common words
    ];

    for (const pattern of commonPatterns) {
      if (pattern.test(password)) {
        errors.push({
          field: 'WALLET_PASSWORD',
          message: 'Wallet password contains common patterns. Please use a more secure password.',
          type: 'wallet_password_common'
        });
        break;
      }
    }

    return errors;
  }

  /**
   * Validate wallet file path
   * @param {string} walletPath - Wallet path to validate
   * @returns {Object[]} Array of validation errors
   */
  validateWalletPath(walletPath) {
    const errors = [];

    if (!walletPath || typeof walletPath !== 'string') {
      return [{
        field: 'WALLET_PATH',
        message: 'Wallet path must be a string.',
        type: 'wallet_path_type'
      }];
    }

    // Basic path validation
    const pathErrors = this.validatePath({ key: 'WALLET_PATH', label: 'Wallet Path' }, walletPath, { type: 'path' });
    if (pathErrors) {
      errors.push(pathErrors);
    }

    // Check if path is absolute (recommended for Docker containers)
    if (!path.isAbsolute(walletPath)) {
      errors.push({
        field: 'WALLET_PATH',
        message: 'Wallet path should be absolute for Docker container compatibility.',
        type: 'wallet_path_absolute',
        severity: 'warning'
      });
    }

    return errors;
  }

  /**
   * Validate wallet file format
   * @param {string} walletFile - Wallet file content or path
   * @returns {Object[]} Array of validation errors
   */
  validateWalletFile(walletFile) {
    const errors = [];

    if (!walletFile || typeof walletFile !== 'string') {
      return [{
        field: 'WALLET_FILE',
        message: 'Wallet file content must be provided.',
        type: 'wallet_file_required'
      }];
    }

    // Check if it's a file path or file content
    if (walletFile.includes('\n') || walletFile.includes('{')) {
      // Likely file content - validate JSON format
      try {
        const parsed = JSON.parse(walletFile);
        
        // Basic wallet file structure validation
        if (!parsed.version) {
          errors.push({
            field: 'WALLET_FILE',
            message: 'Wallet file missing version field.',
            type: 'wallet_file_format'
          });
        }

        if (!parsed.accounts && !parsed.keys) {
          errors.push({
            field: 'WALLET_FILE',
            message: 'Wallet file missing accounts or keys data.',
            type: 'wallet_file_format'
          });
        }
      } catch (e) {
        errors.push({
          field: 'WALLET_FILE',
          message: 'Wallet file is not valid JSON format.',
          type: 'wallet_file_json'
        });
      }
    } else {
      // Likely file path - validate path format
      const pathErrors = this.validatePath({ key: 'WALLET_FILE', label: 'Wallet File' }, walletFile, { type: 'path' });
      if (pathErrors) {
        errors.push(pathErrors);
      }
    }

    return errors;
  }

  /**
   * Validate wallet private key format
   * @param {string} privateKey - Private key to validate
   * @returns {Object[]} Array of validation errors
   */
  validateWalletPrivateKey(privateKey) {
    const errors = [];

    if (!privateKey || typeof privateKey !== 'string') {
      return [{
        field: 'WALLET_PRIVATE_KEY',
        message: 'Private key must be provided.',
        type: 'wallet_key_required'
      }];
    }

    // Remove whitespace
    const cleanKey = privateKey.trim();

    // Validate hex format (64 characters for secp256k1)
    if (!/^[0-9a-fA-F]{64}$/.test(cleanKey)) {
      errors.push({
        field: 'WALLET_PRIVATE_KEY',
        message: 'Private key must be 64 hexadecimal characters.',
        type: 'wallet_key_format'
      });
    }

    // Check for obviously invalid keys (all zeros, all ones, etc.)
    if (/^0+$/.test(cleanKey) || /^f+$/i.test(cleanKey)) {
      errors.push({
        field: 'WALLET_PRIVATE_KEY',
        message: 'Private key appears to be invalid (all zeros or all ones).',
        type: 'wallet_key_invalid'
      });
    }

    return errors;
  }

  /**
   * Validate mining wallet configuration
   * @param {Object} config - Configuration object
   * @param {string[]} selectedProfiles - Array of selected profile IDs
   * @returns {Object[]} Array of validation errors
   */
  validateMiningWalletConfiguration(config, selectedProfiles) {
    const errors = [];

    // Only validate if mining profile is selected
    if (!selectedProfiles.includes('mining')) {
      return errors;
    }

    // Validate mining address format
    const miningAddress = config.MINING_ADDRESS;
    if (!miningAddress) {
      errors.push({
        field: 'MINING_ADDRESS',
        message: 'Mining address is required for mining profile.',
        type: 'mining_address_required'
      });
    } else {
      const addressErrors = this.validateKaspaAddress(miningAddress);
      errors.push(...addressErrors);
    }

    // Validate node connectivity for mining
    const hasLocalNode = selectedProfiles.includes('core') || selectedProfiles.includes('archive-node');
    if (!hasLocalNode) {
      errors.push({
        field: 'mining_node',
        message: 'Mining profile requires a local Kaspa node (Core or Archive Node profile).',
        type: 'mining_node_required'
      });
    } else {
      // Validate node RPC connectivity settings
      const rpcPort = config.KASPA_NODE_RPC_PORT;
      if (!rpcPort) {
        errors.push({
          field: 'KASPA_NODE_RPC_PORT',
          message: 'Kaspa node RPC port is required for mining connectivity.',
          type: 'mining_rpc_required'
        });
      }
    }

    return errors;
  }

  /**
   * Validate Kaspa address format
   * @param {string} address - Kaspa address to validate
   * @returns {Object[]} Array of validation errors
   */
  validateKaspaAddress(address) {
    const errors = [];

    if (!address || typeof address !== 'string') {
      return [{
        field: 'MINING_ADDRESS',
        message: 'Kaspa address must be provided.',
        type: 'kaspa_address_required'
      }];
    }

    const cleanAddress = address.trim();

    // Kaspa addresses start with 'kaspa:' prefix
    if (!cleanAddress.startsWith('kaspa:')) {
      errors.push({
        field: 'MINING_ADDRESS',
        message: 'Kaspa address must start with "kaspa:" prefix.',
        type: 'kaspa_address_prefix'
      });
      return errors;
    }

    // Remove prefix for validation
    const addressPart = cleanAddress.substring(6);

    // Validate address format (basic validation - real validation would use Kaspa libraries)
    if (addressPart.length < 58 || addressPart.length > 65) {
      errors.push({
        field: 'MINING_ADDRESS',
        message: 'Kaspa address has invalid length.',
        type: 'kaspa_address_length'
      });
    }

    // Check for valid characters (base58-like)
    if (!/^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/.test(addressPart)) {
      errors.push({
        field: 'MINING_ADDRESS',
        message: 'Kaspa address contains invalid characters.',
        type: 'kaspa_address_characters'
      });
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
   * Check for existing network-specific data
   * @private
   * @param {string} network - Network to check for (mainnet/testnet)
   * @returns {boolean} True if existing data is found
   */
  _checkForExistingNetworkData(network) {
    const fs = require('fs');
    const path = require('path');
    
    try {
      // Check for common data directories that would contain network-specific data
      const projectRoot = path.resolve(__dirname, '../../../../');
      const possibleDataPaths = [
        path.join(projectRoot, 'data'),
        path.join(projectRoot, '.kaspa-data'),
        path.join(projectRoot, 'kaspa-data'),
        path.join(projectRoot, 'volumes'),
        // Docker volume mount points
        '/data/kaspa',
        '/data/kaspa-archive',
        '/data/timescaledb'
      ];

      // Check for docker-compose.yml to see if services have been running
      const dockerComposePath = path.join(projectRoot, 'docker-compose.yml');
      if (fs.existsSync(dockerComposePath)) {
        // If docker-compose exists, assume there might be data
        return true;
      }

      // Check for .env file with previous configuration
      const envPath = path.join(projectRoot, '.env');
      if (fs.existsSync(envPath)) {
        // If .env exists, services may have been running
        return true;
      }

      // Check for installation-config.json
      const configPath = path.join(projectRoot, 'installation-config.json');
      if (fs.existsSync(configPath)) {
        try {
          const configContent = fs.readFileSync(configPath, 'utf8');
          const config = JSON.parse(configContent);
          
          // If config has profiles that create data, assume data exists
          if (config.profiles && (
            config.profiles.includes('core') || 
            config.profiles.includes('archive-node') ||
            config.profiles.includes('indexer-services')
          )) {
            return true;
          }
        } catch (e) {
          // Ignore JSON parse errors
        }
      }

      // Check for actual data directories
      for (const dataPath of possibleDataPaths) {
        if (fs.existsSync(dataPath)) {
          const stats = fs.statSync(dataPath);
          if (stats.isDirectory()) {
            // Check if directory has contents
            const contents = fs.readdirSync(dataPath);
            if (contents.length > 0) {
              return true;
            }
          }
        }
      }

      return false;
    } catch (error) {
      // If we can't check, assume no data exists to avoid blocking legitimate changes
      return false;
    }
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
