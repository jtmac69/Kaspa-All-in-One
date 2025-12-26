#!/usr/bin/env node

/**
 * Property-Based Test: Validation and Error Reporting
 * 
 * **Feature: kaspa-explorer-cors-fix, Property 3: Validation and Error Reporting**
 * **Validates: Requirements 2.1, 2.2, 2.4, 2.5**
 * 
 * Property: For any configuration with missing or misconfigured services, 
 * the system should detect and report the issues with clear diagnostic information
 */

const ConfigGenerator = require('./src/utils/config-generator');
const ServiceValidator = require('./src/utils/service-validator');

// Simple property-based testing implementation
class SimplePropertyTesting {
  constructor() {
    this.iterations = 100;
  }

  // Generate random invalid profile combinations
  generateInvalidProfileCombinations() {
    const invalidProfiles = ['prod', 'production', 'dev', 'test', 'invalid', 'wrong'];
    const validProfiles = ['core', 'kaspa-user-applications', 'indexer-services', 'archive-node', 'mining'];
    const combinations = [];
    
    for (let i = 0; i < this.iterations; i++) {
      const profiles = [];
      
      // Add some invalid profiles
      if (Math.random() > 0.3) {
        const invalidProfile = invalidProfiles[Math.floor(Math.random() * invalidProfiles.length)];
        profiles.push(invalidProfile);
      }
      
      // Sometimes add valid profiles too
      if (Math.random() > 0.5) {
        const validProfile = validProfiles[Math.floor(Math.random() * validProfiles.length)];
        profiles.push(validProfile);
      }
      
      // Sometimes have empty profiles
      if (Math.random() > 0.9) {
        combinations.push([]);
      } else {
        combinations.push(profiles);
      }
    }
    
    return combinations;
  }

  // Generate configurations that should cause validation errors
  generateProblematicConfigurations() {
    const configs = [];
    
    for (let i = 0; i < this.iterations; i++) {
      const config = {
        KASPA_NODE_RPC_PORT: 16110 + Math.floor(Math.random() * 100),
        KASPA_NODE_P2P_PORT: 16110 + Math.floor(Math.random() * 100),
        KASPA_NETWORK: Math.random() > 0.5 ? 'mainnet' : 'testnet'
      };
      
      configs.push(config);
    }
    
    return configs;
  }

  async runProperty(propertyFn, description) {
    console.log(`\nTesting Property: ${description}`);
    console.log('-'.repeat(80));
    
    let passed = 0;
    let failed = 0;
    const failures = [];
    
    for (let i = 0; i < this.iterations; i++) {
      try {
        const result = await propertyFn();
        if (result.success) {
          passed++;
        } else {
          failed++;
          failures.push({
            iteration: i + 1,
            error: result.error,
            input: result.input
          });
        }
      } catch (error) {
        failed++;
        failures.push({
          iteration: i + 1,
          error: error.message,
          input: 'Unknown'
        });
      }
    }
    
    console.log(`\nResults: ${passed}/${this.iterations} passed`);
    
    if (failed > 0) {
      console.log(`\nFailures (${failed}):`);
      failures.slice(0, 3).forEach(failure => {
        console.log(`  Iteration ${failure.iteration}: ${failure.error}`);
      });
      if (failures.length > 3) {
        console.log(`  ... and ${failures.length - 3} more failures`);
      }
    }
    
    return { passed, failed, failures };
  }
}

const configGenerator = new ConfigGenerator();
const serviceValidator = new ServiceValidator();
const propertyTester = new SimplePropertyTesting();

// Property 3: Validation and Error Reporting
async function testValidationAndErrorReporting() {
  return await propertyTester.runProperty(async () => {
    const invalidProfiles = propertyTester.generateInvalidProfileCombinations()[Math.floor(Math.random() * 100)];
    const config = propertyTester.generateProblematicConfigurations()[Math.floor(Math.random() * 100)];
    
    try {
      // Test profile validation
      const profileValidation = configGenerator.validateProfileConfiguration(invalidProfiles);
      
      // Should detect invalid profiles
      const hasInvalidProfiles = invalidProfiles.some(p => !['core', 'kaspa-user-applications', 'indexer-services', 'archive-node', 'mining'].includes(p));
      const hasEmptyProfiles = invalidProfiles.length === 0;
      
      if (hasInvalidProfiles || hasEmptyProfiles) {
        // Should have validation errors
        if (profileValidation.errors.length === 0) {
          return {
            success: false,
            error: 'Failed to detect invalid profiles',
            input: { profiles: invalidProfiles, config }
          };
        }
        
        // Should have clear error messages
        const hasErrorMessages = profileValidation.errors.every(error => 
          error.message && error.message.length > 0 && error.suggestion
        );
        
        if (!hasErrorMessages) {
          return {
            success: false,
            error: 'Error messages are missing or incomplete',
            input: { profiles: invalidProfiles, config }
          };
        }
        
        // Should categorize errors by type
        const hasErrorTypes = profileValidation.errors.every(error => error.type);
        if (!hasErrorTypes) {
          return {
            success: false,
            error: 'Error types are missing',
            input: { profiles: invalidProfiles, config }
          };
        }
      }
      
      // Test docker-compose validation if profiles are valid
      const validProfiles = invalidProfiles.filter(p => 
        ['core', 'kaspa-user-applications', 'indexer-services', 'archive-node', 'mining'].includes(p)
      );
      
      if (validProfiles.length > 0) {
        const dockerComposeContent = await configGenerator.generateDockerCompose(config, validProfiles);
        const serviceValidation = configGenerator.validateDockerComposeGeneration(dockerComposeContent, validProfiles, config);
        
        // Should provide validation summary
        if (!serviceValidation.summary) {
          return {
            success: false,
            error: 'Validation summary is missing',
            input: { profiles: validProfiles, config }
          };
        }
        
        // Should provide diagnostic information when there are issues
        if (!serviceValidation.valid) {
          const diagnostics = configGenerator.generateDiagnosticReport(dockerComposeContent, validProfiles, config);
          
          if (!diagnostics.recommendations || !diagnostics.quickFixes) {
            return {
              success: false,
              error: 'Diagnostic report is incomplete',
              input: { profiles: validProfiles, config }
            };
          }
        }
      }
      
      return { success: true };
      
    } catch (error) {
      return {
        success: false,
        error: `Validation failed: ${error.message}`,
        input: { profiles: invalidProfiles, config }
      };
    }
  }, 'Validation and Error Reporting - Clear diagnostic information for configuration issues');
}

// Test specific error scenarios
async function testSpecificErrorScenarios() {
  console.log('\nTesting Specific Error Scenarios');
  console.log('-'.repeat(80));
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Invalid 'prod' profile detection
  console.log('\nTest 1: Invalid "prod" profile detection');
  try {
    const validation = configGenerator.validateProfileConfiguration(['prod']);
    
    if (validation.errors.length === 0) {
      console.log('❌ FAIL: Did not detect invalid "prod" profile');
      failed++;
    } else {
      const prodError = validation.errors.find(e => e.profile === 'prod');
      if (prodError && (prodError.type === 'profile_mismatch' || prodError.type === 'invalid_profile')) {
        console.log('✅ PASS: Detected invalid "prod" profile with correct error type');
        console.log(`   Type: ${prodError.type}`);
        console.log(`   Message: ${prodError.message}`);
        console.log(`   Suggestion: ${prodError.suggestion}`);
        passed++;
      } else {
        console.log('❌ FAIL: Incorrect error type for "prod" profile');
        console.log('   Available errors:', validation.errors.map(e => `${e.type}:${e.profile}`));
        failed++;
      }
    }
  } catch (error) {
    console.log(`❌ FAIL: Error testing prod profile: ${error.message}`);
    failed++;
  }
  
  // Test 2: Missing service detection
  console.log('\nTest 2: Missing service detection');
  try {
    const config = { KASPA_NODE_RPC_PORT: 16111, KASPA_NODE_P2P_PORT: 16110 };
    const profiles = ['kaspa-user-applications'];
    
    const dockerComposeContent = await configGenerator.generateDockerCompose(config, profiles);
    const validation = configGenerator.validateDockerComposeGeneration(dockerComposeContent, profiles, config);
    
    // Should detect if kaspa-explorer is missing (it shouldn't be with current implementation)
    const hasKaspaExplorer = dockerComposeContent.includes('kaspa-explorer:');
    
    if (hasKaspaExplorer) {
      console.log('✅ PASS: kaspa-explorer service is properly included');
      passed++;
    } else {
      // If it's missing, validation should detect it
      const missingServiceError = validation.errors.find(e => 
        e.type === 'missing_service' && e.service === 'kaspa-explorer'
      );
      
      if (missingServiceError) {
        console.log('✅ PASS: Detected missing kaspa-explorer service');
        console.log(`   Message: ${missingServiceError.message}`);
        passed++;
      } else {
        console.log('❌ FAIL: Did not detect missing kaspa-explorer service');
        failed++;
      }
    }
  } catch (error) {
    console.log(`❌ FAIL: Error testing missing service: ${error.message}`);
    failed++;
  }
  
  // Test 3: Empty profiles detection
  console.log('\nTest 3: Empty profiles detection');
  try {
    const validation = configGenerator.validateProfileConfiguration([]);
    
    if (validation.errors.length === 0) {
      console.log('❌ FAIL: Did not detect empty profiles');
      failed++;
    } else {
      const emptyProfileError = validation.errors.find(e => e.type === 'no_profiles');
      if (emptyProfileError) {
        console.log('✅ PASS: Detected empty profiles with correct error type');
        console.log(`   Message: ${emptyProfileError.message}`);
        console.log(`   Suggestion: ${emptyProfileError.suggestion}`);
        passed++;
      } else {
        console.log('❌ FAIL: Incorrect error type for empty profiles');
        failed++;
      }
    }
  } catch (error) {
    console.log(`❌ FAIL: Error testing empty profiles: ${error.message}`);
    failed++;
  }
  
  // Test 4: Diagnostic report generation
  console.log('\nTest 4: Diagnostic report generation');
  try {
    const config = { KASPA_NODE_RPC_PORT: 16111 };
    const profiles = ['prod', 'invalid']; // Invalid profiles
    
    // Generate empty docker-compose content to simulate missing services
    const dockerComposeContent = 'services:\n';
    
    const diagnostics = configGenerator.generateDiagnosticReport(dockerComposeContent, profiles, config);
    
    if (!diagnostics.timestamp || !diagnostics.validation || !diagnostics.recommendations) {
      console.log('❌ FAIL: Diagnostic report is incomplete');
      console.log(`   Has timestamp: ${!!diagnostics.timestamp}`);
      console.log(`   Has validation: ${!!diagnostics.validation}`);
      console.log(`   Has recommendations: ${!!diagnostics.recommendations}`);
      failed++;
    } else {
      console.log('✅ PASS: Diagnostic report is complete');
      console.log(`   Errors detected: ${diagnostics.validation.errors.length}`);
      console.log(`   Recommendations: ${diagnostics.recommendations.length}`);
      console.log(`   Quick fixes: ${diagnostics.quickFixes.length}`);
      passed++;
    }
  } catch (error) {
    console.log(`❌ FAIL: Error generating diagnostic report: ${error.message}`);
    failed++;
  }
  
  return { passed, failed };
}

// Test validation summary functionality
async function testValidationSummary() {
  console.log('\nTesting Validation Summary');
  console.log('-'.repeat(80));
  
  try {
    const config = { KASPA_NODE_RPC_PORT: 16111, KASPA_NODE_P2P_PORT: 16110 };
    const validProfiles = ['kaspa-user-applications'];
    const invalidProfiles = ['prod', 'invalid'];
    
    // Test with valid configuration
    const validDockerCompose = await configGenerator.generateDockerCompose(config, validProfiles);
    const validSummary = configGenerator.getValidationSummary(validDockerCompose, validProfiles);
    
    console.log('Valid configuration summary:');
    console.log(`  Status: ${validSummary.status}`);
    console.log(`  Valid: ${validSummary.valid}`);
    console.log(`  Error count: ${validSummary.errorCount}`);
    console.log(`  Warning count: ${validSummary.warningCount}`);
    
    // Test with invalid configuration
    const invalidSummary = configGenerator.getValidationSummary('services:\n', invalidProfiles);
    
    console.log('\nInvalid configuration summary:');
    console.log(`  Status: ${invalidSummary.status}`);
    console.log(`  Valid: ${invalidSummary.valid}`);
    console.log(`  Error count: ${invalidSummary.errorCount}`);
    console.log(`  Critical issues: ${invalidSummary.criticalIssues}`);
    
    if (validSummary.valid && !invalidSummary.valid) {
      console.log('\n✅ PASS: Validation summary correctly distinguishes valid/invalid configurations');
      return { passed: 1, failed: 0 };
    } else {
      console.log('\n❌ FAIL: Validation summary not working correctly');
      return { passed: 0, failed: 1 };
    }
  } catch (error) {
    console.log(`❌ FAIL: Error testing validation summary: ${error.message}`);
    return { passed: 0, failed: 1 };
  }
}

// Main test runner
async function runAllTests() {
  console.log('='.repeat(80));
  console.log('Property-Based Test: Validation and Error Reporting');
  console.log('Feature: kaspa-explorer-cors-fix');
  console.log('Property 3: Validation and Error Reporting');
  console.log('Validates: Requirements 2.1, 2.2, 2.4, 2.5');
  console.log('='.repeat(80));
  
  let totalPassed = 0;
  let totalFailed = 0;
  
  // Run property-based test
  const result1 = await testValidationAndErrorReporting();
  totalPassed += result1.passed;
  totalFailed += result1.failed;
  
  // Run specific error scenario tests
  const result2 = await testSpecificErrorScenarios();
  totalPassed += result2.passed;
  totalFailed += result2.failed;
  
  // Run validation summary test
  const result3 = await testValidationSummary();
  totalPassed += result3.passed;
  totalFailed += result3.failed;
  
  console.log('\n' + '='.repeat(80));
  console.log('Final Test Summary');
  console.log('='.repeat(80));
  console.log(`Total tests: ${totalPassed + totalFailed}`);
  console.log(`Passed: ${totalPassed}`);
  console.log(`Failed: ${totalFailed}`);
  
  if (totalFailed === 0) {
    console.log('\n✅ All validation and error reporting tests passed!');
    console.log('The system correctly detects and reports configuration issues.');
    return true;
  } else {
    console.log('\n❌ Some validation and error reporting tests failed');
    console.log('There are issues with error detection and reporting.');
    return false;
  }
}

// Run tests if called directly
if (require.main === module) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = { runAllTests, testValidationAndErrorReporting };