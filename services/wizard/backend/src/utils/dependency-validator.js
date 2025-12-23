/**
 * Dependency Validator
 * 
 * Implements external dependency checking during startup, health checks for external resources,
 * and provides guidance when dependencies are unavailable.
 * 
 * Requirements: 2.3, 3.5
 */

const https = require('https');
const http = require('http');
const dns = require('dns').promises;
const { URL } = require('url');

class DependencyValidator {
  constructor() {
    // Define external dependencies for each service
    this.serviceDependencies = {
      'kaspa-explorer': [
        {
          name: 'Google Fonts API',
          url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap',
          type: 'stylesheet',
          critical: false,
          timeout: 5000
        },
        {
          name: 'Google Fonts Static',
          url: 'https://fonts.gstatic.com',
          type: 'font-cdn',
          critical: false,
          timeout: 5000
        },
        {
          name: 'CDN JavaScript Libraries',
          url: 'https://cdn.jsdelivr.net',
          type: 'script-cdn',
          critical: false,
          timeout: 5000
        },
        {
          name: 'Kaspa API',
          url: 'https://api.kaspa.org/info',
          type: 'api',
          critical: true,
          timeout: 10000
        }
      ],
      'kasia-app': [
        {
          name: 'Kasia Indexer API',
          url: 'https://indexer.kasia.fyi/health',
          type: 'api',
          critical: true,
          timeout: 10000
        },
        {
          name: 'Kaspa WebSocket',
          url: 'wss://wrpc.kasia.fyi',
          type: 'websocket',
          critical: true,
          timeout: 10000
        }
      ],
      'k-social': [
        {
          name: 'K Social Indexer API',
          url: 'https://indexer0.kaspatalk.net/health',
          type: 'api',
          critical: true,
          timeout: 10000
        }
      ],
      'simply-kaspa-indexer': [
        {
          name: 'Kaspa Node RPC',
          url: 'http://kaspa-node:16110',
          type: 'rpc',
          critical: true,
          timeout: 10000,
          internal: true
        }
      ],
      'kasia-indexer': [
        {
          name: 'Kaspa Node WebSocket',
          url: 'ws://kaspa-node:17110',
          type: 'websocket',
          critical: true,
          timeout: 10000,
          internal: true
        }
      ]
    };

    // DNS servers to test connectivity
    this.dnsServers = [
      '8.8.8.8',
      '1.1.1.1',
      '208.67.222.222'
    ];

    // Common CDN domains to test
    this.cdnDomains = [
      'cdn.jsdelivr.net',
      'unpkg.com',
      'fonts.googleapis.com',
      'fonts.gstatic.com'
    ];
  }

  /**
   * Validate all external dependencies for a service
   * @param {string} serviceName - Name of the service
   * @param {Object} options - Validation options
   * @returns {Promise<Object>} Validation result
   */
  async validateServiceDependencies(serviceName, options = {}) {
    const dependencies = this.serviceDependencies[serviceName] || [];
    
    if (dependencies.length === 0) {
      return {
        service: serviceName,
        valid: true,
        dependencies: [],
        summary: {
          total: 0,
          available: 0,
          unavailable: 0,
          critical_failures: 0
        },
        message: 'No external dependencies defined for this service'
      };
    }

    console.log(`Validating ${dependencies.length} dependencies for ${serviceName}...`);

    const results = [];
    let criticalFailures = 0;
    let totalUnavailable = 0;

    for (const dependency of dependencies) {
      const result = await this.validateSingleDependency(dependency, options);
      results.push(result);

      if (!result.available) {
        totalUnavailable++;
        if (dependency.critical) {
          criticalFailures++;
        }
      }
    }

    const valid = criticalFailures === 0;

    return {
      service: serviceName,
      valid,
      dependencies: results,
      summary: {
        total: dependencies.length,
        available: dependencies.length - totalUnavailable,
        unavailable: totalUnavailable,
        critical_failures: criticalFailures
      },
      message: valid 
        ? 'All critical dependencies are available'
        : `${criticalFailures} critical dependencies are unavailable`
    };
  }

  /**
   * Validate a single external dependency
   * @param {Object} dependency - Dependency configuration
   * @param {Object} options - Validation options
   * @returns {Promise<Object>} Validation result for single dependency
   */
  async validateSingleDependency(dependency, options = {}) {
    const startTime = Date.now();
    
    try {
      let result;
      
      switch (dependency.type) {
        case 'api':
        case 'stylesheet':
        case 'script-cdn':
        case 'font-cdn':
          result = await this.validateHttpDependency(dependency);
          break;
        case 'websocket':
          result = await this.validateWebSocketDependency(dependency);
          break;
        case 'rpc':
          result = await this.validateRpcDependency(dependency);
          break;
        default:
          result = await this.validateHttpDependency(dependency);
      }

      const duration = Date.now() - startTime;

      return {
        name: dependency.name,
        url: dependency.url,
        type: dependency.type,
        critical: dependency.critical,
        available: result.available,
        status_code: result.statusCode,
        response_time: duration,
        error: result.error,
        guidance: result.available ? null : this.generateGuidance(dependency, result)
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        name: dependency.name,
        url: dependency.url,
        type: dependency.type,
        critical: dependency.critical,
        available: false,
        status_code: null,
        response_time: duration,
        error: error.message,
        guidance: this.generateGuidance(dependency, { error: error.message })
      };
    }
  }

  /**
   * Validate HTTP-based dependency (API, CDN, etc.)
   * @param {Object} dependency - Dependency configuration
   * @returns {Promise<Object>} HTTP validation result
   */
  async validateHttpDependency(dependency) {
    return new Promise((resolve) => {
      const url = new URL(dependency.url);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: 'HEAD', // Use HEAD to minimize data transfer
        timeout: dependency.timeout || 5000,
        headers: {
          'User-Agent': 'Kaspa-AIO-Dependency-Validator/1.0'
        }
      };

      const req = client.request(options, (res) => {
        const available = res.statusCode >= 200 && res.statusCode < 400;
        resolve({
          available,
          statusCode: res.statusCode,
          error: available ? null : `HTTP ${res.statusCode} ${res.statusMessage}`
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          available: false,
          statusCode: null,
          error: `Timeout after ${dependency.timeout}ms`
        });
      });

      req.on('error', (error) => {
        resolve({
          available: false,
          statusCode: null,
          error: error.message
        });
      });

      req.end();
    });
  }

  /**
   * Validate WebSocket dependency
   * @param {Object} dependency - Dependency configuration
   * @returns {Promise<Object>} WebSocket validation result
   */
  async validateWebSocketDependency(dependency) {
    // For WebSocket validation, we'll check if the host is reachable
    // Full WebSocket connection testing would require additional dependencies
    try {
      const url = new URL(dependency.url);
      const hostname = url.hostname;
      
      // Test DNS resolution
      await dns.lookup(hostname);
      
      // Test basic connectivity by attempting HTTP connection to same host
      const httpUrl = dependency.url.replace(/^wss?:/, 'https:').replace(/:\d+$/, '');
      const httpDependency = { ...dependency, url: httpUrl };
      
      const result = await this.validateHttpDependency(httpDependency);
      
      return {
        available: result.available || result.statusCode === 404, // 404 is OK for WebSocket endpoints
        statusCode: result.statusCode,
        error: result.available ? null : `WebSocket host unreachable: ${result.error}`
      };
      
    } catch (error) {
      return {
        available: false,
        statusCode: null,
        error: `WebSocket validation failed: ${error.message}`
      };
    }
  }

  /**
   * Validate RPC dependency (internal services)
   * @param {Object} dependency - Dependency configuration
   * @returns {Promise<Object>} RPC validation result
   */
  async validateRpcDependency(dependency) {
    // For internal RPC services, we'll do a basic HTTP health check
    const httpDependency = { ...dependency };
    return await this.validateHttpDependency(httpDependency);
  }

  /**
   * Generate guidance for unavailable dependencies
   * @param {Object} dependency - Dependency configuration
   * @param {Object} result - Validation result
   * @returns {Object} Guidance information
   */
  generateGuidance(dependency, result) {
    const guidance = {
      severity: dependency.critical ? 'critical' : 'warning',
      impact: dependency.critical 
        ? 'Service may not function properly'
        : 'Some features may be limited',
      suggestions: []
    };

    // Generate specific suggestions based on dependency type and error
    if (result.error && result.error.includes('timeout')) {
      guidance.suggestions.push('Check internet connectivity');
      guidance.suggestions.push('Verify firewall settings allow outbound connections');
      guidance.suggestions.push('Consider increasing timeout values if network is slow');
    } else if (result.error && result.error.includes('ENOTFOUND')) {
      guidance.suggestions.push('Check DNS resolution');
      guidance.suggestions.push('Verify internet connectivity');
      guidance.suggestions.push('Try using alternative DNS servers');
    } else if (result.statusCode >= 500) {
      guidance.suggestions.push('External service is experiencing issues');
      guidance.suggestions.push('Try again later');
      guidance.suggestions.push('Check service status page if available');
    } else if (result.statusCode === 403 || result.statusCode === 401) {
      guidance.suggestions.push('Access denied - check API keys or authentication');
      guidance.suggestions.push('Verify service configuration');
    }

    // Add fallback suggestions based on dependency type
    switch (dependency.type) {
      case 'api':
        if (dependency.critical) {
          guidance.suggestions.push('Consider using local indexer services instead of remote APIs');
          guidance.suggestions.push('Enable indexer-services profile for local data');
        }
        break;
      case 'stylesheet':
      case 'font-cdn':
        guidance.suggestions.push('Service will work without external fonts/styles');
        guidance.suggestions.push('Consider hosting fonts locally for better reliability');
        break;
      case 'script-cdn':
        guidance.suggestions.push('Consider hosting JavaScript libraries locally');
        guidance.suggestions.push('Use npm packages instead of CDN versions');
        break;
      case 'websocket':
        guidance.suggestions.push('Check WebSocket proxy configuration');
        guidance.suggestions.push('Verify firewall allows WebSocket connections');
        break;
    }

    return guidance;
  }

  /**
   * Test basic internet connectivity
   * @returns {Promise<Object>} Connectivity test result
   */
  async testInternetConnectivity() {
    console.log('Testing basic internet connectivity...');
    
    const results = {
      dns_resolution: false,
      http_connectivity: false,
      cdn_accessibility: false,
      details: []
    };

    // Test DNS resolution
    try {
      await dns.lookup('google.com');
      results.dns_resolution = true;
      results.details.push({ test: 'DNS Resolution', status: 'success', message: 'DNS working' });
    } catch (error) {
      results.details.push({ test: 'DNS Resolution', status: 'failed', message: error.message });
    }

    // Test basic HTTP connectivity
    try {
      const httpResult = await this.validateHttpDependency({
        url: 'https://www.google.com',
        timeout: 5000
      });
      results.http_connectivity = httpResult.available;
      results.details.push({ 
        test: 'HTTP Connectivity', 
        status: httpResult.available ? 'success' : 'failed', 
        message: httpResult.available ? 'HTTP working' : httpResult.error 
      });
    } catch (error) {
      results.details.push({ test: 'HTTP Connectivity', status: 'failed', message: error.message });
    }

    // Test CDN accessibility
    let cdnSuccess = 0;
    for (const domain of this.cdnDomains) {
      try {
        const cdnResult = await this.validateHttpDependency({
          url: `https://${domain}`,
          timeout: 5000
        });
        if (cdnResult.available) {
          cdnSuccess++;
        }
        results.details.push({ 
          test: `CDN Access (${domain})`, 
          status: cdnResult.available ? 'success' : 'failed', 
          message: cdnResult.available ? 'Accessible' : cdnResult.error 
        });
      } catch (error) {
        results.details.push({ test: `CDN Access (${domain})`, status: 'failed', message: error.message });
      }
    }

    results.cdn_accessibility = cdnSuccess > 0;

    return {
      connected: results.dns_resolution && results.http_connectivity,
      partial: results.dns_resolution || results.http_connectivity,
      cdn_available: results.cdn_accessibility,
      results
    };
  }

  /**
   * Validate dependencies for multiple services
   * @param {string[]} services - Array of service names
   * @param {Object} options - Validation options
   * @returns {Promise<Object>} Combined validation result
   */
  async validateMultipleServices(services, options = {}) {
    console.log(`Validating dependencies for ${services.length} services...`);

    // First test basic connectivity
    const connectivityTest = await this.testInternetConnectivity();

    const serviceResults = [];
    let totalCriticalFailures = 0;

    for (const service of services) {
      const result = await this.validateServiceDependencies(service, options);
      serviceResults.push(result);
      totalCriticalFailures += result.summary.critical_failures;
    }

    const overallValid = totalCriticalFailures === 0 && connectivityTest.connected;

    return {
      valid: overallValid,
      connectivity: connectivityTest,
      services: serviceResults,
      summary: {
        services_tested: services.length,
        services_valid: serviceResults.filter(s => s.valid).length,
        total_critical_failures: totalCriticalFailures,
        internet_connected: connectivityTest.connected,
        cdn_available: connectivityTest.cdn_available
      },
      recommendations: this.generateOverallRecommendations(serviceResults, connectivityTest)
    };
  }

  /**
   * Generate overall recommendations based on validation results
   * @param {Object[]} serviceResults - Results from service validations
   * @param {Object} connectivityTest - Internet connectivity test results
   * @returns {Object[]} Array of recommendations
   */
  generateOverallRecommendations(serviceResults, connectivityTest) {
    const recommendations = [];

    if (!connectivityTest.connected) {
      recommendations.push({
        priority: 'critical',
        category: 'connectivity',
        title: 'Internet Connectivity Issues',
        message: 'Basic internet connectivity is not working',
        actions: [
          'Check network connection',
          'Verify DNS settings',
          'Check firewall configuration',
          'Contact network administrator if needed'
        ]
      });
    }

    if (!connectivityTest.cdn_available) {
      recommendations.push({
        priority: 'warning',
        category: 'cdn',
        title: 'CDN Access Limited',
        message: 'Some CDN services are not accessible',
        actions: [
          'External fonts and scripts may not load',
          'Consider hosting assets locally',
          'Check if corporate firewall blocks CDNs'
        ]
      });
    }

    // Check for services with critical failures
    const failedServices = serviceResults.filter(s => !s.valid);
    if (failedServices.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'services',
        title: 'Service Dependencies Unavailable',
        message: `${failedServices.length} services have critical dependency failures`,
        actions: [
          'Review individual service dependency reports',
          'Consider using local services instead of remote APIs',
          'Enable indexer-services profile for local data processing'
        ]
      });
    }

    // Check for kaspa-user-applications specific recommendations
    const kaspaUserAppsResult = serviceResults.find(s => s.service === 'kaspa-user-applications');
    if (kaspaUserAppsResult && !kaspaUserAppsResult.valid) {
      recommendations.push({
        priority: 'high',
        category: 'configuration',
        title: 'User Applications May Need Local Services',
        message: 'Remote APIs are unavailable for user applications',
        actions: [
          'Enable indexer-services profile to use local indexers',
          'Enable core profile to run local Kaspa node',
          'This will provide local alternatives to remote services'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Get dependency validation summary for a service
   * @param {string} serviceName - Name of the service
   * @returns {Promise<Object>} Quick validation summary
   */
  async getServiceDependencySummary(serviceName) {
    const result = await this.validateServiceDependencies(serviceName);
    
    return {
      service: serviceName,
      status: result.valid ? 'healthy' : 'issues',
      critical_issues: result.summary.critical_failures,
      total_dependencies: result.summary.total,
      available_dependencies: result.summary.available,
      message: result.message
    };
  }

  /**
   * Validate profile removal and check impact on other services
   * @param {string} profileId - Profile ID to remove
   * @param {string[]} currentProfiles - Currently installed profiles
   * @returns {Promise<Object>} Removal validation result
   */
  async validateRemoval(profileId, currentProfiles) {
    try {
      const ProfileManager = require('./profile-manager');
      const profileManager = new ProfileManager();
      
      const profile = profileManager.getProfile(profileId);
      if (!profile) {
        return {
          valid: false,
          error: `Profile '${profileId}' not found`,
          canRemove: false
        };
      }

      // Check if other profiles depend on this one
      const dependentProfiles = [];
      const remainingProfiles = currentProfiles.filter(p => p !== profileId);
      
      for (const otherProfileId of remainingProfiles) {
        const otherProfile = profileManager.getProfile(otherProfileId);
        if (otherProfile && otherProfile.dependencies && otherProfile.dependencies.includes(profileId)) {
          dependentProfiles.push({
            id: otherProfileId,
            name: otherProfile.name
          });
        }
      }

      // Check if removing this profile would break prerequisites
      const prerequisiteIssues = [];
      for (const otherProfileId of remainingProfiles) {
        const otherProfile = profileManager.getProfile(otherProfileId);
        if (otherProfile && otherProfile.prerequisites && otherProfile.prerequisites.includes(profileId)) {
          // Check if other prerequisites are still available
          const hasOtherPrerequisites = otherProfile.prerequisites.some(prereq => 
            prereq !== profileId && remainingProfiles.includes(prereq)
          );
          
          if (!hasOtherPrerequisites) {
            prerequisiteIssues.push({
              profile: otherProfileId,
              name: otherProfile.name,
              message: `${otherProfile.name} requires ${profile.name} or another prerequisite`
            });
          }
        }
      }

      // Check if this is a core profile (core or archive-node)
      const isCoreProfile = profileId === 'core' || profileId === 'archive-node';
      const hasOtherCoreProfile = remainingProfiles.includes('core') || remainingProfiles.includes('archive-node');
      
      let coreProfileWarning = null;
      if (isCoreProfile && !hasOtherCoreProfile) {
        coreProfileWarning = {
          severity: 'critical',
          message: 'Removing this profile will leave no Kaspa node running',
          impact: 'All services requiring a local node will stop working'
        };
      }

      // Check service dependencies
      const servicesToRemove = profile.services.map(s => s.name);
      const serviceImpacts = [];
      
      for (const serviceName of servicesToRemove) {
        // Check if other profiles use this service
        const usedByOthers = [];
        for (const otherProfileId of remainingProfiles) {
          const otherProfile = profileManager.getProfile(otherProfileId);
          if (otherProfile) {
            const usesService = otherProfile.services.some(s => s.name === serviceName);
            if (usesService) {
              usedByOthers.push(otherProfile.name);
            }
          }
        }
        
        if (usedByOthers.length > 0) {
          serviceImpacts.push({
            service: serviceName,
            usedBy: usedByOthers,
            impact: 'Service is shared with other profiles'
          });
        }
      }

      // Determine if removal is safe
      const canRemove = dependentProfiles.length === 0 && 
                       prerequisiteIssues.length === 0 && 
                       serviceImpacts.length === 0 &&
                       !coreProfileWarning;

      const warnings = [];
      const errors = [];

      if (dependentProfiles.length > 0) {
        errors.push({
          type: 'dependent_profiles',
          message: `Other profiles depend on ${profile.name}`,
          profiles: dependentProfiles
        });
      }

      if (prerequisiteIssues.length > 0) {
        errors.push({
          type: 'prerequisite_issues',
          message: 'Removing this profile would break prerequisites for other profiles',
          issues: prerequisiteIssues
        });
      }

      if (serviceImpacts.length > 0) {
        warnings.push({
          type: 'shared_services',
          message: 'Some services are shared with other profiles',
          impacts: serviceImpacts
        });
      }

      if (coreProfileWarning) {
        if (coreProfileWarning.severity === 'critical') {
          errors.push({
            type: 'core_profile_removal',
            message: coreProfileWarning.message,
            impact: coreProfileWarning.impact
          });
        } else {
          warnings.push({
            type: 'core_profile_removal',
            message: coreProfileWarning.message,
            impact: coreProfileWarning.impact
          });
        }
      }

      return {
        valid: canRemove,
        canRemove,
        profile: {
          id: profileId,
          name: profile.name,
          services: servicesToRemove
        },
        impact: {
          dependentProfiles,
          prerequisiteIssues,
          serviceImpacts,
          coreProfileWarning
        },
        errors,
        warnings,
        recommendations: this.generateRemovalRecommendations(profileId, profile, errors, warnings)
      };

    } catch (error) {
      return {
        valid: false,
        canRemove: false,
        error: error.message
      };
    }
  }

  /**
   * Generate recommendations for profile removal
   * @param {string} profileId - Profile ID being removed
   * @param {Object} profile - Profile definition
   * @param {Object[]} errors - Validation errors
   * @param {Object[]} warnings - Validation warnings
   * @returns {Object[]} Array of recommendations
   */
  generateRemovalRecommendations(profileId, profile, errors, warnings) {
    const recommendations = [];

    // Handle dependent profiles
    const dependentError = errors.find(e => e.type === 'dependent_profiles');
    if (dependentError) {
      recommendations.push({
        priority: 'high',
        category: 'dependencies',
        title: 'Remove Dependent Profiles First',
        message: 'Other profiles depend on this one and must be removed first',
        actions: dependentError.profiles.map(p => `Remove ${p.name} profile first`),
        profiles: dependentError.profiles.map(p => p.id)
      });
    }

    // Handle prerequisite issues
    const prerequisiteError = errors.find(e => e.type === 'prerequisite_issues');
    if (prerequisiteError) {
      recommendations.push({
        priority: 'high',
        category: 'prerequisites',
        title: 'Install Alternative Prerequisites',
        message: 'Some profiles will lose required prerequisites',
        actions: prerequisiteError.issues.map(issue => 
          `Install alternative prerequisite for ${issue.name} or remove it first`
        )
      });
    }

    // Handle core profile removal
    const coreError = errors.find(e => e.type === 'core_profile_removal');
    if (coreError) {
      recommendations.push({
        priority: 'critical',
        category: 'core',
        title: 'Install Alternative Node Profile',
        message: 'A Kaspa node is required for the system to function',
        actions: [
          profileId === 'core' ? 'Install Archive Node profile first' : 'Install Core profile first',
          'Or remove all profiles that require a local node'
        ]
      });
    }

    // Handle shared services
    const sharedWarning = warnings.find(w => w.type === 'shared_services');
    if (sharedWarning) {
      recommendations.push({
        priority: 'medium',
        category: 'services',
        title: 'Shared Services Will Be Removed',
        message: 'Some services are used by multiple profiles',
        actions: [
          'Consider the impact on other profiles',
          'Backup data before removal if needed',
          'Other profiles may need reconfiguration'
        ]
      });
    }

    // General recommendations
    recommendations.push({
      priority: 'low',
      category: 'backup',
      title: 'Backup Data Before Removal',
      message: 'Consider backing up important data',
      actions: [
        'Export wallet data if applicable',
        'Backup database data if needed',
        'Save configuration files'
      ]
    });

    return recommendations;
  }

  /**
   * Validate profile selection (comprehensive validation)
   * @param {string[]} profiles - Array of profile IDs to validate
   * @returns {Object} Validation result
   */
  validateSelection(profiles) {
    const ProfileManager = require('./profile-manager');
    const profileManager = new ProfileManager();
    
    // Use existing profile manager validation
    const validation = profileManager.validateProfileSelection(profiles);
    
    // Add additional dependency-specific validation
    const dependencyIssues = [];
    
    // Check for circular dependencies
    const cycles = profileManager.detectCircularDependencies(profiles);
    if (cycles.length > 0) {
      dependencyIssues.push({
        type: 'circular_dependencies',
        message: 'Circular dependencies detected',
        cycles
      });
    }
    
    return {
      ...validation,
      dependencyIssues,
      hasDependencyIssues: dependencyIssues.length > 0
    };
  }

  /**
   * Get detailed validation report for profile selection
   * @param {string[]} profiles - Array of profile IDs
   * @returns {Object} Detailed validation report
   */
  getValidationReport(profiles) {
    const ProfileManager = require('./profile-manager');
    const profileManager = new ProfileManager();
    
    const validation = this.validateSelection(profiles);
    const requirements = profileManager.calculateResourceRequirements(profiles);
    const startupOrder = profileManager.getStartupOrder(profiles);
    const dependencyGraph = this.buildDependencyGraph(profiles);
    
    return {
      profiles,
      validation,
      requirements,
      startupOrder,
      dependencyGraph,
      summary: {
        valid: validation.valid,
        profileCount: profiles.length,
        resolvedProfileCount: validation.resolvedProfiles?.length || 0,
        errorCount: validation.errors?.length || 0,
        warningCount: validation.warnings?.length || 0,
        serviceCount: startupOrder.length,
        totalPorts: requirements.ports?.length || 0
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Validate profile addition and check integration with existing profiles
   * @param {string} profileId - Profile ID to add
   * @param {string[]} currentProfiles - Currently installed profiles
   * @returns {Promise<Object>} Addition validation result
   */
  async validateAddition(profileId, currentProfiles) {
    try {
      const ProfileManager = require('./profile-manager');
      const profileManager = new ProfileManager();
      
      const profile = profileManager.getProfile(profileId);
      if (!profile) {
        return {
          valid: false,
          error: `Profile '${profileId}' not found`,
          canAdd: false
        };
      }

      // Check if profile is already installed
      if (currentProfiles.includes(profileId)) {
        return {
          valid: false,
          error: `Profile '${profileId}' is already installed`,
          canAdd: false
        };
      }

      // Check for conflicts with existing profiles
      const conflicts = [];
      for (const existingProfileId of currentProfiles) {
        const existingProfile = profileManager.getProfile(existingProfileId);
        if (existingProfile && existingProfile.conflicts && existingProfile.conflicts.includes(profileId)) {
          conflicts.push({
            profile: existingProfileId,
            name: existingProfile.name,
            message: `${existingProfile.name} conflicts with ${profile.name}`
          });
        }
        
        // Check reverse conflicts
        if (profile.conflicts && profile.conflicts.includes(existingProfileId)) {
          conflicts.push({
            profile: profileId,
            name: profile.name,
            message: `${profile.name} conflicts with ${existingProfile.name}`
          });
        }
      }

      // Check prerequisites
      const missingPrerequisites = [];
      if (profile.prerequisites && profile.prerequisites.length > 0) {
        const hasPrerequisite = profile.prerequisites.some(prereq => 
          currentProfiles.includes(prereq)
        );
        
        if (!hasPrerequisite) {
          missingPrerequisites.push({
            profile: profileId,
            name: profile.name,
            required: profile.prerequisites,
            message: `${profile.name} requires one of: ${profile.prerequisites.map(p => profileManager.getProfile(p)?.name || p).join(', ')}`
          });
        }
      }

      // Check port conflicts
      const portConflicts = [];
      const newProfiles = [...currentProfiles, profileId];
      const allConflicts = profileManager.detectConflicts(newProfiles);
      
      for (const conflict of allConflicts) {
        if (conflict.profiles.includes(profileId)) {
          portConflicts.push(conflict);
        }
      }

      // Check resource requirements
      const requirements = profileManager.calculateResourceRequirements(newProfiles);
      const resourceWarnings = [];
      
      if (requirements.minMemory > 32) {
        resourceWarnings.push({
          type: 'high_memory',
          message: `Adding this profile will require ${requirements.minMemory}GB RAM total`,
          current: requirements.minMemory - profile.resources.minMemory,
          additional: profile.resources.minMemory
        });
      }

      // Determine if addition is safe
      const canAdd = conflicts.length === 0 && 
                    missingPrerequisites.length === 0 && 
                    portConflicts.length === 0;

      const errors = [];
      const warnings = [];

      if (conflicts.length > 0) {
        errors.push({
          type: 'profile_conflicts',
          message: 'Profile conflicts with existing installations',
          conflicts
        });
      }

      if (missingPrerequisites.length > 0) {
        errors.push({
          type: 'missing_prerequisites',
          message: 'Profile has unmet prerequisites',
          prerequisites: missingPrerequisites
        });
      }

      if (portConflicts.length > 0) {
        errors.push({
          type: 'port_conflicts',
          message: 'Profile would cause port conflicts',
          conflicts: portConflicts
        });
      }

      if (resourceWarnings.length > 0) {
        warnings.push({
          type: 'resource_requirements',
          message: 'High resource requirements detected',
          warnings: resourceWarnings
        });
      }

      // Generate integration suggestions
      const integrationSuggestions = this.generateIntegrationSuggestions(profileId, currentProfiles, profileManager);

      return {
        valid: canAdd,
        canAdd,
        profile: {
          id: profileId,
          name: profile.name,
          services: profile.services.map(s => s.name)
        },
        integration: {
          suggestions: integrationSuggestions,
          requirements: requirements,
          newServices: profile.services.map(s => s.name)
        },
        errors,
        warnings,
        recommendations: this.generateAdditionRecommendations(profileId, profile, errors, warnings, integrationSuggestions)
      };

    } catch (error) {
      return {
        valid: false,
        canAdd: false,
        error: error.message
      };
    }
  }

  /**
   * Generate integration suggestions for adding a profile
   * @param {string} profileId - Profile ID being added
   * @param {string[]} currentProfiles - Currently installed profiles
   * @param {Object} profileManager - Profile manager instance
   * @returns {Object[]} Array of integration suggestions
   */
  generateIntegrationSuggestions(profileId, currentProfiles, profileManager) {
    const suggestions = [];
    const profile = profileManager.getProfile(profileId);
    
    // Indexer Services integration with existing Core profile
    if (profileId === 'indexer-services' && currentProfiles.includes('core')) {
      suggestions.push({
        type: 'indexer_node_connection',
        title: 'Connect Indexers to Local Node',
        description: 'You have a local Kaspa node. Indexers can connect to it instead of public networks.',
        options: [
          {
            id: 'local_node',
            label: 'Use Local Node',
            description: 'Connect all indexers to your local Kaspa node',
            recommended: true,
            config: {
              KASPA_NODE_URL: 'http://kaspa-node:16110',
              USE_LOCAL_NODE: 'true'
            }
          },
          {
            id: 'mixed',
            label: 'Mixed Configuration',
            description: 'Some indexers use local node, others use public network',
            recommended: false,
            config: {
              KASIA_INDEXER_NODE: 'local',
              K_INDEXER_NODE: 'public',
              SIMPLY_KASPA_INDEXER_NODE: 'local'
            }
          },
          {
            id: 'public_network',
            label: 'Use Public Network',
            description: 'Connect indexers to public Kaspa network',
            recommended: false,
            config: {
              USE_LOCAL_NODE: 'false'
            }
          }
        ]
      });
    }

    // Kaspa User Applications integration with existing Indexer Services
    if (profileId === 'kaspa-user-applications' && currentProfiles.includes('indexer-services')) {
      suggestions.push({
        type: 'app_indexer_connection',
        title: 'Connect Apps to Local Indexers',
        description: 'You have local indexer services. Applications can use them instead of public APIs.',
        options: [
          {
            id: 'local_indexers',
            label: 'Use Local Indexers',
            description: 'Connect all applications to your local indexer services',
            recommended: true,
            config: {
              KASIA_INDEXER_URL: 'http://kasia-indexer:3004',
              K_INDEXER_URL: 'http://k-indexer:3005',
              SIMPLY_KASPA_INDEXER_URL: 'http://simply-kaspa-indexer:3006'
            }
          },
          {
            id: 'mixed_indexers',
            label: 'Mixed Configuration',
            description: 'Some apps use local indexers, others use public APIs',
            recommended: false,
            config: {
              KASIA_APP_INDEXER: 'local',
              K_SOCIAL_INDEXER: 'local',
              KASPA_EXPLORER_INDEXER: 'public'
            }
          },
          {
            id: 'public_apis',
            label: 'Use Public APIs',
            description: 'Connect applications to public indexer APIs',
            recommended: false,
            config: {
              USE_LOCAL_INDEXERS: 'false'
            }
          }
        ]
      });
    }

    // Mining integration with existing Core/Archive Node
    if (profileId === 'mining' && (currentProfiles.includes('core') || currentProfiles.includes('archive-node'))) {
      const nodeType = currentProfiles.includes('core') ? 'Core' : 'Archive';
      suggestions.push({
        type: 'mining_node_connection',
        title: `Connect Mining to Local ${nodeType} Node`,
        description: `You have a local ${nodeType} node. Mining can connect directly to it.`,
        options: [
          {
            id: 'local_node',
            label: `Use Local ${nodeType} Node`,
            description: `Connect mining stratum to your local ${nodeType} node`,
            recommended: true,
            config: {
              KASPA_NODE_URL: 'http://kaspa-node:16110',
              MINING_NODE_TYPE: nodeType.toLowerCase()
            }
          }
        ]
      });
    }

    // Core profile integration with existing services
    if (profileId === 'core' && currentProfiles.length > 0) {
      const hasIndexers = currentProfiles.includes('indexer-services');
      const hasApps = currentProfiles.includes('kaspa-user-applications');
      
      if (hasIndexers || hasApps) {
        suggestions.push({
          type: 'node_service_integration',
          title: 'Integrate Node with Existing Services',
          description: 'Your existing services can be reconfigured to use the new local node.',
          options: [
            {
              id: 'integrate_all',
              label: 'Integrate with All Services',
              description: 'Reconfigure all existing services to use the new local node',
              recommended: true,
              config: {
                RECONFIGURE_EXISTING: 'true',
                NODE_INTEGRATION: 'full'
              }
            },
            {
              id: 'keep_separate',
              label: 'Keep Services Separate',
              description: 'Run local node independently, existing services keep current configuration',
              recommended: false,
              config: {
                NODE_INTEGRATION: 'none'
              }
            }
          ]
        });
      }
    }

    return suggestions;
  }

  /**
   * Generate recommendations for profile addition
   * @param {string} profileId - Profile ID being added
   * @param {Object} profile - Profile definition
   * @param {Object[]} errors - Validation errors
   * @param {Object[]} warnings - Validation warnings
   * @param {Object[]} integrationSuggestions - Integration suggestions
   * @returns {Object[]} Array of recommendations
   */
  generateAdditionRecommendations(profileId, profile, errors, warnings, integrationSuggestions) {
    const recommendations = [];

    // Handle conflicts
    const conflictError = errors.find(e => e.type === 'profile_conflicts');
    if (conflictError) {
      recommendations.push({
        priority: 'high',
        category: 'conflicts',
        title: 'Resolve Profile Conflicts',
        message: 'Cannot add profile due to conflicts with existing installations',
        actions: conflictError.conflicts.map(c => `Remove ${c.name} profile first or choose a different profile`),
        profiles: conflictError.conflicts.map(c => c.profile)
      });
    }

    // Handle missing prerequisites
    const prerequisiteError = errors.find(e => e.type === 'missing_prerequisites');
    if (prerequisiteError) {
      recommendations.push({
        priority: 'high',
        category: 'prerequisites',
        title: 'Install Required Prerequisites',
        message: 'Profile has unmet prerequisites that must be installed first',
        actions: prerequisiteError.prerequisites.map(p => 
          `Install one of: ${p.required.join(', ')}`
        )
      });
    }

    // Handle port conflicts
    const portError = errors.find(e => e.type === 'port_conflicts');
    if (portError) {
      recommendations.push({
        priority: 'high',
        category: 'ports',
        title: 'Resolve Port Conflicts',
        message: 'Profile would cause port conflicts with existing services',
        actions: [
          'Configure custom ports for conflicting services',
          'Stop conflicting services before adding this profile',
          'Choose different profiles that don\'t conflict'
        ]
      });
    }

    // Handle resource warnings
    const resourceWarning = warnings.find(w => w.type === 'resource_requirements');
    if (resourceWarning) {
      recommendations.push({
        priority: 'medium',
        category: 'resources',
        title: 'Check System Resources',
        message: 'Adding this profile will significantly increase resource usage',
        actions: [
          'Ensure your system has sufficient RAM and CPU',
          'Consider monitoring system performance after installation',
          'Review resource requirements before proceeding'
        ]
      });
    }

    // Integration recommendations
    if (integrationSuggestions.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'integration',
        title: 'Configure Service Integration',
        message: 'This profile can integrate with your existing services',
        actions: [
          'Review integration options to optimize performance',
          'Consider using local services instead of public APIs',
          'Configure service connections for best reliability'
        ]
      });
    }

    // General recommendations
    recommendations.push({
      priority: 'low',
      category: 'backup',
      title: 'Backup Before Adding Profile',
      message: 'Consider backing up your current configuration',
      actions: [
        'Create configuration backup',
        'Export important data if applicable',
        'Document current service URLs and settings'
      ]
    });

    return recommendations;
  }

  /**
   * Build dependency graph for profile selection
   * @param {string[]} profiles - Array of profile IDs
   * @returns {Object} Dependency graph structure
   */
  buildDependencyGraph(profiles) {
    const ProfileManager = require('./profile-manager');
    const profileManager = new ProfileManager();
    
    const nodes = [];
    const edges = [];
    const resolvedProfiles = profileManager.resolveProfileDependencies(profiles);
    
    // Create nodes for each profile
    for (const profileId of resolvedProfiles) {
      const profile = profileManager.getProfile(profileId);
      if (profile) {
        nodes.push({
          id: profileId,
          name: profile.name,
          category: profile.category,
          services: profile.services.map(s => s.name),
          ports: profile.ports,
          selected: profiles.includes(profileId),
          required: profile.required || false
        });
      }
    }
    
    // Create edges for dependencies
    for (const profileId of resolvedProfiles) {
      const profile = profileManager.getProfile(profileId);
      if (profile && profile.dependencies) {
        for (const depId of profile.dependencies) {
          edges.push({
            from: depId,
            to: profileId,
            type: 'dependency'
          });
        }
      }
      
      // Add prerequisite edges
      if (profile && profile.prerequisites) {
        for (const prereqId of profile.prerequisites) {
          if (resolvedProfiles.includes(prereqId)) {
            edges.push({
              from: prereqId,
              to: profileId,
              type: 'prerequisite'
            });
          }
        }
      }
      
      // Add conflict edges
      if (profile && profile.conflicts) {
        for (const conflictId of profile.conflicts) {
          if (resolvedProfiles.includes(conflictId)) {
            edges.push({
              from: profileId,
              to: conflictId,
              type: 'conflict'
            });
          }
        }
      }
    }
    
    return {
      nodes,
      edges,
      metadata: {
        profileCount: nodes.length,
        dependencyCount: edges.filter(e => e.type === 'dependency').length,
        prerequisiteCount: edges.filter(e => e.type === 'prerequisite').length,
        conflictCount: edges.filter(e => e.type === 'conflict').length
      }
    };
  }
}

module.exports = DependencyValidator;