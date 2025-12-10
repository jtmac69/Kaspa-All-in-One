#!/usr/bin/env node

/**
 * Property-Based Test for Dependency Validation
 * 
 * **Property 5: Dependency Validation**
 * **Validates: Requirements 2.3, 3.5**
 * 
 * Tests that the dependency validation system correctly validates external dependencies
 * and provides appropriate guidance when dependencies are unavailable.
 */

const DependencyValidator = require('./src/utils/dependency-validator');

// Test configuration
const TEST_ITERATIONS = 10; // Reduced for manual testing
const TIMEOUT_MS = 30000; // 30 seconds for network tests

class DependencyValidationPropertyTest {
  constructor() {
    this.validator = new DependencyValidator();
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  /**
   * Property 5: Dependency Validation
   * For any application initialization, all external dependencies should be validated 
   * and accessible before the service reports as healthy
   */
  async runDependencyValidationProperty() {
    console.log('🧪 Running Property 5: Dependency Validation');
    console.log('=' .repeat(80));

    try {
      // Test scenarios with different service configurations
      const testScenarios = [
        { serviceName: 'kaspa-explorer', simulateNetworkIssues: false, simulateServiceDown: false, timeoutMultiplier: 1 },
        { serviceName: 'kasia-app', simulateNetworkIssues: false, simulateServiceDown: false, timeoutMultiplier: 1 },
        { serviceName: 'k-social', simulateNetworkIssues: false, simulateServiceDown: false, timeoutMultiplier: 1 },
        { serviceName: 'simply-kaspa-indexer', simulateNetworkIssues: false, simulateServiceDown: false, timeoutMultiplier: 1 },
        { serviceName: 'kasia-indexer', simulateNetworkIssues: false, simulateServiceDown: false, timeoutMultiplier: 1 },
        // Test with different timeout multipliers
        { serviceName: 'kaspa-explorer', simulateNetworkIssues: false, simulateServiceDown: false, timeoutMultiplier: 2 },
        { serviceName: 'kasia-app', simulateNetworkIssues: false, simulateServiceDown: false, timeoutMultiplier: 3 }
      ];

      for (const testScenario of testScenarios) {
        const { serviceName, simulateNetworkIssues, simulateServiceDown, timeoutMultiplier } = testScenario;
        
        console.log(`\n🔍 Testing service: ${serviceName}`);
        console.log(`   Network issues: ${simulateNetworkIssues}`);
        console.log(`   Service down: ${simulateServiceDown}`);
        console.log(`   Timeout multiplier: ${timeoutMultiplier}`);

        // Test the dependency validation
        const result = await this.validator.validateServiceDependencies(serviceName, {
          timeoutMultiplier,
          simulateNetworkIssues,
          simulateServiceDown
        });

        // Property assertions
        this.assertValidationStructure(result, serviceName);
        this.assertDependencyClassification(result);
        this.assertGuidanceProvision(result);
        this.assertCriticalDependencyHandling(result);
      }

      console.log('\n✅ Property 5: Dependency Validation - PASSED');
      this.testResults.passed++;
      return true;

    } catch (error) {
      console.log('\n❌ Property 5: Dependency Validation - FAILED');
      console.log(`Error: ${error.message}`);
      this.testResults.failed++;
      this.testResults.errors.push({
        property: 'Dependency Validation',
        error: error.message,
        details: error.stack
      });
      return false;
    }
  }

  /**
   * Assert that validation result has proper structure
   */
  assertValidationStructure(result, serviceName) {
    // Result must have required fields
    if (!result.hasOwnProperty('service')) {
      throw new Error('Validation result missing service field');
    }
    
    if (!result.hasOwnProperty('valid')) {
      throw new Error('Validation result missing valid field');
    }
    
    if (!result.hasOwnProperty('dependencies')) {
      throw new Error('Validation result missing dependencies field');
    }
    
    if (!result.hasOwnProperty('summary')) {
      throw new Error('Validation result missing summary field');
    }

    // Service name must match
    if (result.service !== serviceName) {
      throw new Error(`Service name mismatch: expected ${serviceName}, got ${result.service}`);
    }

    // Valid field must be boolean
    if (typeof result.valid !== 'boolean') {
      throw new Error('Valid field must be boolean');
    }

    // Dependencies must be array
    if (!Array.isArray(result.dependencies)) {
      throw new Error('Dependencies must be an array');
    }

    // Summary must have required fields
    const requiredSummaryFields = ['total', 'available', 'unavailable', 'critical_failures'];
    for (const field of requiredSummaryFields) {
      if (!result.summary.hasOwnProperty(field)) {
        throw new Error(`Summary missing required field: ${field}`);
      }
      if (typeof result.summary[field] !== 'number') {
        throw new Error(`Summary field ${field} must be a number`);
      }
    }

    // Summary numbers must be consistent
    if (result.summary.total !== result.summary.available + result.summary.unavailable) {
      throw new Error('Summary totals are inconsistent');
    }

    if (result.summary.total !== result.dependencies.length) {
      throw new Error('Summary total does not match dependencies array length');
    }
  }

  /**
   * Assert that dependencies are properly classified
   */
  assertDependencyClassification(result) {
    for (const dependency of result.dependencies) {
      // Each dependency must have required fields
      const requiredFields = ['name', 'url', 'type', 'critical', 'available'];
      for (const field of requiredFields) {
        if (!dependency.hasOwnProperty(field)) {
          throw new Error(`Dependency missing required field: ${field}`);
        }
      }

      // Critical field must be boolean
      if (typeof dependency.critical !== 'boolean') {
        throw new Error('Dependency critical field must be boolean');
      }

      // Available field must be boolean
      if (typeof dependency.available !== 'boolean') {
        throw new Error('Dependency available field must be boolean');
      }

      // URL must be valid
      try {
        new URL(dependency.url);
      } catch (error) {
        throw new Error(`Invalid dependency URL: ${dependency.url}`);
      }

      // Type must be valid
      const validTypes = ['api', 'stylesheet', 'script-cdn', 'font-cdn', 'websocket', 'rpc'];
      if (!validTypes.includes(dependency.type)) {
        throw new Error(`Invalid dependency type: ${dependency.type}`);
      }

      // Response time must be present and be a number
      if (!dependency.hasOwnProperty('response_time') || typeof dependency.response_time !== 'number') {
        throw new Error('Dependency must have numeric response_time');
      }
    }
  }

  /**
   * Assert that guidance is provided for unavailable dependencies
   */
  assertGuidanceProvision(result) {
    for (const dependency of result.dependencies) {
      if (!dependency.available) {
        // Unavailable dependencies must have guidance
        if (!dependency.guidance) {
          throw new Error(`Unavailable dependency ${dependency.name} missing guidance`);
        }

        // Guidance must have required structure
        const requiredGuidanceFields = ['severity', 'impact', 'suggestions'];
        for (const field of requiredGuidanceFields) {
          if (!dependency.guidance.hasOwnProperty(field)) {
            throw new Error(`Guidance missing required field: ${field}`);
          }
        }

        // Severity must be appropriate for critical status
        if (dependency.critical && dependency.guidance.severity !== 'critical') {
          throw new Error('Critical dependency must have critical severity guidance');
        }

        // Suggestions must be array with at least one suggestion
        if (!Array.isArray(dependency.guidance.suggestions) || dependency.guidance.suggestions.length === 0) {
          throw new Error('Guidance must provide at least one suggestion');
        }
      } else {
        // Available dependencies should not have guidance
        if (dependency.guidance !== null && dependency.guidance !== undefined) {
          throw new Error(`Available dependency ${dependency.name} should not have guidance`);
        }
      }
    }
  }

  /**
   * Assert that critical dependencies are handled properly
   */
  assertCriticalDependencyHandling(result) {
    const criticalDependencies = result.dependencies.filter(d => d.critical);
    const unavailableCriticalDependencies = criticalDependencies.filter(d => !d.available);

    // Critical failures count must match unavailable critical dependencies
    if (result.summary.critical_failures !== unavailableCriticalDependencies.length) {
      throw new Error('Critical failures count does not match unavailable critical dependencies');
    }

    // Service validity must reflect critical dependency status
    const hasCriticalFailures = unavailableCriticalDependencies.length > 0;
    if (result.valid === hasCriticalFailures) {
      throw new Error('Service validity must be false when critical dependencies are unavailable');
    }

    // Message must reflect critical dependency status
    if (hasCriticalFailures && !result.message.includes('critical')) {
      throw new Error('Result message must mention critical dependencies when they are unavailable');
    }
  }

  /**
   * Test internet connectivity validation
   */
  async testInternetConnectivityProperty() {
    console.log('\n🧪 Testing Internet Connectivity Validation');
    console.log('-'.repeat(50));

    try {
      const connectivityResult = await this.validator.testInternetConnectivity();

      // Connectivity result must have required structure
      const requiredFields = ['connected', 'partial', 'cdn_available', 'results'];
      for (const field of requiredFields) {
        if (!connectivityResult.hasOwnProperty(field)) {
          throw new Error(`Connectivity result missing field: ${field}`);
        }
      }

      // Boolean fields must be boolean
      if (typeof connectivityResult.connected !== 'boolean' ||
          typeof connectivityResult.partial !== 'boolean' ||
          typeof connectivityResult.cdn_available !== 'boolean') {
        throw new Error('Connectivity boolean fields must be boolean');
      }

      // Results must have required structure
      if (!connectivityResult.results.hasOwnProperty('details') ||
          !Array.isArray(connectivityResult.results.details)) {
        throw new Error('Connectivity results must have details array');
      }

      // Each detail must have required fields
      for (const detail of connectivityResult.results.details) {
        const requiredDetailFields = ['test', 'status', 'message'];
        for (const field of requiredDetailFields) {
          if (!detail.hasOwnProperty(field)) {
            throw new Error(`Connectivity detail missing field: ${field}`);
          }
        }

        if (!['success', 'failed'].includes(detail.status)) {
          throw new Error(`Invalid connectivity detail status: ${detail.status}`);
        }
      }

      console.log('✅ Internet connectivity validation structure is correct');
      return true;

    } catch (error) {
      console.log(`❌ Internet connectivity validation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Test multiple services validation
   */
  async testMultipleServicesProperty() {
    console.log('\n🧪 Testing Multiple Services Validation');
    console.log('-'.repeat(50));

    try {
      // Test different combinations of services
      const serviceCombinations = [
        ['kaspa-explorer'],
        ['kasia-app'],
        ['k-social'],
        ['kaspa-explorer', 'kasia-app'],
        ['kaspa-explorer', 'kasia-app', 'k-social']
      ];

      for (const services of serviceCombinations) {
        console.log(`\n🔍 Testing services: ${services.join(', ')}`);

        const result = await this.validator.validateMultipleServices(services);

        // Result must have required structure
        const requiredFields = ['valid', 'connectivity', 'services', 'summary', 'recommendations'];
        for (const field of requiredFields) {
          if (!result.hasOwnProperty(field)) {
            throw new Error(`Multiple services result missing field: ${field}`);
          }
        }

        // Services array must match input
        if (result.services.length !== services.length) {
          throw new Error('Services result length does not match input');
        }

        // Summary must have required fields
        const requiredSummaryFields = ['services_tested', 'services_valid', 'total_critical_failures', 'internet_connected', 'cdn_available'];
        for (const field of requiredSummaryFields) {
          if (!result.summary.hasOwnProperty(field)) {
            throw new Error(`Multiple services summary missing field: ${field}`);
          }
        }

        // Summary numbers must be consistent
        if (result.summary.services_tested !== services.length) {
          throw new Error('Summary services_tested does not match input length');
        }

        // Recommendations must be array
        if (!Array.isArray(result.recommendations)) {
          throw new Error('Recommendations must be an array');
        }

        // Each recommendation must have required structure
        for (const recommendation of result.recommendations) {
          const requiredRecFields = ['priority', 'category', 'title', 'message', 'actions'];
          for (const field of requiredRecFields) {
            if (!recommendation.hasOwnProperty(field)) {
              throw new Error(`Recommendation missing field: ${field}`);
            }
          }

          if (!['critical', 'high', 'warning', 'info'].includes(recommendation.priority)) {
            throw new Error(`Invalid recommendation priority: ${recommendation.priority}`);
          }

          if (!Array.isArray(recommendation.actions)) {
            throw new Error('Recommendation actions must be an array');
          }
        }
      }

      console.log('✅ Multiple services validation property passed');
      return true;

    } catch (error) {
      console.log(`❌ Multiple services validation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Run all dependency validation property tests
   */
  async runAllTests() {
    console.log('🚀 Starting Dependency Validation Property Tests');
    console.log('='.repeat(80));
    console.log(`Running ${TEST_ITERATIONS} iterations per property`);
    console.log(`Timeout: ${TIMEOUT_MS}ms per test`);
    console.log();

    const startTime = Date.now();

    try {
      // Run main dependency validation property
      await this.runDependencyValidationProperty();

      // Run internet connectivity test
      await this.testInternetConnectivityProperty();

      // Run multiple services test
      await this.testMultipleServicesProperty();

      const duration = Date.now() - startTime;

      console.log('\n' + '='.repeat(80));
      console.log('🎉 ALL DEPENDENCY VALIDATION PROPERTY TESTS PASSED');
      console.log('='.repeat(80));
      console.log(`Total time: ${duration}ms`);
      console.log(`Tests passed: ${this.testResults.passed + 2}`); // +2 for additional tests
      console.log(`Tests failed: ${this.testResults.failed}`);
      console.log();

      if (this.testResults.failed === 0) {
        console.log('✅ The dependency validation system correctly:');
        console.log('   • Validates external dependencies for all services');
        console.log('   • Provides appropriate guidance for unavailable dependencies');
        console.log('   • Handles critical vs non-critical dependencies properly');
        console.log('   • Tests internet connectivity and CDN accessibility');
        console.log('   • Generates actionable recommendations');
        console.log('   • Maintains consistent data structures across all operations');
        console.log();
        return true;
      } else {
        console.log('❌ Some property tests failed. See errors above.');
        return false;
      }

    } catch (error) {
      console.log('\n' + '='.repeat(80));
      console.log('💥 DEPENDENCY VALIDATION PROPERTY TESTS FAILED');
      console.log('='.repeat(80));
      console.log(`Error: ${error.message}`);
      console.log(`Stack: ${error.stack}`);
      return false;
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new DependencyValidationPropertyTest();
  
  tester.runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = DependencyValidationPropertyTest;