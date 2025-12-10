/**
 * Startup Dependency Checker
 * 
 * Automatically validates external dependencies during wizard startup
 * and provides guidance when dependencies are unavailable.
 * 
 * Requirements: 2.3, 3.5
 */

const DependencyValidator = require('./dependency-validator');
const ConfigGenerator = require('./config-generator');

class StartupDependencyChecker {
  constructor() {
    this.validator = new DependencyValidator();
    this.configGenerator = new ConfigGenerator();
    this.checkResults = null;
    this.lastCheckTime = null;
  }

  /**
   * Perform startup dependency validation
   * @param {Object} options - Startup check options
   * @returns {Promise<Object>} Startup validation result
   */
  async performStartupCheck(options = {}) {
    const {
      profiles = [],
      config = {},
      skipCache = false,
      timeoutMs = 30000
    } = options;

    console.log('🔍 Performing startup dependency validation...');
    console.log(`Profiles: ${profiles.join(', ')}`);

    // Check cache if not skipping
    if (!skipCache && this.checkResults && this.lastCheckTime) {
      const cacheAge = Date.now() - this.lastCheckTime;
      if (cacheAge < 300000) { // 5 minutes cache
        console.log('✅ Using cached dependency validation results');
        return this.checkResults;
      }
    }

    const startTime = Date.now();

    try {
      // Determine which services need validation based on profiles
      const servicesToValidate = this.getServicesForProfiles(profiles);

      if (servicesToValidate.length === 0) {
        const result = {
          success: true,
          profiles,
          services: [],
          validation: {
            valid: true,
            connectivity: { connected: true, cdn_available: true },
            services: [],
            summary: {
              services_tested: 0,
              services_valid: 0,
              total_critical_failures: 0,
              internet_connected: true,
              cdn_available: true
            },
            recommendations: []
          },
          message: 'No services require external dependency validation for selected profiles',
          timestamp: new Date().toISOString(),
          duration: Date.now() - startTime
        };

        this.checkResults = result;
        this.lastCheckTime = Date.now();
        return result;
      }

      // Perform validation with timeout
      const validationPromise = this.validator.validateMultipleServices(servicesToValidate);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Startup dependency check timeout')), timeoutMs);
      });

      const validation = await Promise.race([validationPromise, timeoutPromise]);

      // Analyze results and generate startup-specific recommendations
      const startupRecommendations = this.generateStartupRecommendations(validation, profiles);

      const result = {
        success: true,
        profiles,
        services: servicesToValidate,
        validation,
        startupRecommendations,
        message: validation.valid 
          ? 'All critical dependencies are available'
          : `${validation.summary.total_critical_failures} critical dependencies unavailable`,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      };

      // Cache results
      this.checkResults = result;
      this.lastCheckTime = Date.now();

      // Log summary
      this.logStartupSummary(result);

      return result;

    } catch (error) {
      console.error('❌ Startup dependency check failed:', error.message);
      
      const result = {
        success: false,
        profiles,
        services: [],
        validation: null,
        error: error.message,
        message: 'Startup dependency check failed',
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      };

      return result;
    }
  }

  /**
   * Get services that need validation for given profiles
   * @param {string[]} profiles - Selected profiles
   * @returns {string[]} Services to validate
   */
  getServicesForProfiles(profiles) {
    const services = [];

    if (profiles.includes('kaspa-user-applications')) {
      services.push('kaspa-explorer', 'kasia-app', 'k-social');
    }

    if (profiles.includes('indexer-services')) {
      services.push('simply-kaspa-indexer', 'kasia-indexer');
    }

    // Remove duplicates
    return [...new Set(services)];
  }

  /**
   * Generate startup-specific recommendations
   * @param {Object} validation - Validation results
   * @param {string[]} profiles - Selected profiles
   * @returns {Object[]} Startup recommendations
   */
  generateStartupRecommendations(validation, profiles) {
    const recommendations = [...validation.recommendations];

    // Add startup-specific recommendations
    if (!validation.valid && profiles.includes('kaspa-user-applications')) {
      // Check if local alternatives are available
      const hasLocalIndexers = profiles.includes('indexer-services');
      const hasLocalNode = profiles.includes('core');

      if (!hasLocalIndexers) {
        recommendations.push({
          priority: 'high',
          category: 'startup',
          title: 'Consider Local Services for Reliability',
          message: 'Remote APIs are unavailable. Local services would provide better reliability.',
          actions: [
            'Add "indexer-services" profile to use local indexers',
            'Add "core" profile to run local Kaspa node',
            'Restart wizard with additional profiles for local services'
          ],
          profiles_to_add: ['indexer-services', 'core']
        });
      }

      if (!hasLocalNode && hasLocalIndexers) {
        recommendations.push({
          priority: 'medium',
          category: 'startup',
          title: 'Local Node Recommended for Indexers',
          message: 'Local indexers work best with a local Kaspa node',
          actions: [
            'Add "core" profile for local Kaspa node',
            'This will improve indexer performance and reliability'
          ],
          profiles_to_add: ['core']
        });
      }
    }

    // Add connectivity-specific startup recommendations
    if (!validation.connectivity.connected) {
      recommendations.push({
        priority: 'critical',
        category: 'startup',
        title: 'Network Configuration Required',
        message: 'No internet connectivity detected during startup',
        actions: [
          'Verify network connection before starting services',
          'Check firewall settings for outbound connections',
          'Consider offline mode if network is intentionally isolated',
          'Restart wizard after network issues are resolved'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Log startup validation summary
   * @param {Object} result - Startup check result
   */
  logStartupSummary(result) {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 Startup Dependency Validation Summary');
    console.log('='.repeat(60));
    
    if (result.success && result.validation) {
      const { validation } = result;
      
      console.log(`✅ Validation completed in ${result.duration}ms`);
      console.log(`📊 Services tested: ${validation.summary.services_tested}`);
      console.log(`✅ Services valid: ${validation.summary.services_valid}`);
      console.log(`❌ Critical failures: ${validation.summary.total_critical_failures}`);
      console.log(`🌐 Internet connected: ${validation.summary.internet_connected ? 'Yes' : 'No'}`);
      console.log(`📡 CDN accessible: ${validation.summary.cdn_available ? 'Yes' : 'No'}`);
      
      if (validation.summary.total_critical_failures > 0) {
        console.log('\n⚠️  Critical Issues Found:');
        for (const service of validation.services) {
          if (!service.valid) {
            console.log(`   • ${service.service}: ${service.summary.critical_failures} critical failures`);
          }
        }
      }
      
      if (result.startupRecommendations && result.startupRecommendations.length > 0) {
        console.log('\n💡 Startup Recommendations:');
        for (const rec of result.startupRecommendations) {
          if (rec.priority === 'critical' || rec.priority === 'high') {
            console.log(`   • ${rec.title}`);
          }
        }
      }
      
    } else {
      console.log(`❌ Validation failed: ${result.message}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }
    
    console.log('='.repeat(60));
  }

  /**
   * Get cached validation results
   * @returns {Object|null} Cached results or null
   */
  getCachedResults() {
    if (this.checkResults && this.lastCheckTime) {
      const cacheAge = Date.now() - this.lastCheckTime;
      if (cacheAge < 300000) { // 5 minutes cache
        return {
          ...this.checkResults,
          cached: true,
          cache_age: cacheAge
        };
      }
    }
    return null;
  }

  /**
   * Clear cached results
   */
  clearCache() {
    this.checkResults = null;
    this.lastCheckTime = null;
  }

  /**
   * Check if startup validation is needed for profiles
   * @param {string[]} profiles - Selected profiles
   * @returns {boolean} True if validation is needed
   */
  isValidationNeeded(profiles) {
    const servicesToValidate = this.getServicesForProfiles(profiles);
    return servicesToValidate.length > 0;
  }

  /**
   * Get quick status of last validation
   * @returns {Object} Quick status
   */
  getQuickStatus() {
    if (!this.checkResults) {
      return {
        status: 'not_checked',
        message: 'No dependency validation performed yet'
      };
    }

    const cacheAge = Date.now() - this.lastCheckTime;
    const isStale = cacheAge > 300000; // 5 minutes

    if (!this.checkResults.success) {
      return {
        status: 'error',
        message: 'Last dependency check failed',
        error: this.checkResults.error,
        stale: isStale
      };
    }

    if (!this.checkResults.validation.valid) {
      return {
        status: 'issues',
        message: `${this.checkResults.validation.summary.total_critical_failures} critical dependencies unavailable`,
        critical_failures: this.checkResults.validation.summary.total_critical_failures,
        stale: isStale
      };
    }

    return {
      status: 'healthy',
      message: 'All critical dependencies available',
      services_tested: this.checkResults.validation.summary.services_tested,
      stale: isStale
    };
  }
}

module.exports = StartupDependencyChecker;