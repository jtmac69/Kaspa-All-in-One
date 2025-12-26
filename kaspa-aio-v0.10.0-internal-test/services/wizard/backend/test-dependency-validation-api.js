#!/usr/bin/env node

/**
 * Test Dependency Validation API Integration
 * 
 * Tests the API endpoints for dependency validation functionality.
 */

const http = require('http');

// Test configuration
const API_BASE_URL = 'http://localhost:3000';
const TEST_TIMEOUT = 30000;

class DependencyValidationAPITest {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  /**
   * Make HTTP request to API
   */
  async makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, API_BASE_URL);
      
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Dependency-Validation-API-Test/1.0'
        },
        timeout: TEST_TIMEOUT
      };

      const req = http.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          try {
            const parsedData = JSON.parse(responseData);
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              data: parsedData
            });
          } catch (error) {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              data: responseData
            });
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  /**
   * Test health check endpoint
   */
  async testHealthCheck() {
    console.log('🧪 Testing dependency validation health check...');
    
    try {
      const response = await this.makeRequest('GET', '/api/dependencies/health');
      
      if (response.statusCode === 200 && response.data.success) {
        console.log('✅ Health check passed');
        this.testResults.passed++;
        return true;
      } else {
        console.log(`❌ Health check failed: ${response.statusCode}`);
        this.testResults.failed++;
        return false;
      }
    } catch (error) {
      console.log(`❌ Health check error: ${error.message}`);
      this.testResults.failed++;
      return false;
    }
  }

  /**
   * Test single service validation
   */
  async testSingleServiceValidation() {
    console.log('🧪 Testing single service validation...');
    
    try {
      const response = await this.makeRequest('GET', '/api/dependencies/validate/kaspa-explorer');
      
      if (response.statusCode === 200 && response.data.success) {
        const validation = response.data.validation;
        
        // Verify response structure
        if (!validation.hasOwnProperty('service') || 
            !validation.hasOwnProperty('valid') ||
            !validation.hasOwnProperty('dependencies') ||
            !validation.hasOwnProperty('summary')) {
          throw new Error('Invalid validation response structure');
        }
        
        console.log('✅ Single service validation passed');
        console.log(`   Service: ${validation.service}`);
        console.log(`   Valid: ${validation.valid}`);
        console.log(`   Dependencies: ${validation.dependencies.length}`);
        console.log(`   Critical failures: ${validation.summary.critical_failures}`);
        
        this.testResults.passed++;
        return true;
      } else {
        console.log(`❌ Single service validation failed: ${response.statusCode}`);
        console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
        this.testResults.failed++;
        return false;
      }
    } catch (error) {
      console.log(`❌ Single service validation error: ${error.message}`);
      this.testResults.failed++;
      return false;
    }
  }

  /**
   * Test multiple services validation
   */
  async testMultipleServicesValidation() {
    console.log('🧪 Testing multiple services validation...');
    
    try {
      const requestData = {
        services: ['kaspa-explorer', 'kasia-app'],
        options: {
          timeoutMultiplier: 1
        }
      };
      
      const response = await this.makeRequest('POST', '/api/dependencies/validate-multiple', requestData);
      
      if (response.statusCode === 200 && response.data.success) {
        const validation = response.data.validation;
        
        // Verify response structure
        if (!validation.hasOwnProperty('valid') || 
            !validation.hasOwnProperty('connectivity') ||
            !validation.hasOwnProperty('services') ||
            !validation.hasOwnProperty('summary') ||
            !validation.hasOwnProperty('recommendations')) {
          throw new Error('Invalid multiple services validation response structure');
        }
        
        console.log('✅ Multiple services validation passed');
        console.log(`   Services tested: ${validation.summary.services_tested}`);
        console.log(`   Services valid: ${validation.summary.services_valid}`);
        console.log(`   Critical failures: ${validation.summary.total_critical_failures}`);
        console.log(`   Internet connected: ${validation.summary.internet_connected}`);
        
        this.testResults.passed++;
        return true;
      } else {
        console.log(`❌ Multiple services validation failed: ${response.statusCode}`);
        console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
        this.testResults.failed++;
        return false;
      }
    } catch (error) {
      console.log(`❌ Multiple services validation error: ${error.message}`);
      this.testResults.failed++;
      return false;
    }
  }

  /**
   * Test connectivity check
   */
  async testConnectivityCheck() {
    console.log('🧪 Testing connectivity check...');
    
    try {
      const response = await this.makeRequest('GET', '/api/dependencies/connectivity');
      
      if (response.statusCode === 200 && response.data.success) {
        const connectivity = response.data.connectivity;
        
        // Verify response structure
        if (!connectivity.hasOwnProperty('connected') || 
            !connectivity.hasOwnProperty('partial') ||
            !connectivity.hasOwnProperty('cdn_available') ||
            !connectivity.hasOwnProperty('results')) {
          throw new Error('Invalid connectivity response structure');
        }
        
        console.log('✅ Connectivity check passed');
        console.log(`   Connected: ${connectivity.connected}`);
        console.log(`   CDN available: ${connectivity.cdn_available}`);
        console.log(`   Test details: ${connectivity.results.details.length} tests`);
        
        this.testResults.passed++;
        return true;
      } else {
        console.log(`❌ Connectivity check failed: ${response.statusCode}`);
        console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
        this.testResults.failed++;
        return false;
      }
    } catch (error) {
      console.log(`❌ Connectivity check error: ${error.message}`);
      this.testResults.failed++;
      return false;
    }
  }

  /**
   * Test startup check
   */
  async testStartupCheck() {
    console.log('🧪 Testing startup dependency check...');
    
    try {
      const requestData = {
        profiles: ['kaspa-user-applications'],
        config: {}
      };
      
      const response = await this.makeRequest('POST', '/api/dependencies/startup-check', requestData);
      
      if (response.statusCode === 200 && response.data.success) {
        const validation = response.data.validation;
        
        console.log('✅ Startup dependency check passed');
        console.log(`   Profiles: ${response.data.profiles.join(', ')}`);
        console.log(`   Services: ${response.data.services.join(', ')}`);
        console.log(`   Valid: ${validation.valid}`);
        console.log(`   Recommendations: ${response.data.recommendations.length}`);
        
        this.testResults.passed++;
        return true;
      } else {
        console.log(`❌ Startup dependency check failed: ${response.statusCode}`);
        console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
        this.testResults.failed++;
        return false;
      }
    } catch (error) {
      console.log(`❌ Startup dependency check error: ${error.message}`);
      this.testResults.failed++;
      return false;
    }
  }

  /**
   * Test service summary
   */
  async testServiceSummary() {
    console.log('🧪 Testing service dependency summary...');
    
    try {
      const response = await this.makeRequest('GET', '/api/dependencies/summary/kaspa-explorer');
      
      if (response.statusCode === 200 && response.data.success) {
        const summary = response.data.summary;
        
        // Verify response structure
        if (!summary.hasOwnProperty('service') || 
            !summary.hasOwnProperty('status') ||
            !summary.hasOwnProperty('total_dependencies') ||
            !summary.hasOwnProperty('available_dependencies')) {
          throw new Error('Invalid service summary response structure');
        }
        
        console.log('✅ Service dependency summary passed');
        console.log(`   Service: ${summary.service}`);
        console.log(`   Status: ${summary.status}`);
        console.log(`   Dependencies: ${summary.available_dependencies}/${summary.total_dependencies}`);
        
        this.testResults.passed++;
        return true;
      } else {
        console.log(`❌ Service dependency summary failed: ${response.statusCode}`);
        console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
        this.testResults.failed++;
        return false;
      }
    } catch (error) {
      console.log(`❌ Service dependency summary error: ${error.message}`);
      this.testResults.failed++;
      return false;
    }
  }

  /**
   * Run all API tests
   */
  async runAllTests() {
    console.log('🚀 Starting Dependency Validation API Tests');
    console.log('='.repeat(80));
    console.log(`API Base URL: ${API_BASE_URL}`);
    console.log(`Timeout: ${TEST_TIMEOUT}ms`);
    console.log();

    const startTime = Date.now();

    try {
      // Test all endpoints
      await this.testHealthCheck();
      await this.testSingleServiceValidation();
      await this.testMultipleServicesValidation();
      await this.testConnectivityCheck();
      await this.testStartupCheck();
      await this.testServiceSummary();

      const duration = Date.now() - startTime;

      console.log('\n' + '='.repeat(80));
      if (this.testResults.failed === 0) {
        console.log('🎉 ALL DEPENDENCY VALIDATION API TESTS PASSED');
      } else {
        console.log('❌ SOME DEPENDENCY VALIDATION API TESTS FAILED');
      }
      console.log('='.repeat(80));
      console.log(`Total time: ${duration}ms`);
      console.log(`Tests passed: ${this.testResults.passed}`);
      console.log(`Tests failed: ${this.testResults.failed}`);
      console.log();

      if (this.testResults.failed === 0) {
        console.log('✅ The dependency validation API correctly:');
        console.log('   • Provides health check endpoint');
        console.log('   • Validates single service dependencies');
        console.log('   • Validates multiple services at once');
        console.log('   • Tests internet connectivity');
        console.log('   • Performs startup dependency checks');
        console.log('   • Provides service dependency summaries');
        console.log();
        return true;
      } else {
        console.log('❌ Some API tests failed. Check the server logs for details.');
        return false;
      }

    } catch (error) {
      console.log('\n' + '='.repeat(80));
      console.log('💥 DEPENDENCY VALIDATION API TESTS FAILED');
      console.log('='.repeat(80));
      console.log(`Error: ${error.message}`);
      console.log(`Stack: ${error.stack}`);
      return false;
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new DependencyValidationAPITest();
  
  console.log('⚠️  Note: This test requires the wizard backend server to be running on port 3000');
  console.log('   Start the server with: npm start');
  console.log();
  
  tester.runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = DependencyValidationAPITest;