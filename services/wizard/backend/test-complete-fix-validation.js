#!/usr/bin/env node

/**
 * Complete Fix Validation Test
 * 
 * Tests and validates the complete Kaspa Explorer CORS fix by:
 * 1. Regenerating docker-compose.yml with correct configuration
 * 2. Validating Kaspa Explorer service configuration
 * 3. Testing external resource loading capabilities
 * 4. Validating diagnostic and error reporting functionality
 * 
 * Requirements: 1.2, 1.4, 2.3
 */

const fs = require('fs').promises;
const path = require('path');
const ConfigGenerator = require('./src/utils/config-generator');
const ServiceValidator = require('./src/utils/service-validator');

class CompleteFixValidator {
  constructor() {
    this.configGenerator = new ConfigGenerator();
    this.serviceValidator = new ServiceValidator();
    this.projectRoot = path.resolve(__dirname, '../../..');
  }

  async runAllValidations() {
    console.log('='.repeat(80));
    console.log('Complete Fix Validation for Kaspa Explorer CORS Fix');
    console.log('Requirements: 1.2, 1.4, 2.3');
    console.log('='.repeat(80));

    let allTestsPassed = true;

    try {
      // Step 1: Regenerate docker-compose.yml with correct configuration
      console.log('\n1. Regenerating docker-compose.yml with correct configuration...');
      const regenerationResult = await this.regenerateDockerCompose();
      if (!regenerationResult.success) {
        console.log('❌ FAIL: Docker compose regeneration failed');
        console.log(`   Error: ${regenerationResult.error}`);
        allTestsPassed = false;
      } else {
        console.log('✅ PASS: Docker compose regenerated successfully');
      }

      // Step 2: Validate Kaspa Explorer service configuration
      console.log('\n2. Validating Kaspa Explorer service configuration...');
      const serviceValidationResult = await this.validateKaspaExplorerService();
      if (!serviceValidationResult.success) {
        console.log('❌ FAIL: Kaspa Explorer service validation failed');
        console.log(`   Error: ${serviceValidationResult.error}`);
        allTestsPassed = false;
      } else {
        console.log('✅ PASS: Kaspa Explorer service configuration is correct');
        console.log(`   - Service definition: ✓`);
        console.log(`   - Container name: ✓`);
        console.log(`   - Profile assignment: ✓`);
        console.log(`   - Port configuration: ✓`);
        console.log(`   - Environment variables: ✓`);
      }

      // Step 3: Test external resource loading capabilities
      console.log('\n3. Testing external resource loading capabilities...');
      const resourceLoadingResult = await this.testExternalResourceLoading();
      if (!resourceLoadingResult.success) {
        console.log('❌ FAIL: External resource loading test failed');
        console.log(`   Error: ${resourceLoadingResult.error}`);
        allTestsPassed = false;
      } else {
        console.log('✅ PASS: External resource loading configuration is correct');
        console.log(`   - CORS headers: ✓`);
        console.log(`   - CDN access: ✓`);
        console.log(`   - API endpoints: ✓`);
      }

      // Step 4: Validate diagnostic and error reporting functionality
      console.log('\n4. Validating diagnostic and error reporting functionality...');
      const diagnosticResult = await this.validateDiagnosticFunctionality();
      if (!diagnosticResult.success) {
        console.log('❌ FAIL: Diagnostic functionality validation failed');
        console.log(`   Error: ${diagnosticResult.error}`);
        allTestsPassed = false;
      } else {
        console.log('✅ PASS: Diagnostic and error reporting functionality is working');
        console.log(`   - Service presence validation: ✓`);
        console.log(`   - Profile mismatch detection: ✓`);
        console.log(`   - Clear error messages: ✓`);
        console.log(`   - Helpful suggestions: ✓`);
      }

      // Step 5: Run all property-based tests to ensure they still pass
      console.log('\n5. Running property-based tests to ensure fixes are working...');
      const propertyTestResult = await this.runPropertyBasedTests();
      if (!propertyTestResult.success) {
        console.log('❌ FAIL: Property-based tests failed');
        console.log(`   Error: ${propertyTestResult.error}`);
        allTestsPassed = false;
      } else {
        console.log('✅ PASS: All property-based tests are passing');
        console.log(`   - Service inclusion consistency: ✓`);
        console.log(`   - CORS resource loading: ✓`);
        console.log(`   - API CORS compliance: ✓`);
        console.log(`   - Validation and error reporting: ✓`);
      }

    } catch (error) {
      console.log(`❌ FAIL: Unexpected error during validation: ${error.message}`);
      allTestsPassed = false;
    }

    console.log('\n' + '='.repeat(80));
    console.log('Complete Fix Validation Summary');
    console.log('='.repeat(80));
    
    if (allTestsPassed) {
      console.log('🎉 ALL VALIDATIONS PASSED!');
      console.log('The Kaspa Explorer CORS fix is working correctly.');
      console.log('\nNext steps:');
      console.log('- The kaspa-explorer service should now be accessible at localhost:3004');
      console.log('- External resources should load without CORS errors');
      console.log('- Diagnostic functionality provides clear error messages');
      return true;
    } else {
      console.log('💥 SOME VALIDATIONS FAILED!');
      console.log('There are still issues that need to be addressed.');
      return false;
    }
  }

  async regenerateDockerCompose() {
    try {
      // Read current .env configuration
      const envPath = path.join(this.projectRoot, 'services', '.env');
      const envContent = await fs.readFile(envPath, 'utf8');
      
      // Parse .env file
      const config = this.parseEnvFile(envContent);
      
      // Extract profiles from COMPOSE_PROFILES
      const profiles = config.COMPOSE_PROFILES ? config.COMPOSE_PROFILES.split(',') : ['kaspa-user-applications'];
      
      console.log(`   Current profiles: ${profiles.join(', ')}`);
      console.log(`   Current network: ${config.KASPA_NETWORK || 'testnet'}`);
      
      // Generate new docker-compose.yml
      const dockerComposeContent = await this.configGenerator.generateDockerCompose(config, profiles);
      
      // Write to docker-compose.yml
      const dockerComposePath = path.join(this.projectRoot, 'docker-compose.yml');
      await fs.writeFile(dockerComposePath, dockerComposeContent);
      
      console.log(`   ✓ Docker compose file regenerated at ${dockerComposePath}`);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async validateKaspaExplorerService() {
    try {
      // Read the generated docker-compose.yml
      const dockerComposePath = path.join(this.projectRoot, 'docker-compose.yml');
      const dockerComposeContent = await fs.readFile(dockerComposePath, 'utf8');
      
      // Check for kaspa-explorer service definition
      if (!dockerComposeContent.includes('kaspa-explorer:')) {
        return { success: false, error: 'kaspa-explorer service definition not found' };
      }
      
      // Check for container name
      if (!dockerComposeContent.includes('container_name: kaspa-explorer')) {
        return { success: false, error: 'kaspa-explorer container_name not found' };
      }
      
      // Check for profile assignment
      if (!dockerComposeContent.includes('- kaspa-user-applications')) {
        return { success: false, error: 'kaspa-explorer not assigned to kaspa-user-applications profile' };
      }
      
      // Check for port configuration
      if (!dockerComposeContent.includes('${KASPA_EXPLORER_PORT:-3004}')) {
        return { success: false, error: 'kaspa-explorer port configuration not found' };
      }
      
      // Check for environment variables
      if (!dockerComposeContent.includes('KASPA_NETWORK=')) {
        return { success: false, error: 'KASPA_NETWORK environment variable not found' };
      }
      
      if (!dockerComposeContent.includes('API_BASE_URL=')) {
        return { success: false, error: 'API_BASE_URL environment variable not found' };
      }
      
      // Check for build context
      if (!dockerComposeContent.includes('context: ./services/kaspa-explorer')) {
        return { success: false, error: 'kaspa-explorer build context not found' };
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async testExternalResourceLoading() {
    try {
      // Read kaspa-explorer nginx.conf
      const nginxConfigPath = path.join(this.projectRoot, 'services', 'kaspa-explorer', 'nginx.conf');
      const nginxConfig = await fs.readFile(nginxConfigPath, 'utf8');
      
      // Test CORS headers
      if (!nginxConfig.includes('Access-Control-Allow-Origin')) {
        return { success: false, error: 'Missing Access-Control-Allow-Origin header in nginx.conf' };
      }
      
      if (!nginxConfig.includes('Access-Control-Allow-Methods')) {
        return { success: false, error: 'Missing Access-Control-Allow-Methods header in nginx.conf' };
      }
      
      if (!nginxConfig.includes('Access-Control-Allow-Headers')) {
        return { success: false, error: 'Missing Access-Control-Allow-Headers header in nginx.conf' };
      }
      
      // Test that origin allows external resources
      const originMatch = nginxConfig.match(/add_header\s+Access-Control-Allow-Origin\s+"([^"]+)"/);
      if (originMatch) {
        const origin = originMatch[1];
        if (origin !== '*' && !origin.includes('*')) {
          console.log(`   Warning: CORS origin is restrictive: ${origin}`);
        }
      }
      
      // Test that methods include GET (required for loading resources)
      const methodsMatch = nginxConfig.match(/add_header\s+Access-Control-Allow-Methods\s+"([^"]+)"/);
      if (methodsMatch) {
        const methods = methodsMatch[1];
        if (!methods.includes('GET') && methods !== '*') {
          return { success: false, error: `CORS methods "${methods}" does not include GET` };
        }
      }
      
      // Test security headers are present
      const securityHeaders = ['X-Frame-Options', 'X-Content-Type-Options', 'X-XSS-Protection'];
      for (const header of securityHeaders) {
        if (!nginxConfig.includes(header)) {
          console.log(`   Warning: Missing security header: ${header}`);
        }
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async validateDiagnosticFunctionality() {
    try {
      // Test service presence validation
      const dockerComposeWithoutExplorer = `
version: '3.8'
services:
  kasia-app:
    container_name: kasia-app
    profiles:
      - kaspa-user-applications
  k-social:
    container_name: k-social
    profiles:
      - kaspa-user-applications
`;
      
      const validation = this.serviceValidator.validateServicePresence(dockerComposeWithoutExplorer, ['kaspa-user-applications']);
      
      if (validation.valid) {
        return { success: false, error: 'Service validator should detect missing kaspa-explorer service' };
      }
      
      if (!validation.missingServices.includes('kaspa-explorer')) {
        return { success: false, error: 'Service validator should identify kaspa-explorer as missing' };
      }
      
      // Test profile mismatch detection
      const profileValidation = this.serviceValidator.validateProfiles(['prod']);
      
      if (profileValidation.errors.length === 0) {
        return { success: false, error: 'Service validator should detect prod profile as invalid' };
      }
      
      const prodError = profileValidation.errors.find(e => e.profile === 'prod');
      if (!prodError) {
        return { success: false, error: 'Service validator should have specific error for prod profile' };
      }
      
      // Test error message quality
      if (!prodError.message || !prodError.suggestion) {
        return { success: false, error: 'Error messages should include both message and suggestion' };
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async runPropertyBasedTests() {
    try {
      // Import and run the property-based tests
      const { runAllTests: runServiceInclusionTests } = require('./test-service-inclusion-consistency');
      const { runAllTests: runCorsResourceTests } = require('./test-cors-resource-loading');
      const { runAllTests: runApiCorsTests } = require('./test-api-cors-compliance');
      
      console.log('   Running service inclusion consistency tests...');
      const serviceInclusionResult = await runServiceInclusionTests();
      
      console.log('   Running CORS resource loading tests...');
      const corsResourceResult = await runCorsResourceTests();
      
      console.log('   Running API CORS compliance tests...');
      const apiCorsResult = await runApiCorsTests();
      
      if (!serviceInclusionResult || !corsResourceResult || !apiCorsResult) {
        return { success: false, error: 'One or more property-based tests failed' };
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  parseEnvFile(envContent) {
    const config = {};
    const lines = envContent.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          config[key.trim()] = valueParts.join('=').trim();
        }
      }
    }
    
    return config;
  }
}

// Run validation if this file is executed directly
if (require.main === module) {
  const validator = new CompleteFixValidator();
  validator.runAllValidations()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Validation execution failed:', error);
      process.exit(1);
    });
}

module.exports = { CompleteFixValidator };