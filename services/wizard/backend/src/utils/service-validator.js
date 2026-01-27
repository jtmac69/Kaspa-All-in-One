/**
 * Service Validator
 * 
 * Validates service presence, profile consistency, and provides clear error messages
 * for missing services and configuration issues.
 * 
 * Updated for 8-profile architecture with legacy profile support.
 * 
 * Requirements: 2.1, 2.2, 2.4, 2.5
 */

/**
 * Profile ID migration mapping (old → new)
 */
const PROFILE_ID_MIGRATION = {
  'core': 'kaspa-node',
  'kaspa-user-applications': ['kasia-app', 'k-social-app'],
  'indexer-services': ['kasia-indexer', 'k-indexer-bundle'],
  'archive-node': 'kaspa-archive-node',
  'mining': 'kaspa-stratum'
};

/**
 * Legacy profile IDs for backward compatibility
 */
const LEGACY_PROFILE_IDS = ['core', 'kaspa-user-applications', 'indexer-services', 'archive-node', 'mining'];

/**
 * New valid profile IDs
 */
const NEW_PROFILE_IDS = [
  'kaspa-node',
  'kasia-app',
  'k-social-app',
  'kaspa-explorer-bundle',
  'kasia-indexer',
  'k-indexer-bundle',
  'kaspa-archive-node',
  'kaspa-stratum'
];

class ServiceValidator {
  constructor() {
    // Define expected services for each profile (NEW 8-profile structure)
    // Note: Docker container names may differ from profile IDs
    this.profileServiceMap = {
      // Kaspa Node Profile
      'kaspa-node': ['kaspa-node'],
      
      // Kasia App Profile
      'kasia-app': ['kasia-app'],
      
      // K-Social App Profile (container name is 'k-social')
      'k-social-app': ['k-social'],
      
      // Kaspa Explorer Bundle (includes explorer + indexer + database)
      'kaspa-explorer-bundle': ['kaspa-explorer', 'simply-kaspa-indexer', 'timescaledb-explorer'],
      
      // Kasia Indexer Profile (embedded database - no separate DB service)
      'kasia-indexer': ['kasia-indexer'],
      
      // K-Indexer Bundle (includes indexer + database)
      'k-indexer-bundle': ['k-indexer', 'timescaledb-kindexer'],
      
      // Kaspa Archive Node Profile
      'kaspa-archive-node': ['kaspa-archive-node'],
      
      // Kaspa Stratum Profile
      'kaspa-stratum': ['kaspa-stratum']
    };

    // Legacy profile service mappings (for backward compatibility)
    this.legacyProfileServiceMap = {
      'core': ['kaspa-node'],
      'kaspa-user-applications': ['kasia-app', 'k-social', 'kaspa-explorer'],
      'indexer-services': ['kasia-indexer', 'k-indexer', 'simply-kaspa-indexer', 'timescaledb', 'timescaledb-kindexer', 'timescaledb-explorer'],
      'archive-node': ['kaspa-archive-node'],
      'mining': ['kaspa-stratum']
    };

    // Define service dependencies (which services depend on which)
    this.serviceDependencies = {
      // Apps - can use local or remote indexers
      'kasia-app': [],  // Uses KASIA_INDEXER_MODE to determine source
      'k-social': [],   // Uses KSOCIAL_INDEXER_MODE to determine source
      'kaspa-explorer': ['simply-kaspa-indexer'],  // Must have local indexer
      
      // Indexers - can use local or remote nodes
      'kasia-indexer': [],  // Uses KASIA_NODE_MODE to determine source
      'k-indexer': ['timescaledb-kindexer'],  // Requires local database
      'simply-kaspa-indexer': ['timescaledb-explorer'],  // Requires local database
      
      // Databases - no dependencies
      'timescaledb-kindexer': [],
      'timescaledb-explorer': [],
      
      // Mining - requires local node
      'kaspa-stratum': ['kaspa-node'],  // MUST have local node (hard dependency)
      
      // Nodes - no dependencies
      'kaspa-node': [],
      'kaspa-archive-node': []
    };

    // Profile conflicts (mutually exclusive profiles)
    this.profileConflicts = {
      'kaspa-node': ['kaspa-archive-node'],
      'kaspa-archive-node': ['kaspa-node']
    };

    // Profile dependencies (hard requirements)
    this.profileDependencies = {
      'kaspa-stratum': {
        requires: ['kaspa-node', 'kaspa-archive-node'],
        requiresAny: true,  // Only ONE of these needed
        message: 'Kaspa Stratum requires a local Kaspa node (standard or archive)'
      }
    };

    // Profile prerequisites (soft dependencies - recommended but not required)
    this.profilePrerequisites = {
      'kasia-indexer': {
        recommends: ['kaspa-node', 'kaspa-archive-node'],
        canUseRemote: true,
        message: 'Kasia Indexer works best with local node, can use remote'
      },
      'k-indexer-bundle': {
        recommends: ['kaspa-node', 'kaspa-archive-node'],
        canUseRemote: true,
        message: 'K-Indexer works best with local node, can use remote'
      },
      'kaspa-explorer-bundle': {
        recommends: ['kaspa-node', 'kaspa-archive-node'],
        canUseRemote: true,
        message: 'Kaspa Explorer works best with local node, can use remote'
      }
    };

    // Define valid profiles (new + legacy for backward compat)
    this.validProfiles = [...NEW_PROFILE_IDS];
    this.allValidProfiles = [...NEW_PROFILE_IDS, ...LEGACY_PROFILE_IDS];
  }

  /**
   * Check if a profile ID is a legacy (old) profile ID
   * @param {string} profileId - Profile ID to check
   * @returns {boolean} True if legacy
   */
  isLegacyProfileId(profileId) {
    return LEGACY_PROFILE_IDS.includes(profileId);
  }

  /**
   * Migrate legacy profile ID to new profile ID(s)
   * @param {string} profileId - Profile ID (may be legacy)
   * @returns {string|string[]} New profile ID(s)
   */
  migrateProfileId(profileId) {
    if (NEW_PROFILE_IDS.includes(profileId)) {
      return profileId;
    }
    return PROFILE_ID_MIGRATION[profileId] || profileId;
  }

  /**
   * Migrate array of profile IDs to new profile IDs
   * @param {string[]} profileIds - Array of profile IDs
   * @returns {string[]} Array of new profile IDs (flattened, unique)
   */
  migrateProfileIds(profileIds) {
    const result = [];
    for (const id of profileIds) {
      const migrated = this.migrateProfileId(id);
      if (Array.isArray(migrated)) {
        result.push(...migrated);
      } else {
        result.push(migrated);
      }
    }
    return [...new Set(result)];
  }

  /**
   * Get services for a profile (handles legacy profile IDs)
   * @param {string} profileId - Profile ID
   * @returns {string[]} Array of service names
   */
  getServicesForProfile(profileId) {
    // Check new profiles first
    if (this.profileServiceMap[profileId]) {
      return this.profileServiceMap[profileId];
    }
    
    // Check legacy profiles
    if (this.legacyProfileServiceMap[profileId]) {
      return this.legacyProfileServiceMap[profileId];
    }
    
    // Try migrating and getting services
    const migrated = this.migrateProfileId(profileId);
    if (Array.isArray(migrated)) {
      return migrated.flatMap(id => this.profileServiceMap[id] || []);
    }
    
    return this.profileServiceMap[migrated] || [];
  }

  /**
   * Get all services for an array of profiles
   * @param {string[]} profileIds - Array of profile IDs
   * @returns {string[]} Array of unique service names
   */
  getAllServicesForProfiles(profileIds) {
    const services = new Set();
    const migratedIds = this.migrateProfileIds(profileIds);
    
    for (const profileId of migratedIds) {
      const profileServices = this.getServicesForProfile(profileId);
      profileServices.forEach(s => services.add(s));
    }
    
    return Array.from(services);
  }

  /**
   * Validate a profile selection
   * @param {string[]} selectedProfiles - Array of selected profile IDs
   * @returns {Object} Validation result with errors and warnings
   */
  validateProfileSelection(selectedProfiles) {
    const errors = [];
    const warnings = [];
    
    // Empty selection check
    if (!selectedProfiles || selectedProfiles.length === 0) {
      errors.push({
        type: 'no_profiles',
        message: 'At least one profile must be active.',
        severity: 'error',
        suggestion: 'Select at least one profile (e.g., kaspa-node, kasia-app)'
      });
      return { errors, warnings };
    }

    // Migrate legacy profile IDs and track for warnings
    const legacyProfilesUsed = selectedProfiles.filter(p => this.isLegacyProfileId(p));
    const migratedProfiles = this.migrateProfileIds(selectedProfiles);
    
    // Warn about legacy profile IDs
    for (const legacyId of legacyProfilesUsed) {
      const newIds = this.migrateProfileId(legacyId);
      warnings.push({
        type: 'legacy_profile_id',
        profile: legacyId,
        message: `Profile ID '${legacyId}' is deprecated`,
        severity: 'info',
        suggestion: `Use '${Array.isArray(newIds) ? newIds.join("' or '") : newIds}' instead`
      });
    }

    // Check for invalid profiles
    const invalidProfiles = migratedProfiles.filter(profile => !this.validProfiles.includes(profile));
    
    for (const invalidProfile of invalidProfiles) {
      errors.push({
        type: 'invalid_profile',
        profile: invalidProfile,
        message: `Profile '${invalidProfile}' is not a valid profile`,
        severity: 'error',
        suggestion: `Valid profiles are: ${this.validProfiles.join(', ')}`
      });
    }

    // Check for profile conflicts
    const conflictErrors = this.checkProfileConflicts(migratedProfiles);
    errors.push(...conflictErrors);

    // Check for dependency requirements
    const dependencyIssues = this.validateProfileDependencies(migratedProfiles);
    warnings.push(...dependencyIssues.warnings);
    errors.push(...dependencyIssues.errors);

    return { 
      errors, 
      warnings,
      migratedProfiles,  // Return migrated profiles for downstream use
      hasLegacyProfiles: legacyProfilesUsed.length > 0
    };
  }

  /**
   * Check for conflicts between selected profiles
   * @param {string[]} profileIds - Array of profile IDs (should be migrated)
   * @returns {Object[]} Array of conflict errors
   */
  checkProfileConflicts(profileIds) {
    const errors = [];
    
    for (const profileId of profileIds) {
      const conflicts = this.profileConflicts[profileId] || [];
      
      for (const conflictId of conflicts) {
        if (profileIds.includes(conflictId)) {
          // Avoid duplicate errors (A conflicts B === B conflicts A)
          const existingError = errors.find(e => 
            (e.profile === conflictId && e.conflictsWith === profileId)
          );
          
          if (!existingError) {
            errors.push({
              type: 'profile_conflict',
              profile: profileId,
              conflictsWith: conflictId,
              message: `Profile '${profileId}' conflicts with '${conflictId}' (they use the same ports)`,
              severity: 'error',
              suggestion: `Remove either '${profileId}' or '${conflictId}' from selection`
            });
          }
        }
      }
    }
    
    return errors;
  }

  /**
   * Validate profile dependencies and suggest missing profiles
   * @param {string[]} selectedProfiles - Array of selected profile IDs (should be migrated)
   * @returns {Object} Object with errors and warnings arrays
   */
  validateProfileDependencies(selectedProfiles) {
    const errors = [];
    const warnings = [];

    // Check hard dependencies
    for (const profileId of selectedProfiles) {
      const dependency = this.profileDependencies[profileId];
      
      if (dependency) {
        const { requires, requiresAny, message } = dependency;
        
        if (requiresAny) {
          // Profile requires at least ONE of the listed profiles
          const hasAnyRequired = requires.some(req => selectedProfiles.includes(req));
          
          if (!hasAnyRequired) {
            errors.push({
              type: 'missing_dependency',
              profile: profileId,
              requires: requires,
              requiresAny: true,
              message: message || `Profile '${profileId}' requires one of: ${requires.join(', ')}`,
              severity: 'error',
              suggestion: `Add one of: ${requires.join(', ')}`
            });
          }
        } else {
          // Profile requires ALL listed profiles
          const missingRequired = requires.filter(req => !selectedProfiles.includes(req));
          
          if (missingRequired.length > 0) {
            errors.push({
              type: 'missing_dependency',
              profile: profileId,
              requires: missingRequired,
              requiresAny: false,
              message: message || `Profile '${profileId}' requires: ${missingRequired.join(', ')}`,
              severity: 'error',
              suggestion: `Add profiles: ${missingRequired.join(', ')}`
            });
          }
        }
      }
    }

    // Check soft dependencies (prerequisites) - generate warnings, not errors
    for (const profileId of selectedProfiles) {
      const prereq = this.profilePrerequisites[profileId];
      
      if (prereq) {
        const { recommends, canUseRemote, message } = prereq;
        const hasRecommended = recommends.some(rec => selectedProfiles.includes(rec));
        
        if (!hasRecommended) {
          if (canUseRemote) {
            warnings.push({
              type: 'prerequisite_suggestion',
              profile: profileId,
              recommends: recommends,
              message: message || `'${profileId}' works best with local node`,
              severity: 'info',
              suggestion: `Consider adding '${recommends[0]}' for better performance, or configure remote node URL`
            });
          } else {
            warnings.push({
              type: 'prerequisite_warning',
              profile: profileId,
              recommends: recommends,
              message: message || `'${profileId}' is recommended to have: ${recommends.join(' or ')}`,
              severity: 'warning',
              suggestion: `Add '${recommends[0]}' for optimal functionality`
            });
          }
        }
      }
    }

    // Check app profiles without indexer profiles
    const appProfiles = ['kasia-app', 'k-social-app'];
    const indexerProfiles = ['kasia-indexer', 'k-indexer-bundle'];
    const nodeProfiles = ['kaspa-node', 'kaspa-archive-node'];
    
    const hasAppProfile = appProfiles.some(p => selectedProfiles.includes(p));
    const hasIndexerProfile = indexerProfiles.some(p => selectedProfiles.includes(p));
    const hasNodeProfile = nodeProfiles.some(p => selectedProfiles.includes(p));
    
    if (hasAppProfile && !hasIndexerProfile && !hasNodeProfile) {
      warnings.push({
        type: 'remote_dependency_info',
        message: 'Application profiles selected without local node or indexer services',
        severity: 'info',
        suggestion: 'Applications will use remote/public endpoints. Add kaspa-node or indexer profiles for local services.'
      });
    }

    return { errors, warnings };
  }

  /**
   * Validate service presence in docker-compose content
   * @param {string} dockerComposeContent - Generated docker-compose.yml content
   * @param {string[]} selectedProfiles - Array of selected profile IDs
   * @returns {Object} Validation result with errors and warnings
   */
  validateServicePresence(dockerComposeContent, selectedProfiles) {
    const errors = [];
    const warnings = [];
    const missingServices = [];
    const presentServices = [];

    // Migrate legacy profile IDs
    const migratedProfiles = this.migrateProfileIds(selectedProfiles);
    
    // Get all expected services for selected profiles
    const expectedServices = this.getAllServicesForProfiles(migratedProfiles);

    // Validate profile selection first
    const profileValidation = this.validateProfileSelection(selectedProfiles);
    errors.push(...profileValidation.errors);
    warnings.push(...profileValidation.warnings);

    // Check each expected service
    for (const serviceName of expectedServices) {
      const serviceStatus = this.checkServiceInCompose(dockerComposeContent, serviceName);
      
      if (!serviceStatus.exists) {
        missingServices.push({
          service: serviceName,
          requiredBy: this.getProfilesRequiringService(serviceName, migratedProfiles),
          ...serviceStatus
        });
      } else {
        presentServices.push({
          service: serviceName,
          ...serviceStatus
        });
      }
    }

    // Add errors for missing services
    for (const missing of missingServices) {
      errors.push({
        type: 'missing_service',
        service: missing.service,
        requiredBy: missing.requiredBy,
        message: `Service '${missing.service}' is missing but required by profiles: ${missing.requiredBy.join(', ')}`,
        severity: 'error',
        suggestion: `Ensure '${missing.service}' is defined in docker-compose.yml`
      });
    }

    return {
      valid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      warnings,
      missingServices,
      presentServices,
      expectedServices,
      migratedProfiles
    };
  }

  /**
   * Check if a service exists in docker-compose content
   * @param {string} dockerComposeContent - Docker compose content
   * @param {string} serviceName - Service name to check
   * @returns {Object} Service status
   */
  checkServiceInCompose(dockerComposeContent, serviceName) {
    const servicePattern = new RegExp(`^\\s*${serviceName}:`, 'm');
    const containerPattern = new RegExp(`container_name:\\s*${serviceName}`, 'm');
    
    const hasServiceDefinition = servicePattern.test(dockerComposeContent);
    const hasContainerName = containerPattern.test(dockerComposeContent);
    
    return {
      exists: hasServiceDefinition,
      hasContainerName,
      configured: hasServiceDefinition && hasContainerName
    };
  }

  /**
   * Get profiles that require a specific service
   * @param {string} serviceName - Service name
   * @param {string[]} profileIds - Array of profile IDs to check
   * @returns {string[]} Array of profile IDs that require the service
   */
  getProfilesRequiringService(serviceName, profileIds) {
    const requiringProfiles = [];
    
    for (const profileId of profileIds) {
      const services = this.getServicesForProfile(profileId);
      if (services.includes(serviceName)) {
        requiringProfiles.push(profileId);
      }
    }
    
    return requiringProfiles;
  }

  /**
   * Get the profile that a service belongs to
   * @param {string} serviceName - Service name
   * @returns {string|null} Profile ID or null
   */
  getProfileForService(serviceName) {
    for (const [profileId, services] of Object.entries(this.profileServiceMap)) {
      if (services.includes(serviceName)) {
        return profileId;
      }
    }
    return null;
  }

  /**
   * Get validation summary for quick status check
   * @param {string} dockerComposeContent - Generated docker-compose.yml content
   * @param {string[]} selectedProfiles - Array of selected profile IDs
   * @returns {Object} Quick validation summary
   */
  getValidationSummary(dockerComposeContent, selectedProfiles) {
    const validation = this.validateServicePresence(dockerComposeContent, selectedProfiles);
    
    return {
      valid: validation.valid,
      profilesValid: validation.errors.filter(e => e.type.includes('profile')).length === 0,
      servicesValid: validation.missingServices.length === 0,
      errorCount: validation.errors.length,
      warningCount: validation.warnings.length,
      criticalIssues: validation.errors.filter(e => e.severity === 'error').length,
      status: validation.valid ? 'healthy' : 'issues_detected',
      migratedProfiles: validation.migratedProfiles,
      hasLegacyProfiles: selectedProfiles.some(p => this.isLegacyProfileId(p))
    };
  }

  /**
   * Generate diagnostic report for configuration issues
   * @param {string} dockerComposeContent - Generated docker-compose.yml content
   * @param {string[]} selectedProfiles - Array of selected profile IDs
   * @param {Object} config - Configuration object
   * @returns {Object} Comprehensive diagnostic report
   */
  generateDiagnosticReport(dockerComposeContent, selectedProfiles, config = {}) {
    const validation = this.validateServicePresence(dockerComposeContent, selectedProfiles);
    
    const report = {
      timestamp: new Date().toISOString(),
      configuration: {
        selectedProfiles,
        migratedProfiles: validation.migratedProfiles,
        profileCount: selectedProfiles.length,
        configKeys: Object.keys(config).length
      },
      validation,
      recommendations: [],
      quickFixes: []
    };

    // Generate recommendations based on errors
    for (const error of validation.errors) {
      switch (error.type) {
        case 'missing_service':
          report.recommendations.push({
            type: 'service_inclusion',
            priority: 'high',
            message: `Add ${error.service} service to docker-compose.yml`,
            action: `Ensure profile includes service definition for '${error.service}'`
          });
          break;

        case 'invalid_profile':
          report.quickFixes.push({
            type: 'profile_replacement',
            priority: 'critical',
            current: error.profile,
            suggested: this._suggestProfileReplacement(error.profile),
            message: `Replace invalid profile '${error.profile}' with valid profile`
          });
          break;

        case 'profile_conflict':
          report.quickFixes.push({
            type: 'profile_conflict_resolution',
            priority: 'critical',
            profiles: [error.profile, error.conflictsWith],
            message: error.suggestion
          });
          break;

        case 'missing_dependency':
          report.quickFixes.push({
            type: 'add_dependency',
            priority: 'critical',
            profile: error.profile,
            requires: error.requires,
            message: error.suggestion
          });
          break;
      }
    }

    // Add general recommendations
    if (validation.missingServices.length > 0) {
      report.recommendations.push({
        type: 'configuration_regeneration',
        priority: 'high',
        message: 'Regenerate docker-compose.yml with correct profile configuration',
        action: 'Use the wizard to regenerate configuration with proper service inclusion'
      });
    }

    return report;
  }

  /**
   * Suggest profile replacement for invalid profiles
   * @private
   * @param {string} invalidProfile - Invalid profile name
   * @returns {string} Suggested valid profile
   */
  _suggestProfileReplacement(invalidProfile) {
    const suggestions = {
      'prod': 'kaspa-node',
      'production': 'kaspa-node',
      'dev': 'kaspa-node',
      'development': 'kaspa-node',
      'test': 'kaspa-node',
      'testing': 'kaspa-node',
      // Legacy profile suggestions
      'core': 'kaspa-node',
      'archive-node': 'kaspa-archive-node',
      'mining': 'kaspa-stratum'
    };

    return suggestions[invalidProfile] || 'kaspa-node';
  }

  /**
   * Check if a specific service is properly configured
   * @param {string} serviceName - Name of service to check
   * @param {string} dockerComposeContent - Generated docker-compose.yml content
   * @returns {Object} Service validation result
   */
  validateSpecificService(serviceName, dockerComposeContent) {
    const serviceStatus = this.checkServiceInCompose(dockerComposeContent, serviceName);
    const requiredProfile = this.getProfileForService(serviceName);

    return {
      serviceName,
      exists: serviceStatus.exists,
      hasContainerName: serviceStatus.hasContainerName,
      requiredProfile,
      configured: serviceStatus.configured,
      issues: [
        ...(!serviceStatus.exists ? [`Service '${serviceName}' definition missing`] : []),
        ...(!serviceStatus.hasContainerName ? [`Container name missing for '${serviceName}'`] : [])
      ]
    };
  }
}

module.exports = ServiceValidator;

// Also export constants for use in other modules
module.exports.PROFILE_ID_MIGRATION = PROFILE_ID_MIGRATION;
module.exports.LEGACY_PROFILE_IDS = LEGACY_PROFILE_IDS;
module.exports.NEW_PROFILE_IDS = NEW_PROFILE_IDS;
