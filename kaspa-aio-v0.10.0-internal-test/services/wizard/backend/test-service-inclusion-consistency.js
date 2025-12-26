#!/usr/bin/env node

/**
 * Property-Based Test: Service Inclusion Consistency
 * 
 * **Feature: kaspa-explorer-cors-fix, Property 1: Service Inclusion Consistency**
 * **Validates: Requirements 1.1, 1.3, 1.4**
 * 
 * Property: For any profile configuration that includes kaspa-user-applications, 
 * the generated docker-compose.yml should contain the kaspa-explorer service with correct configuration
 */

const ConfigGenerator = require('./src/utils/config-generator');

// Simple property-based testing implementation since fast-check is not available
class SimplePropertyTesting {
  constructor() {
    this.iterations = 100;
  }

  // Generate random profile combinations that include kaspa-user-applications
  generateProfileCombinations() {
    const allProfiles = ['core', 'kaspa-user-applications', 'indexer-services', 'archive-node', 'mining'];
    const combinations = [];
    
    // Always include kaspa-user-applications as per the property requirement
    for (let i = 0; i < this.iterations; i++) {
      const profiles = ['kaspa-user-applications'];
      
      // Randomly add other profiles
      for (const profile of allProfiles) {
        if (profile !== 'kaspa-user-applications' && Math.random() > 0.5) {
          profiles.push(profile);
        }
      }
      
      // Ensure we have at least one node profile (core or archive-node)
      if (!profiles.includes('core') && !profiles.includes('archive-node')) {
        profiles.push(Math.random() > 0.5 ? 'core' : 'archive-node');
      }
      
      combinations.push(profiles);
    }
    
    return combinations;
  }

  // Generate random configuration objects
  generateRandomConfig() {
    return {
      KASPA_NODE_RPC_PORT: 16110 + Math.floor(Math.random() * 100),
      KASPA_NODE_P2P_PORT: 16110 + Math.floor(Math.random() * 100),
      KASPA_NETWORK: Math.random() > 0.5 ? 'mainnet' : 'testnet',
      KASPA_EXPLORER_PORT: 3004 + Math.floor(Math.random() * 10),
      PUBLIC_NODE: Math.random() > 0.5
    };
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
      failures.slice(0, 5).forEach(failure => {
        console.log(`  Iteration ${failure.iteration}: ${failure.error}`);
        if (failure.input && typeof failure.input === 'object') {
          console.log(`    Input: ${JSON.stringify(failure.input, null, 2)}`);
        }
      });
      if (failures.length > 5) {
        console.log(`  ... and ${failures.length - 5} more failures`);
      }
    }
    
    return { passed, failed, failures };
  }
}

const configGenerator = new ConfigGenerator();
const propertyTester = new SimplePropertyTesting();

// Property 1: Service Inclusion Consistency
async function testServiceInclusionConsistency() {
  return await propertyTester.runProperty(async () => {
    const profiles = propertyTester.generateProfileCombinations()[Math.floor(Math.random() * 100)];
    const config = propertyTester.generateRandomConfig();
    
    try {
      const dockerComposeContent = await configGenerator.generateDockerCompose(config, profiles);
      
      // Check if kaspa-explorer service is included when kaspa-user-applications profile is active
      const hasKaspaExplorerService = dockerComposeContent.includes('kaspa-explorer:');
      const hasKaspaExplorerContainer = dockerComposeContent.includes('container_name: kaspa-explorer');
      const hasKaspaExplorerProfile = dockerComposeContent.includes('- kaspa-user-applications');
      const hasKaspaExplorerPort = dockerComposeContent.includes('KASPA_EXPLORER_PORT:-3004');
      
      if (!hasKaspaExplorerService) {
        return {
          success: false,
          error: 'kaspa-explorer service definition missing from docker-compose.yml',
          input: { profiles, config }
        };
      }
      
      if (!hasKaspaExplorerContainer) {
        return {
          success: false,
          error: 'kaspa-explorer container_name missing',
          input: { profiles, config }
        };
      }
      
      if (!hasKaspaExplorerProfile) {
        return {
          success: false,
          error: 'kaspa-explorer not assigned to kaspa-user-applications profile',
          input: { profiles, config }
        };
      }
      
      if (!hasKaspaExplorerPort) {
        return {
          success: false,
          error: 'kaspa-explorer port configuration missing',
          input: { profiles, config }
        };
      }
      
      // Verify the service has correct build context
      const hasBuildContext = dockerComposeContent.includes('context: ./services/kaspa-explorer');
      if (!hasBuildContext) {
        return {
          success: false,
          error: 'kaspa-explorer build context incorrect',
          input: { profiles, config }
        };
      }
      
      // Verify environment variables are set
      const hasNetworkEnv = dockerComposeContent.includes('KASPA_NETWORK=');
      const hasApiBaseUrl = dockerComposeContent.includes('API_BASE_URL=');
      
      if (!hasNetworkEnv || !hasApiBaseUrl) {
        return {
          success: false,
          error: 'kaspa-explorer environment variables missing',
          input: { profiles, config }
        };
      }
      
      return { success: true };
      
    } catch (error) {
      return {
        success: false,
        error: `Docker compose generation failed: ${error.message}`,
        input: { profiles, config }
      };
    }
  }, 'Service Inclusion Consistency - kaspa-explorer in kaspa-user-applications profile');
}

// Additional property: Profile mismatch detection
async function testProfileMismatchDetection() {
  return await propertyTester.runProperty(async () => {
    // Test with profiles that don't include kaspa-user-applications
    const profilesWithoutUserApps = [['core'], ['indexer-services'], ['core', 'mining'], ['archive-node']];
    const profiles = profilesWithoutUserApps[Math.floor(Math.random() * profilesWithoutUserApps.length)];
    const config = propertyTester.generateRandomConfig();
    
    try {
      const dockerComposeContent = await configGenerator.generateDockerCompose(config, profiles);
      
      // kaspa-explorer should NOT be included when kaspa-user-applications is not in profiles
      const hasKaspaExplorerService = dockerComposeContent.includes('kaspa-explorer:');
      
      if (hasKaspaExplorerService) {
        return {
          success: false,
          error: 'kaspa-explorer service incorrectly included without kaspa-user-applications profile',
          input: { profiles, config }
        };
      }
      
      return { success: true };
      
    } catch (error) {
      return {
        success: false,
        error: `Docker compose generation failed: ${error.message}`,
        input: { profiles, config }
      };
    }
  }, 'Profile Mismatch Detection - kaspa-explorer excluded when kaspa-user-applications not selected');
}

// Test current .env profile issue
async function testCurrentEnvProfileIssue() {
  console.log('\nTesting Current .env Profile Issue');
  console.log('-'.repeat(80));
  
  // Test with 'prod' profile (current issue)
  const config = { KASPA_NODE_RPC_PORT: 16111, KASPA_NODE_P2P_PORT: 16110 };
  const profiles = ['prod']; // This is the current problematic profile
  
  try {
    const dockerComposeContent = await configGenerator.generateDockerCompose(config, profiles);
    
    // With 'prod' profile, no services should be included since it's not a valid profile
    const hasAnyService = dockerComposeContent.includes('kaspa-node:') || 
                         dockerComposeContent.includes('kaspa-explorer:') ||
                         dockerComposeContent.includes('kasia-app:');
    
    if (hasAnyService) {
      console.log('❌ FAIL: Services incorrectly included with invalid "prod" profile');
      return false;
    } else {
      console.log('✅ PASS: No services included with invalid "prod" profile (expected behavior)');
      return true;
    }
  } catch (error) {
    console.log(`❌ FAIL: Error testing prod profile: ${error.message}`);
    return false;
  }
}

// Test correct profile configuration
async function testCorrectProfileConfiguration() {
  console.log('\nTesting Correct Profile Configuration');
  console.log('-'.repeat(80));
  
  // Test with correct kaspa-user-applications profile
  const config = { 
    KASPA_NODE_RPC_PORT: 16111, 
    KASPA_NODE_P2P_PORT: 16110,
    KASPA_NETWORK: 'mainnet'
  };
  const profiles = ['kaspa-user-applications'];
  
  try {
    const dockerComposeContent = await configGenerator.generateDockerCompose(config, profiles);
    
    // Should include kaspa-explorer
    const hasKaspaExplorer = dockerComposeContent.includes('kaspa-explorer:');
    const hasKasiaApp = dockerComposeContent.includes('kasia-app:');
    const hasKSocial = dockerComposeContent.includes('k-social:');
    
    if (hasKaspaExplorer && hasKasiaApp && hasKSocial) {
      console.log('✅ PASS: All user applications included with kaspa-user-applications profile');
      console.log('   - kaspa-explorer: ✓');
      console.log('   - kasia-app: ✓');
      console.log('   - k-social: ✓');
      return true;
    } else {
      console.log('❌ FAIL: Not all user applications included');
      console.log(`   - kaspa-explorer: ${hasKaspaExplorer ? '✓' : '✗'}`);
      console.log(`   - kasia-app: ${hasKasiaApp ? '✓' : '✗'}`);
      console.log(`   - k-social: ${hasKSocial ? '✓' : '✗'}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ FAIL: Error testing correct profile: ${error.message}`);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log('='.repeat(80));
  console.log('Property-Based Test: Service Inclusion Consistency');
  console.log('Feature: kaspa-explorer-cors-fix');
  console.log('Property 1: Service Inclusion Consistency');
  console.log('Validates: Requirements 1.1, 1.3, 1.4');
  console.log('='.repeat(80));
  
  let totalPassed = 0;
  let totalFailed = 0;
  
  // Run property-based tests
  const result1 = await testServiceInclusionConsistency();
  totalPassed += result1.passed;
  totalFailed += result1.failed;
  
  const result2 = await testProfileMismatchDetection();
  totalPassed += result2.passed;
  totalFailed += result2.failed;
  
  // Run specific issue tests
  const currentEnvResult = await testCurrentEnvProfileIssue();
  const correctProfileResult = await testCorrectProfileConfiguration();
  
  if (currentEnvResult) totalPassed += 1;
  else totalFailed += 1;
  
  if (correctProfileResult) totalPassed += 1;
  else totalFailed += 1;
  
  console.log('\n' + '='.repeat(80));
  console.log('Final Test Summary');
  console.log('='.repeat(80));
  console.log(`Total property tests: ${totalPassed + totalFailed}`);
  console.log(`Passed: ${totalPassed}`);
  console.log(`Failed: ${totalFailed}`);
  
  if (totalFailed === 0) {
    console.log('\n✅ All property tests passed!');
    console.log('The kaspa-explorer service inclusion logic is working correctly.');
    return true;
  } else {
    console.log('\n❌ Some property tests failed');
    console.log('There are issues with service inclusion consistency.');
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

module.exports = { runAllTests, testServiceInclusionConsistency, testProfileMismatchDetection };