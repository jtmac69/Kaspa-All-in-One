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
          url: 'https://indexer.kaspatalk.net/health',
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
}

module.exports = DependencyValidator;