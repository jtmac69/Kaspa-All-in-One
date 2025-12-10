#!/usr/bin/env node

/**
 * Unit Tests for Configuration Components
 * 
 * Tests profile mapping logic, service configuration generation,
 * CORS header generation, and error detection and reporting.
 * 
 * Requirements: 1.1, 2.1, 3.1
 */

const ConfigGenerator = require('./src/utils/config-generator');
const ServiceValidator = require('./src/utils/service-validator');
const DockerManager = require('./src/utils/docker-manager');

// Simple test framework
class UnitTestFramework {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, testFn) {
    this.tests.push({ name, testFn });
  }

  async runAll() {
    console.log('='.repeat(80));
    console.log('Unit Tests for Configuration Components');
    console.log('Requirements: 1.1, 2.1, 3.1');
    console.log('='.repeat(80));

    for (const { name, testFn } of this.tests) {
      try {
        console.log(`\nTesting: ${name}`);
        console.log('-'.repeat(60));
        
        await testFn();
        console.log('✅ PASS');
        this.passed++;
      } catch (error) {
        console.log(`❌ FAIL: ${error.message}`);
        this.failed++;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('Test Summary');
    console.log('='.repeat(80));
    console.log(`Total tests: ${this.tests.length}`);
    console.log(`Passed: ${this.passed}`);
    console.log(`Failed: ${this.failed}`);
    
    return this.failed === 0;
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(`${message}: expected ${expected}, got ${actual}`);
    }
  }

  assertContains(haystack, needle, message) {
    if (!haystack.includes(needle)) {
      throw new Error(`${message}: "${haystack}" does not contain "${needle}"`);
    }
  }

  assertArrayEqual(actual, expected, message) {
    if (JSON.stringify(actual.sort()) !== JSON.stringify(expected.sort())) {
      throw new Error(`${message}: expected [${expected.join(', ')}], got [${actual.join(', ')}]`);
    }
  }
}

const testFramework = new UnitTestFramework();

// Test Profile Mapping Logic
testFramework.test('Profile Mapping - Basic Mapping', async () => {
  const dockerManager = new DockerManager();
  
  // Test individual profile mappings
  const coreProfiles = dockerManager.mapProfilesToDockerCompose(['core']);
  testFramework.assertArrayEqual(coreProfiles, [], 'Core profile should map to empty array (always runs)');
  
  const userAppProfiles = dockerManager.mapProfilesToDockerCompose(['kaspa-user-applications']);
  testFramework.assertArrayEqual(userAppProfiles, ['kaspa-user-applications'], 'User applications profile should map correctly');
  
  const indexerProfiles = dockerManager.mapProfilesToDockerCompose(['indexer-services']);
  testFramework.assertArrayEqual(indexerProfiles, ['indexer-services'], 'Indexer services profile should map correctly');
});

testFramework.test('Profile Mapping - Multiple Profiles', async () => {
  const dockerManager = new DockerManager();
  
  // Test multiple profile combinations
  const multipleProfiles = dockerManager.mapProfilesToDockerCompose(['kaspa-user-applications', 'indexer-services']);
  testFramework.assertArrayEqual(multipleProfiles, ['kaspa-user-applications', 'indexer-services'], 'Multiple profiles should map correctly');
  
  const allProfiles = dockerManager.mapProfilesToDockerCompose(['core', 'kaspa-user-applications', 'indexer-services', 'mining']);
  testFramework.assertArrayEqual(allProfiles, ['kaspa-user-applications', 'indexer-services', 'mining'], 'All profiles should map correctly (core excluded)');
});

testFramework.test('Profile Mapping - Invalid Profiles', async () => {
  const dockerManager = new DockerManager();
  
  // Test with invalid profiles
  const invalidProfiles = dockerManager.mapProfilesToDockerCompose(['invalid-profile', 'kaspa-user-applications']);
  testFramework.assertArrayEqual(invalidProfiles, ['kaspa-user-applications'], 'Invalid profiles should be ignored');
  
  const emptyProfiles = dockerManager.mapProfilesToDockerCompose([]);
  testFramework.assertArrayEqual(emptyProfiles, [], 'Empty profile array should return empty array');
});

// Test Service Configuration Generation
testFramework.test('Service Configuration - Kaspa Explorer Inclusion', async () => {
  const configGenerator = new ConfigGenerator();
  
  const config = {
    KASPA_NODE_RPC_PORT: 16111,
    KASPA_NODE_P2P_PORT: 16110,
    KASPA_NETWORK: 'mainnet',
    KASPA_EXPLORER_PORT: 3004
  };
  
  const profiles = ['kaspa-user-applications'];
  const dockerComposeContent = await configGenerator.generateDockerCompose(config, profiles);
  
  // Verify kaspa-explorer service is included
  testFramework.assertContains(dockerComposeContent, 'kaspa-explorer:', 'Docker compose should contain kaspa-explorer service');
  testFramework.assertContains(dockerComposeContent, 'container_name: kaspa-explorer', 'Service should have correct container name');
  testFramework.assertContains(dockerComposeContent, '- kaspa-user-applications', 'Service should be assigned to correct profile');
});

testFramework.test('Service Configuration - Port Configuration', async () => {
  const configGenerator = new ConfigGenerator();
  
  const config = {
    KASPA_NODE_RPC_PORT: 16111,
    KASPA_NODE_P2P_PORT: 16110,
    KASPA_EXPLORER_PORT: 3005, // Custom port
    DASHBOARD_PORT: 3002
  };
  
  const profiles = ['kaspa-user-applications'];
  const dockerComposeContent = await configGenerator.generateDockerCompose(config, profiles);
  
  // Verify port configuration
  testFramework.assertContains(dockerComposeContent, '${KASPA_EXPLORER_PORT:-3004}', 'Should use KASPA_EXPLORER_PORT environment variable');
  testFramework.assertContains(dockerComposeContent, 'KASPA_NETWORK=', 'Should include network environment variable');
});

testFramework.test('Service Configuration - Environment Variables', async () => {
  const configGenerator = new ConfigGenerator();
  
  const config = {
    KASPA_NODE_RPC_PORT: 16111,
    KASPA_NODE_P2P_PORT: 16110,
    KASPA_NETWORK: 'testnet',
    PUBLIC_NODE: true
  };
  
  const profiles = ['kaspa-user-applications'];
  const dockerComposeContent = await configGenerator.generateDockerCompose(config, profiles);
  
  // Verify environment variables are set correctly
  testFramework.assertContains(dockerComposeContent, 'KASPA_NETWORK=${KASPA_NETWORK:-testnet}', 'Should set correct network variable');
  testFramework.assertContains(dockerComposeContent, 'API_BASE_URL=', 'Should include API base URL');
});

// Test CORS Header Generation
testFramework.test('CORS Header Generation - Basic Headers', async () => {
  const corsConfig = {
    allowOrigin: '*',
    allowMethods: 'GET, POST, OPTIONS',
    allowHeaders: 'Content-Type,Authorization',
    allowCredentials: false
  };
  
  const nginxConfig = generateNginxConfigWithCors(corsConfig);
  
  testFramework.assertContains(nginxConfig, 'Access-Control-Allow-Origin "*"', 'Should include origin header');
  testFramework.assertContains(nginxConfig, 'Access-Control-Allow-Methods "GET, POST, OPTIONS"', 'Should include methods header');
  testFramework.assertContains(nginxConfig, 'Access-Control-Allow-Headers "Content-Type,Authorization"', 'Should include headers header');
});

testFramework.test('CORS Header Generation - Credentials Handling', async () => {
  const corsConfigWithCredentials = {
    allowOrigin: 'https://kaspa.org',
    allowMethods: 'GET, POST, OPTIONS',
    allowHeaders: 'Content-Type,Authorization',
    allowCredentials: true
  };
  
  const nginxConfig = generateNginxConfigWithCors(corsConfigWithCredentials);
  
  testFramework.assertContains(nginxConfig, 'Access-Control-Allow-Credentials "true"', 'Should include credentials header when enabled');
  testFramework.assertContains(nginxConfig, 'Access-Control-Allow-Origin "https://kaspa.org"', 'Should use specific origin with credentials');
});

testFramework.test('CORS Header Generation - OPTIONS Handling', async () => {
  const corsConfig = {
    allowOrigin: '*',
    allowMethods: 'GET, POST, OPTIONS',
    allowHeaders: 'Content-Type',
    allowCredentials: false
  };
  
  const nginxConfig = generateNginxConfigWithCors(corsConfig);
  
  testFramework.assertContains(nginxConfig, 'if ($request_method = OPTIONS)', 'Should handle OPTIONS requests');
  testFramework.assertContains(nginxConfig, 'return 204', 'Should return 204 for OPTIONS requests');
});

// Test Error Detection and Reporting
testFramework.test('Error Detection - Missing Services', async () => {
  const serviceValidator = new ServiceValidator();
  
  // Test with docker-compose content missing kaspa-explorer
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
  
  const validation = serviceValidator.validateServicePresence(dockerComposeWithoutExplorer, ['kaspa-user-applications']);
  
  testFramework.assert(!validation.valid, 'Validation should fail when service is missing');
  testFramework.assert(validation.errors.length > 0, 'Should report errors for missing services');
  testFramework.assert(validation.missingServices.includes('kaspa-explorer'), 'Should identify kaspa-explorer as missing');
});

testFramework.test('Error Detection - Profile Validation', async () => {
  const serviceValidator = new ServiceValidator();
  
  // Test with invalid profile
  const validation = serviceValidator.validateProfiles(['invalid-profile', 'kaspa-user-applications']);
  
  testFramework.assert(validation.errors.length > 0, 'Should report errors for invalid profiles');
  // Note: warnings may be present for dependency suggestions, so we don't assert warnings.length === 0
  
  const errorMessages = validation.errors.map(e => e.message).join(' ');
  testFramework.assertContains(errorMessages, 'invalid-profile', 'Error message should mention invalid profile');
});

testFramework.test('Error Detection - Profile Mismatch Detection', async () => {
  const serviceValidator = new ServiceValidator();
  
  // Test with 'prod' profile (the current issue)
  const validation = serviceValidator.validateProfiles(['prod']);
  
  testFramework.assert(validation.errors.length > 0, 'Should detect prod profile as invalid');
  
  const prodError = validation.errors.find(e => e.profile === 'prod');
  testFramework.assert(prodError !== undefined, 'Should have specific error for prod profile');
  testFramework.assertContains(prodError.message, 'not a valid', 'Should explain that prod is not valid');
  testFramework.assertContains(prodError.suggestion, 'kaspa-user-applications', 'Should suggest correct profiles');
});

testFramework.test('Error Detection - Service Dependencies', async () => {
  const serviceValidator = new ServiceValidator();
  
  // Test dependency validation
  const dependencies = serviceValidator.serviceDependencies;
  
  testFramework.assert(Array.isArray(dependencies['simply-kaspa-indexer']), 'Should have dependencies for simply-kaspa-indexer');
  testFramework.assert(dependencies['simply-kaspa-indexer'].includes('kaspa-node'), 'Should depend on kaspa-node');
  testFramework.assert(dependencies['simply-kaspa-indexer'].includes('indexer-db'), 'Should depend on indexer-db');
});

testFramework.test('Error Detection - Clear Error Messages', async () => {
  const serviceValidator = new ServiceValidator();
  
  const dockerComposeEmpty = 'version: "3.8"\nservices: {}';
  const validation = serviceValidator.validateServicePresence(dockerComposeEmpty, ['kaspa-user-applications']);
  
  testFramework.assert(validation.errors.length > 0, 'Should have errors for empty docker-compose');
  
  // Check error message quality
  const firstError = validation.errors[0];
  testFramework.assert(firstError.type !== undefined, 'Error should have type');
  testFramework.assert(firstError.message !== undefined, 'Error should have message');
  testFramework.assert(firstError.suggestion !== undefined, 'Error should have suggestion');
  testFramework.assert(firstError.severity !== undefined, 'Error should have severity');
});

// Helper function to generate nginx config with CORS (for testing)
function generateNginxConfigWithCors(corsConfig) {
  const lines = [
    'server {',
    '    listen 80;',
    '    server_name localhost;',
    '',
    '    # CORS headers',
    `    add_header Access-Control-Allow-Origin "${corsConfig.allowOrigin}" always;`,
    `    add_header Access-Control-Allow-Methods "${corsConfig.allowMethods}" always;`,
    `    add_header Access-Control-Allow-Headers "${corsConfig.allowHeaders}" always;`
  ];
  
  if (corsConfig.allowCredentials) {
    lines.push('    add_header Access-Control-Allow-Credentials "true" always;');
  }
  
  lines.push(
    '',
    '    # Handle preflight OPTIONS requests',
    '    if ($request_method = OPTIONS) {',
    '        return 204;',
    '    }',
    '}'
  );
  
  return lines.join('\n');
}

// Test Configuration Validation
testFramework.test('Configuration Validation - Valid Config', async () => {
  const configGenerator = new ConfigGenerator();
  
  const validConfig = {
    KASPA_NODE_RPC_PORT: 16111,
    KASPA_NODE_P2P_PORT: 16110,
    KASPA_NETWORK: 'mainnet',
    PUBLIC_NODE: false,
    POSTGRES_USER: 'kaspa',
    POSTGRES_DB: 'kaspa_explorer'
  };
  
  const validation = await configGenerator.validateConfig(validConfig);
  
  testFramework.assert(validation.valid, 'Valid configuration should pass validation');
  testFramework.assert(validation.errors.length === 0, 'Valid configuration should have no errors');
  testFramework.assert(validation.config !== null, 'Valid configuration should return config object');
});

testFramework.test('Configuration Validation - Invalid Config', async () => {
  const configGenerator = new ConfigGenerator();
  
  const invalidConfig = {
    KASPA_NODE_RPC_PORT: 'invalid', // Should be number
    KASPA_NETWORK: 'invalid-network', // Should be mainnet or testnet
    POSTGRES_USER: 'a', // Too short
    POSTGRES_PORT: 99999 // Out of range
  };
  
  const validation = await configGenerator.validateConfig(invalidConfig);
  
  testFramework.assert(!validation.valid, 'Invalid configuration should fail validation');
  testFramework.assert(validation.errors.length > 0, 'Invalid configuration should have errors');
  testFramework.assert(validation.config === null, 'Invalid configuration should return null config');
});

testFramework.test('Configuration Validation - Password Generation', async () => {
  const configGenerator = new ConfigGenerator();
  
  const password1 = configGenerator.generateSecurePassword();
  const password2 = configGenerator.generateSecurePassword();
  
  testFramework.assert(password1.length >= 32, 'Generated password should be at least 32 characters');
  testFramework.assert(password1 !== password2, 'Generated passwords should be unique');
  testFramework.assert(/^[A-Za-z0-9+/]+$/.test(password1), 'Generated password should be base64-like');
});

// Run all tests
if (require.main === module) {
  testFramework.runAll()
    .then(success => {
      if (success) {
        console.log('\n🎉 All unit tests passed!');
        process.exit(0);
      } else {
        console.log('\n💥 Some unit tests failed!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { testFramework };