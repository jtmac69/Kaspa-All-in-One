/**
 * Service Validator
 * 
 * Validates service presence, profile consistency, and provides clear error messages
 * for missing services and configuration issues.
 * 
 * Requirements: 2.1, 2.2, 2.4, 2.5
 */

class ServiceValidator {
  constructor() {
    // Define expected services for each profile
    this.profileServiceMap = {
      'core': ['kaspa-node'],
      'kaspa-user-applications': ['kasia-app', 'k-social', 'kaspa-explorer'],
      'indexer-services': ['indexer-db', 'kasia-indexer', 'simply-kaspa-indexer'],
      'archive-node': ['kaspa-node', 'archive-db'],
      'mining': ['kaspa-node', 'kaspa-stratum']
    };

    // Define service dependencies
    this.serviceDependencies = {
      'kasia-indexer': ['indexer-db'],
      'simply-kaspa-indexer': ['indexer-db', 'kaspa-node'],
      'kaspa-stratum': ['kaspa-node'],
      'k-social': [], // Uses remote endpoints by default
      'kasia-app': [], // Uses remote endpoints by default
      'kaspa-explorer': [] // Uses remote endpoints by default
    };

    // Define valid profiles
    this.validProfiles = Object.keys(this.profileServiceMap);
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

    // Validate profiles first
    const profileValidation = this.validateProfiles(selectedProfiles);
    errors.push(...profileValidation.errors);
    warnings.push(...profileValidation.warnings);

    // For each selected profile, check if expected services are present
    for (const profile of selectedProfiles) {
      if (!this.profileServiceMap[profile]) {
        continue; // Skip invalid profiles (already handled above)
      }

      const expectedServices = this.profileServiceMap[profile];
      
      for (const serviceName of expectedServices) {
        const servicePattern = new RegExp(`^\\s*${serviceName}:`, 'm');
        const containerPattern = new RegExp(`container_name:\\s*${serviceName}`, 'm');
        
        const hasServiceDefinition = servicePattern.test(dockerComposeContent);
        const hasContainerName = containerPattern.test(dockerComposeContent);
        
        if (!hasServiceDefinition) {
          missingServices.push(serviceName);
          errors.push({
            type: 'missing_service',
            service: serviceName,
            profile: profile,
            message: `Service '${serviceName}' is missing from docker-compose.yml but is required by profile '${profile}'`,
            severity: 'error',
            suggestion: `Ensure the ${profile} profile includes the ${serviceName} service definition`
          });
        } else if (!hasContainerName) {
          warnings.push({
            type: 'incomplete_service',
            service: serviceName,
            profile: profile,
            message: `Service '${serviceName}' is defined but missing container_name`,
            severity: 'warning',
            suggestion: `Add 'container_name: ${serviceName}' to the service definition`
          });
        }
      }
    }

    // Check for profile assignment consistency
    const profileAssignmentErrors = this.validateProfileAssignments(dockerComposeContent, selectedProfiles);
    errors.push(...profileAssignmentErrors);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      missingServices,
      summary: {
        totalErrors: errors.length,
        totalWarnings: warnings.length,
        missingServiceCount: missingServices.length,
        profilesValidated: selectedProfiles.length
      }
    };
  }

  /**
   * Validate profile names and detect mismatches
   * @param {string[]} selectedProfiles - Array of selected profile IDs
   * @returns {Object} Validation result with errors and warnings
   */
  validateProfiles(selectedProfiles) {
    const errors = [];
    const warnings = [];

    if (!Array.isArray(selectedProfiles) || selectedProfiles.length === 0) {
      errors.push({
        type: 'no_profiles',
        message: 'No profiles selected. At least one profile must be active.',
        severity: 'error',
        suggestion: 'Select at least one profile (e.g., core, kaspa-user-applications)'
      });
      return { errors, warnings };
    }

    // Check for invalid profiles
    const invalidProfiles = selectedProfiles.filter(profile => !this.validProfiles.includes(profile));
    
    for (const invalidProfile of invalidProfiles) {
      errors.push({
        type: 'invalid_profile',
        profile: invalidProfile,
        message: `Profile '${invalidProfile}' is not a valid profile`,
        severity: 'error',
        suggestion: `Valid profiles are: ${this.validProfiles.join(', ')}`
      });
    }

    // Check for common profile mismatches
    if (selectedProfiles.includes('prod')) {
      errors.push({
        type: 'profile_mismatch',
        profile: 'prod',
        message: "Profile 'prod' is not a valid service profile. This appears to be a configuration error.",
        severity: 'error',
        suggestion: "Replace 'prod' with appropriate service profiles like 'kaspa-user-applications', 'core', or 'indexer-services'"
      });
    }

    // Check for dependency conflicts
    const dependencyWarnings = this.validateProfileDependencies(selectedProfiles);
    warnings.push(...dependencyWarnings);

    return { errors, warnings };
  }

  /**
   * Validate profile dependencies and suggest missing profiles
   * @param {string[]} selectedProfiles - Array of selected profile IDs
   * @returns {Object[]} Array of dependency warnings
   */
  validateProfileDependencies(selectedProfiles) {
    const warnings = [];

    // Check if kaspa-user-applications is selected without any node profile
    if (selectedProfiles.includes('kaspa-user-applications')) {
      const hasNodeProfile = selectedProfiles.some(p => ['core', 'archive-node'].includes(p));
      const hasIndexerServices = selectedProfiles.includes('indexer-services');
      
      if (!hasNodeProfile && !hasIndexerServices) {
        warnings.push({
          type: 'dependency_suggestion',
          profile: 'kaspa-user-applications',
          message: 'kaspa-user-applications profile selected without local node or indexer services',
          severity: 'info',
          suggestion: 'Applications will use remote endpoints. Consider adding "core" or "indexer-services" profile for local services'
        });
      }
    }

    // Check if mining is selected without core
    if (selectedProfiles.includes('mining') && !selectedProfiles.includes('core')) {
      warnings.push({
        type: 'dependency_warning',
        profile: 'mining',
        message: 'Mining profile requires a local Kaspa node',
        severity: 'warning',
        suggestion: 'Add "core" profile to provide the required kaspa-node service'
      });
    }

    // Check if indexer-services is selected without core
    if (selectedProfiles.includes('indexer-services') && !selectedProfiles.includes('core')) {
      warnings.push({
        type: 'dependency_warning',
        profile: 'indexer-services',
        message: 'Indexer services work best with a local Kaspa node',
        severity: 'info',
        suggestion: 'Consider adding "core" profile for optimal indexer performance'
      });
    }

    return warnings;
  }

  /**
   * Validate that services are assigned to correct profiles in docker-compose
   * @param {string} dockerComposeContent - Generated docker-compose.yml content
   * @param {string[]} selectedProfiles - Array of selected profile IDs
   * @returns {Object[]} Array of profile assignment errors
   */
  validateProfileAssignments(dockerComposeContent, selectedProfiles) {
    const errors = [];

    // Extract service definitions and their profile assignments
    const serviceMatches = dockerComposeContent.matchAll(/^\s*([a-z-]+):\s*$/gm);
    
    for (const match of serviceMatches) {
      const serviceName = match[1];
      
      // Skip non-service entries (like 'volumes', 'networks')
      if (['volumes', 'networks', 'services'].includes(serviceName)) {
        continue;
      }

      // Find the profiles section for this service
      const serviceStart = match.index;
      const nextServiceMatch = dockerComposeContent.indexOf('\n  ', serviceStart + match[0].length);
      const serviceEnd = nextServiceMatch === -1 ? dockerComposeContent.length : nextServiceMatch;
      const serviceSection = dockerComposeContent.substring(serviceStart, serviceEnd);

      // Extract profiles from the service section
      const profilesMatch = serviceSection.match(/profiles:\s*\n((?:\s*-\s*[^\n]+\n?)*)/);
      
      if (profilesMatch) {
        const assignedProfiles = profilesMatch[1]
          .split('\n')
          .map(line => line.trim().replace(/^-\s*/, ''))
          .filter(profile => profile.length > 0);

        // Check if service is assigned to profiles that are not selected
        const unselectedProfiles = assignedProfiles.filter(profile => !selectedProfiles.includes(profile));
        
        if (unselectedProfiles.length > 0) {
          errors.push({
            type: 'profile_assignment_mismatch',
            service: serviceName,
            assignedProfiles,
            selectedProfiles,
            unselectedProfiles,
            message: `Service '${serviceName}' is assigned to profiles [${assignedProfiles.join(', ')}] but only [${selectedProfiles.join(', ')}] are selected`,
            severity: 'error',
            suggestion: `Either select the required profiles or update the service profile assignment`
          });
        }
      }
    }

    return errors;
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
            action: `Ensure profile '${error.profile}' includes service definition for '${error.service}'`
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

        case 'profile_mismatch':
          report.quickFixes.push({
            type: 'profile_correction',
            priority: 'critical',
            current: error.profile,
            suggested: 'kaspa-user-applications',
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
      'prod': 'kaspa-user-applications',
      'production': 'kaspa-user-applications',
      'dev': 'core',
      'development': 'core',
      'test': 'core',
      'testing': 'core'
    };

    return suggestions[invalidProfile] || 'core';
  }

  /**
   * Check if a specific service is properly configured
   * @param {string} serviceName - Name of service to check
   * @param {string} dockerComposeContent - Generated docker-compose.yml content
   * @returns {Object} Service validation result
   */
  validateSpecificService(serviceName, dockerComposeContent) {
    const servicePattern = new RegExp(`^\\s*${serviceName}:`, 'm');
    const containerPattern = new RegExp(`container_name:\\s*${serviceName}`, 'm');
    const profilePattern = new RegExp(`profiles:\\s*\\n(?:\\s*-\\s*[^\\n]+\\n?)*`, 'm');

    const hasServiceDefinition = servicePattern.test(dockerComposeContent);
    const hasContainerName = containerPattern.test(dockerComposeContent);
    
    // Find required profile for this service
    const requiredProfile = Object.entries(this.profileServiceMap)
      .find(([profile, services]) => services.includes(serviceName))?.[0];

    return {
      serviceName,
      exists: hasServiceDefinition,
      hasContainerName,
      requiredProfile,
      configured: hasServiceDefinition && hasContainerName,
      issues: [
        ...(!hasServiceDefinition ? [`Service '${serviceName}' definition missing`] : []),
        ...(!hasContainerName ? [`Container name missing for '${serviceName}'`] : [])
      ]
    };
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
      status: validation.valid ? 'healthy' : 'issues_detected'
    };
  }
}

module.exports = ServiceValidator;