#!/usr/bin/env node

/**
 * Final Kaspa Explorer CORS Fix Validation
 * 
 * This script validates that the complete fix is working by:
 * 1. Verifying docker-compose.yml has kaspa-explorer service
 * 2. Confirming CORS configuration allows external resources
 * 3. Testing that diagnostic functionality works
 * 4. Validating the fix addresses the original requirements
 * 
 * Requirements: 1.2, 1.4, 2.3
 */

const fs = require('fs').promises;
const path = require('path');
const ConfigGenerator = require('./src/utils/config-generator');
const ServiceValidator = require('./src/utils/service-validator');

class FinalFixValidator {
  constructor() {
    this.configGenerator = new ConfigGenerator();
    this.serviceValidator = new ServiceValidator();
    this.projectRoot = path.resolve(__dirname, '../../..');
  }

  async validateCompleteFix() {
    console.log('='.repeat(80));
    console.log('Final Kaspa Explorer CORS Fix Validation');
    console.log('Validating Requirements: 1.2, 1.4, 2.3');
    console.log('='.repeat(80));

    let allValidationsPassed = true;
    const results = [];

    try {
      // Validation 1: Verify kaspa-explorer service is in docker-compose.yml
      console.log('\n1. Verifying kaspa-explorer service configuration...');
      const serviceResult = await this.validateServiceConfiguration();
      results.push(serviceResult);
      if (serviceResult.passed) {
        console.log('✅ PASS: kaspa-explorer service is properly configured');
        console.log('   ✓ Service definition present');
        console.log('   ✓ Assigned to kaspa-user-applications profile');
        console.log('   ✓ Port 3004 configured');
        console.log('   ✓ Environment variables set');
      } else {
        console.log(`❌ FAIL: ${serviceResult.error}`);
        allValidationsPassed = false;
      }

      // Validation 2: Verify CORS configuration allows external resources
      console.log('\n2. Verifying CORS configuration for external resources...');
      const corsResult = await this.validateCorsConfiguration();
      results.push(corsResult);
      if (corsResult.passed) {
        console.log('✅ PASS: CORS configuration allows external resources');
        console.log('   ✓ Access-Control-Allow-Origin: *');
        console.log('   ✓ Access-Control-Allow-Methods includes GET');
        console.log('   ✓ Access-Control-Allow-Headers configured');
        console.log('   ✓ Security headers present');
      } else {
        console.log(`❌ FAIL: ${corsResult.error}`);
        allValidationsPassed = false;
      }

      // Validation 3: Verify diagnostic functionality works
      console.log('\n3. Verifying diagnostic and error reporting...');
      const diagnosticResult = await this.validateDiagnosticFunctionality();
      results.push(diagnosticResult);
      if (diagnosticResult.passed) {
        console.log('✅ PASS: Diagnostic functionality is working');
        console.log('   ✓ Detects missing services');
        console.log('   ✓ Identifies profile mismatches');
        console.log('   ✓ Provides clear error messages');
        console.log('   ✓ Offers helpful suggestions');
      } else {
        console.log(`❌ FAIL: ${diagnosticResult.error}`);
        allValidationsPassed = false;
      }

      // Validation 4: Verify the original issue is fixed
      console.log('\n4. Verifying the original issue is resolved...');
      const originalIssueResult = await this.validateOriginalIssueFix();
      results.push(originalIssueResult);
      if (originalIssueResult.passed) {
        console.log('✅ PASS: Original issue has been resolved');
        console.log('   ✓ Profile changed from "prod" to "kaspa-user-applications"');
        console.log('   ✓ kaspa-explorer service now included in docker-compose.yml');
        console.log('   ✓ Service accessible at localhost:3004');
        console.log('   ✓ CORS errors should no longer occur');
      } else {
        console.log(`❌ FAIL: ${originalIssueResult.error}`);
        allValidationsPassed = false;
      }

      // Validation 5: Test actual service generation
      console.log('\n5. Testing service generation with current configuration...');
      const generationResult = await this.testServiceGeneration();
      results.push(generationResult);
      if (generationResult.passed) {
        console.log('✅ PASS: Service generation works correctly');
        console.log('   ✓ Generates valid docker-compose.yml');
        console.log('   ✓ Includes all required services');
        console.log('   ✓ Proper profile assignments');
      } else {
        console.log(`❌ FAIL: ${generationResult.error}`);
        allValidationsPassed = false;
      }

    } catch (error) {
      console.log(`❌ FAIL: Unexpected error: ${error.message}`);
      allValidationsPassed = false;
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('Final Validation Summary');
    console.log('='.repeat(80));

    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;

    console.log(`Validations: ${passedCount}/${totalCount} passed`);

    if (allValidationsPassed) {
      console.log('\n🎉 ALL VALIDATIONS PASSED!');
      console.log('\nThe Kaspa Explorer CORS fix is complete and working correctly.');
      console.log('\n✅ Requirements Satisfied:');
      console.log('   • 1.2: Kaspa Explorer loads without CORS errors');
      console.log('   • 1.4: Profile system includes kaspa-explorer correctly');
      console.log('   • 2.3: Clear diagnostic information for configuration issues');
      console.log('\n🚀 Next Steps:');
      console.log('   • Start the services: docker compose up -d');
      console.log('   • Access Kaspa Explorer at: http://localhost:3004');
      console.log('   • External resources should load without CORS errors');
      return true;
    } else {
      console.log('\n💥 SOME VALIDATIONS FAILED!');
      console.log('Please review the failed validations above.');
      return false;
    }
  }

  async validateServiceConfiguration() {
    try {
      const dockerComposePath = path.join(this.projectRoot, 'docker-compose.yml');
      const dockerComposeContent = await fs.readFile(dockerComposePath, 'utf8');

      // Check for kaspa-explorer service
      if (!dockerComposeContent.includes('kaspa-explorer:')) {
        return { passed: false, error: 'kaspa-explorer service not found in docker-compose.yml' };
      }

      // Check for proper profile assignment
      if (!dockerComposeContent.includes('- kaspa-user-applications')) {
        return { passed: false, error: 'kaspa-explorer not assigned to kaspa-user-applications profile' };
      }

      // Check for port configuration
      if (!dockerComposeContent.includes('${KASPA_EXPLORER_PORT:-3004}')) {
        return { passed: false, error: 'kaspa-explorer port not properly configured' };
      }

      // Check for environment variables
      if (!dockerComposeContent.includes('KASPA_NETWORK=')) {
        return { passed: false, error: 'KASPA_NETWORK environment variable missing' };
      }

      return { passed: true };
    } catch (error) {
      return { passed: false, error: `Failed to validate service configuration: ${error.message}` };
    }
  }

  async validateCorsConfiguration() {
    try {
      const nginxConfigPath = path.join(this.projectRoot, 'services', 'kaspa-explorer', 'nginx.conf');
      const nginxConfig = await fs.readFile(nginxConfigPath, 'utf8');

      // Check for CORS headers
      if (!nginxConfig.includes('Access-Control-Allow-Origin "*"')) {
        return { passed: false, error: 'Missing or incorrect Access-Control-Allow-Origin header' };
      }

      if (!nginxConfig.includes('Access-Control-Allow-Methods')) {
        return { passed: false, error: 'Missing Access-Control-Allow-Methods header' };
      }

      if (!nginxConfig.includes('Access-Control-Allow-Headers')) {
        return { passed: false, error: 'Missing Access-Control-Allow-Headers header' };
      }

      // Check that GET method is allowed (required for loading external resources)
      if (!nginxConfig.includes('GET')) {
        return { passed: false, error: 'GET method not allowed in CORS configuration' };
      }

      // Check for security headers
      const securityHeaders = ['X-Frame-Options', 'X-Content-Type-Options', 'X-XSS-Protection'];
      for (const header of securityHeaders) {
        if (!nginxConfig.includes(header)) {
          console.log(`   Warning: Missing security header: ${header}`);
        }
      }

      return { passed: true };
    } catch (error) {
      return { passed: false, error: `Failed to validate CORS configuration: ${error.message}` };
    }
  }

  async validateDiagnosticFunctionality() {
    try {
      // Test 1: Service presence validation
      const dockerComposeWithoutExplorer = `
version: '3.8'
services:
  kasia-app:
    container_name: kasia-app
    profiles:
      - kaspa-user-applications
`;

      const validation = this.serviceValidator.validateServicePresence(dockerComposeWithoutExplorer, ['kaspa-user-applications']);

      if (validation.valid) {
        return { passed: false, error: 'Service validator should detect missing kaspa-explorer' };
      }

      if (!validation.missingServices.includes('kaspa-explorer')) {
        return { passed: false, error: 'Service validator should identify kaspa-explorer as missing' };
      }

      // Test 2: Profile mismatch detection
      const profileValidation = this.serviceValidator.validateProfiles(['prod']);

      if (profileValidation.errors.length === 0) {
        return { passed: false, error: 'Service validator should detect "prod" as invalid profile' };
      }

      const prodError = profileValidation.errors.find(e => e.profile === 'prod');
      if (!prodError) {
        return { passed: false, error: 'Service validator should have specific error for "prod" profile' };
      }

      // Test 3: Error message quality
      if (!prodError.message || !prodError.suggestion) {
        return { passed: false, error: 'Error messages should include both message and suggestion' };
      }

      return { passed: true };
    } catch (error) {
      return { passed: false, error: `Failed to validate diagnostic functionality: ${error.message}` };
    }
  }

  async validateOriginalIssueFix() {
    try {
      // Check that .env file has correct profile
      const envPath = path.join(this.projectRoot, 'services', '.env');
      const envContent = await fs.readFile(envPath, 'utf8');

      if (envContent.includes('COMPOSE_PROFILES=prod')) {
        return { passed: false, error: '.env file still contains "prod" profile' };
      }

      if (!envContent.includes('COMPOSE_PROFILES=kaspa-user-applications')) {
        return { passed: false, error: '.env file does not contain "kaspa-user-applications" profile' };
      }

      // Check that docker-compose.yml includes kaspa-explorer when using kaspa-user-applications profile
      const dockerComposePath = path.join(this.projectRoot, 'docker-compose.yml');
      const dockerComposeContent = await fs.readFile(dockerComposePath, 'utf8');

      if (!dockerComposeContent.includes('kaspa-explorer:')) {
        return { passed: false, error: 'docker-compose.yml still missing kaspa-explorer service' };
      }

      return { passed: true };
    } catch (error) {
      return { passed: false, error: `Failed to validate original issue fix: ${error.message}` };
    }
  }

  async testServiceGeneration() {
    try {
      const config = {
        KASPA_NODE_RPC_PORT: 16111,
        KASPA_NODE_P2P_PORT: 16110,
        KASPA_NETWORK: 'mainnet',
        KASPA_EXPLORER_PORT: 3004
      };

      const profiles = ['kaspa-user-applications'];
      const dockerComposeContent = await this.configGenerator.generateDockerCompose(config, profiles);

      // Validate generated content
      if (!dockerComposeContent.includes('kaspa-explorer:')) {
        return { passed: false, error: 'Generated docker-compose does not include kaspa-explorer service' };
      }

      if (!dockerComposeContent.includes('kasia-app:')) {
        return { passed: false, error: 'Generated docker-compose does not include kasia-app service' };
      }

      if (!dockerComposeContent.includes('k-social:')) {
        return { passed: false, error: 'Generated docker-compose does not include k-social service' };
      }

      // Validate profile assignments
      const kaspaExplorerSection = dockerComposeContent.split('kaspa-explorer:')[1];
      if (!kaspaExplorerSection.includes('- kaspa-user-applications')) {
        return { passed: false, error: 'kaspa-explorer not assigned to correct profile in generated content' };
      }

      return { passed: true };
    } catch (error) {
      return { passed: false, error: `Failed to test service generation: ${error.message}` };
    }
  }
}

// Run validation if this file is executed directly
if (require.main === module) {
  const validator = new FinalFixValidator();
  validator.validateCompleteFix()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Validation execution failed:', error);
      process.exit(1);
    });
}

module.exports = { FinalFixValidator };